import { en, type MessageKey, type Messages } from './en';
import { ja } from './ja';
import { ko } from './ko';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';

export type { MessageKey, Messages };

export const LOCALES = ['en', 'ko', 'ja', 'zh-CN', 'zh-TW'] as const;
export type Locale = (typeof LOCALES)[number];
export type LocalePreference = 'auto' | Locale;

/** Each language is listed under its own name so people can find it whatever the current UI language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

export const DEFAULT_LOCALE: Locale = 'en';

const CATALOGS: Record<Locale, Messages> = {
  en,
  ko,
  ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
};

/** Maps one BCP 47 language tag (for example "zh-Hant-TW" or "ko-KR") to a supported locale. */
export function matchLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase().replace(/_/g, '-');
  if (lower === 'zh' || lower.startsWith('zh-')) {
    return /^zh-(tw|hk|mo)\b|hant/.test(lower) ? 'zh-TW' : 'zh-CN';
  }
  const base = lower.split('-')[0];
  return base === 'en' || base === 'ko' || base === 'ja' ? base : null;
}

/** Picks the first supported locale from the browser's ordered language preferences. */
export function resolveLocale(
  languages: readonly string[],
  fallback: Locale = DEFAULT_LOCALE,
): Locale {
  for (const tag of languages) {
    const match = matchLocale(tag);
    if (match) return match;
  }
  return fallback;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Replaces {name} placeholders; unknown placeholders are left as they are. */
export function format(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

let current: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return format(CATALOGS[current][key], params);
}

/** Exposed for tests. */
export function catalog(locale: Locale): Messages {
  return CATALOGS[locale];
}
