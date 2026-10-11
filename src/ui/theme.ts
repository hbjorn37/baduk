import type { ThemePreference } from './storage';

/**
 * Applies the theme preference. "system" removes the attribute so the
 * prefers-color-scheme media query in the stylesheet decides.
 */
export function applyTheme(theme: ThemePreference): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
