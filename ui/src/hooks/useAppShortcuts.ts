/**
 * App-level Keyboard Shortcuts Orchestrator Hook
 *
 * Purpose: Manages all global keyboard shortcuts for the application
 * Responsibilities:
 * - Coordinating individual shortcut hooks
 * - Providing a unified API for keyboard shortcuts
 * - Managing shortcut registrations and cleanup
 */

import { useSidebarShortcut } from '@/hooks/useSidebarShortcut';
import { useConversationShortcut } from '@/hooks/useConversationShortcut';
import { usePreviewShortcut } from '@/hooks/usePreviewShortcut';
import { useQuickAddShortcut } from '@/hooks/useQuickAddShortcut';
import { useCreateSpaceShortcut } from '@/hooks/useCreateSpaceShortcut';

interface AppShortcutsHandlers {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleConversation: () => void;
  togglePreview: () => void;
  toggleQuickAdd: () => void;
  isDialogOpen?: boolean;
}

export const useAppShortcuts = (handlers: AppShortcutsHandlers) => {
  const isDialogOpen = handlers.isDialogOpen || false;

  useSidebarShortcut(handlers.isSidebarOpen, handlers.openSidebar, handlers.closeSidebar, isDialogOpen);
  useConversationShortcut(handlers.toggleConversation, isDialogOpen);
  usePreviewShortcut(handlers.togglePreview, isDialogOpen);
  useQuickAddShortcut(handlers.toggleQuickAdd, isDialogOpen);
  useCreateSpaceShortcut(isDialogOpen);
};
