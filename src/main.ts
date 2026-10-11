import { formatPoint } from './core/coords';
import { SgfError } from './core/errors';
import { Game } from './core/game';
import { gameFromSgf, sgfFromGame } from './core/record';
import type { IllegalReason } from './core/rules';
import { scoreArea } from './core/score';
import { BLACK, WHITE, type Color, type Point } from './core/types';
import {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  LOCALES,
  isLocale,
  resolveLocale,
  setLocale,
  t,
  type Locale,
} from './i18n';
import { BoardView } from './ui/boardView';
import { MoveList, renderChoices } from './ui/moveList';
import {
  DEFAULT_OPTIONS,
  loadOptions,
  loadSavedGame,
  saveGame,
  saveOptions,
  type ColorMode,
  type Options,
  type ThemePreference,
} from './ui/storage';
import { applyTheme } from './ui/theme';
import { applyTranslations } from './ui/translate';

function $<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}.`);
  return node as T;
}

let options: Options = loadOptions();
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
  onPoint: (point, button) => place(point, button),
  onCursor: (point) => {
    const cell = game.state.board.get(point);
    const state =
      cell === BLACK ? t('point.black') : cell === WHITE ? t('point.white') : t('point.empty');
    announce(t('announce.cursor', { point: formatPoint(point, game.size), state }));
  },
});

const moveList = new MoveList($('move-list'), (n) => {
  game.goTo(n);
  showMessage('');
  update();
  announce(t('announce.moveNow', { n: game.moveNumber }));
});

// ---------- Helpers ----------

function colorName(color: Color): string {
  return color === BLACK ? t('color.black') : t('color.white');
}

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

function announce(text: string): void {
  const node = $('announcer');
  node.textContent = '';
  // A short delay makes screen readers re-read identical consecutive messages.
  window.setTimeout(() => {
    node.textContent = text;
  }, 30);
}

function showMessage(text: string, kind: 'info' | 'error' = 'info'): void {
  const node = $('message');
  node.textContent = text;
  node.classList.toggle('is-error', kind === 'error' && text !== '');
}

function describeError(err: unknown): string {
  if (err instanceof SgfError) {
    const params = { ...err.params };
    if (err.code === 'illegal-move' && typeof params.reason === 'string') {
      params.reason = t(`reasonShort.${params.reason as IllegalReason}`);
    }
    return t(`error.${err.code}`, params);
  }
  return t('error.unknown');
}

// ---------- Rendering ----------

function update(): void {
  const state = game.state;
  view.render(state, game.moves, options);
  view.setHover(colorFor(0) ?? state.toPlay, (p) => state.board.get(p) === 0);

  $('turn-stone').className = `dot ${state.toPlay === BLACK ? 'dot-black' : 'dot-white'}`;
  $('turn-stone').hidden = game.isOver;
  $('turn-text').textContent = game.isOver
    ? t('status.over')
    : t('status.turn', { color: colorName(state.toPlay) });
  $('move-text').textContent = t('status.move', { n: game.moveNumber });
  $('cap-black-n').textContent = String(state.prisoners.black);
  $('cap-white-n').textContent = String(state.prisoners.white);
  $('cap-black').setAttribute(
    'aria-label',
    t('status.capturesBy', { color: colorName(BLACK), n: state.prisoners.black }),
  );
  $('cap-white').setAttribute(
    'aria-label',
    t('status.capturesBy', { color: colorName(WHITE), n: state.prisoners.white }),
  );

  $<HTMLButtonElement>('undo').disabled = !game.canBack || game.canForward;
  $<HTMLButtonElement>('pass').disabled = game.canForward;
  $<HTMLButtonElement>('first').disabled = !game.canBack;
  $<HTMLButtonElement>('back').disabled = !game.canBack;
  $<HTMLButtonElement>('forward').disabled = !game.canForward;
  $<HTMLButtonElement>('last').disabled = !game.canForward;

  const scrub = $<HTMLInputElement>('scrub');
  scrub.max = String(game.totalMoves);
  scrub.value = String(game.moveNumber);
  scrub.disabled = game.totalMoves === 0;
  scrub.setAttribute(
    'aria-valuetext',
    t('record.scrubValue', { n: game.moveNumber, total: game.totalMoves }),
  );

  renderRecord();
  saveGame(sgfFromGame(game, info));
}

/** Game info summary, move list, variation choices and the comment box. */
function renderRecord(): void {
  const named = (name?: string, rank?: string): string => [name, rank].filter(Boolean).join(' ');
  const players =
    info.PB || info.PW
      ? t('info.players', {
          black: named(info.PB, info.BR) || colorName(BLACK),
          white: named(info.PW, info.WR) || colorName(WHITE),
        })
      : '';
  const details = [info.GN, info.EV, info.DT, info.PC, info.RE].filter(Boolean).join(' · ');
  $('summary-players').textContent = players;
  $('summary-players').hidden = players === '';
  $('summary-details').textContent = details;
  $('summary-details').hidden = details === '';
  $('game-summary').hidden = players === '' && details === '';

  moveList.render(game);

  const next = game.nextChoices;
  const alt = game.alternatives;
  const showNext = next.moves.length > 1;
  const showAlt = alt.moves.length > 1;
  $('variations').hidden = !showNext && !showAlt;
  $('next-group').hidden = !showNext;
  $('alt-group').hidden = !showAlt;
  renderChoices(
    $('next-list'),
    showNext ? next.moves : [],
    next.index,
    game.size,
    (i) => {
      game.selectNext(i);
      afterNavigation();
      moveList.focusCurrent();
    },
    false,
  );
  renderChoices(
    $('alt-list'),
    showAlt ? alt.moves : [],
    alt.index,
    game.size,
    (i) => {
      game.selectAlternative(i);
      afterNavigation();
    },
    true,
  );

  $('comment-label').textContent =
    game.moveNumber === 0 ? t('comment.labelStart') : t('comment.label', { n: game.moveNumber });
  const box = $<HTMLTextAreaElement>('comment');
  if (box.value !== game.comment) box.value = game.comment;
}

function afterNavigation(): void {
  showMessage('');
  update();
  announce(t('announce.moveNow', { n: game.moveNumber }));
}

function applyLanguage(): void {
  const locale: Locale =
    options.locale === 'auto'
      ? resolveLocale(navigator.languages?.length ? navigator.languages : [navigator.language])
      : options.locale;
  setLocale(locale);
  moveList.invalidate();
  document.documentElement.lang = locale;
  document.title = t('app.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'));
  applyTranslations();
  $('version').textContent = t('footer.version', { v: __APP_VERSION__ });
  view.setAccessibleText(t('board.label'), 'board-hint');
}

function syncControls(): void {
  $<HTMLSelectElement>('language').value = options.locale;
  $<HTMLSelectElement>('size').value = String(game.size);
  $<HTMLInputElement>('showStones').checked = options.showStones;
  $<HTMLInputElement>('showNumbers').checked = options.showNumbers;
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=color]')) {
    radio.checked = radio.value === options.colorMode;
  }
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=theme]')) {
    radio.checked = radio.value === options.theme;
  }
}

function changeOptions(patch: Partial<Options>): void {
  options = { ...options, ...patch };
  saveOptions(options);
  if ('theme' in patch) applyTheme(options.theme);
  if ('locale' in patch) {
    applyLanguage();
    showMessage('');
  }
  update();
}

// ---------- Playing ----------

const REASON_KEYS: Record<IllegalReason, `reason.${IllegalReason}`> = {
  'out-of-bounds': 'reason.out-of-bounds',
  occupied: 'reason.occupied',
  suicide: 'reason.suicide',
  ko: 'reason.ko',
};

function place(point: Point, button: number): void {
  const color = colorFor(button) ?? game.state.toPlay;
  const continuations = game.nextChoices.moves.length;
  const r = game.play(point, colorFor(button));
  if (!r.ok) {
    const text = t(REASON_KEYS[r.reason]);
    showMessage(text, 'error');
    announce(text);
    return;
  }
  showMessage('');
  const startedVariation = continuations > 0 && game.alternatives.moves.length > continuations;
  if (startedVariation) showMessage(t('msg.variation', { n: game.moveNumber }));
  update();
  const parts = [
    t('announce.played', { color: colorName(color), point: formatPoint(point, game.size) }),
  ];
  if (r.captured.length > 0) parts.push(t('announce.captured', { n: r.captured.length }));
  if (startedVariation) parts.push(t('msg.variation', { n: game.moveNumber }));
  announce(parts.join(' '));
}

function run(id: string, handler: () => void): void {
  $(id).addEventListener('click', () => {
    showMessage('');
    handler();
    update();
  });
}

run('undo', () => {
  if (game.undo()) announce(t('announce.undone'));
});
run('pass', () => {
  const color = game.state.toPlay;
  game.pass();
  announce(
    game.isOver
      ? `${t('announce.passed', { color: colorName(color) })} ${t('announce.over')}`
      : t('announce.passed', { color: colorName(color) }),
  );
});
for (const [id, go] of [
  ['first', () => game.first()],
  ['back', () => game.back()],
  ['forward', () => game.forward()],
  ['last', () => game.last()],
] as [string, () => void][]) {
  run(id, () => {
    go();
    announce(t('announce.moveNow', { n: game.moveNumber }));
  });
}

$<HTMLInputElement>('scrub').addEventListener('input', (e) => {
  game.goTo(Number((e.target as HTMLInputElement).value));
  showMessage('');
  update();
});

run('score', () => {
  const s = scoreArea(game.state.board, game.komi);
  const diff = Math.abs(s.black - s.white);
  const result =
    s.black === s.white
      ? t('score.draw')
      : s.black > s.white
        ? t('score.blackWins', { n: diff })
        : t('score.whiteWins', { n: diff });
  const text = t('score.result', { komi: game.komi, black: s.black, white: s.white, result });
  showMessage(text);
  announce(text);
});

// ---------- New game ----------

function startNewGame(): void {
  options = { ...options, size: Number($<HTMLSelectElement>('size').value) };
  saveOptions(options);
  game = new Game({ size: options.size });
  info = {};
  showMessage('');
  update();
  announce(t('announce.newGame'));
  view.focus();
}

$('new').addEventListener('click', () => {
  if (game.totalMoves === 0) {
    startNewGame();
    return;
  }
  const dialog = $<HTMLDialogElement>('confirm-new');
  dialog.addEventListener(
    'close',
    () => {
      if (dialog.returnValue === 'ok') startNewGame();
    },
    { once: true },
  );
  dialog.returnValue = '';
  dialog.showModal();
});

// ---------- SGF ----------

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
    options = { ...options, size: game.size };
    saveOptions(options);
    $<HTMLSelectElement>('size').value = String(game.size);
    showMessage(t('msg.opened', { name: file.name }));
    update();
  } catch (err) {
    showMessage(t('msg.openFailed', { reason: describeError(err) }), 'error');
  }
});

// ---------- Comments and game info ----------

$<HTMLTextAreaElement>('comment').addEventListener('input', (e) => {
  game.comment = (e.target as HTMLTextAreaElement).value;
  update();
});

const INFO_FIELDS = ['GN', 'EV', 'DT', 'PC', 'PB', 'BR', 'PW', 'WR', 'RE'] as const;
const infoDialog = $<HTMLDialogElement>('info-dialog');

$('edit-info').addEventListener('click', () => {
  for (const key of INFO_FIELDS) $<HTMLInputElement>(`info-${key}`).value = info[key] ?? '';
  $<HTMLInputElement>('info-KM').value = String(game.komi);
  infoDialog.returnValue = '';
  infoDialog.showModal();
});
$('info-cancel').addEventListener('click', () => infoDialog.close());
infoDialog.addEventListener('click', (e) => {
  if (e.target === infoDialog) infoDialog.close();
});
infoDialog.addEventListener('close', () => {
  if (infoDialog.returnValue !== 'ok') return;
  const next = { ...info };
  for (const key of INFO_FIELDS) {
    const value = $<HTMLInputElement>(`info-${key}`).value.trim();
    if (value) next[key] = value;
    else delete next[key];
  }
  info = next;
  const komi = Number.parseFloat($<HTMLInputElement>('info-KM').value);
  if (Number.isFinite(komi)) game.komi = Math.max(-100, Math.min(100, komi));
  update();
  showMessage(t('info.updated'));
  announce(t('info.updated'));
});

// ---------- Keyboard shortcuts (while the board has focus) ----------

$('board').addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  const actions: Record<string, string> = {
    u: 'undo',
    backspace: 'undo',
    p: 'pass',
    pageup: 'back',
    pagedown: 'forward',
    home: 'first',
    end: 'last',
  };
  const id = actions[key];
  if (!id) return;
  e.preventDefault();
  const button = $<HTMLButtonElement>(id);
  if (!button.disabled) button.click();
});

// ---------- Settings ----------

const settings = $<HTMLDialogElement>('settings');
$('open-settings').addEventListener('click', () => settings.showModal());
$('close-settings').addEventListener('click', () => settings.close());
$('done-settings').addEventListener('click', () => settings.close());
// A click on the backdrop targets the <dialog> itself.
settings.addEventListener('click', (e) => {
  if (e.target === settings) settings.close();
});
$('reset-settings').addEventListener('click', () => {
  options = { ...DEFAULT_OPTIONS, size: options.size };
  saveOptions(options);
  applyTheme(options.theme);
  applyLanguage();
  syncControls();
  showMessage('');
  update();
});

const languageSelect = $<HTMLSelectElement>('language');
for (const locale of LOCALES) {
  const option = document.createElement('option');
  option.value = locale;
  option.lang = locale;
  option.textContent = LOCALE_NAMES[locale];
  languageSelect.append(option);
}
languageSelect.addEventListener('change', () => {
  const value = languageSelect.value;
  changeOptions({ locale: value === 'auto' ? 'auto' : isLocale(value) ? value : DEFAULT_LOCALE });
});

for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=color]')) {
  radio.addEventListener('change', () => changeOptions({ colorMode: radio.value as ColorMode }));
}
for (const radio of document.querySelectorAll<HTMLInputElement>('input[name=theme]')) {
  radio.addEventListener('change', () => changeOptions({ theme: radio.value as ThemePreference }));
}
$('showStones').addEventListener('change', (e) =>
  changeOptions({ showStones: (e.target as HTMLInputElement).checked }),
);
$('showNumbers').addEventListener('change', (e) =>
  changeOptions({ showNumbers: (e.target as HTMLInputElement).checked }),
);

// Re-evaluate the automatic language if the browser's language list changes.
window.addEventListener('languagechange', () => {
  if (options.locale === 'auto') {
    applyLanguage();
    update();
  }
});

// ---------- Start ----------

applyTheme(options.theme);
applyLanguage();
syncControls();
update();
