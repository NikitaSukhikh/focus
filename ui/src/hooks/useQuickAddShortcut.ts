/**
 * Quick Add Popup Toggle Keyboard Shortcut Hook
 *
 * Purpose: Manages Ctrl/Cmd+I keyboard shortcut for toggling the quick add popup
 * Responsibilities:
 * - Listening for Ctrl/Cmd+I keyboard events
 * - Preventing shortcut conflicts with text fields
 * - Calling toggle handler when shortcut is activated
 */

import { useEffect } from 'react';
import { isTextFieldTarget, isModifierOnlyKey, preventDefaultAndStop } from './keyboardUtils';

export const useQuickAddShortcut = (toggleQuickAdd: () => void, isDialogOpen: boolean = false) => {
  useEffect(() => {
    if (isDialogOpen) return;

    const handleQuickAdd = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!isModifierOnlyKey(e) || isTextFieldTarget(target)) return;
      if (e.code !== 'KeyI') return;

      preventDefaultAndStop(e);
      toggleQuickAdd();
    };

    window.addEventListener('keydown', handleQuickAdd, true);
    document.addEventListener('keydown', handleQuickAdd, true);
    return () => {
      window.removeEventListener('keydown', handleQuickAdd, true);
      document.removeEventListener('keydown', handleQuickAdd, true);
    };
  }, [toggleQuickAdd, isDialogOpen]);
};
