/**
 * Dimension Constants
 *
 * Centralized dimension values for all UI elements in the application.
 * Includes panel sizes, component dimensions, min/max constraints, and localStorage keys.
 */

export const DIMENSIONS = {
  // Top Bar
  TOPBAR: {
    HEIGHT: 48, // Slimmer top bar height
  },

  // Left Sidebar
  SIDEBAR: {
    DEFAULT_WIDTH: 220,
    MIN_WIDTH: 200,
    MAX_WIDTH: 400,
    STORAGE_KEY: 'focus-sidebar-width',
  },

  // Preview Pane
  PREVIEW: {
    MIN_WIDTH: 360,
    DEFAULT_WIDTH: 480, // Default width when not flexible
    MAX_WIDTH: 800, // Maximum width to prevent taking too much space
    STORAGE_KEY: 'focus-preview-width',
  },

  // Assistant Pane (Conversation)
  ASSISTANT: {
    DEFAULT_WIDTH: 540,
    MIN_WIDTH: 500,
    MAX_WIDTH: 1000,
    HEIGHT: 340,
    STORAGE_KEY: 'focus-conversation-width',
  },

  // Quick Add Popup
  QUICK_ADD_POPUP: {
    WIDTH: 280,
  },

  // Dialogs
  DIALOG: {
    MAX_WIDTH: 448, // max-w-md = 28rem = 448px
    SEARCH_INPUT_WIDTH: 256, // w-64 = 16rem = 256px
    ACCOUNT_DROPDOWN_WIDTH: 208, // w-52 = 13rem = 208px
    CONTEXT_MENU_WIDTH: 160, // w-40 = 10rem = 160px
  },

  // Assistant Input
  ASSISTANT_INPUT: {
    MIN_HEIGHT: 40,
    MAX_HEIGHT: 120,
  },

  // Message Bubbles
  MESSAGE: {
    MAX_WIDTH_PERCENT: 85, // max-w-[85%]
    AVATAR_SIZE: 48, // w-12 h-12 = 48px
    DOT_SIZE: 8, // w-2 h-2 = 8px
    ICON_SIZE: 16, // w-4 h-4 = 16px
  },

  // Resize Handles
  RESIZE_HANDLE: {
    WIDTH: 4, // w-1 = 4px
  },
} as const;

// Legacy export for backward compatibility
export const PANEL_DIMENSIONS = {
  SIDEBAR: DIMENSIONS.SIDEBAR,
  PREVIEW: DIMENSIONS.PREVIEW,
  ASSISTANT: DIMENSIONS.ASSISTANT,
} as const;

// Type for dimension keys
export type DimensionKey = keyof typeof DIMENSIONS;
export type PanelKey = keyof typeof PANEL_DIMENSIONS;

// Helper functions
export const getDimensions = (key: DimensionKey) => DIMENSIONS[key];
export const getPanelDimensions = (key: PanelKey) => PANEL_DIMENSIONS[key];
