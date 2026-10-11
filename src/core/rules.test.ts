import { describe, expect, it } from 'vitest';
import { Board } from './board';
import { Game } from './game';
import { play } from './rules';
import { scoreArea } from './score';
import { BLACK, EMPTY, WHITE, type Color, type Point } from './types';

/** Builds a board from strings: 'X' = black, 'O' = white, '.' = empty. */
function boardOf(rows: string[]): Board {
  if (rows.some((r) => r.length !== rows.length)) throw new Error('Board must be square');
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
  it('allows a move on an empty point', () => {
    const r = play(Board.empty(9), at(4, 4), BLACK);
    expect(r.ok && r.board.get(at(4, 4))).toBe(BLACK);
  });

  it('rejects out-of-bounds and occupied points', () => {
    const b = boardOf(['X..', '...', '...']);
    expect(play(b, at(3, 0), BLACK)).toEqual({ ok: false, reason: 'out-of-bounds' });
    expect(play(b, at(0, 0), WHITE)).toEqual({ ok: false, reason: 'occupied' });
  });

  it('captures an opponent stone with no liberties (corner)', () => {
    const b = boardOf(['O.', 'X.']);
    const r = play(b, at(1, 0), BLACK);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.captured).toEqual([at(0, 0)]);
      expect(r.board.get(at(0, 0))).toBe(EMPTY);
    }
  });

  it('captures several groups with one move', () => {
    // Playing (2,1) removes the last liberty of both White (1,1) and White (2,0).
    const r = play(boardOf(['.XO', 'XO.', '.X.']), at(2, 1), BLACK);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.captured.length).toBe(2);
  });

  it('rejects suicide', () => {
    const b = boardOf(['.X.', 'X.X', '.X.']);
    expect(play(b, at(1, 1), WHITE)).toEqual({ ok: false, reason: 'suicide' });
  });

  it('does not treat a capturing move as suicide', () => {
    // Black (0,0) has no liberty on its own, but it captures two White stones, so it is legal.
    const r = play(boardOf(['.OX', 'OXX', 'XX.']), at(0, 0), BLACK);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.captured.length).toBe(2);
  });

  it('simple ko: forbids repeating the previous position', () => {
    //  .XO.
    //  XO.O   Black plays (2,1) capturing White (1,1) -> White retaking at (1,1) is ko
    //  .XO.
    const before = boardOf(['.XO.', 'XO.O', '.XO.', '....']);
    const afterBlack = play(before, at(2, 1), BLACK, undefined);
    expect(afterBlack.ok).toBe(true);
    if (!afterBlack.ok) return;
    const retake = play(afterBlack.board, at(1, 1), WHITE, before);
    expect(retake).toEqual({ ok: false, reason: 'ko' });
    // After a move elsewhere it is allowed (previous differs)
    const other = play(afterBlack.board, at(1, 1), WHITE, afterBlack.board);
    expect(other.ok).toBe(true);
  });
});

describe('Game', () => {
  it('alternates colors and counts prisoners', () => {
    const g = new Game({ size: 9 });
    expect(g.state.toPlay).toBe(BLACK);
    g.play(at(1, 0)); // B
    g.play(at(0, 0)); // W
    const r = g.play(at(0, 1)); // B captures (0,0)
    expect(r).toEqual({ ok: true, captured: [at(0, 0)] });
    expect(g.state.prisoners.black).toBe(1);
    expect(g.state.toPlay).toBe(WHITE);
  });

  it('undo restores stones, turn and prisoners', () => {
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

  it('undo at the start returns false', () => {
    expect(new Game().undo()).toBe(false);
  });

  it('playing a different move during replay starts a variation', () => {
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
    expect(g.alternatives.moves.length).toBe(2);
    expect(g.alternatives.index).toBe(1);
    // The old line is still there.
    g.selectAlternative(0);
    expect(g.allMoves.length).toBe(3);
    expect(g.moveNumber).toBe(2);
  });

  it('replaying an existing move follows it instead of adding a duplicate', () => {
    const g = new Game({ size: 9 });
    g.play(at(0, 0));
    g.play(at(1, 1));
    g.back();
    g.play(at(1, 1));
    expect(g.alternatives.moves.length).toBe(1);
    expect(g.moveNumber).toBe(2);
  });

  it('keeps the line stable while scrubbing through a variation', () => {
    const g = new Game({ size: 9 });
    g.play(at(0, 0));
    g.play(at(1, 1));
    g.back();
    g.play(at(2, 2));
    g.play(at(3, 3));
    expect(g.totalMoves).toBe(3);
    g.goTo(0);
    expect(g.totalMoves).toBe(3);
    g.goTo(3);
    expect(g.moves[1]?.point).toEqual(at(2, 2));
  });

  it('undo removes only the current variation', () => {
    const g = new Game({ size: 9 });
    g.play(at(0, 0));
    g.play(at(1, 1));
    g.back();
    g.play(at(2, 2));
    expect(g.undo()).toBe(true);
    expect(g.moveNumber).toBe(1);
    expect(g.nextChoices.moves).toEqual([{ color: WHITE, point: at(1, 1) }]);
  });

  it('stores a comment per position', () => {
    const g = new Game({ size: 9 });
    g.comment = 'start';
    g.play(at(0, 0));
    expect(g.comment).toBe('');
    g.comment = 'first';
    expect(g.line[0]?.hasComment).toBe(true);
    g.first();
    expect(g.comment).toBe('start');
  });

  it('goTo jumps within the record and clamps out-of-range values', () => {
    const g = new Game({ size: 9 });
    g.play(at(0, 0));
    g.play(at(1, 1));
    g.play(at(2, 2));
    expect(g.totalMoves).toBe(3);
    g.goTo(1);
    expect(g.moveNumber).toBe(1);
    expect(g.totalMoves).toBe(3);
    g.goTo(99);
    expect(g.moveNumber).toBe(3);
    g.goTo(-5);
    expect(g.moveNumber).toBe(0);
  });

  it('two consecutive passes end the game', () => {
    const g = new Game({ size: 9 });
    g.pass();
    expect(g.isOver).toBe(false);
    g.pass();
    expect(g.isOver).toBe(true);
  });

  it('White plays first in a handicap game', () => {
    const g = new Game({ size: 9, setup: { black: [at(2, 2), at(6, 6)] } });
    expect(g.state.toPlay).toBe(WHITE);
  });

  it('the color argument allows consecutive same-color moves (practice mode)', () => {
    const g = new Game({ size: 9 });
    const c: Color = BLACK;
    g.play(at(0, 0), c);
    g.play(at(1, 1), c);
    expect(g.state.board.get(at(1, 1))).toBe(BLACK);
    expect(g.state.toPlay).toBe(WHITE);
  });
});

describe('scoreArea', () => {
  it('computes area and komi', () => {
    const b = boardOf(['.X.O.', '.X.O.', '.X.O.', '.X.O.', '.X.O.']);
    // Black: 5 stones + 5 empty on the left = 10; White: 5 stones + 5 empty on the right = 10; the middle 5 are dame
    expect(scoreArea(b, 0.5)).toEqual({ black: 10, white: 10.5, neutral: 5 });
  });
});
