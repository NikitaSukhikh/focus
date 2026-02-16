/**
 * Conversation Toggle Keyboard Shortcut Hook
 *
 * Purpose: Manages Ctrl/Cmd+O keyboard shortcut for toggling the conversation pane
 * Responsibilities:
 * - Listening for Ctrl/Cmd+O keyboard events
 * - Preventing shortcut conflicts with text fields
 * - Calling toggle handler when shortcut is activated
 */

import { useEffect } from 'react';
import { isTextFieldTarget, isModifierOnlyKey, preventDefaultAndStop } from '@/hooks/keyboardUtils';

export const useConversationShortcut = (toggleConversation: () => void, isDialogOpen: boolean = false) => {
  useEffect(() => {
    if (isDialogOpen) return;

    const handleToggleConversation = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!isModifierOnlyKey(e) || isTextFieldTarget(target)) return;
      if (e.code !== 'KeyO') return;

      preventDefaultAndStop(e);
      toggleConversation();
    };

    window.addEventListener('keydown', handleToggleConversation, true);
    document.addEventListener('keydown', handleToggleConversation, true);
    return () => {
      window.removeEventListener('keydown', handleToggleConversation, true);
      document.removeEventListener('keydown', handleToggleConversation, true);
    };
  }, [toggleConversation, isDialogOpen]);
};
