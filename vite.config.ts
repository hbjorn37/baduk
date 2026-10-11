import { defineConfig } from 'vitest/config';

// Relative base: works when deployed under any sub-path, e.g. GitHub Pages.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: { include: ['src/**/*.test.ts'] },
});
