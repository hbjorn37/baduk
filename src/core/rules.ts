import { Board } from './board';
import { EMPTY, opponent, type Color, type Point } from './types';

export type IllegalReason = 'out-of-bounds' | 'occupied' | 'suicide' | 'ko';

export type PlayResult =
  { ok: true; board: Board; captured: Point[] } | { ok: false; reason: IllegalReason };

/**
 * Validates a move and computes the resulting board.
 *
 * @param previous Board before the previous move. A result equal to it is rejected as a simple ko.
 */
export function play(board: Board, point: Point, color: Color, previous?: Board): PlayResult {
  if (!board.inBounds(point)) return { ok: false, reason: 'out-of-bounds' };
  if (board.get(point) !== EMPTY) return { ok: false, reason: 'occupied' };

  let next = board.with([[point, color]]);

  // Capture opponent groups that have lost their last liberty.
  const captured: Point[] = [];
  const checked = new Set<number>();
  for (const n of next.neighbors(point)) {
    if (next.get(n) !== opponent(color) || checked.has(n.y * next.size + n.x)) continue;
    const g = next.group(n);
    for (const p of g.points) checked.add(p.y * next.size + p.x);
    if (g.liberties.length === 0) captured.push(...g.points);
  }
  if (captured.length > 0) next = next.with(captured.map((p) => [p, EMPTY]));

  // If our own group still has no liberty after captures, the move is suicide.
  if (next.group(point).liberties.length === 0) return { ok: false, reason: 'suicide' };

  if (previous && next.equals(previous)) return { ok: false, reason: 'ko' };

  return { ok: true, board: next, captured };
}
