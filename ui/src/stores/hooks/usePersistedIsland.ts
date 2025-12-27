/**
 * Persisted Island Hook
 *
 * Purpose: Persist the currently selected island to localStorage
 * Responsibilities:
 * - Save selected island ID to localStorage when it changes
 * Note: Restoration is handled by islandStore.initialize()
 */

import { useEffect } from 'react';
import { useIslandStore } from '../islandStore';

const STORAGE_KEY = 'ocean:selectedIslandId';

export const usePersistedIsland = () => {
  const selectedIslandId = useIslandStore((state) => state.selectedIslandId);

  // Persist selected island whenever it changes
  useEffect(() => {
    if (selectedIslandId) {
      localStorage.setItem(STORAGE_KEY, selectedIslandId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedIslandId]);
};
