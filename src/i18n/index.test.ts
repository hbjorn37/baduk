import { describe, expect, it } from 'vitest';
import { catalog, format, LOCALES, matchLocale, resolveLocale, setLocale, t } from './index';

const placeholders = (s: string): string[] =>
  [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

describe('matchLocale', () => {
  it('maps region and script variants to supported locales', () => {
    expect(matchLocale('en-US')).toBe('en');
    expect(matchLocale('ko-KR')).toBe('ko');
    expect(matchLocale('ja')).toBe('ja');
    expect(matchLocale('zh-CN')).toBe('zh-CN');
    expect(matchLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(matchLocale('zh')).toBe('zh-CN');
    expect(matchLocale('zh-TW')).toBe('zh-TW');
    expect(matchLocale('zh-HK')).toBe('zh-TW');
    expect(matchLocale('zh-Hant')).toBe('zh-TW');
    expect(matchLocale('ZH_tw')).toBe('zh-TW');
  });

  it('returns null for unsupported languages', () => {
    expect(matchLocale('fr-FR')).toBeNull();
    expect(matchLocale('')).toBeNull();
  });
});

describe('resolveLocale', () => {
  it('uses the first supported language in preference order', () => {
    expect(resolveLocale(['fr-FR', 'ja-JP', 'en'])).toBe('ja');
    expect(resolveLocale(['ko-KR', 'en-US'])).toBe('ko');
  });

  it('falls back to English', () => {
    expect(resolveLocale(['fr', 'de'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });
});

describe('format / t', () => {
  it('fills placeholders and leaves unknown ones untouched', () => {
    expect(format('Move {n} of {total}', { n: 3, total: 10 })).toBe('Move 3 of 10');
    expect(format('Hello {name}', {})).toBe('Hello {name}');
  });

  it('translates with the active locale', () => {
    setLocale('ko');
    expect(t('game.undo')).toBe('무르기');
    setLocale('en');
    expect(t('game.undo')).toBe('Undo');
  });
});

describe('catalogs', () => {
  const en = catalog('en');
  for (const locale of LOCALES) {
    it(`${locale} has the same keys and placeholders as English and no empty text`, () => {
      const messages = catalog(locale);
      expect(Object.keys(messages).sort()).toEqual(Object.keys(en).sort());
      for (const [key, value] of Object.entries(messages)) {
        expect(value.trim(), key).not.toBe('');
        expect(placeholders(value), `${locale}:${key}`).toEqual(
          placeholders(en[key as keyof typeof en]),
        );
      }
    });
  }
});
