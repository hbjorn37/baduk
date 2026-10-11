import { formatPoint } from '../core/coords';
import type { Game } from '../core/game';
import { BLACK, type Color, type Move } from '../core/types';
import { t } from '../i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';

function icon(name: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon mark');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function stoneDot(color: Color): HTMLSpanElement {
  const dot = document.createElement('span');
  dot.className = `dot ${color === BLACK ? 'dot-black' : 'dot-white'}`;
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

function colorName(color: Color): string {
  return color === BLACK ? t('color.black') : t('color.white');
}

function pointText(move: Move, size: number): string {
  return move.point ? formatPoint(move.point, size) : t('moves.pass');
}

/**
 * The record's move list. Only the current move is in the tab order (roving tabindex); the
 * arrow keys step through the moves and a click jumps to a move.
 */
export class MoveList {
  private key = '';
  private current = 0;
  private buttons: HTMLButtonElement[] = [];

  constructor(
    private readonly list: HTMLElement,
    onSelect: (moveNumber: number) => void,
  ) {
    list.addEventListener('click', (e) => {
      const button = (e.target as Element).closest<HTMLButtonElement>('button[data-n]');
      if (button) onSelect(Number(button.dataset.n));
    });
    list.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const last = this.buttons.length - 1;
      const target = {
        ArrowRight: this.current + 1,
        ArrowDown: this.current + 1,
        ArrowLeft: this.current - 1,
        ArrowUp: this.current - 1,
        Home: 0,
        End: last,
      }[e.key];
      if (target === undefined) return;
      e.preventDefault();
      onSelect(Math.max(0, Math.min(last, target)));
    });
  }

  /** Forces a rebuild on the next render, e.g. after a language change. */
  invalidate(): void {
    this.key = '';
  }

  focusCurrent(): void {
    this.buttons[this.current]?.focus({ preventScroll: true });
  }

  render(game: Game): void {
    const line = game.line;
    const key = [
      colorName(BLACK),
      game.size,
      ...line.map(
        (e) =>
          `${e.move.color}${e.move.point ? `${e.move.point.x},${e.move.point.y}` : '-'}:` +
          `${e.variations}${e.hasComment ? 'c' : ''}`,
      ),
    ].join(';');
    if (key !== this.key) {
      this.key = key;
      this.rebuild(game, line);
    }

    this.current = game.moveNumber;
    const hadFocus = this.list.contains(document.activeElement);
    this.buttons.forEach((button, i) => {
      if (i === this.current) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.tabIndex = i === this.current ? 0 : -1;
    });
    const button = this.buttons[this.current];
    if (!button) return;
    if (hadFocus && document.activeElement !== button) this.focusCurrent();
    this.scrollTo(button);
  }

  private rebuild(game: Game, line: Game['line']): void {
    const hadFocus = this.list.contains(document.activeElement);
    const items: HTMLLIElement[] = [];
    const add = (button: HTMLButtonElement): void => {
      const li = document.createElement('li');
      li.append(button);
      items.push(li);
    };
    const makeButton = (n: number): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'move-item';
      button.dataset.n = String(n);
      return button;
    };

    const start = makeButton(0);
    start.textContent = t('moves.start');
    add(start);
    line.forEach((entry, i) => {
      const n = i + 1;
      const point = pointText(entry.move, game.size);
      const button = makeButton(n);
      const number = document.createElement('span');
      number.className = 'num';
      number.textContent = String(n);
      const text = document.createElement('span');
      text.textContent = point;
      button.append(stoneDot(entry.move.color), number, text);
      const label = [t('moves.item', { n, color: colorName(entry.move.color), point })];
      if (entry.variations > 1) {
        button.append(icon('branch'));
        label.push(t('moves.hasVariations', { n: entry.variations }));
      }
      if (entry.hasComment) {
        button.append(icon('comment'));
        label.push(t('moves.hasComment'));
      }
      button.setAttribute('aria-label', label.join(', '));
      add(button);
    });

    this.list.replaceChildren(...items);
    this.buttons = items.map((li) => li.firstElementChild as HTMLButtonElement);
    if (hadFocus) this.buttons[Math.min(this.current, this.buttons.length - 1)]?.focus();
  }

  /** Scrolls the list itself (not the page) so the button is visible. */
  private scrollTo(button: HTMLElement): void {
    const top = button.offsetTop;
    const bottom = top + button.offsetHeight;
    if (top < this.list.scrollTop) this.list.scrollTop = top - 4;
    else if (bottom > this.list.scrollTop + this.list.clientHeight) {
      this.list.scrollTop = bottom - this.list.clientHeight + 4;
    }
  }
}

/** Fills a container with one button per alternative move. */
export function renderChoices(
  container: HTMLElement,
  moves: Move[],
  index: number,
  size: number,
  onPick: (i: number) => void,
  markCurrent: boolean,
): void {
  const hadFocus = container.contains(document.activeElement);
  const buttons = moves.map((move, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    const point = pointText(move, size);
    const text = document.createElement('span');
    text.textContent = point;
    button.append(stoneDot(move.color), text);
    button.setAttribute(
      'aria-label',
      t('variations.choice', { n: i + 1, color: colorName(move.color), point }),
    );
    if (markCurrent && i === index) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => onPick(i));
    return button;
  });
  container.replaceChildren(...buttons);
  if (hadFocus && markCurrent) buttons[index]?.focus();
}
