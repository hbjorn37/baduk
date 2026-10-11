import { defineConfig } from 'vitest/config';

// 상대 경로 base: GitHub Pages 등 어떤 하위 경로에 배포해도 동작한다.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: { include: ['src/**/*.test.ts'] },
});
