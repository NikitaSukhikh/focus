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
import { DroppedIcon } from '../types';

interface IconActionsParams {
  selectedIsland: any;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
}

export const useCenterPaneIconActions = ({ selectedIsland, setIconsByIsland }: IconActionsParams) => {
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
    setIconsByIsland((prev) => ({
      ...prev,
      [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== iconId),
    }));
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

        const newTitle = metadata.title || metadata.og_title || url;
        const newDescription = metadata.description || metadata.og_description || '';
        const newFaviconUrl = metadata.favicon_url || buildFaviconUrl(url);

        setIconsByIsland((prev) => ({
          ...prev,
          [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
            i.id === iconId ? { ...i, title: newTitle, description: newDescription, faviconUrl: newFaviconUrl } : i
          ),
        }));

        await objectsApi.updateLink(iconId, url, newTitle, newDescription, newFaviconUrl);
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
