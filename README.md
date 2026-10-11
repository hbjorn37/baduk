# baduk

![Baduk](docs/images/baduk-1.png)

**Baduk (Go)** is a web app for practicing the game of Go and working with game records. I first built it in 2012 with plain HTML5 and JavaScript so my father could enjoy the game online, and rewrote it from scratch in TypeScript for v2.0.

**https://hbjorn.dev/baduk/**

## Features

- Alternating play, captures, suicide prevention and simple ko
- Stone color modes: auto / black / white / mouse (left click = white, right click = black), handy for solo practice and setting up problems
- Move numbers, last-move marker, show/hide stones
- Undo, pass, area scoring with komi
- 9×9, 13×13 and 19×19 boards
- Open and save SGF files; step through a game (first / previous / next / last)
- The game is saved in the browser and survives a reload
- Desktop and mobile (touch), board scales to the screen width, dark mode

### Limitations

- Scoring does not detect dead stones. Remove them by hand before scoring.
- Only the first variation of an SGF file is read.
- Superko is not supported.
- No online play, chat or AI yet.

## Screenshots

<img src="docs/images/baduk-2.png" alt="Mobile view" width="320" />

## Development

Requires Node.js 20 or later.

```sh
npm install
npm run dev      # development server
npm test         # unit tests
npm run lint     # ESLint
npm run build    # type-check and build static files into dist/
npm run preview  # preview the production build
```

### Layout

```
src/core/   Pure TypeScript with no DOM access. All game rules live here and are tested.
  board.ts    immutable board, group and liberty computation
  rules.ts    move validation (captures, suicide, ko)
  game.ts     move sequence, undo, record navigation
  score.ts    area scoring
  sgf.ts      SGF parser and serializer
  record.ts   SGF <-> Game conversion
src/ui/     SVG board rendering, input handling, localStorage
src/main.ts wires the UI to the core
```

There are no runtime dependencies. Only the UI layer would need to change to move to a framework such as React.

### Deployment

Pushing to `main` runs tests, builds the site and deploys it to GitHub Pages through GitHub Actions. The build uses relative paths, so it works on any static host.

## Versioning

Versions are `major.minor` (for example `2.0`, `2.1`); a three-part version such as `2.0.1` is used only for hotfixes. `package.json` uses the `2.0.0` form because npm requires semver. See [CHANGES](CHANGES) for the history.

## License

[GPL-3.0-or-later](LICENSE). See [AUTHORS](AUTHORS) for credits.
