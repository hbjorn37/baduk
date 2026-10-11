import { Board } from './board';
import { EMPTY, opponent, type Color, type Point } from './types';

export type IllegalReason = 'out-of-bounds' | 'occupied' | 'suicide' | 'ko';

export type PlayResult =
  { ok: true; board: Board; captured: Point[] } | { ok: false; reason: IllegalReason };

/**
 * 착수를 검사하고 결과 보드를 계산한다.
 *
 * @param previous 직전 수를 두기 전의 보드. 결과가 이 보드와 같으면 단순 패(ko)로 금지한다.
 */
export function play(board: Board, point: Point, color: Color, previous?: Board): PlayResult {
  if (!board.inBounds(point)) return { ok: false, reason: 'out-of-bounds' };
  if (board.get(point) !== EMPTY) return { ok: false, reason: 'occupied' };

  let next = board.with([[point, color]]);

  // 상대 덩어리 중 활로가 없어진 것을 따낸다.
  const captured: Point[] = [];
  const checked = new Set<number>();
  for (const n of next.neighbors(point)) {
    if (next.get(n) !== opponent(color) || checked.has(n.y * next.size + n.x)) continue;
    const g = next.group(n);
    for (const p of g.points) checked.add(p.y * next.size + p.x);
    if (g.liberties.length === 0) captured.push(...g.points);
  }
  if (captured.length > 0) next = next.with(captured.map((p) => [p, EMPTY]));

  // 따낸 뒤에도 자기 덩어리에 활로가 없으면 자충수.
  if (next.group(point).liberties.length === 0) return { ok: false, reason: 'suicide' };

  if (previous && next.equals(previous)) return { ok: false, reason: 'ko' };

  return { ok: true, board: next, captured };
}
