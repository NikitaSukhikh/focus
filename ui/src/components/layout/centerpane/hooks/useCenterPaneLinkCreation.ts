/**
 * CenterPane Link Creation Hook
 *
 * Purpose: Manages link creation directly from the center pane
 * Responsibilities:
 * - Showing/hiding the Add Link dialog
 * - Creating new links at specific canvas positions
 * - Adding newly created links to the canvas
 */

import { useState } from 'react';
import { objectsApi } from '../../../../api/objects';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { truncateLinkTitle } from '../../../../utils/text';
import { DroppedIcon } from '../types';
import { isGmailUrl } from '../utils';
import { useUndoHistoryStore } from '../../../../stores/undoHistoryStore';

interface LinkCreationParams {
  selectedIsland: any;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
}

export const useCenterPaneLinkCreation = ({ selectedIsland, setIconsByIsland }: LinkCreationParams) => {
  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [pendingLinkPosition, setPendingLinkPosition] = useState<{ x: number; y: number } | null>(null);
  const addEvent = useUndoHistoryStore((state) => state.addEvent);

  const looksLikeFavicon = (src?: string) => {
    const s = (src || '').toLowerCase();
    return s.endsWith('.ico') || s.includes('favicon');
  };

  const pickFavicon = (metadata: any, resolvedUrl: string, originalUrl: string) => {
    const targetUrl = resolvedUrl || originalUrl;
    const candidateImage = metadata?.og_image || metadata?.thumbnail_url || metadata?.image;
    if (candidateImage && !looksLikeFavicon(candidateImage)) {
      return candidateImage;
    }

    return metadata?.favicon_url || buildFaviconUrl(targetUrl);
  };

  const openAddLinkDialog = (x: number, y: number) => {
    setPendingLinkPosition({ x, y });
    setIsAddLinkDialogOpen(true);
  };

  const handleAddLink = async (url: string, title: string, description: string) => {
    if (!selectedIsland || !pendingLinkPosition) {
      alert('Please select an island first');
      return;
    }

    const { x, y } = pendingLinkPosition;
    const favicon_url = buildFaviconUrl(url);
    const isGmail = isGmailUrl(url);

    try {
      const created = await objectsApi.create(selectedIsland.id, {
        type: isGmail ? 'gmail' : 'link',
        title,
        url,
        description,
        favicon_url,
        x,
        y,
      });

      // Add to canvas immediately
      const newIcon: DroppedIcon = {
        id: created.id,
        type: isGmail ? 'gmail' : 'link',
        title: created.title,
        x,
        y,
        url,
        description: created.description,
        faviconUrl: isGmail ? undefined : favicon_url,
      };

      setIconsByIsland((prev) => {
        const current = prev[selectedIsland.id] || [];
        return { ...prev, [selectedIsland.id]: [...current, newIcon] };
      });

      // Add to unified undo history
      addEvent({
        type: 'tile_create' as const,
        islandId: selectedIsland.id,
        tile: {
          id: created.id,
          type: isGmail ? 'gmail' : 'link',
          title: created.title,
          x,
          y,
          url,
          description: created.description,
          faviconUrl: isGmail ? undefined : favicon_url,
        },
      });

      // Notify other components that a link was created
      window.dispatchEvent(new CustomEvent('link:created', { detail: { linkId: created.id } }));

      // Auto-refresh metadata after 100ms to update title/description/favicon
      setTimeout(async () => {
        try {
          const params = new URLSearchParams({ url });
          const response = await fetch(`/api/metadata/url?${params.toString()}`);
          if (response.ok) {
            const metadata = await response.json();
            console.log('[AUTO-REFRESH] Received metadata:', metadata);
            const resolvedUrl = metadata.resolved_url || url;
            const updatedTitle = truncateLinkTitle(metadata.title || metadata.og_title || created.title);
            const updatedDescription = metadata.description || metadata.og_description || created.description;
            const updatedFavicon = pickFavicon(metadata, resolvedUrl, url) || favicon_url;
            console.log('[AUTO-REFRESH] Using favicon:', updatedFavicon);

            // Update the icon in state
            setIconsByIsland((prev) => {
              const current = prev[selectedIsland.id] || [];
              const updated = current.map((icon) =>
                icon.id === created.id
                  ? {
                      ...icon,
                      title: updatedTitle,
                      description: updatedDescription,
                      faviconUrl: updatedFavicon,
                      url: resolvedUrl,
                    }
                  : icon
              );
              return { ...prev, [selectedIsland.id]: updated };
            });

            // Persist to backend
            await objectsApi.updateLink(created.id, resolvedUrl, updatedTitle, updatedDescription, updatedFavicon);
          }
        } catch (err) {
          console.error('[AUTO-REFRESH] Failed to refresh metadata:', err);
        }
      }, 100);

      setIsAddLinkDialogOpen(false);
      setPendingLinkPosition(null);
    } catch (err) {
      console.error('Failed to create link:', err);
      alert('Failed to add link. Please try again.');
    }
  };

  const closeAddLinkDialog = () => {
    setIsAddLinkDialogOpen(false);
    setPendingLinkPosition(null);
  };

  return {
    isAddLinkDialogOpen,
    openAddLinkDialog,
    handleAddLink,
    closeAddLinkDialog,
  };
};
