export type ColorMode = 'auto' | 'black' | 'white' | 'mouse';

export interface Options {
  colorMode: ColorMode;
  showStones: boolean;
  showNumbers: boolean;
  size: number;
}

export const DEFAULT_OPTIONS: Options = {
  colorMode: 'auto',
  showStones: true,
  showNumbers: true,
  size: 19,
};

const OPTIONS_KEY = 'baduk:options:v2';
const GAME_KEY = 'baduk:game:v2';

const COLOR_MODES: readonly string[] = ['auto', 'black', 'white', 'mouse'];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // 사생활 보호 모드 등에서는 저장소를 쓸 수 없다.
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 저장 실패는 치명적이지 않다 */
  }
}

/** 저장된 값이 깨졌거나 스키마가 달라도 항목별로 기본값으로 대체한다. */
export function loadOptions(): Options {
  const raw = read(OPTIONS_KEY);
  if (!raw) return { ...DEFAULT_OPTIONS };
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
  const d = DEFAULT_OPTIONS;
  return {
    colorMode:
      typeof data.colorMode === 'string' && COLOR_MODES.includes(data.colorMode)
        ? (data.colorMode as ColorMode)
        : d.colorMode,
    showStones: typeof data.showStones === 'boolean' ? data.showStones : d.showStones,
    showNumbers: typeof data.showNumbers === 'boolean' ? data.showNumbers : d.showNumbers,
    size: [9, 13, 19].includes(data.size as number) ? (data.size as number) : d.size,
  };
}

export function saveOptions(options: Options): void {
  write(OPTIONS_KEY, JSON.stringify(options));
}

export function loadSavedGame(): string | null {
  return read(GAME_KEY);
}

export function saveGame(sgf: string): void {
  write(GAME_KEY, sgf);
}
