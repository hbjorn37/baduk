import type { Board } from './board';
import { BLACK, EMPTY, WHITE } from './types';

export interface Score {
  black: number;
  white: number;
  /** Empty points that belong to neither side (dame) */
  neutral: number;
}

/**
 * Area scoring (Chinese rules): a side's stones plus the empty regions bordered only by its color.
 * Dead stones are not detected, so remove them from the board before calling.
 */
export function scoreArea(board: Board, komi = 0): Score {
  let black = 0;
  let white = komi;
  let neutral = 0;
  const seen = new Set<number>();

  for (const p of board.points()) {
    const cell = board.get(p);
    if (cell === BLACK) black += 1;
    else if (cell === WHITE) white += 1;
    else if (!seen.has(p.y * board.size + p.x)) {
      const { points } = board.group(p);
      const borders = new Set<number>();
      for (const q of points) {
        seen.add(q.y * board.size + q.x);
        for (const n of board.neighbors(q)) {
          const c = board.get(n);
          if (c !== EMPTY) borders.add(c);
        }
      }
      if (borders.size === 1 && borders.has(BLACK)) black += points.length;
      else if (borders.size === 1 && borders.has(WHITE)) white += points.length;
      else neutral += points.length;
    }
  }
  return { black, white, neutral };
}
