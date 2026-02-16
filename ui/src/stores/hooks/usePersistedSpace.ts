/**
 * Persisted Space Hook
 *
 * Purpose: Persist the currently selected space to localStorage
 * Responsibilities:
 * - Save selected space ID to localStorage when it changes
 * Note: Restoration is handled by spaceStore.initialize()
 */

import { useEffect } from 'react';
import { useSpaceStore } from '@/stores/spaceStore';

const STORAGE_KEY = 'focus:selectedSpaceId';

export const usePersistedSpace = () => {
  const selectedSpaceId = useSpaceStore((state) => state.selectedSpaceId);

  // Persist selected space whenever it changes
  useEffect(() => {
    if (selectedSpaceId) {
      localStorage.setItem(STORAGE_KEY, selectedSpaceId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [selectedSpaceId]);
};
