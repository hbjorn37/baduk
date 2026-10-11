export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Color = typeof BLACK | typeof WHITE;
export type Cell = typeof EMPTY | Color;

/** x: 열(왼쪽에서 0), y: 행(위에서 0) */
export interface Point {
  x: number;
  y: number;
}

/** point가 null이면 패스 */
export interface Move {
  color: Color;
  point: Point | null;
}

export function opponent(color: Color): Color {
  return color === BLACK ? WHITE : BLACK;
}
