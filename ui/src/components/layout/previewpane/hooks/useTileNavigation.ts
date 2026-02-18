import { useMemo, useCallback } from 'react';
import { DroppedIcon } from '@/components/layout/centerpane/types';
import { sortTilesSpatially } from '@/utils/spatialSort';
import { isPreviewPaneTargetAllowed } from '@/utils/previewTargets';

export interface UseTileNavigationParams {
  tiles: DroppedIcon[];
  currentTileId: string | undefined;
  onNavigate: (tileId: string) => void;
}

export interface UseTileNavigationReturn {
  navigateNext: () => void;
  navigatePrevious: () => void;
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
  currentIndex: number;
  totalTiles: number;
}

/**
 * Hook for managing tile navigation state and providing navigation functions.
 *
 * Handles:
 * - Spatial sorting of tiles (top-left to bottom-right)
 * - Finding current tile in sorted order
 * - Calculating next/previous navigation targets
 * - Determining if navigation is possible
 *
 * @param params - Navigation parameters
 * @returns Navigation functions and state
 */
export function useTileNavigation(params: UseTileNavigationParams): UseTileNavigationReturn {
  const { tiles, currentTileId, onNavigate } = params;

  // Keep navigation in sync with preview eligibility so disabled targets are skipped.
  const sortedTiles = useMemo(() => sortTilesSpatially(tiles.filter((tile) => isPreviewPaneTargetAllowed(tile))), [tiles]);

  // Find current tile index in sorted array
  const currentIndex = useMemo(() => {
    if (!currentTileId) return -1;
    return sortedTiles.findIndex(t => t.id === currentTileId);
  }, [sortedTiles, currentTileId]);

  // Calculate navigation state
  const canNavigateNext = currentIndex >= 0 && currentIndex < sortedTiles.length - 1;
  const canNavigatePrevious = currentIndex > 0;

  // Navigate to next tile
  const navigateNext = useCallback(() => {
    if (canNavigateNext) {
      const nextTile = sortedTiles[currentIndex + 1];
      onNavigate(nextTile.id);
    }
  }, [canNavigateNext, currentIndex, sortedTiles, onNavigate]);

  // Navigate to previous tile
  const navigatePrevious = useCallback(() => {
    if (canNavigatePrevious) {
      const prevTile = sortedTiles[currentIndex - 1];
      onNavigate(prevTile.id);
    }
  }, [canNavigatePrevious, currentIndex, sortedTiles, onNavigate]);

  return {
    navigateNext,
    navigatePrevious,
    canNavigateNext,
    canNavigatePrevious,
    currentIndex,
    totalTiles: sortedTiles.length,
  };
}
