// Visual styles for tile rings and boxes.
// Color tokens live in styles/tokens.css; dimensions live in constants/objectsDimensions.ts.

// Per-type ring colors.
export const TILE_RING_COLORS = {
  link: '#3b82f6',   // blue-500
  text: '#a855f7',   // purple-500
  file: '#eab308',   // yellow-500
} as const;

// RGB components for each ring color — used to compose rgba() with CSS-var opacity.
const TILE_RING_RGB = {
  link: '59, 130, 246',
  text: '168, 85, 247',
  file: '234, 179, 8',
} as const;

// Ring applied to all tile types.
// Uses outline (not border) so it draws outside the content bounding box.
export const TILE_RING = {
  strokeWidth: 2.5,
  margin: 6, // px gap between content edge and ring
  borderRadius: 8,
};

export function tileRingOutline(type: keyof typeof TILE_RING_COLORS): string {
  return `${TILE_RING.strokeWidth}px solid rgba(${TILE_RING_RGB[type]}, var(--tile-ring-opacity, 0.8))`;
}

export function tileRingStyle(type: keyof typeof TILE_RING_COLORS) {
  return {
    outline: tileRingOutline(type),
    outlineOffset: `${TILE_RING.margin}px`,
    borderRadius: `${TILE_RING.borderRadius}px`,
    filter: `drop-shadow(0 0 8px rgba(${TILE_RING_RGB[type]}, var(--tile-glow-opacity, 0.8)))`,
  };
}

// Extends tile background into the gap between content edge and ring via box-shadow spread.
export function tileBackgroundFillStyle(background: string) {
  return {
    boxShadow: `0 0 0 ${TILE_RING.margin}px ${background}`,
  };
}

// Background fill used inside tile focus rings (video/embed tiles).
export const TILE_INNER_BACKGROUND = '#2d2d2d';

// Background fill for tiles — reads from the active theme via CSS variable.
export const TILE_BACKGROUND = 'var(--color-surface-tile)';

// Extended box for text note tiles — adds inner padding so text has breathing room.
export const TEXT_NOTE_BOX = {
  ...TILE_RING,
  background: TILE_BACKGROUND,
  padding: { x: 12, y: 10 },
  boxShadow: 'none',
};
