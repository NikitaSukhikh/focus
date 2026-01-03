/**
 * Space Navigation Keyboard Shortcut Hook
 *
 * Purpose: Manages Ctrl/Cmd+Down/Up for navigating between spaces, Ctrl/Cmd+Enter to load, Ctrl/Cmd+N to rename, and Ctrl/Cmd+Delete to delete
 * Responsibilities:
 * - Listening for Ctrl/Cmd+Down/Up keyboard events to navigate between spaces
 * - Listening for Ctrl/Cmd+Enter to load the currently highlighted space
 * - Listening for Ctrl/Cmd+N to rename the currently highlighted space
 * - Listening for Ctrl/Cmd+Delete to delete the currently highlighted space
 * - Managing highlighted space state during navigation
 * - Only active when sidebar is open
 */

import { useEffect, useState } from 'react';
import { isModifierOnlyKey, preventDefaultAndStop } from './keyboardUtils';
import { useSpaceStore } from '../stores/spaceStore';

interface UseSpaceNavigationShortcutReturn {
  highlightedSpaceId: string | null;
  renameRequestedSpaceId: string | null;
  renameRequestTimestamp: number;
  deleteRequestedSpaceId: string | null;
  deleteRequestTimestamp: number;
}

export const useSpaceNavigationShortcut = (isSidebarOpen: boolean, isDialogOpen: boolean = false): UseSpaceNavigationShortcutReturn => {
  const spaces = useSpaceStore((state) => state.spaces);
  const selectedSpaceId = useSpaceStore((state) => state.selectedSpaceId);
  const selectSpace = useSpaceStore((state) => state.selectSpace);

  const [highlightedSpaceId, setHighlightedSpaceId] = useState<string | null>(null);
  const [renameRequestedSpaceId, setRenameRequestedSpaceId] = useState<string | null>(null);
  const [renameRequestTimestamp, setRenameRequestTimestamp] = useState<number>(0);
  const [deleteRequestedSpaceId, setDeleteRequestedSpaceId] = useState<string | null>(null);
  const [deleteRequestTimestamp, setDeleteRequestTimestamp] = useState<number>(0);

  // Reset highlighted space when sidebar closes or spaces change
  useEffect(() => {
    if (!isSidebarOpen) {
      setHighlightedSpaceId(null);
      setRenameRequestedSpaceId(null);
      setRenameRequestTimestamp(0);
      setDeleteRequestedSpaceId(null);
      setDeleteRequestTimestamp(0);
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (!isSidebarOpen || spaces.length === 0 || isDialogOpen) return;

    const handleShortcut = (e: KeyboardEvent) => {
      const isNavigationHotkey = isModifierOnlyKey(e) && (e.code === 'ArrowDown' || e.code === 'ArrowUp');
      const isEnterHotkey = isModifierOnlyKey(e) && e.code === 'Enter';
      const isRenameHotkey = isModifierOnlyKey(e) && e.code === 'KeyN';
      const isDeleteHotkey = isModifierOnlyKey(e) && e.code === 'Delete';

      if (!isNavigationHotkey && !isEnterHotkey && !isRenameHotkey && !isDeleteHotkey) return;

      preventDefaultAndStop(e);

      // Handle Ctrl+Delete to delete highlighted space
      if (isDeleteHotkey) {
        const spaceToDelete = highlightedSpaceId || selectedSpaceId;
        if (spaceToDelete) {
          setDeleteRequestedSpaceId(spaceToDelete);
          setDeleteRequestTimestamp(Date.now());
          setHighlightedSpaceId(null);
        }
        return;
      }

      // Handle Ctrl+N to rename highlighted space
      if (isRenameHotkey) {
        const spaceToRename = highlightedSpaceId || selectedSpaceId;
        if (spaceToRename) {
          // Load the space first if it's not already loaded
          if (spaceToRename !== selectedSpaceId) {
            selectSpace(spaceToRename);
          }
          setRenameRequestedSpaceId(spaceToRename);
          setRenameRequestTimestamp(Date.now());
          setHighlightedSpaceId(null);
        }
        return;
      }

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
  }, [isSidebarOpen, spaces, selectedSpaceId, highlightedSpaceId, selectSpace, isDialogOpen]);

  return { highlightedSpaceId, renameRequestedSpaceId, renameRequestTimestamp, deleteRequestedSpaceId, deleteRequestTimestamp };
};
