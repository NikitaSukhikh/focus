/**
 * CenterPane State Management Hook
 *
 * Purpose: Manages core state and data loading for the center pane canvas
 * Responsibilities:
 * - Managing icons state by island (iconsByIsland)
 * - Loading objects from API and mapping to DroppedIcon format
 * - Tracking selected icon and drag-over state
 * - Calculating dynamic content height based on icon positions
 * - Handling keyboard delete for selected icons
 * - Syncing state when island selection changes
 */

import { useState, useEffect, useMemo } from 'react';
import { useIslandStore } from '../../../../stores/islandStore';
import { useUndoHistoryStore } from '../../../../stores/undoHistoryStore';
import { objectsApi } from '../../../../api/objects';
import { undoApi } from '../../../../api/undo';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { DroppedIcon, IconKind, ArrowSegment } from '../types';
import { normalizeTag } from '../../../../types/tags';
import { isGmailUrl } from '../utils';
import { calculateContentHeight } from '../boundaries';

export const useCenterPaneState = (paneRef: React.RefObject<HTMLDivElement | null>) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [iconsByIsland, setIconsByIsland] = useState<Record<string, DroppedIcon[]>>({});
  const [arrowsByIsland, setArrowsByIsland] = useState<Record<string, ArrowSegment[]>>({});
  const [selectedIconIds, setSelectedIconIds] = useState<string[]>([]);
  const [dragGhost, setDragGhost] = useState<{
    id: string;
    x: number;
    y: number;
    type: IconKind;
  } | null>(null);

  const selectedIsland = useIslandStore((state) => state.getSelectedIsland());
  const addEvent = useUndoHistoryStore((state) => state.addEvent);

  const contentHeight = useMemo(() => {
    const currentIcons = selectedIsland ? iconsByIsland[selectedIsland.id] || [] : [];
    const viewportHeight = paneRef.current?.getBoundingClientRect().height || 600;
    return calculateContentHeight(currentIcons, viewportHeight);
  }, [iconsByIsland, selectedIsland, paneRef]);

  // Load existing objects as icons when island changes
  useEffect(() => {
    const islandId = selectedIsland?.id;
    if (!islandId) return;

    objectsApi
      .list(islandId)
      .then((objects) => {
        const arrows: ArrowSegment[] = [];
        const mapped: DroppedIcon[] = objects
          .filter((obj) => {
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = meta.x;
            const y = meta.y;
            const deletedAt = meta.deleted_at;
            const hasCoords = typeof x === 'number' && typeof y === 'number' && x >= 0 && y >= 0;
            return hasCoords && !deletedAt;
          })
          .map((obj, idx) => {
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = typeof meta.x === 'number' ? meta.x : 100 + (idx % 5) * 120;
            const y = typeof meta.y === 'number' ? meta.y : 100 + Math.floor(idx / 5) * 140;

            const defaultTitle = (obj as any).default_title as string | undefined;
            const defaultDescription = (obj as any).default_description as string | undefined;
            const customTitle = ((obj as any).custom_title as string | null | undefined) ?? null;
            const customDescription = ((obj as any).custom_description as string | null | undefined) ?? null;
            const serviceKey = obj.type === 'google_drive' ? obj.description : undefined;
            const description = obj.type !== 'google_drive' ? (customDescription ?? obj.description ?? defaultDescription) : undefined;
            const url = obj.type === 'link' ? (meta.url as string) : undefined;
            const service = meta.service as string | undefined;
            const faviconUrl = (meta.favicon_url as string | undefined) || (url ? buildFaviconUrl(url) : undefined);
            const filePath = obj.type === 'file' ? (meta.file_path as string) : undefined;

            const tag = normalizeTag((obj as any).tag ?? meta.tag);
            const isGmail = url && isGmailUrl(url);
            const displayTitleBase = customTitle || obj.title || defaultTitle || '';
            const displayTitle = isGmail && description?.includes('Gmail - ')
              ? description.replace('Gmail - ', '')
              : displayTitleBase;

            let kind: IconKind =
              obj.type === 'link'
                ? (isGmail ? 'gmail' : 'link')
                : obj.type === 'file'
                ? 'file'
                : obj.type === 'gmail'
                ? 'gmail'
                : service === 'telegram'
                ? 'telegram'
                : service === 'intstorage'
                ? 'intstorage'
                : obj.type === 'google_drive'
                ? (
                  serviceKey === 'sheets' ? 'google_sheets' :
                  serviceKey === 'docs' ? 'google_docs' :
                  serviceKey === 'slides' ? 'google_slides' :
                  'google_drive'
                )
                : obj.type === 'text'
                ? 'text'
                : 'unknown';

            return {
              id: obj.id,
              type: kind,
              title: displayTitle,
              x,
              y,
              tag,
              serviceKey,
              url,
              service,
              description,
              defaultTitle,
              defaultDescription,
              customTitle,
              customDescription,
              faviconUrl,
              filePath,
              content: obj.type === 'text' ? (meta.content as string) : undefined,
            };
          });
        objects.forEach((obj) => {
          const meta = (obj.metadata || {}) as Record<string, any>;
          const hasArrowFlag = meta.arrow === true;
          const startX = meta.start_x;
          const startY = meta.start_y;
          const endX = meta.end_x;
          const endY = meta.end_y;
          if (hasArrowFlag && [startX, startY, endX, endY].every((v) => typeof v === 'number')) {
            arrows.push({
              id: obj.id,
              start: { x: startX, y: startY },
              end: { x: endX, y: endY },
            });
          }
        });
        setIconsByIsland((prev) => ({ ...prev, [islandId]: mapped }));
        setArrowsByIsland((prev) => ({ ...prev, [islandId]: arrows }));
      })
      .catch((err) => {
        console.error('Failed to load objects for island', islandId, err);
      });
  }, [selectedIsland?.id]);

  // Listen for tile updates from preview pane
  useEffect(() => {
    const handleTileUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ tileId: string; title: string; content: string }>;
      const { tileId, title, content } = customEvent.detail;

      if (!selectedIsland) return;

      setIconsByIsland((prev) => {
        const current = prev[selectedIsland.id] || [];
        return {
          ...prev,
          [selectedIsland.id]: current.map((icon) =>
            icon.id === tileId
              ? { ...icon, title, content, description: content.substring(0, 100) }
              : icon
          ),
        };
      });
    };

    window.addEventListener('tile:updated', handleTileUpdated);
    return () => window.removeEventListener('tile:updated', handleTileUpdated);
  }, [selectedIsland, setIconsByIsland]);

  // Sync link updates (title/description/custom/default) from other UI surfaces (e.g., sidebar)
  useEffect(() => {
    const handleLinkUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{
        linkId: string;
        title?: string;
        description?: string;
        url?: string;
        defaultTitle?: string;
        defaultDescription?: string;
        customTitle?: string | null;
        customDescription?: string | null;
        faviconUrl?: string;
      }>;
      const {
        linkId,
        title,
        description,
        url,
        defaultTitle,
        defaultDescription,
        customTitle,
        customDescription,
        faviconUrl,
      } = customEvent.detail;

      if (!selectedIsland) return;

      setIconsByIsland((prev) => {
        const current = prev[selectedIsland.id] || [];
        return {
          ...prev,
          [selectedIsland.id]: current.map((icon) =>
            icon.id === linkId
              ? {
                  ...icon,
                  title: title ?? icon.title,
                  description: description ?? icon.description,
                  url: url ?? icon.url,
                  defaultTitle: defaultTitle ?? icon.defaultTitle,
                  defaultDescription: defaultDescription ?? icon.defaultDescription,
                  customTitle: customTitle ?? icon.customTitle ?? null,
                  customDescription: customDescription ?? icon.customDescription ?? null,
                  faviconUrl: faviconUrl ?? icon.faviconUrl,
                }
              : icon
          ),
        };
      });
    };

    window.addEventListener('link:updated', handleLinkUpdated);
    return () => window.removeEventListener('link:updated', handleLinkUpdated);
  }, [selectedIsland, setIconsByIsland]);

  // Handle keyboard delete for selected icon
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const primarySelectedId = selectedIconIds[0];
      if ((e.key === 'Delete' || e.key === 'Backspace') && primarySelectedId && selectedIsland) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();

        console.log('[DELETE] Removing icon from canvas:', primarySelectedId);

        // Find the tile to save to history
        const tileToDelete = (iconsByIsland[selectedIsland.id] || []).find((i) => i.id === primarySelectedId);
        if (tileToDelete) {
          // Keep keyboard delete in both local undo store and server undo log
          const isTextTile = tileToDelete.type === 'text';
          const tileEventPayload = {
            id: tileToDelete.id,
            type: tileToDelete.type,
            title: tileToDelete.title,
            x: tileToDelete.x,
            y: tileToDelete.y,
            tag: tileToDelete.tag,
            url: tileToDelete.url,
            description: tileToDelete.description,
            faviconUrl: tileToDelete.faviconUrl,
            filePath: tileToDelete.filePath,
            serviceKey: tileToDelete.serviceKey,
            service: tileToDelete.service,
            content: tileToDelete.content,
          };
          const textEventPayload = {
            id: tileToDelete.id,
            title: tileToDelete.title,
            content: tileToDelete.content || '',
            x: tileToDelete.x,
            y: tileToDelete.y,
          };

          // Local history store
          addEvent(
            isTextTile
              ? { type: 'text_delete', islandId: selectedIsland.id, text: textEventPayload }
              : { type: 'tile_delete', islandId: selectedIsland.id, tile: tileEventPayload }
          );

          // Persist undo event to backend
          undoApi
            .createEvent(selectedIsland.id, {
              event_type: isTextTile ? 'text_delete' : 'tile_delete',
              event_data: isTextTile ? { text: textEventPayload } : { tile: tileEventPayload },
            })
            .catch((err) => console.error('Failed to create undo event:', err));
        }

        // Dispatch event before deleting to notify preview pane
        window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: primarySelectedId } }));

        setIconsByIsland((prev) => ({
          ...prev,
          [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== primarySelectedId),
        }));

        objectsApi.markDeleted(primarySelectedId).catch((err) => {
          console.error('Failed to mark object deleted:', err);
        });
        setSelectedIconIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIconIds, selectedIsland, iconsByIsland, addEvent]);

  return {
    isDragOver,
    setIsDragOver,
    iconsByIsland,
    setIconsByIsland,
    arrowsByIsland,
    setArrowsByIsland,
    selectedIconId: selectedIconIds[0] ?? null,
    setSelectedIconId: (id: string | null) => setSelectedIconIds(id ? [id] : []),
    selectedIconIds,
    setSelectedIconIds,
    dragGhost,
    setDragGhost,
    selectedIsland,
    contentHeight,
  };
};
