import { DroppedIcon } from '../components/layout/centerpane/types';

/**
 * Y-coordinate tolerance for considering tiles to be in the same row.
 * Tiles with Y coordinates within this threshold are grouped together.
 *
 * Value chosen based on typical tile height (~128px), allowing for
 * slight vertical misalignment while maintaining row integrity.
 */
export const ROW_TOLERANCE = 64;

/**
 * Sorts tiles spatially from top-left to bottom-right, like reading a book.
 *
 * Algorithm:
 * 1. Sort tiles by Y coordinate (top to bottom)
 * 2. Group consecutive tiles into rows based on Y-coordinate similarity
 * 3. Within each row, sort tiles left-to-right by X coordinate
 * 4. Flatten rows into final navigation order
 *
 * @param tiles - Array of tiles to sort
 * @returns Sorted array in reading order (top-left to bottom-right)
 *
 * @example
 * // Tiles arranged like:
 * //   A  B
 * //   C  D
 * // Returns: [A, B, C, D]
 */
export function sortTilesSpatially(tiles: DroppedIcon[]): DroppedIcon[] {
  // Handle edge cases
  if (tiles.length <= 1) {
    return tiles;
  }

  // Step 1: Sort all tiles by Y (top to bottom), then by X (left to right) as tiebreaker
  const sortedByY = tiles.slice().sort((a, b) => {
    const yDiff = a.y - b.y;
    // If Y coordinates are essentially the same, use X as tiebreaker
    if (Math.abs(yDiff) < 0.01) {
      return a.x - b.x;
    }
    return yDiff;
  });

  // Step 2: Group tiles into rows based on Y-coordinate proximity
  const rows: DroppedIcon[][] = [];
  let currentRow: DroppedIcon[] = [];
  let currentRowY: number | null = null;

  for (const tile of sortedByY) {
    if (currentRowY === null) {
      // First tile - start first row
      currentRow = [tile];
      currentRowY = tile.y;
    } else if (Math.abs(tile.y - currentRowY) <= ROW_TOLERANCE) {
      // Tile is close enough vertically - add to current row
      currentRow.push(tile);
    } else {
      // Tile is too far down - start new row
      rows.push(currentRow);
      currentRow = [tile];
      currentRowY = tile.y;
    }
  }

  // Don't forget the last row
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Step 3: Sort each row by X coordinate (left to right)
  const sortedRows = rows.map(row =>
    row.slice().sort((a, b) => a.x - b.x)
  );

  // Step 4: Flatten rows into final sorted array
  return sortedRows.flat();
}
