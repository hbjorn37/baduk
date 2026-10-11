import { t, type MessageKey } from '../i18n';

const ATTRIBUTES = ['aria-label', 'title', 'placeholder'] as const;

/**
 * Fills translatable text in the DOM from the active locale:
 *   data-i18n="key"             sets textContent
 *   data-i18n-aria-label="key"  sets the aria-label attribute (likewise data-i18n-title and data-i18n-placeholder)
 */
export function applyTranslations(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n as MessageKey);
  }
  for (const attr of ATTRIBUTES) {
    for (const el of root.querySelectorAll<HTMLElement>(`[data-i18n-${attr}]`)) {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`) as MessageKey));
    }
  }
}
