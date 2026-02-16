// Visual styles for tile rings and boxes.
// Color tokens live in styles/tokens.css; dimensions live in constants/objectsDimensions.ts.

// Per-type ring colors.
export const TILE_RING_COLORS = {
  link: '#3b82f6',   // blue-500
  text: '#a855f7',   // purple-500
  file: '#eab308',   // yellow-500
} as const;

// Ring applied to all tile types.
// Uses outline (not border) so it draws outside the content bounding box.
export const TILE_RING = {
  outline: '2.5px solid var(--color-note-ring)',
  outlineOffset: 6, // px gap between content edge and ring
  borderRadius: 8,
};

export function tileRingOutline(type: keyof typeof TILE_RING_COLORS): string {
  return `2.5px solid ${TILE_RING_COLORS[type]}`;
}

// Extended box for text note tiles — adds inner padding so text has breathing room.
export const TEXT_NOTE_BOX = {
  ...TILE_RING,
  background: 'transparent',
  padding: { x: 12, y: 10 },
  boxShadow: 'none',
};
