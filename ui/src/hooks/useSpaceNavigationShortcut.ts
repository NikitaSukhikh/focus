/**
 * Space Navigation Keyboard Shortcut Hook
 *
 * Purpose: Manages Ctrl/Cmd+Down/Up for navigating between spaces and Ctrl/Cmd+Enter to load selected space
 * Responsibilities:
 * - Listening for Ctrl/Cmd+Down/Up keyboard events to navigate between spaces
 * - Listening for Ctrl/Cmd+Enter to load the currently highlighted space
 * - Managing highlighted space state during navigation
 * - Only active when sidebar is open
 */

import { useEffect, useState } from 'react';
import { isModifierOnlyKey, preventDefaultAndStop } from './keyboardUtils';
import { useSpaceStore } from '../stores/spaceStore';

export const useSpaceNavigationShortcut = (isSidebarOpen: boolean) => {
  const spaces = useSpaceStore((state) => state.spaces);
  const selectedSpaceId = useSpaceStore((state) => state.selectedSpaceId);
  const selectSpace = useSpaceStore((state) => state.selectSpace);

  const [highlightedSpaceId, setHighlightedSpaceId] = useState<string | null>(null);

  // Reset highlighted space when sidebar closes or spaces change
  useEffect(() => {
    if (!isSidebarOpen) {
      setHighlightedSpaceId(null);
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen || spaces.length === 0) return;

    const handleShortcut = (e: KeyboardEvent) => {
      const isNavigationHotkey = isModifierOnlyKey(e) && (e.code === 'ArrowDown' || e.code === 'ArrowUp');
      const isEnterHotkey = isModifierOnlyKey(e) && e.code === 'Enter';

      if (!isNavigationHotkey && !isEnterHotkey) return;

      preventDefaultAndStop(e);

      // Handle Ctrl+Enter to load highlighted space
      if (isEnterHotkey) {
        if (highlightedSpaceId) {
          selectSpace(highlightedSpaceId);
          setHighlightedSpaceId(null);
        }
        return;
      }

      // Handle Ctrl+Down/Up navigation
      const currentHighlighted = highlightedSpaceId || selectedSpaceId;
      const currentIndex = spaces.findIndex((space) => space.id === currentHighlighted);

      let nextIndex: number;
      if (e.code === 'ArrowDown') {
        nextIndex = currentIndex < spaces.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : spaces.length - 1;
      }

      const nextSpace = spaces[nextIndex];
      if (nextSpace) {
        setHighlightedSpaceId(nextSpace.id);
      }
    };

    window.addEventListener('keydown', handleShortcut, true);
    document.addEventListener('keydown', handleShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleShortcut, true);
      document.removeEventListener('keydown', handleShortcut, true);
    };
  }, [isSidebarOpen, spaces, selectedSpaceId, highlightedSpaceId, selectSpace]);

  return { highlightedSpaceId };
};
