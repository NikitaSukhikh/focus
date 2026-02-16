// Dimensions for content objects (tiles, embeds, icons, inline editor)
// Pane/layout dimensions are in panesDimensions.ts
// Typography (font sizes, weights) are in styles/typographics.ts
// Tile visual styles (rings, borders) are in styles/tileStyles.ts

import { TEXT_NOTE_BOX, TILE_RING } from '@/styles/tileStyles';
export { TEXT_NOTE_BOX, TILE_RING } from '@/styles/tileStyles';

// ============================================
// Tile Dimensions
// ============================================
export const TILE = {
  // Keep enough transparent wrapper space so the ring remains fully visible around the tile.
  hoverSafePadding: Math.ceil(TILE_RING.margin + TILE_RING.strokeWidth),
  defaultFileTileSize: 128,
  thumbnail: {
    defaultSize: 96,
    maxSize: 144,
  },
};

// ============================================
// Embed Link Tiles (YouTube, etc.)
// ============================================
export const EMBED_LINK = {
  width: 360,
  height: 260,
};

// ============================================
// Non-Embed Link Tiles
// ============================================
export const NON_EMBED_LINK = {
  size: 192,
  maxWidth: 420,
};

// ============================================
// Audio Embed Tiles
// ============================================
export const AUDIO_EMBED = {
  width: 360,
  height: 210,
};

// ============================================
// Video Embed Tiles
// ============================================
export const VIDEO_EMBED = {
  width: 360,
  height: 260,
};

// ============================================
// Text/Note Tiles
// ============================================
export const TEXT_TILE = {
  maxHeight: 200,
  maxWidth: 600,
  charLimit: 80, // Characters per line for text wrapping
};

// ============================================
// Inline Text Editor
// ============================================
export const INLINE_EDITOR = {
  maxWidth: TEXT_TILE.maxWidth,
  minWidth: '10ch',
  padding: TEXT_NOTE_BOX.padding,
  borderRadius: TEXT_NOTE_BOX.borderRadius,
};

// ============================================
// Icon Sizes
// ============================================
export const ICON_SIZES = {
  tiny: 14,
  small: 16,
  headerButton: 18,
  navButton: 20,
  large: 28,
  tileFavicon: 18,
  tileGoogleService: 40,
};

// ============================================
// Google Integration Tiles (Gmail, Drive, etc.)
// ============================================
export const GOOGLE_INTEGRATION_TILE = {
  iconSize: ICON_SIZES.tileGoogleService,
  titleMinWidth: ICON_SIZES.tileGoogleService * 2,
  titleMaxWidth: 128,
};
