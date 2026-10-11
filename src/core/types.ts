export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export type Color = typeof BLACK | typeof WHITE;
export type Cell = typeof EMPTY | Color;

/** x: column (0 at the left), y: row (0 at the top) */
export interface Point {
  x: number;
  y: number;
}

/** A null point means a pass */
export interface Move {
  color: Color;
  point: Point | null;
}

export function opponent(color: Color): Color {
  return color === BLACK ? WHITE : BLACK;
}
