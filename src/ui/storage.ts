import { isLocale, type LocalePreference } from '../i18n';

export type ColorMode = 'auto' | 'black' | 'white' | 'mouse';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Options {
  colorMode: ColorMode;
  showStones: boolean;
  showNumbers: boolean;
  size: number;
  /** 'auto' follows the browser language */
  locale: LocalePreference;
  theme: ThemePreference;
}

export const DEFAULT_OPTIONS: Options = {
  colorMode: 'auto',
  showStones: true,
  showNumbers: true,
  size: 19,
  locale: 'auto',
  theme: 'system',
};

export const OPTIONS_KEY = 'baduk:options:v2';
const GAME_KEY = 'baduk:game:v2';

const COLOR_MODES: readonly string[] = ['auto', 'black', 'white', 'mouse'];
const THEMES: readonly string[] = ['system', 'light', 'dark'];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // Storage may be unavailable, e.g. in private browsing.
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* A failed save is not fatal */
  }
}

/** Falls back to defaults per field when stored data is corrupt or has a different schema. */
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
    locale: data.locale === 'auto' || isLocale(data.locale) ? data.locale : d.locale,
    theme:
      typeof data.theme === 'string' && THEMES.includes(data.theme)
        ? (data.theme as ThemePreference)
        : d.theme,
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
