/**
 * Sidebar Toggle Keyboard Shortcut Hook
 *
 * Purpose: Manages Ctrl/Cmd+Left/Right keyboard shortcuts for opening/closing the sidebar
 * Responsibilities:
 * - Listening for Ctrl/Cmd+Left to open sidebar
 * - Listening for Ctrl/Cmd+Right to close sidebar
 * - Preventing shortcut conflicts with text fields
 * - Only executing actions when state change is needed
 */

import { useEffect } from 'react';
import { isTextFieldTarget, isModifierOnlyKey, preventDefaultAndStop } from './keyboardUtils';

export const useSidebarShortcut = (isSidebarOpen: boolean, openSidebar: () => void, closeSidebar: () => void, isDialogOpen: boolean = false) => {
  useEffect(() => {
    if (isDialogOpen) return;

    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isLeftHotkey = isModifierOnlyKey(e) && e.code === 'ArrowLeft';
      const isRightHotkey = isModifierOnlyKey(e) && e.code === 'ArrowRight';

      if ((!isLeftHotkey && !isRightHotkey) || isTextFieldTarget(target)) return;

      if (isLeftHotkey && !isSidebarOpen) {
        preventDefaultAndStop(e);
        openSidebar();
      } else if (isRightHotkey && isSidebarOpen) {
        preventDefaultAndStop(e);
        closeSidebar();
      }
    };

    window.addEventListener('keydown', handleShortcut, true);
    document.addEventListener('keydown', handleShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleShortcut, true);
      document.removeEventListener('keydown', handleShortcut, true);
    };
  }, [isSidebarOpen, openSidebar, closeSidebar, isDialogOpen]);
};
