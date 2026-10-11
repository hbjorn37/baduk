import { describe, expect, it } from 'vitest';
import { Board } from './board';
import { Game } from './game';
import { play } from './rules';
import { scoreArea } from './score';
import { BLACK, EMPTY, WHITE, type Color, type Point } from './types';

/** 'X'=흑, 'O'=백, '.'=빈 칸 문자열로 보드를 만든다. */
function boardOf(rows: string[]): Board {
  if (rows.some((r) => r.length !== rows.length)) throw new Error('정방형 보드가 아닙니다');
  const changes: [Point, typeof BLACK | typeof WHITE][] = [];
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'X') changes.push([{ x, y }, BLACK]);
      if (ch === 'O') changes.push([{ x, y }, WHITE]);
    }),
  );
  return Board.empty(rows.length).with(changes);
}

const at = (x: number, y: number): Point => ({ x, y });

describe('play', () => {
  it('빈 칸에 둘 수 있다', () => {
    const r = play(Board.empty(9), at(4, 4), BLACK);
    expect(r.ok && r.board.get(at(4, 4))).toBe(BLACK);
  });

  it('보드 밖과 이미 돌이 있는 칸은 거부한다', () => {
    const b = boardOf(['X..', '...', '...']);
    expect(play(b, at(3, 0), BLACK)).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(play(b, at(0, 0), WHITE)).toEqual({ ok: false, reason: 'occupied' });
  });

  it('활로가 없는 상대 돌을 따낸다 (귀)', () => {
    const b = boardOf(['O.', 'X.']);
    const r = play(b, at(1, 0), BLACK);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.captured).toEqual([at(0, 0)]);
      expect(r.board.get(at(0, 0))).toBe(EMPTY);
    }
  });

  it('여러 덩어리를 한 수로 동시에 따낸다', () => {
    // (2,1)에 두면 백 (1,1)과 백 (2,0)이 동시에 활로를 잃는다.
    const r = play(boardOf(['.XO', 'XO.', '.X.']), at(2, 1), BLACK);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.captured.length).toBe(2);
  });

  it('활로가 없으면 자충수로 거부한다', () => {
    const b = boardOf(['.X.', 'X.X', '.X.']);
    expect(play(b, at(1, 1), WHITE)).toEqual({ ok: false, reason: 'suicide' });
  });

  it('따내는 수는 자충이 아니다', () => {
    // 흑 (0,0)은 그 자리만으로는 활로가 없지만 백 두 점을 따내므로 합법이다.
    const r = play(boardOf(['.OX', 'OXX', 'XX.']), at(0, 0), BLACK);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.captured.length).toBe(2);
  });

  it('단순 패: 직전 국면을 되풀이하는 수는 금지', () => {
    //  .XO.
    //  XO.O   흑이 (2,1)에 두어 백 (1,1)을 따냄 -> 백이 (1,1)에 되따내면 패
    //  .XO.
    const before = boardOf(['.XO.', 'XO.O', '.XO.', '....']);
    const afterBlack = play(before, at(2, 1), BLACK, undefined);
    expect(afterBlack.ok).toBe(true);
    if (!afterBlack.ok) return;
    const retake = play(afterBlack.board, at(1, 1), WHITE, before);
    expect(retake).toEqual({ ok: false, reason: 'ko' });
    // 한 수 건너뛴 뒤에는 둘 수 있다 (previous가 달라짐)
    const other = play(afterBlack.board, at(1, 1), WHITE, afterBlack.board);
    expect(other.ok).toBe(true);
  });
});

describe('Game', () => {
  it('흑백이 번갈아 두고 따낸 돌 수를 센다', () => {
    const g = new Game({ size: 9 });
    expect(g.state.toPlay).toBe(BLACK);
    g.play(at(1, 0)); // B
    g.play(at(0, 0)); // W
    const r = g.play(at(0, 1)); // B captures (0,0)
    expect(r).toEqual({ ok: true, captured: [at(0, 0)] });
    expect(g.state.prisoners.black).toBe(1);
    expect(g.state.toPlay).toBe(WHITE);
  });

  it('무르기는 돌, 차례, 따낸 돌을 되돌린다', () => {
    const g = new Game({ size: 9 });
    g.play(at(1, 0));
    g.play(at(0, 0));
    g.play(at(0, 1));
    expect(g.undo()).toBe(true);
    expect(g.state.board.get(at(0, 0))).toBe(WHITE);
    expect(g.state.toPlay).toBe(BLACK);
    expect(g.state.prisoners.black).toBe(0);
    expect(g.moveNumber).toBe(2);
  });

  it('처음에서 무르면 false', () => {
    expect(new Game().undo()).toBe(false);
  });

  it('재생 중 새 수를 두면 이후 수순을 버린다', () => {
    const g = new Game({ size: 9 });
    g.play(at(0, 0));
    g.play(at(1, 1));
    g.play(at(2, 2));
    g.back();
    g.back();
    expect(g.canForward).toBe(true);
    g.play(at(5, 5));
    expect(g.canForward).toBe(false);
    expect(g.allMoves.length).toBe(2);
  });

  it('연속 패스 두 번이면 종료', () => {
    const g = new Game({ size: 9 });
    g.pass();
    expect(g.isOver).toBe(false);
    g.pass();
    expect(g.isOver).toBe(true);
  });

  it('접바둑은 백이 먼저 둔다', () => {
    const g = new Game({ size: 9, setup: { black: [at(2, 2), at(6, 6)] } });
    expect(g.state.toPlay).toBe(WHITE);
  });

  it('color 인자로 같은 색을 연속 착수할 수 있다 (연습 모드)', () => {
    const g = new Game({ size: 9 });
    const c: Color = BLACK;
    g.play(at(0, 0), c);
    g.play(at(1, 1), c);
    expect(g.state.board.get(at(1, 1))).toBe(BLACK);
    expect(g.state.toPlay).toBe(WHITE);
  });
});

describe('scoreArea', () => {
  it('영역과 덤을 계산한다', () => {
    const b = boardOf(['.X.O.', '.X.O.', '.X.O.', '.X.O.', '.X.O.']);
    // 흑: 돌 5 + 왼쪽 빈 5 = 10, 백: 돌 5 + 오른쪽 빈 5 = 10, 가운데 5는 공배
    expect(scoreArea(b, 0.5)).toEqual({ black: 10, white: 10.5, neutral: 5 });
  });
});
