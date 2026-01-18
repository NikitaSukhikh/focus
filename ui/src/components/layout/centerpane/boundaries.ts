/**
 * Boundary calculations for the center pane
 * These values control how close tiles can be placed to the edges
 */

export const BOUNDARY_CONSTRAINTS = {
  minX: 60,    // Left edge minimum distance
  maxXOffset: 30,  // Right edge offset from pane width
  minY: 40,    // Top edge minimum distance
  bottomBuffer: 200,  // Extra space to add below the bottommost tile
} as const;

/**
 * Clamps a position to stay within the pane boundaries (horizontal only)
 * Vertical position is not clamped to allow infinite scrolling
 * @param x - Target x position
 * @param y - Target y position
 * @param paneWidth - Current pane width
 * @returns Clamped position {x, y}
 */
export function clampToBoundaries(
  x: number,
  y: number,
  paneWidth: number
): { x: number; y: number } {
  const minX = BOUNDARY_CONSTRAINTS.minX;
  const maxX = paneWidth - BOUNDARY_CONSTRAINTS.maxXOffset;
  const minY = BOUNDARY_CONSTRAINTS.minY;

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, y)  // Only enforce minimum Y, no maximum for infinite scroll
  };
}

/**
 * Clamps a position to stay within the pane boundaries with extra padding.
 * @param x - Target x position
 * @param y - Target y position
 * @param paneWidth - Current pane width
 * @param paddingX - Additional horizontal padding from edges
 * @param paddingY - Additional vertical padding from top edge
 * @returns Clamped position {x, y}
 */
export function clampToBoundariesWithPadding(
  x: number,
  y: number,
  paneWidth: number,
  paddingX: number = 0,
  paddingY: number = 0
): { x: number; y: number } {
  const safePaddingX = Math.max(0, paddingX);
  const safePaddingY = Math.max(0, paddingY);
  const minX = BOUNDARY_CONSTRAINTS.minX + safePaddingX;
  const maxX = paneWidth - BOUNDARY_CONSTRAINTS.maxXOffset - safePaddingX;
  const minY = BOUNDARY_CONSTRAINTS.minY + safePaddingY;
  const clampedMaxX = Math.max(minX, maxX);

  return {
    x: Math.max(minX, Math.min(clampedMaxX, x)),
    y: Math.max(minY, y)  // Only enforce minimum Y, no maximum for infinite scroll
  };
}

/**
 * Calculates the required content height based on the bottommost tile
 * @param tiles - Array of tiles with x, y positions
 * @param viewportHeight - Current viewport height
 * @returns Minimum content height to accommodate all tiles plus buffer
 */
export function calculateContentHeight(
  tiles: Array<{ x: number; y: number }>,
  viewportHeight: number
): number {
  if (tiles.length === 0) {
    return viewportHeight;
  }

  // Find the bottommost tile
  const maxY = Math.max(...tiles.map(tile => tile.y));

  // Add buffer space below the bottommost tile
  const minContentHeight = maxY + BOUNDARY_CONSTRAINTS.bottomBuffer;

  // Ensure content is at least as tall as the viewport
  return Math.max(minContentHeight, viewportHeight);
}
