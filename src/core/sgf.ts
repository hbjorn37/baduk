import { BLACK, WHITE, type Color, type Move, type Point } from './types';

export interface SgfGame {
  size: number;
  komi: number;
  /** Named metadata such as PB, PW, RE, DT, GN */
  info: Record<string, string>;
  setup: { black: Point[]; white: Point[] };
  /** Main-line moves (variations are ignored) */
  moves: Move[];
}

type Props = Record<string, string[]>;

/** Decodes 'aa'-style coordinates. An empty string or an off-board point (e.g. 'tt' on 19x19) is a pass (null). */
export function decodePoint(value: string, size: number): Point | null {
  if (value.length !== 2) return null;
  const x = value.charCodeAt(0) - 97;
  const y = value.charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return { x, y };
}

export function encodePoint(p: Point | null): string {
  return p ? String.fromCharCode(97 + p.x, 97 + p.y) : '';
}

interface Tree {
  nodes: Props[];
  children: Tree[];
}

/** Parses an SGF string into a variation tree. */
function parseTree(text: string, start: number): { tree: Tree; end: number } {
  let i = start + 1; // just after '('
  const tree: Tree = { nodes: [], children: [] };

  const skipSpace = (): void => {
    while (i < text.length && /\s/.test(text[i] as string)) i += 1;
  };

  const readValue = (): string => {
    let out = '';
    while (i < text.length && text[i] !== ']') {
      if (text[i] === '\\' && i + 1 < text.length) {
        i += 1;
        if (text[i] === '\n') {
          i += 1; // soft line break
          continue;
        }
      }
      out += text[i];
      i += 1;
    }
    if (i >= text.length) throw new Error('Unterminated SGF property value.');
    i += 1; // ']'
    return out;
  };

  for (;;) {
    skipSpace();
    if (i >= text.length) throw new Error('Unterminated SGF variation.');
    const c = text[i];
    if (c === ')') return { tree, end: i + 1 };
    if (c === '(') {
      const child = parseTree(text, i);
      tree.children.push(child.tree);
      i = child.end;
    } else if (c === ';') {
      const props: Props = {};
      tree.nodes.push(props);
      i += 1;
      for (;;) {
        skipSpace();
        if (!/[A-Za-z]/.test(text[i] ?? '')) break;
        let name = '';
        while (i < text.length && /[A-Za-z]/.test(text[i] as string)) name += text[i++];
        name = name.replace(/[a-z]/g, ''); // strip lowercase decoration used by old SGF versions
        const values = (props[name] ??= []);
        for (;;) {
          skipSpace();
          if (text[i] !== '[') break;
          i += 1;
          values.push(readValue());
        }
      }
    } else {
      i += 1;
    }
  }
}

/** Flattens the first game's main line (the first variation at each branch) into a node list. */
function parseMainLine(text: string): Props[] {
  const open = text.indexOf('(');
  if (open < 0) throw new Error('Not an SGF file: no "(" found.');
  const nodes: Props[] = [];
  let tree: Tree | undefined = parseTree(text, open).tree;
  while (tree) {
    nodes.push(...tree.nodes);
    tree = tree.children[0];
  }
  return nodes;
}

/** Expands point properties (AB/AW), including 'aa:cc' rectangle ranges, into all coordinates. */
function expandPoints(values: string[] | undefined, size: number): Point[] {
  const result: Point[] = [];
  for (const v of values ?? []) {
    const [a, b] = v.split(':');
    const from = decodePoint(a ?? '', size);
    if (!from) continue;
    const to = b ? decodePoint(b, size) : from;
    if (!to) continue;
    for (let y = from.y; y <= to.y; y++) {
      for (let x = from.x; x <= to.x; x++) result.push({ x, y });
    }
  }
  return result;
}

const INFO_KEYS = ['GN', 'PB', 'PW', 'BR', 'WR', 'DT', 'PC', 'RE', 'RU', 'EV', 'GC'];

export function parseSgf(text: string): SgfGame {
  const nodes = parseMainLine(text);
  const root = nodes[0];
  if (!root) throw new Error('The SGF contains no nodes.');

  const size = Number.parseInt(root.SZ?.[0] ?? '19', 10);
  if (!Number.isInteger(size) || size < 2 || size > 25) {
    throw new Error(`Unsupported board size: ${root.SZ?.[0]}`);
  }
  const komi = Number.parseFloat(root.KM?.[0] ?? '0') || 0;

  const info: Record<string, string> = {};
  for (const key of INFO_KEYS) {
    const v = root[key]?.[0];
    if (v !== undefined) info[key] = v;
  }

  const setup = { black: expandPoints(root.AB, size), white: expandPoints(root.AW, size) };
  const moves: Move[] = [];
  for (const node of nodes) {
    for (const [prop, color] of [
      ['B', BLACK],
      ['W', WHITE],
    ] as [string, Color][]) {
      const v = node[prop]?.[0];
      if (v !== undefined) moves.push({ color, point: decodePoint(v, size) });
    }
  }
  return { size, komi, info, setup, moves };
}

function escapeValue(value: string): string {
  return value.replace(/[\]\\]/g, '\\$&');
}

export function serializeSgf(game: SgfGame): string {
  let root = `;GM[1]FF[4]CA[UTF-8]SZ[${game.size}]KM[${game.komi}]`;
  for (const [key, value] of Object.entries(game.info)) {
    root += `${key}[${escapeValue(value)}]`;
  }
  if (game.setup.black.length > 0) {
    root += 'AB' + game.setup.black.map((p) => `[${encodePoint(p)}]`).join('');
  }
  if (game.setup.white.length > 0) {
    root += 'AW' + game.setup.white.map((p) => `[${encodePoint(p)}]`).join('');
  }
  const body = game.moves
    .map((m) => `;${m.color === BLACK ? 'B' : 'W'}[${encodePoint(m.point)}]`)
    .join('');
  return `(${root}${body})\n`;
}
