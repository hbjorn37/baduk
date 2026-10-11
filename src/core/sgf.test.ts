import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { decodePoint, encodePoint, parseSgf, serializeSgf } from './sgf';
import { BLACK, WHITE } from './types';

describe('sgf', () => {
  it('좌표를 변환한다', () => {
    expect(decodePoint('cd', 19)).toEqual({ x: 2, y: 3 });
    expect(decodePoint('', 19)).toBeNull();
    expect(decodePoint('tt', 19)).toBeNull(); // 19로 보드의 tt는 패스
    expect(encodePoint({ x: 2, y: 3 })).toBe('cd');
    expect(encodePoint(null)).toBe('');
  });

  it('메타데이터, 접바둑 배치, 수순을 읽는다', () => {
    const g = parseSgf('(;GM[1]FF[4]SZ[9]KM[5.5]PB[흑\\]이름]PW[백]AB[cc][gg]\n;W[dd];B[ee];W[])');
    expect(g.size).toBe(9);
    expect(g.komi).toBe(5.5);
    expect(g.info.PB).toBe('흑]이름');
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

  it('변화도가 있으면 각 분기의 첫 번째 라인을 따른다', () => {
    const g = parseSgf('(;SZ[9];B[aa](;W[bb];B[cc])(;W[dd]))');
    expect(g.moves.map((m) => m.point)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('SZ가 없으면 19, 점 범위(AB[aa:bb])를 펼친다', () => {
    const g = parseSgf('(;AB[aa:bb])');
    expect(g.size).toBe(19);
    expect(g.setup.black.length).toBe(4);
  });

  it('잘못된 입력은 오류를 던진다', () => {
    expect(() => parseSgf('hello')).toThrow();
    expect(() => parseSgf('(;SZ[9];B[aa')).toThrow();
    expect(() => parseSgf('(;SZ[1])')).toThrow();
  });

  it('직렬화 후 다시 읽으면 같다', () => {
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
