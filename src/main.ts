import { Game } from './core/game';
import { gameFromSgf, sgfFromGame } from './core/record';
import type { IllegalReason } from './core/rules';
import { scoreArea } from './core/score';
import { BLACK, WHITE, type Color, type Point } from './core/types';
import { BoardView } from './ui/boardView';
import { loadOptions, loadSavedGame, saveGame, saveOptions, type ColorMode } from './ui/storage';

const REASONS: Record<IllegalReason, string> = {
  'out-of-bounds': 'Out of bounds.',
  occupied: 'That point is already occupied.',
  suicide: 'Illegal move (suicide).',
  ko: 'Ko: play elsewhere first, then you may retake.',
};

function $<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}.`);
  return node as T;
}

const options = loadOptions();
let game = new Game({ size: options.size });
let info: Record<string, string> = {};

// Restore the previous session's game (ignore corrupt data and start fresh)
const saved = loadSavedGame();
if (saved) {
  try {
    const restored = gameFromSgf(saved);
    game = restored.game;
    info = restored.info;
    game.last();
  } catch {
    /* ignore */
  }
}

const view = new BoardView($('board'), {
  onPoint(point, button) {
    place(point, button);
  },
});

function colorFor(button: number): Color | undefined {
  switch (options.colorMode) {
    case 'black':
      return BLACK;
    case 'white':
      return WHITE;
    case 'mouse':
      return button === 2 ? BLACK : WHITE;
    default:
      return undefined;
  }
}

function showMessage(text: string): void {
  $('message').textContent = text;
}

function place(point: Point, button: number): void {
  const r = game.play(point, colorFor(button));
  if (!r.ok) {
    showMessage(REASONS[r.reason]);
    return;
  }
  showMessage('');
  update();
}

function update(): void {
  const state = game.state;
  view.render(state, game.moves, options);
  view.setHover(colorFor(0) ?? state.toPlay, (p) => state.board.get(p) === 0);

  const turn = state.toPlay === BLACK ? 'Black' : 'White';
  $('status').textContent =
    `${game.isOver ? 'Game over · ' : `${turn} to play · `}Move ${game.moveNumber}` +
    ` · Captures: Black ${state.prisoners.black} / White ${state.prisoners.white}`;

  $<HTMLButtonElement>('undo').disabled = !game.canBack || game.canForward;
  $<HTMLButtonElement>('first').disabled = !game.canBack;
  $<HTMLButtonElement>('back').disabled = !game.canBack;
  $<HTMLButtonElement>('forward').disabled = !game.canForward;
  $<HTMLButtonElement>('last').disabled = !game.canForward;

  saveGame(sgfFromGame(game, info));
}

function on(id: string, handler: () => void): void {
  $(id).addEventListener('click', () => {
    showMessage('');
    handler();
    update();
  });
}

on('undo', () => game.undo());
on('pass', () => game.pass());
on('first', () => game.first());
on('back', () => game.back());
on('forward', () => game.forward());
on('last', () => game.last());

on('new', () => {
  options.size = Number($<HTMLSelectElement>('size').value);
  saveOptions(options);
  game = new Game({ size: options.size });
  info = {};
});

on('score', () => {
  const s = scoreArea(game.state.board, game.komi);
  const diff = Math.abs(s.black - s.white);
  const result = s.black > s.white ? `Black wins by ${diff}` : `White wins by ${diff}`;
  showMessage(
    `Area score (komi ${game.komi}): Black ${s.black} : White ${s.white} → ${result}. Dead stones are not accounted for.`,
  );
});

$('save').addEventListener('click', () => {
  const blob = new Blob([sgfFromGame(game, info)], { type: 'application/x-go-sgf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `baduk-${new Date().toISOString().slice(0, 10)}.sgf`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$<HTMLInputElement>('open').addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // allow opening the same file again
  if (!file) return;
  try {
    const loaded = gameFromSgf(await file.text());
    game = loaded.game;
    info = loaded.info;
    options.size = game.size;
    $<HTMLSelectElement>('size').value = String(game.size);
    showMessage(`Opened ${file.name}. Use ◀ ▶ to step through the game.`);
    update();
  } catch (err) {
    showMessage(`Could not open SGF: ${err instanceof Error ? err.message : String(err)}`);
  }
});

// Initialize and bind option controls
$<HTMLSelectElement>('size').value = String(game.size);
$<HTMLInputElement>('showStones').checked = options.showStones;
$<HTMLInputElement>('showNumbers').checked = options.showNumbers;
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=color]')) {
  radio.checked = radio.value === options.colorMode;
  radio.addEventListener('change', () => {
    options.colorMode = radio.value as ColorMode;
    saveOptions(options);
    update();
  });
}
$('showStones').addEventListener('change', (e) => {
  options.showStones = (e.target as HTMLInputElement).checked;
  saveOptions(options);
  update();
});
$('showNumbers').addEventListener('change', (e) => {
  options.showNumbers = (e.target as HTMLInputElement).checked;
  saveOptions(options);
  update();
});

update();
