/**
 * Z-Index Constants
 *
 * Centralized z-index values for consistent layering across the application.
 * Values are organized by layer groups to maintain proper stacking context.
 *
 * Layer hierarchy (from bottom to top):
 * - BASE: Default page content
 * - CONTENT: Main content elements
 * - DROPDOWN: Dropdown menus and popovers
 * - SIDEBAR: Fixed sidebars and navigation
 * - OVERLAY: Modal overlays and backdrops
 * - MODAL: Modal dialogs and popups
 * - CONTEXT_MENU: Context menus (above modals)
 */

export const Z_INDEX = {
  // Base layer - default content
  BASE: 0,
  BASE_RAISED: 10,

  // Content layer - icons, tiles, interactive elements
  CONTENT_DEFAULT: 10,
  CONTENT_SELECTED: 20,
  CONTENT_DRAGGING: 30,
  CONTENT_PREVIEW: 20,
  CONTENT_PREVIEW_EMPTY: 30,

  // Dropdown layer - dropdowns and popovers
  DROPDOWN_BACKDROP: 500,
  DROPDOWN_MENU: 600,
  RESIZE_HANDLE: 40,

  // Sidebar layer - fixed navigation
  TOPBAR: 100,
  SIDEBAR: 110,

  // Overlay layer - modal backdrops
  OVERLAY_BACKDROP: 1000,
  OVERLAY_DIALOG: 1100,

  // Modal layer - dialogs and popups
  MODAL_BACKDROP: 1200,
  MODAL_DIALOG: 1300,
  MODAL: 1300,

  // Context menu layer - context menus
  CONTEXT_MENU_BACKDROP: 1400,
  CONTEXT_MENU: 1500,

  // Assistant pane - above everything
  ASSISTANT_PANE: 2000,
} as const;

// Type for z-index keys
export type ZIndexKey = keyof typeof Z_INDEX;

// Helper function to get z-index value
export const getZIndex = (key: ZIndexKey): number => Z_INDEX[key];
