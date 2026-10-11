import { Board } from './board';
import { play, type IllegalReason } from './rules';
import { BLACK, WHITE, opponent, type Color, type Move, type Point } from './types';

export interface GameState {
  board: Board;
  /** Color to play in this state */
  toPlay: Color;
  /** The move that led to this state; null for the initial state */
  move: Move | null;
  /** Stones captured by the previous move */
  captured: Point[];
  /** Prisoners taken so far (keyed by the capturing color) */
  prisoners: { black: number; white: number };
}

export interface GameOptions {
  size?: number;
  komi?: number;
  /** Initial stones, e.g. for handicap games */
  setup?: { black?: Point[]; white?: Point[] };
  firstColor?: Color;
}

export type MoveResult = { ok: true; captured: Point[] } | { ok: false; reason: IllegalReason };

/**
 * A game that manages the move sequence. states[0] is the initial state and cursor is the
 * position currently shown. The cursor can move back and forth for record playback;
 * playing a new move from the middle discards everything after it.
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
    // In a handicap game White plays first.
    const toPlay = firstColor ?? (black.length > 0 && white.length === 0 ? WHITE : BLACK);
    this.states = [{ board, toPlay, move: null, captured: [], prisoners: { black: 0, white: 0 } }];
  }

  get state(): GameState {
    return this.states[this.cursor] as GameState;
  }

  /** Move number currently shown (0 = starting position) */
  get moveNumber(): number {
    return this.cursor;
  }

  /** Number of moves in the whole record, including moves after the cursor. */
  get totalMoves(): number {
    return this.states.length - 1;
  }

  get canBack(): boolean {
    return this.cursor > 0;
  }

  get canForward(): boolean {
    return this.cursor < this.states.length - 1;
  }

  /** Moves from the start up to the current cursor */
  get moves(): Move[] {
    return this.states.slice(1, this.cursor + 1).map((s) => s.move as Move);
  }

  /** The full move sequence, including moves after the cursor */
  get allMoves(): Move[] {
    return this.states.slice(1).map((s) => s.move as Move);
  }

  get isOver(): boolean {
    const m = this.moves;
    const last = m[m.length - 1];
    const prev = m[m.length - 2];
    return !!last && !!prev && last.point === null && prev.point === null;
  }

  /** Plays with the current turn's color when color is omitted. */
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

  /** Takes back the last move. Anything after the current cursor is discarded too. */
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

  /** Moves the cursor to move number n, clamped to the valid range. */
  goTo(n: number): void {
    this.cursor = Math.max(0, Math.min(this.states.length - 1, Math.trunc(n)));
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
