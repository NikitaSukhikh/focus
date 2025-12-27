/**
 * CenterPane Icon Actions Hook
 *
 * Purpose: Manages user actions on individual icons in the canvas
 * Responsibilities:
 * - Renaming icons (optimistic update + backend sync)
 * - Deleting icons from the canvas
 * - Refreshing metadata for link icons (re-fetching favicon and title)
 * - Handling canvas empty space clicks to deselect icons
 */

import { objectsApi } from '../../../../api/objects';
import { buildFaviconUrl } from '../../../../utils/favicon';
import { truncateLinkTitle } from '../../../../utils/text';
import { DroppedIcon } from '../types';
import { useDeletedTilesStore } from '../../../../stores/deletedTilesStore';

interface IconActionsParams {
  selectedIsland: any;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
}

export const useCenterPaneIconActions = ({ selectedIsland, setIconsByIsland }: IconActionsParams) => {
  const addDeletedTile = useDeletedTilesStore((state) => state.addDeletedTile);

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

  const handleIconRename = (iconId: string, newTitle: string) => {
    if (!selectedIsland) return;
    setIconsByIsland((prev) => ({
      ...prev,
      [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
        i.id === iconId ? { ...i, title: newTitle } : i
      ),
    }));
    objectsApi.updateTitle(iconId, newTitle).catch((err) => {
      console.error('Failed to update title:', err);
    });
  };

  const handleIconDelete = (iconId: string) => {
    if (!selectedIsland) return;

    // Find the tile to save to history
    const tileToDelete = (setIconsByIsland as any).__currentValue?.[selectedIsland.id]?.find((i: DroppedIcon) => i.id === iconId);

    setIconsByIsland((prev) => {
      const tile = (prev[selectedIsland.id] || []).find((i) => i.id === iconId);
      if (tile) {
        addDeletedTile({
          ...tile,
          islandId: selectedIsland.id,
        });
      }

      // Dispatch event before deleting to notify preview pane
      window.dispatchEvent(new CustomEvent('tile:deleted', { detail: { tileId: iconId } }));

      return {
        ...prev,
        [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== iconId),
      };
    });

    objectsApi.delete(iconId).catch((err) => {
      console.error('Failed to delete object:', err);
    });
  };

  const handleIconRefreshMetadata = async (iconId: string, url: string | undefined) => {
    if (!selectedIsland || !url) return;

    try {
      const params = new URLSearchParams({ url });
      const response = await fetch(`/api/metadata/url?${params.toString()}`);
      if (response.ok) {
        const metadata = await response.json();
        console.log('[CENTER PANE] Fetched metadata for refresh:', metadata);

        const resolvedUrl = metadata.resolved_url || url;
        const rawTitle = metadata.title || metadata.og_title || resolvedUrl;
        const newTitle = truncateLinkTitle(rawTitle);
        const newDescription = metadata.description || metadata.og_description || '';
        const newFaviconUrl = pickFavicon(metadata, resolvedUrl, url);
        console.log('[CENTER PANE] Using favicon URL:', newFaviconUrl);

        setIconsByIsland((prev) => ({
          ...prev,
          [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
            i.id === iconId
              ? { ...i, title: newTitle, description: newDescription, faviconUrl: newFaviconUrl, url: resolvedUrl }
              : i
          ),
        }));

        await objectsApi.updateLink(iconId, resolvedUrl, newTitle, newDescription, newFaviconUrl);
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
    handleIconRename,
    handleIconDelete,
    handleIconRefreshMetadata,
    handleCanvasClick,
  };
};
