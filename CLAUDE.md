# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Language

**English is the default and the rule for everything written about the repository**: README and other docs, code comments, identifiers, tests, commit messages, pull request titles and descriptions, issue text, release notes, CHANGES, and GitHub Actions config. Write these in English even if the conversation with the user is in Korean.

**The one exception is the game UI, which is multilingual.** User-facing text lives only in the translation files under `src/i18n/` (`en`, `ko`, `ja`, `zh-CN`, `zh-TW`), which are the only place non-English text belongs. Never hard-code user-visible strings in `index.html` or the TypeScript code: add a key to `src/i18n/en.ts` and to every other locale (the compiler enforces matching keys, and a test checks placeholders).

## Project

Baduk (Go) practice board and SGF viewer. Multilingual (en, ko, ja, zh-CN, zh-TW), light/dark/system themes, keyboard and screen reader accessible. TypeScript + Vite static site with **zero runtime dependencies**. Deployed to GitHub Pages at https://hbjorn.dev/baduk/ by GitHub Actions on every push to `main`. The `cleanup-deployments` workflow then removes older deployment records, keeping only the newest.

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
- `src/i18n/` holds the translation catalogs and locale detection (`resolveLocale` picks the language from `navigator.languages`; the user can override it in Settings). `en.ts` defines the keys; the other catalogs are typed against it. Core code never produces user-facing text: errors carry a code (`SgfError`) that the UI translates.
- `src/ui/` is the thin, replaceable view layer: `boardView.ts` (SVG rendering, pointer and keyboard input), `theme.ts`, `translate.ts` (fills `data-i18n*` attributes), `storage.ts` (validated localStorage).
- `src/main.ts` wires the UI to the core. Keep game logic out of it.
- Coordinates: `x` is the column and `y` the row, both 0-based from the top-left. Board cells are `EMPTY = 0`, `BLACK = 1`, `WHITE = 2`.

## Conventions

- **Accessibility is a requirement**: every control must work with the keyboard, have an accessible name, keep visible focus, and meet WCAG AA contrast in both themes; announce game events through the `#announcer` live region. Check new UI with axe-core in light and dark themes.
- Styling uses the CSS custom properties in `src/style.css`; add colors as tokens for both themes, never as one-off values.

- Strict TypeScript, no runtime dependencies; add dev dependencies only when they are needed for the toolchain.
- Prettier style (single quotes, print width 100); ESLint must pass.
- Vite `base` is `./` so the build works under any sub-path. Reference static assets via `import.meta.env.BASE_URL`, never with absolute `/` paths in code.
- localStorage keys are versioned (`baduk:*:v2`). Stored data must be validated on read and never trusted.

## Versioning and releases

- **Default: two-part versions** such as `v1.2` or `v2.0`. **Use a three-part version such as `v1.2.1` only for a hotfix** to an already released version. Never use three parts for a regular release.
- Git tags and GitHub releases use the `v` prefix (`v1.2`, `v1.2.1`). `package.json` uses the semver form (`1.2.0`, `1.2.1`) because npm requires it.
- Create annotated tags and a GitHub release for every version. Release titles look like `v1.2: Short summary`, and the notes are detailed: summary, grouped changes, commit list and a compare link to the previous tag. Mark only the newest release as latest.
- Update `CHANGES` for every release.
- Releases `v0.1`-`v1.1` were backfilled from the git history. Documentation-only commits do not get their own version.

## Git

- Default branch is `main`; the GitHub repo is `hbjorn37/baduk`.
- Write commit messages in English, imperative mood, conventional-commit style (`feat:`, `fix:`, `docs:`, `chore:`).
