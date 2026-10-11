# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Language

**Everything in this repository is written in English only**: code comments, identifiers, UI text and error messages, tests, README and other docs, commit messages, PR descriptions, release notes, and GitHub Actions config. Do not add Korean (or any other language) to the repo, even if the conversation with the user is in Korean.

## Project

Baduk (Go) practice board and SGF viewer. TypeScript + Vite static site with **zero runtime dependencies**. Deployed to GitHub Pages at https://hbjorn.dev/baduk/ by GitHub Actions on every push to `main`.

## Commands

```sh
npm install
npm run dev       # Vite dev server
npm test          # Vitest unit tests (src/**/*.test.ts)
npm run lint      # ESLint
npm run build     # tsc --noEmit && vite build -> dist/
npm run format    # Prettier
```

Run `npm run lint && npm test && npm run build` before committing; CI runs the same three.

## Architecture

- `src/core/` is pure TypeScript with **no DOM access**. All Go rules, game state and SGF handling live here and must stay framework- and browser-independent. Any change to rules or SGF needs unit tests.
  - `board.ts` immutable `Board` (every change returns a new instance); `rules.ts` `play()` handles captures, suicide and simple ko; `game.ts` `Game` keeps a state history with a cursor (undo, replay); `score.ts` area scoring; `sgf.ts` parser/serializer; `record.ts` SGF <-> `Game`.
- `src/ui/` is the thin, replaceable view layer: `boardView.ts` (SVG rendering and pointer input), `storage.ts` (validated localStorage).
- `src/main.ts` wires the UI to the core. Keep game logic out of it.
- Coordinates: `x` is the column and `y` the row, both 0-based from the top-left. Board cells are `EMPTY = 0`, `BLACK = 1`, `WHITE = 2`.

## Conventions

- Strict TypeScript, no runtime dependencies; add dev dependencies only when they are needed for the toolchain.
- Prettier style (single quotes, print width 100); ESLint must pass.
- Vite `base` is `./` so the build works under any sub-path. Reference static assets via `import.meta.env.BASE_URL`, never with absolute `/` paths in code.
- localStorage keys are versioned (`baduk:*:v2`). Stored data must be validated on read and never trusted.

## Versioning and releases

- Versions are `major.minor` (e.g. `2.0`, `2.1`). A three-part version (e.g. `2.0.1`) is used **only for hotfixes**.
- Git tags and GitHub releases use `v2.0` / `v2.0.1`. `package.json` uses the semver form (`2.0.0`, `2.1.0`, `2.0.1`) because npm requires it.
- Update `CHANGES` for every release.

## Git

- Default branch is `main`; the GitHub repo is `hbjorn37/baduk`.
- Write commit messages in English, imperative mood, conventional-commit style (`feat:`, `fix:`, `docs:`, `chore:`).
