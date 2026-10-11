import type { Board } from './board';
import { BLACK, EMPTY, WHITE } from './types';

export interface Score {
  black: number;
  white: number;
  /** 어느 쪽에도 속하지 않는 빈 칸(공배) */
  neutral: number;
}

/**
 * 영역 계가(중국식): 자기 돌 + 자기 색만 접한 빈 영역.
 * 사석은 판단하지 않으므로, 죽은 돌은 호출 전에 판에서 들어내야 한다.
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
