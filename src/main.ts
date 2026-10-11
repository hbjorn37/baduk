import { Game } from './core/game';
import { gameFromSgf, sgfFromGame } from './core/record';
import type { IllegalReason } from './core/rules';
import { scoreArea } from './core/score';
import { BLACK, WHITE, type Color, type Point } from './core/types';
import { BoardView } from './ui/boardView';
import { loadOptions, loadSavedGame, saveGame, saveOptions, type ColorMode } from './ui/storage';

const REASONS: Record<IllegalReason, string> = {
  'out-of-bounds': '판 밖입니다.',
  occupied: '이미 돌이 놓인 자리입니다.',
  suicide: '둘 수 없는 자리입니다 (자충수).',
  ko: '패입니다. 다른 곳에 한 수 둔 뒤 다시 따낼 수 있습니다.',
};

function $<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} 요소가 없습니다.`);
  return node as T;
}

const options = loadOptions();
let game = new Game({ size: options.size });
let info: Record<string, string> = {};

// 이전 세션의 대국 복원 (깨진 데이터는 무시하고 새 대국으로 시작)
const saved = loadSavedGame();
if (saved) {
  try {
    const restored = gameFromSgf(saved);
    game = restored.game;
    info = restored.info;
    game.last();
  } catch {
    /* 무시 */
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

  const turn = state.toPlay === BLACK ? '흑' : '백';
  $('status').textContent =
    `${game.isOver ? '대국 종료 · ' : `${turn} 차례 · `}${game.moveNumber}수` +
    ` · 따낸 돌 흑 ${state.prisoners.black} / 백 ${state.prisoners.white}`;

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
  const result = s.black > s.white ? `흑 ${diff}집 승` : `백 ${diff}집 승`;
  showMessage(
    `영역 계가(덤 ${game.komi}): 흑 ${s.black} : 백 ${s.white} → ${result}. 사석은 반영되지 않았습니다.`,
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
  input.value = ''; // 같은 파일을 다시 열 수 있도록
  if (!file) return;
  try {
    const loaded = gameFromSgf(await file.text());
    game = loaded.game;
    info = loaded.info;
    options.size = game.size;
    $<HTMLSelectElement>('size').value = String(game.size);
    showMessage(`${file.name}을(를) 열었습니다. ◀ ▶ 로 기보를 넘겨 보세요.`);
    update();
  } catch (err) {
    showMessage(`SGF를 열 수 없습니다: ${err instanceof Error ? err.message : String(err)}`);
  }
});

// 옵션 컨트롤 초기화/바인딩
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
