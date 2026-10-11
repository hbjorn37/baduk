import { COLUMN_LABELS } from '../core/coords';
import type { GameState } from '../core/game';
import { BLACK, EMPTY, WHITE, type Color, type Move, type Point } from '../core/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ViewOptions {
  showStones: boolean;
  showNumbers: boolean;
}

export interface BoardViewHandlers {
  /** button: 0 = left click / touch / Enter, 2 = right click / Shift+Enter */
  onPoint(point: Point, button: number): void;
  /** Called when the keyboard cursor moves or the board receives keyboard focus. */
  onCursor?(point: Point): void;
}

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export function starPoints(size: number): Point[] {
  const edge = size >= 13 ? 3 : size >= 9 ? 2 : -1;
  if (edge < 0) return [];
  const far = size - 1 - edge;
  const mid = (size - 1) / 2;
  const pts = [edge, far].flatMap((x) => [edge, far].map((y) => ({ x, y })));
  if (Number.isInteger(mid)) {
    pts.push({ x: mid, y: mid });
    if (size >= 13)
      pts.push({ x: edge, y: mid }, { x: far, y: mid }, { x: mid, y: edge }, { x: mid, y: far });
  }
  return pts;
}

/**
 * SVG Go board. One grid cell is one unit in the coordinate system, and the outer
 * one-unit margin holds the coordinate labels. The rendered size is set by CSS
 * (container width), so no resize code is needed.
 *
 * Keyboard support: the board is focusable; arrow keys move a cursor and Enter or
 * Space places a stone (Shift+Enter acts as the right mouse button).
 */
export class BoardView {
  private svg: SVGSVGElement;
  private size = 0;
  private stonesLayer = el('g');
  private hover = el('circle', { class: 'hover', r: 0.46 });
  private cursorMark = el('g', { class: 'cursor' });
  private hoverPoint: Point | null = null;
  private hoverColor: Color = BLACK;
  private cursor: Point = { x: 0, y: 0 };
  private canPlace: (p: Point) => boolean = () => true;

