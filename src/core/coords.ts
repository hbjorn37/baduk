import type { Point } from './types';

/** Column letters used on Go boards; by convention 'I' is skipped. */
export const COLUMN_LABELS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

/** Formats a point the way it is printed on the board, e.g. "D4" (row 1 is the bottom row). */
export function formatPoint(p: Point, size: number): string {
  return `${COLUMN_LABELS[p.x] ?? '?'}${size - p.y}`;
}
