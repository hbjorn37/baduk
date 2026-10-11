import { describe, expect, it } from 'vitest';
import { COLUMN_LABELS, formatPoint } from './coords';

describe('formatPoint', () => {
  it('formats points like the labels printed on the board', () => {
    expect(formatPoint({ x: 3, y: 15 }, 19)).toBe('D4');
    expect(formatPoint({ x: 0, y: 0 }, 19)).toBe('A19');
    expect(formatPoint({ x: 18, y: 18 }, 19)).toBe('T1');
    expect(formatPoint({ x: 4, y: 4 }, 9)).toBe('E5');
  });

  it('skips the letter I', () => {
    expect(COLUMN_LABELS).not.toContain('I');
    expect(formatPoint({ x: 8, y: 0 }, 19)).toBe('J19');
  });
});
