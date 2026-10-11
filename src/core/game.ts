import { Board } from './board';
import { play, type IllegalReason } from './rules';
import { BLACK, WHITE, opponent, type Color, type Move, type Point } from './types';

export interface GameState {
  board: Board;
  /** 이 상태에서 둘 차례 */
  toPlay: Color;
  /** 이 상태에 이르게 한 수. 초기 상태는 null */
  move: Move | null;
  /** 직전 수로 따낸 돌 */
  captured: Point[];
  /** 지금까지 따낸 돌 수(색 = 따낸 쪽) */
  prisoners: { black: number; white: number };
}

export interface GameOptions {
  size?: number;
  komi?: number;
  /** 접바둑 등 초기 배치 돌 */
  setup?: { black?: Point[]; white?: Point[] };
  firstColor?: Color;
}

export type MoveResult = { ok: true; captured: Point[] } | { ok: false; reason: IllegalReason };

/**
 * 수순을 관리하는 대국. states[0]이 초기 상태이고 cursor가 현재 보고 있는 수순이다.
 * 기보 재생을 위해 cursor를 앞뒤로 움직일 수 있고, 중간에서 새 수를 두면 그 뒤는 버려진다.
 */
export class Game {
  readonly size: number;
  readonly setup: { black: Point[]; white: Point[] };
  komi: number;
  private states: GameState[];
  private cursor = 0;

  constructor({ size = 19, komi = 6.5, setup = {}, firstColor }: GameOptions = {}) {
    this.size = size;
    this.komi = komi;
    const black = setup.black ?? [];
    const white = setup.white ?? [];
    this.setup = { black, white };
    const board = Board.empty(size).with([
      ...black.map((p): [Point, typeof BLACK] => [p, BLACK]),
      ...white.map((p): [Point, typeof WHITE] => [p, WHITE]),
    ]);
    // 접바둑이면 백이 먼저 둔다.
    const toPlay = firstColor ?? (black.length > 0 && white.length === 0 ? WHITE : BLACK);
    this.states = [{ board, toPlay, move: null, captured: [], prisoners: { black: 0, white: 0 } }];
  }

  get state(): GameState {
    return this.states[this.cursor] as GameState;
  }

  /** 현재 화면의 수 번호(0 = 시작 국면) */
  get moveNumber(): number {
    return this.cursor;
  }

  get canBack(): boolean {
    return this.cursor > 0;
  }

  get canForward(): boolean {
    return this.cursor < this.states.length - 1;
  }

  /** 처음부터 현재 cursor까지의 수 */
  get moves(): Move[] {
    return this.states.slice(1, this.cursor + 1).map((s) => s.move as Move);
  }

  /** 전체 수순(cursor 뒤 포함) */
  get allMoves(): Move[] {
    return this.states.slice(1).map((s) => s.move as Move);
  }

  get isOver(): boolean {
    const m = this.moves;
    const last = m[m.length - 1];
    const prev = m[m.length - 2];
    return !!last && !!prev && last.point === null && prev.point === null;
  }

  /** color를 생략하면 현재 차례의 색으로 둔다. */
  play(point: Point, color: Color = this.state.toPlay): MoveResult {
    const current = this.state;
    const previous =
      this.cursor > 0 ? (this.states[this.cursor - 1] as GameState).board : undefined;
    const result = play(current.board, point, color, previous);
    if (!result.ok) return result;

    const prisoners = { ...current.prisoners };
    if (color === BLACK) prisoners.black += result.captured.length;
    else prisoners.white += result.captured.length;

    this.push({
      board: result.board,
      toPlay: opponent(color),
      move: { color, point },
      captured: result.captured,
      prisoners,
    });
    return { ok: true, captured: result.captured };
  }

  pass(color: Color = this.state.toPlay): void {
    const current = this.state;
    this.push({
      board: current.board,
      toPlay: opponent(color),
      move: { color, point: null },
      captured: [],
      prisoners: { ...current.prisoners },
    });
  }

  /** 마지막 수를 무른다. 재생 중이어도 현재 cursor 이후는 함께 버린다. */
  undo(): boolean {
    if (this.cursor === 0) return false;
    this.cursor -= 1;
    this.states.length = this.cursor + 1;
    return true;
  }

  back(): boolean {
    if (!this.canBack) return false;
    this.cursor -= 1;
    return true;
  }

  forward(): boolean {
    if (!this.canForward) return false;
    this.cursor += 1;
    return true;
  }

  first(): void {
    this.cursor = 0;
  }

  last(): void {
    this.cursor = this.states.length - 1;
  }

  private push(state: GameState): void {
    this.states.length = this.cursor + 1;
    this.states.push(state);
    this.cursor += 1;
  }
}
