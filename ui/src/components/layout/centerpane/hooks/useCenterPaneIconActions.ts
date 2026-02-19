/**
 * CenterPane Icon Actions Hook
 *
 * Purpose: Manages user actions on individual icons in the canvas
 * Responsibilities:
 * - Deleting icons from the canvas
 * - Refreshing metadata for link icons (re-fetching favicon and title)
 * - Handling canvas empty space clicks to deselect icons
 */

import { objectsApi } from '@/api/objects';
import { undoApi } from '@/api/undo';
import { buildFaviconUrl } from '@/utils/favicon';
import { resolveLinkTitle } from '@/utils/text';
import { ArrowSegment, DroppedIcon } from '@/components/layout/centerpane/types';
import { API_BASE } from '@/config/api';

interface IconActionsParams {
  selectedSpace: any;
  setIconsBySpace: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  arrowsBySpace: Record<string, ArrowSegment[]>;
}

const toArrowUndoPayload = (arrow: ArrowSegment) => ({
  id: arrow.id,
  start: { x: arrow.start.x, y: arrow.start.y },
  end: { x: arrow.end.x, y: arrow.end.y },
  start_anchor: arrow.startAnchor
    ? { tile_id: arrow.startAnchor.tileId, edge: arrow.startAnchor.edge, edge_index: arrow.startAnchor.edgeIndex }
    : undefined,
  end_anchor: arrow.endAnchor
    ? { tile_id: arrow.endAnchor.tileId, edge: arrow.endAnchor.edge, edge_index: arrow.endAnchor.edgeIndex }
    : undefined,
});

export const useCenterPaneIconActions = ({ selectedSpace, setIconsBySpace, arrowsBySpace }: IconActionsParams) => {

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

  const handleIconDelete = (iconId: string) => {
    if (!selectedSpace) return;

    const connectedArrows = (arrowsBySpace[selectedSpace.id] || [])
      .filter((arrow) => arrow.startAnchor?.tileId === iconId || arrow.endAnchor?.tileId === iconId)
      .map(toArrowUndoPayload);

    setIconsBySpace((prev) => {
      const tile = (prev[selectedSpace.id] || []).find((i) => i.id === iconId);
      if (tile) {
        // Add to backend undo history
        // Text tiles use text_delete event, all other tiles use tile_delete
        if (tile.type === 'text') {
          undoApi
            .createEvent(selectedSpace.id, {
              event_type: 'text_delete',
              event_data: {
                text: {
                  id: tile.id,
                  title: tile.title,
                  content: tile.content || '',
                  x: tile.x,
                  y: tile.y,
                  width: tile.width,
                  height: tile.height,
                },
                deleted_arrows: connectedArrows,
              },
            })
            .catch((err) => console.error('Failed to create undo event:', err));
        } else {
          undoApi
            .createEvent(selectedSpace.id, {
              event_type: 'tile_delete',
              event_data: {
                tile: {
                  id: tile.id,
                  type: tile.type,
                  title: tile.title,
                  width: tile.width,
                  height: tile.height,
                  defaultTitle: tile.defaultTitle,
                  defaultDescription: tile.defaultDescription,
                  customTitle: tile.customTitle,
                  customDescription: tile.customDescription,
                  x: tile.x,
                  y: tile.y,
                  url: tile.url,
                  description: tile.description,
                  faviconUrl: tile.faviconUrl,
                  filePath: tile.filePath,
                  serviceKey: tile.serviceKey,
                  service: tile.service,
                  content: tile.content,
                },
                deleted_arrows: connectedArrows,
              },
            })
            .catch((err) => console.error('Failed to create undo event:', err));
        }
      }

      // Dispatch event before deleting to notify preview pane
      window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: iconId } }));

      return {
        ...prev,
        [selectedSpace.id]: (prev[selectedSpace.id] || []).filter((i) => i.id !== iconId),
      };
    });

    // Soft-delete by clearing position so undo/redo can restore the object
    objectsApi.markDeleted(iconId).catch((err) => {
      console.error('Failed to mark object deleted:', err);
    });
  };

  const handleIconRefreshMetadata = async (iconId: string, url: string | undefined) => {
    if (!selectedSpace || !url) return;

    try {
      const params = new URLSearchParams({ url });
      const response = await fetch(`${API_BASE}/metadata/url?${params.toString()}`);
      if (response.ok) {
        const metadata = await response.json();
        console.log('[CENTER PANE] Fetched metadata for refresh:', metadata);

        const resolvedUrl = metadata.resolved_url || url;
        const newTitle = resolveLinkTitle(metadata.title || metadata.og_title, resolvedUrl);
        const newDescription = metadata.description || metadata.og_description || '';
        const newFaviconUrl = pickFavicon(metadata, resolvedUrl, url);
        const newChannelName = metadata.channel_name;
        console.log('[CENTER PANE] Using favicon URL:', newFaviconUrl);

        setIconsBySpace((prev) => ({
          ...prev,
          [selectedSpace.id]: (prev[selectedSpace.id] || []).map((i) =>
            i.id === iconId
              ? {
                  ...i,
                  defaultTitle: newTitle,
                  defaultDescription: newDescription,
                  title: i.customTitle ? i.title : newTitle,
                  description: i.customDescription ?? newDescription,
                  channelName: newChannelName || i.channelName,
                  faviconUrl: newFaviconUrl,
                  url: resolvedUrl,
                }
              : i
          ),
        }));

        await objectsApi.updateLink(iconId, resolvedUrl, newTitle, newDescription, newFaviconUrl);
        window.dispatchEvent(new CustomEvent('link:updated', {
          detail: {
            linkId: iconId,
            channelName: newChannelName,
          },
        }));
      }
    } catch (err) {
      console.error('[CENTER PANE] Failed to refresh metadata:', err);
    }
  };

  const handleCanvasClick = (
    event: React.MouseEvent<HTMLDivElement>,
    onCanvasEmptyClick?: () => void,
    setSelectedIconIds?: (ids: string[]) => void
  ) => {
    const target = event.target as HTMLElement;
    const clickedIcon = target.closest('[data-icon-tile]');
    if (clickedIcon) return;

    setSelectedIconIds?.([]);
    onCanvasEmptyClick?.();
  };

  return {
    handleIconDelete,
    handleIconRefreshMetadata,
    handleCanvasClick,
  };
};
