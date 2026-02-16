/**
 * Dimension Constants
 *
 * Centralized dimension values for all UI elements in the application.
 * Includes panel sizes, component dimensions, min/max constraints, and localStorage keys.
 */

export const COMMON = {
  borderRadius: 12,
  aspectRatio16x9: '56.25%', // padding-top for 16:9 aspect ratio
};

export const TOP_BAR = {
  height: 40, // h-10
  layout: {
    paddingX: 16,
    leftSectionGap: 12,
    leftGroupGap: 8,
    leftGroupMarginRight: 8,
    rightSectionGap: 8,
    windowControlsMarginRight: -8,
  },
  title: {
    maxWidth: 448,
    leftOffset: -80,
  },
  logo: {
    size: 18,
    marginLeft: -10,
  },
  appName: {
    fontSize: 13,
  },
  icons: {
    primary: 20,
    secondary: 18,
    small: 16,
    tiny: 14,
  },
  button: {
    padding: 8,
  },
  quickAddButton: {
    marginLeft: 8,
    padding: 6,
  },
  sidebarToggle: {
    marginLeft: -16,
  },
  zoomControl: {
    containerPaddingX: 4,
    containerPaddingY: 2,
    buttonPaddingX: 10,
    buttonPaddingY: 4,
    buttonTranslateX: 6,
    valuePaddingX: 6,
    valueMinWidth: 48,
  },
  // Hidden for current version
  search: {
    inputWidth: 256,
    inputPaddingY: 6,
    inputPaddingLeft: 36,
    inputPaddingRight: 12,
    inputBorderRadius: 8,
    inputBorderWidth: 1,
    iconSize: 16,
    iconPaddingLeft: 12,
    focusShadowBlur: 10,
  },
  // Hidden for current version
  tags: {
    buttonPaddingX: 12,
    buttonPaddingY: 6,
    buttonGap: 8,
    buttonBorderWidth: 1,
    buttonActiveShadowBlur: 10,
    iconSize: 18,
    menuWidth: 176,
    menuOffsetY: 8,
    menuBorderWidth: 1,
    menuPaddingY: 4,
    menuItemPaddingX: 12,
    menuItemPaddingY: 8,
    menuItemGap: 12,
    menuIconBox: 24,
    menuIconRadius: 6,
    menuIconSize: 16,
    menuIconBorderWidth: 1,
  },
  themeToggle: {
    gap: 2,
  },
};

export const LEFT_SIDEBAR = {
  // Width is controlled by resizer, these are constraints
  minWidth: 200,
  maxWidth: 400,
  defaultWidth: 260,
};

export const CENTER_PANE = {
  marginTop: 16,
};

export const PREVIEW_PANE = {
  header: {
    paddingX: 12,
    paddingY: 8,
  },
  imageMetadata: {
    padding: 16,
    labelWidth: 96,
  },
  videoDescription: {
    maxHeight: 200,
  },
};

export const FULL_WINDOW_PREVIEW = {
  margin: {
    top: 32,
    left: 32,
    right: 32,
    bottom: 44,
  },
  borderRadius: 12,
  header: {
    paddingX: 16,
    paddingY: 8,
    titleFontSize: 14,
    metadataMaxWidth: 400,
  },
  navButton: {
    size: 48,
    offset: 16,
  },
  video: {
    maxWidth: 1400,
  },
};

export const TEXT_PREVIEW = {
  title: {
    fontSize: 28,
    fontSizeFullWindow: 36,
  },
};

export const GMAIL_PREVIEW = {
  iconSize: 56,
};

export const DIMENSIONS = {
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

