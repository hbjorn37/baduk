import { describe, expect, it } from 'vitest';
import { SgfError } from './errors';
import { Game } from './game';
import { gameFromSgf } from './record';
import { decodePoint, encodePoint, parseSgf, serializeSgf } from './sgf';
import { BLACK, WHITE } from './types';

describe('sgf', () => {
  it('converts coordinates', () => {
    expect(decodePoint('cd', 19)).toEqual({ x: 2, y: 3 });
    expect(decodePoint('', 19)).toBeNull();
    expect(decodePoint('tt', 19)).toBeNull(); // 'tt' on a 19x19 board is a pass
    expect(encodePoint({ x: 2, y: 3 })).toBe('cd');
    expect(encodePoint(null)).toBe('');
  });

  it('reads metadata, handicap setup and moves', () => {
    const g = parseSgf(
      '(;GM[1]FF[4]SZ[9]KM[5.5]PB[Black\\]Name]PW[White]AB[cc][gg]\n;W[dd];B[ee];W[])',
    );
    expect(g.size).toBe(9);
    expect(g.komi).toBe(5.5);
    expect(g.info.PB).toBe('Black]Name');
    expect(g.setup.black).toEqual([
      { x: 2, y: 2 },
      { x: 6, y: 6 },
    ]);
    expect(g.moves).toEqual([
      { color: WHITE, point: { x: 3, y: 3 } },
      { color: BLACK, point: { x: 4, y: 4 } },
      { color: WHITE, point: null },
    ]);
  });

  it('follows the first variation at each branch', () => {
    const g = parseSgf('(;SZ[9];B[aa](;W[bb];B[cc])(;W[dd]))');
    expect(g.moves.map((m) => m.point)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('defaults to size 19 and expands point ranges (AB[aa:bb])', () => {
    const g = parseSgf('(;AB[aa:bb])');
    expect(g.size).toBe(19);
    expect(g.setup.black.length).toBe(4);
  });

  it('throws on invalid input', () => {
    expect(() => parseSgf('hello')).toThrow();
    expect(() => parseSgf('(;SZ[9];B[aa')).toThrow();
    expect(() => parseSgf('(;SZ[1])')).toThrow();
  });

  it('reports a machine-readable error code for the UI to translate', () => {
    const code = (fn: () => unknown): string | undefined => {
      try {
        fn();
      } catch (e) {
        return e instanceof SgfError ? e.code : undefined;
      }
      return undefined;
    };
    expect(code(() => parseSgf('hello'))).toBe('not-sgf');
    expect(code(() => parseSgf('(;SZ[9];B[aa'))).toBe('unterminated-value');
    expect(code(() => parseSgf('(;SZ[9];B[aa]'))).toBe('unterminated-variation');
    expect(code(() => parseSgf('(;SZ[1])'))).toBe('unsupported-size');
    expect(code(() => gameFromSgf('(;SZ[9];B[aa];W[ba];B[ab];W[ab])'))).toBe('illegal-move');
  });

  it('round-trips through serialization', () => {
    const game = new Game({ size: 9, komi: 6.5 });
    game.play({ x: 2, y: 2 });
    game.play({ x: 3, y: 3 });
    game.pass();
    const sgf = {
      size: 9,
      komi: 6.5,
      info: { PB: 'a]b', PW: 'c' },
      setup: { black: [], white: [] },
      moves: game.allMoves,
    };
    expect(parseSgf(serializeSgf(sgf))).toEqual(sgf);
  });
});
