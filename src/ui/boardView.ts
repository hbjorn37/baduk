import type { GameState } from '../core/game';
import { BLACK, EMPTY, WHITE, type Color, type Move, type Point } from '../core/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const COLUMN_LABELS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'; // 관례상 I 제외

export interface ViewOptions {
  showStones: boolean;
  showNumbers: boolean;
}

export interface BoardViewHandlers {
  /** button: 0 = 좌클릭/터치, 2 = 우클릭 */
  onPoint(point: Point, button: number): void;
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
 * SVG 바둑판. 좌표계는 한 칸 = 1단위이고, 바깥 여백 1단위에 좌표 글자를 둔다.
 * 크기는 CSS(컨테이너 너비)로 정해지므로 별도 리사이즈 코드가 필요 없다.
 */
export class BoardView {
  private svg: SVGSVGElement;
  private size = 0;
  private stonesLayer = el('g');
  private hover = el('circle', { class: 'hover', r: 0.46 });
  private hoverPoint: Point | null = null;
  private hoverColor: Color = BLACK;

  constructor(
    container: HTMLElement,
    private handlers: BoardViewHandlers,
  ) {
    this.svg = el('svg', { class: 'board', role: 'img', 'aria-label': '바둑판' });
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
  }

  /** 미리보기 돌의 색과 놓을 수 있는 칸인지를 갱신한다. */
  setHover(color: Color, canPlace: (p: Point) => boolean): void {
    this.hoverColor = color;
    this.canPlace = canPlace;
    this.updateHover();
  }
  private canPlace: (p: Point) => boolean = () => true;

  render(state: GameState, moves: Move[], opts: ViewOptions): void {
    const size = state.board.size;
    if (size !== this.size) this.buildGrid(size);
    this.stonesLayer.replaceChildren();
    if (!opts.showStones) return;

    // 칸마다 마지막으로 놓인 수 번호
    const numbers = new Map<number, number>();
    moves.forEach((m, i) => {
      if (m.point) numbers.set(m.point.y * size + m.point.x, i + 1);
    });

    for (const p of state.board.points()) {
      const cell = state.board.get(p);
      if (cell === EMPTY) continue;
      const stone = el('circle', {
        cx: p.x + 1,
        cy: p.y + 1,
        r: 0.48,
        fill: cell === BLACK ? 'url(#stone-black)' : 'url(#stone-white)',
        class: 'stone',
      });
      this.stonesLayer.append(stone);

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
    // 숫자가 보이면 숫자가 곧 마지막 수 표시이므로 링은 겹치지 않게 생략한다.
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
    const span = size + 1;
    this.svg.replaceChildren();
    this.svg.setAttribute('viewBox', `0 0 ${span} ${span}`);

    const defs = el('defs');
    defs.append(
      this.gradient('stone-black', '#777', '#000'),
      this.gradient('stone-white', '#fff', '#c8c8c8'),
    );
    this.svg.append(defs);

    this.svg.append(
      el('rect', { x: 0, y: 0, width: span, height: span, class: 'wood' }),
      el('image', {
        href: `${import.meta.env.BASE_URL}images/pvc_wood_pattern_sheet.jpg`,
        x: 0,
        y: 0,
        width: span,
        height: span,
        preserveAspectRatio: 'xMidYMid slice',
        opacity: 0.7,
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
    this.svg.append(labels, this.stonesLayer, this.hover);
  }

  private gradient(id: string, light: string, dark: string): SVGRadialGradientElement {
    const g = el('radialGradient', { id, cx: '35%', cy: '35%', r: '70%' });
    g.append(
      el('stop', { offset: '0%', 'stop-color': light }),
      el('stop', { offset: '100%', 'stop-color': dark }),
    );
    return g;
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

  /** 화면 좌표를 viewBox 좌표로 바꿔 가장 가까운 교점을 구한다. 스케일/회전에 안전하다. */
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
