/**
 * CenterPane Web Article Creation Hook
 *
 * Purpose: Manages web article tile creation from the center pane
 * Responsibilities:
 * - Showing/hiding the Add Web Article dialog
 * - Creating new web_article objects at specific canvas positions
 */

import React, { useCallback, useState } from 'react';
import { Space } from '@/api/spaces';
import { objectsApi } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { buildFaviconUrl } from '@/utils/favicon';
import { DroppedIcon } from '@/components/layout/centerpane/types';
import { normalizeTag } from '@/types/tags';
import { WEB_ARTICLE_EMBED } from '@/constants/objectsDimensions';

interface WebArticleCreationParams {
  selectedSpace: Space | null;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundariesWithPadding: (x: number, y: number, paddingX?: number, paddingY?: number) => { x: number; y: number };
}

export const useCenterPaneWebArticleCreation = ({
  selectedSpace,
  setIconsBySpace,
  clampToBoundariesWithPadding,
}: WebArticleCreationParams) => {
  const [isAddWebArticleDialogOpen, setIsAddWebArticleDialogOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingArticle, setEditingArticle] = useState<{ id: string; url?: string; title?: string } | null>(null);
  const [articleError, setArticleError] = useState<string | null>(null);

  const clampToArticleBounds = useCallback(
    (x: number, y: number) =>
      clampToBoundariesWithPadding(x, y, WEB_ARTICLE_EMBED.width / 2, WEB_ARTICLE_EMBED.height / 2),
    [clampToBoundariesWithPadding]
  );

  const openAddWebArticleDialog = (x: number, y: number) => {
    setPendingPosition({ x, y });
    setEditingArticle(null);
    setArticleError(null);
    setIsAddWebArticleDialogOpen(true);
  };

  const openWebArticleEditDialog = (article: DroppedIcon) => {
    setPendingPosition(null);
    setEditingArticle({ id: article.id, url: article.url, title: article.title });
    setArticleError(null);
    setIsAddWebArticleDialogOpen(true);
  };

  const closeAddWebArticleDialog = () => {
    setIsAddWebArticleDialogOpen(false);
    setPendingPosition(null);
    setEditingArticle(null);
    setArticleError(null);
  };

  const handleAddWebArticle = async (url: string, title: string) => {
    if (!selectedSpace) return;

    // Edit existing article
    if (editingArticle) {
      try {
        const favicon_url = buildFaviconUrl(url) ?? '';
        await objectsApi.updateLink(editingArticle.id, url, title, '', favicon_url);
        setIconsBySpace((prev) => {
          const current = prev[selectedSpace.id] || [];
          return {
            ...prev,
            [selectedSpace.id]: current.map((icon) =>
              icon.id === editingArticle.id ? { ...icon, url, title, faviconUrl: favicon_url } : icon
            ),
          };
        });
        window.dispatchEvent(new CustomEvent('web_article:updated', { detail: { id: editingArticle.id } }));
      } catch (err) {
        console.error('[WebArticle] Failed to update:', err);
        setArticleError('Failed to update web article. Please try again.');
        return;
      } finally {
        closeAddWebArticleDialog();
      }
      return;
    }

    if (!pendingPosition) return;

    const { x, y } = clampToArticleBounds(pendingPosition.x, pendingPosition.y);
    const favicon_url = buildFaviconUrl(url) ?? '';

    try {
      const created = await objectsApi.create(selectedSpace.id, {
        type: 'web_article',
        title: title || url,
        url,
        favicon_url,
        x,
        y,
      });

      const newIcon: DroppedIcon = {
        id: created.id,
        type: 'web_article',
        title: created.title || title || url,
        x,
        y,
        tag: normalizeTag(created.tag),
        url,
        faviconUrl: favicon_url,
      };

      setIconsBySpace((prev) => {
        const current = prev[selectedSpace.id] || [];
        return { ...prev, [selectedSpace.id]: [...current, newIcon] };
      });

      undoApi
        .createEvent(selectedSpace.id, {
          event_type: 'tile_create',
          event_data: {
            tile: {
              id: created.id,
              type: 'web_article',
              title: newIcon.title,
              tag: newIcon.tag,
              x,
              y,
              url,
              faviconUrl: favicon_url,
            },
          },
        })
        .catch((err) => console.error('[WebArticle] Failed to create undo event:', err));

      window.dispatchEvent(new CustomEvent('web_article:created', { detail: { id: created.id } }));
    } catch (err) {
      console.error('[WebArticle] Failed to create:', err);
      setArticleError('Failed to add web article. Please try again.');
    }
  };

  return {
    isAddWebArticleDialogOpen,
    openAddWebArticleDialog,
    openWebArticleEditDialog,
    closeAddWebArticleDialog,
    handleAddWebArticle,
    editingArticle,
    articleError,
  };
};
