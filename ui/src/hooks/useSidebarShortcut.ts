/**
 * Sidebar Toggle Keyboard Shortcut Hook
 *
 * Purpose: Manages Ctrl/Cmd+Left keyboard shortcut for toggling the sidebar
 * Responsibilities:
 * - Listening for Ctrl/Cmd+Left keyboard events
 * - Preventing shortcut conflicts with text fields
 * - Calling toggle handler when shortcut is activated
 */

import { useEffect } from 'react';
import { isTextFieldTarget, isModifierOnlyKey, preventDefaultAndStop } from './keyboardUtils';

export const useSidebarShortcut = (toggleSidebar: () => void) => {
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isSidebarHotkey = isModifierOnlyKey(e) && e.code === 'ArrowLeft';

      if (!isSidebarHotkey || isTextFieldTarget(target)) return;

      preventDefaultAndStop(e);
      toggleSidebar();
    };

    window.addEventListener('keydown', handleShortcut, true);
    document.addEventListener('keydown', handleShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleShortcut, true);
      document.removeEventListener('keydown', handleShortcut, true);
    };
  }, [toggleSidebar]);
};
