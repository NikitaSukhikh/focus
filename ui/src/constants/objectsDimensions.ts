// Dimensions for content objects (tiles, embeds, icons, inline editor)
// Pane/layout dimensions are in panesDimensions.ts
// Typography (font sizes, weights) are in styles/typographics.ts

// ============================================
// Tile Dimensions
// ============================================
export const TILE = {
  hoverSafePadding: 12,
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
  width: TEXT_TILE.maxWidth,
  padding: { x: 8, y: 6 },
  borderRadius: 8,
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
  gmail: 56,
};

