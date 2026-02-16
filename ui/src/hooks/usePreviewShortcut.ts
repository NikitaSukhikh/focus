/**
 * Preview Pane Toggle Keyboard Shortcut Hook
 *
 * Purpose: Manages Ctrl/Cmd+U keyboard shortcut for toggling the preview pane
 * Responsibilities:
 * - Listening for Ctrl/Cmd+U keyboard events
 * - Preventing shortcut conflicts with text fields
 * - Calling toggle handler when shortcut is activated
 */

import { useEffect } from 'react';
import { isTextFieldTarget, isModifierOnlyKey, preventDefaultAndStop } from '@/hooks/keyboardUtils';

export const usePreviewShortcut = (togglePreview: () => void, isDialogOpen: boolean = false) => {
  useEffect(() => {
    if (isDialogOpen) return;

    const handleTogglePreview = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!isModifierOnlyKey(e) || isTextFieldTarget(target)) return;
      if (e.code !== 'KeyU') return;

      preventDefaultAndStop(e);
      togglePreview();
    };

    window.addEventListener('keydown', handleTogglePreview, true);
    document.addEventListener('keydown', handleTogglePreview, true);
    return () => {
      window.removeEventListener('keydown', handleTogglePreview, true);
      document.removeEventListener('keydown', handleTogglePreview, true);
    };
  }, [togglePreview, isDialogOpen]);
};
