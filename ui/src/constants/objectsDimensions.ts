// Dimensions for content objects (tiles, embeds, icons, inline editor)
// Pane/layout dimensions are in panesDimensions.ts
// Typography (font sizes, weights) are in styles/typographics.ts
// Tile visual styles (rings, borders) are in styles/tileStyles.ts

import { TEXT_NOTE_BOX, TILE_RING } from '@/styles/tileStyles';
export { TEXT_NOTE_BOX, TILE_RING } from '@/styles/tileStyles';

export const DEFAULT_TILE_SIZES = {
  file: {
    width: 180,
    height: 100,
  },
  image: 220,
  linkGhost: {
    width: 360,
    height: 240,
  },
} as const;

// ============================================
// Tile Dimensions
// ============================================
export const TILE = {
  // Keep enough transparent wrapper space so the ring remains fully visible around the tile.
  hoverSafePadding: Math.ceil(TILE_RING.margin + TILE_RING.strokeWidth),
  defaultFileTileSize: DEFAULT_TILE_SIZES.file.width,
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
  width: 240,
  height: 130,
  maxWidth: 420,
  descriptionMaxWidth: 220,
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
// Web Article Embed Tiles
// ============================================
export const WEB_ARTICLE_EMBED = {
  width: 600,
  height: 640,
};

// ============================================
// Text/Note Tiles
// ============================================
export const TEXT_TILE = {
  maxHeight: 220,
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