  constructor(
    container: HTMLElement,
    private handlers: BoardViewHandlers,
  ) {
    this.svg = el('svg', { class: 'board', tabindex: 0, role: 'application' });
    container.replaceChildren(this.svg);

    this.svg.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = this.pointFromEvent(e);
      if (p) this.handlers.onPoint(p, 0);
    });
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const p = this.pointFromEvent(e);
      if (p) this.handlers.onPoint(p, 2);
    });
    this.svg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.hoverPoint = this.pointFromEvent(e);
      this.updateHover();
    });
    this.svg.addEventListener('pointerleave', () => {
      this.hoverPoint = null;
      this.updateHover();
    });
    this.svg.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.svg.addEventListener('focus', () => {
      this.hoverPoint = this.cursor;
      this.updateHover();
      this.handlers.onCursor?.(this.cursor);
    });
    this.svg.addEventListener('blur', () => {
      this.hoverPoint = null;
      this.updateHover();
    });
  }

  /** Sets the accessible name and the id of the element that describes the board. */
  setAccessibleText(label: string, describedBy: string): void {
    this.svg.setAttribute('aria-label', label);
    this.svg.setAttribute('aria-roledescription', label);
    this.svg.setAttribute('aria-describedby', describedBy);
  }

  focus(): void {
    this.svg.focus();
  }

  /** Updates the hover/cursor preview stone's color and which points accept a stone. */
  setHover(color: Color, canPlace: (p: Point) => boolean): void {
    this.hoverColor = color;
    this.canPlace = canPlace;
    this.updateHover();
  }

  render(state: GameState, moves: Move[], opts: ViewOptions): void {
    const size = state.board.size;
    if (size !== this.size) this.buildGrid(size);
    this.stonesLayer.replaceChildren();
    if (!opts.showStones) return;

    // Move number of the last stone placed on each point
    const numbers = new Map<number, number>();
    moves.forEach((m, i) => {
      if (m.point) numbers.set(m.point.y * size + m.point.x, i + 1);
    });

    for (const p of state.board.points()) {
      const cell = state.board.get(p);
      if (cell === EMPTY) continue;
      this.stonesLayer.append(
        el('circle', {
          cx: p.x + 1,
          cy: p.y + 1,
          r: 0.48,
          fill: cell === BLACK ? 'url(#stone-black)' : 'url(#stone-white)',
          class: 'stone',
        }),
      );

      const n = numbers.get(p.y * size + p.x);
      if (opts.showNumbers && n !== undefined) {
        const t = el('text', {
          x: p.x + 1,
          y: p.y + 1,
          class: cell === BLACK ? 'num on-black' : 'num on-white',
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        });
        t.textContent = String(n);
        this.stonesLayer.append(t);
      }
    }

    const last = state.move?.point;
    // When numbers are shown they already mark the last move, so skip the ring to avoid overlap.
    if (!opts.showNumbers && last && state.board.get(last) !== EMPTY) {
      this.stonesLayer.append(
        el('circle', {
          cx: last.x + 1,
          cy: last.y + 1,
          r: 0.18,
          class: state.board.get(last) === BLACK ? 'last on-black' : 'last on-white',
        }),
      );
    }
  }

  private buildGrid(size: number): void {
    this.size = size;
    this.cursor = { x: Math.floor((size - 1) / 2), y: Math.floor((size - 1) / 2) };
    const span = size + 1;
    this.svg.replaceChildren();
    this.svg.setAttribute('viewBox', `0 0 ${span} ${span}`);

    const defs = el('defs');
    defs.append(
      this.gradient('stone-black', '#7a7a7a', '#000'),
      this.gradient('stone-white', '#fff', '#c8c8c8'),
    );
    this.svg.append(defs);

    this.svg.append(
      el('rect', { x: 0, y: 0, width: span, height: span, class: 'wood' }),
      el('image', {
        href: `${import.meta.env.BASE_URL}images/pvc_wood_pattern_sheet.jpg`,
        class: 'wood-texture',
        x: 0,
        y: 0,
        width: span,
        height: span,
        preserveAspectRatio: 'xMidYMid slice',
      }),
    );

    const lines = el('g', { class: 'lines' });
    for (let i = 1; i <= size; i++) {
      lines.append(
        el('line', { x1: i, y1: 1, x2: i, y2: size }),
        el('line', { x1: 1, y1: i, x2: size, y2: i }),
      );
    }
    this.svg.append(lines);

    for (const p of starPoints(size)) {
      this.svg.append(el('circle', { cx: p.x + 1, cy: p.y + 1, r: 0.09, class: 'star' }));
    }

    const labels = el('g', {
      class: 'labels',
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'aria-hidden': 'true',
    });
    for (let i = 0; i < size; i++) {
      const col = COLUMN_LABELS[i] ?? '';
      const row = String(size - i);
      for (const [x, y, text] of [
        [i + 1, 0.4, col],
        [i + 1, size + 0.6, col],
        [0.4, i + 1, row],
        [size + 0.6, i + 1, row],
      ] as [number, number, string][]) {
        const t = el('text', { x, y });
        t.textContent = text;
        labels.append(t);
      }
    }

    // Keyboard cursor: a dark outline under a light one stays visible on any background.
    this.cursorMark.replaceChildren(
      el('rect', { class: 'cursor-outer', width: 0.94, height: 0.94, rx: 0.12 }),
      el('rect', { class: 'cursor-inner', width: 0.94, height: 0.94, rx: 0.12 }),
    );
    this.svg.append(labels, this.stonesLayer, this.hover, this.cursorMark);
    this.updateCursor();
  }

  private gradient(id: string, light: string, dark: string): SVGRadialGradientElement {
    const g = el('radialGradient', { id, cx: '35%', cy: '35%', r: '70%' });
    g.append(
      el('stop', { offset: '0%', 'stop-color': light }),
      el('stop', { offset: '100%', 'stop-color': dark }),
    );
    return g;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = delta[e.key];
    if (move) {
      e.preventDefault();
      const x = Math.max(0, Math.min(this.size - 1, this.cursor.x + move[0]));
      const y = Math.max(0, Math.min(this.size - 1, this.cursor.y + move[1]));
      this.cursor = { x, y };
      this.hoverPoint = this.cursor;
      this.updateCursor();
      this.updateHover();
      this.handlers.onCursor?.(this.cursor);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handlers.onPoint(this.cursor, e.shiftKey ? 2 : 0);
    }
  }

  private updateCursor(): void {
    this.cursorMark.setAttribute(
      'transform',
      `translate(${this.cursor.x + 1 - 0.47} ${this.cursor.y + 1 - 0.47})`,
    );
  }

  private updateHover(): void {
    const p = this.hoverPoint;
    if (!p || !this.canPlace(p)) {
      this.hover.setAttribute('visibility', 'hidden');
      return;
    }
    this.hover.setAttribute('cx', String(p.x + 1));
    this.hover.setAttribute('cy', String(p.y + 1));
    this.hover.setAttribute('fill', this.hoverColor === WHITE ? '#fff' : '#000');
    this.hover.setAttribute('visibility', 'visible');
  }

  /** Maps screen coordinates to the nearest intersection via the viewBox transform; safe under scaling. */
  private pointFromEvent(e: MouseEvent): Point | null {
    const ctm = this.svg.getScreenCTM();
    if (!ctm || this.size === 0) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const x = Math.round(pt.x) - 1;
    const y = Math.round(pt.y) - 1;
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return null;
    return { x, y };
  }
}
