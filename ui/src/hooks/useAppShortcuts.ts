/**
 * App-level Keyboard Shortcuts Orchestrator Hook
 *
 * Purpose: Manages all global keyboard shortcuts for the application
 * Responsibilities:
 * - Coordinating individual shortcut hooks
 * - Providing a unified API for keyboard shortcuts
 * - Managing shortcut registrations and cleanup
 */

import { useSidebarShortcut } from './useSidebarShortcut';
import { useConversationShortcut } from './useConversationShortcut';
import { usePreviewShortcut } from './usePreviewShortcut';
import { useQuickAddShortcut } from './useQuickAddShortcut';
import { useCreateSpaceShortcut } from './useCreateSpaceShortcut';

interface AppShortcutsHandlers {
  toggleSidebar: () => void;
  toggleConversation: () => void;
  togglePreview: () => void;
  toggleQuickAdd: () => void;
}

export const useAppShortcuts = (handlers: AppShortcutsHandlers) => {
  useSidebarShortcut(handlers.toggleSidebar);
  useConversationShortcut(handlers.toggleConversation);
  usePreviewShortcut(handlers.togglePreview);
  useQuickAddShortcut(handlers.toggleQuickAdd);
  useCreateSpaceShortcut();
};
