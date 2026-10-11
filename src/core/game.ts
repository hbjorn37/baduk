import { Board } from './board';
import { play, type IllegalReason } from './rules';
import { BLACK, WHITE, opponent, type Color, type Move, type MoveNode, type Point } from './types';

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

interface GameNode {
  state: GameState;
  parent: GameNode | null;
  children: GameNode[];
  /** Index of the child that "forward" follows; it also defines the line shown in the move list */
  selected: number;
  comment: string;
}

/** One move of the line currently shown in the move list */
export interface LineEntry {
  move: Move;
  /** How many alternatives exist at this move, including itself */
  variations: number;
  hasComment: boolean;
}

/**
 * A game record: a tree of positions with a cursor. The cursor can move back and forth for
 * record playback. Playing a move that differs from the recorded continuation starts a new
 * variation instead of discarding the old one. The "line" is the path from the start to the
 * cursor, continued along the most recently visited child of each node.
 */
export class Game {
  readonly size: number;
  readonly setup: { black: Point[]; white: Point[] };
  komi: number;
  private readonly root: GameNode;
  private current: GameNode;

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
    this.root = {
      state: { board, toPlay, move: null, captured: [], prisoners: { black: 0, white: 0 } },
      parent: null,
      children: [],
      selected: 0,
      comment: '',
    };
    this.current = this.root;
  }

  get state(): GameState {
    return this.current.state;
  }

  /** Nodes from the start to the cursor, inclusive */
  private get path(): GameNode[] {
    const nodes: GameNode[] = [];
    for (let n: GameNode | null = this.current; n; n = n.parent) nodes.push(n);
    return nodes.reverse();
  }

  /** The path to the cursor, continued to the end of the recorded line */
  private get lineNodes(): GameNode[] {
    const nodes = this.path;
    for (let n = this.current; n.children.length > 0;) {
      n = n.children[n.selected] as GameNode;
      nodes.push(n);
    }
    return nodes;
  }

  /** Move number currently shown (0 = starting position) */
  get moveNumber(): number {
    return this.path.length - 1;
  }

  /** Number of moves in the whole line, including moves after the cursor. */
  get totalMoves(): number {
    return this.lineNodes.length - 1;
  }

  get canBack(): boolean {
    return this.current.parent !== null;
  }

  get canForward(): boolean {
    return this.current.children.length > 0;
  }

  /** Moves from the start up to the current cursor */
  get moves(): Move[] {
    return this.path.slice(1).map((n) => n.state.move as Move);
  }

  /** The full move sequence of the line, including moves after the cursor */
  get allMoves(): Move[] {
    return this.lineNodes.slice(1).map((n) => n.state.move as Move);
  }

  /** The moves of the line with variation and comment markers, for the move list */
  get line(): LineEntry[] {
    return this.lineNodes.slice(1).map((n) => ({
      move: n.state.move as Move,
      variations: (n.parent as GameNode).children.length,
      hasComment: n.comment !== '',
    }));
  }

  /** The continuations available after the cursor, and which one is followed */
  get nextChoices(): { moves: Move[]; index: number } {
    return {
      moves: this.current.children.map((n) => n.state.move as Move),
      index: this.current.selected,
    };
  }

  /** The alternatives to the move at the cursor (including itself), and which one is shown */
  get alternatives(): { moves: Move[]; index: number } {
    const parent = this.current.parent;
    if (!parent) return { moves: [], index: 0 };
    return {
      moves: parent.children.map((n) => n.state.move as Move),
      index: parent.children.indexOf(this.current),
    };
  }

  /** The comment at the cursor (the starting position can have one too) */
  get comment(): string {
    return this.current.comment;
  }

  set comment(text: string) {
    this.current.comment = text;
  }

  get isOver(): boolean {
    const m = this.moves;
    const last = m[m.length - 1];
    const prev = m[m.length - 2];
    return !!last && !!prev && last.point === null && prev.point === null;
  }

  /** Plays with the current turn's color when color is omitted. */
  play(point: Point, color: Color = this.state.toPlay): MoveResult {
    const existing = this.findChild(color, point);
    if (existing) {
      this.moveTo(existing);
      return { ok: true, captured: existing.state.captured };
    }
    const current = this.current;
    const previous = current.parent?.state.board;
    const result = play(current.state.board, point, color, previous);
    if (!result.ok) return result;

    const prisoners = { ...current.state.prisoners };
    if (color === BLACK) prisoners.black += result.captured.length;
    else prisoners.white += result.captured.length;

    this.append({
      board: result.board,
      toPlay: opponent(color),
      move: { color, point },
      captured: result.captured,
      prisoners,
    });
    return { ok: true, captured: result.captured };
  }

  pass(color: Color = this.state.toPlay): void {
    const existing = this.findChild(color, null);
    if (existing) {
      this.moveTo(existing);
      return;
    }
    const current = this.state;
    this.append({
      board: current.board,
      toPlay: opponent(color),
      move: { color, point: null },
      captured: [],
      prisoners: { ...current.prisoners },
    });
  }

  /** Takes back the move at the cursor, together with any variations that followed it. */
  undo(): boolean {
    const node = this.current;
    const parent = node.parent;
    if (!parent) return false;
    const i = parent.children.indexOf(node);
    parent.children.splice(i, 1);
    parent.selected = Math.max(0, Math.min(parent.selected, parent.children.length - 1));
    this.current = parent;
    return true;
  }

  back(): boolean {
    if (!this.current.parent) return false;
    this.current = this.current.parent;
    return true;
  }

  forward(): boolean {
    const next = this.current.children[this.current.selected];
    if (!next) return false;
    this.current = next;
    return true;
  }

  /** Follows the i-th continuation after the cursor. */
  selectNext(i: number): boolean {
    const next = this.current.children[i];
    if (!next) return false;
    this.moveTo(next);
    return true;
  }

  /** Switches to the i-th alternative to the move at the cursor. */
  selectAlternative(i: number): boolean {
    const next = this.current.parent?.children[i];
    if (!next) return false;
    this.moveTo(next);
    return true;
  }

  /** Moves the cursor to move number n of the current line, clamped to the valid range. */
  goTo(n: number): void {
    const nodes = this.lineNodes;
    this.moveTo(nodes[Math.max(0, Math.min(nodes.length - 1, Math.trunc(n)))] as GameNode);
  }

  first(): void {
    this.current = this.root;
  }

  last(): void {
    this.goTo(Number.MAX_SAFE_INTEGER);
  }

  /** Makes the first variation of every node the followed one and returns to the start. */
  resetToMainLine(): void {
    const stack = [this.root];
    for (let n = stack.pop(); n; n = stack.pop()) {
      n.selected = 0;
      stack.push(...n.children);
    }
    this.current = this.root;
  }

  /** Exports the whole record tree. */
  toTree(): MoveNode {
    const make = (n: GameNode): MoveNode => ({
      move: n.state.move,
      comment: n.comment,
      children: [],
    });
    const root = make(this.root);
    const stack: [GameNode, MoveNode][] = [[this.root, root]];
    for (let item = stack.pop(); item; item = stack.pop()) {
      const [node, out] = item;
      for (const child of node.children) {
        const copy = make(child);
        out.children.push(copy);
        stack.push([child, copy]);
      }
    }
    return root;
  }

  private findChild(color: Color, point: Point | null): GameNode | undefined {
    return this.current.children.find((n) => {
      const m = n.state.move as Move;
      return (
        m.color === color &&
        (point === null ? m.point === null : m.point?.x === point.x && m.point.y === point.y)
      );
    });
  }

  /** Moves the cursor to a node and remembers the way there, so the line stays consistent. */
  private moveTo(node: GameNode): void {
    for (let n: GameNode = node; n.parent; n = n.parent) {
      n.parent.selected = n.parent.children.indexOf(n);
    }
    this.current = node;
  }

  private append(state: GameState): void {
    const node: GameNode = {
      state,
      parent: this.current,
      children: [],
      selected: 0,
      comment: '',
    };
    this.current.children.push(node);
    this.moveTo(node);
  }
}
