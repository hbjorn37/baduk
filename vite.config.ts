import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// Relative base: works when deployed under any sub-path, e.g. GitHub Pages.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  define: {
    // "2.1.0" -> "2.1"; hotfixes keep three parts ("2.1.1")
    __APP_VERSION__: JSON.stringify(pkg.version.replace(/\.0$/, '')),
  },
  test: { include: ['src/**/*.test.ts'] },
});
