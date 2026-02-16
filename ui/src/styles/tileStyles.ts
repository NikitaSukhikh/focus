// Visual styles for tile rings and boxes.
// Color tokens live in styles/tokens.css; dimensions live in constants/objectsDimensions.ts.

// Ring applied to all tile types.
// Uses outline (not border) so it draws outside the content bounding box.
export const TILE_RING = {
  outline: '2.5px solid var(--color-note-ring)',
  outlineOffset: 6, // px gap between content edge and ring
  borderRadius: 8,
};

// Extended box for text note tiles — adds inner padding so text has breathing room.
export const TEXT_NOTE_BOX = {
  ...TILE_RING,
  background: 'transparent',
  padding: { x: 12, y: 10 },
  boxShadow: 'none',
};
