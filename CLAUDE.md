# CLAUDE.md — Check4

## What This Is

Check4 is a two-player board game engine library. 4x4 grid, chess-flavored pieces (Pawn, Rook, Knight, Bishop). Each player holds all four pieces; win by getting all four aligned horizontally, vertically, or diagonally. It is a pure game logic library — no UI. Designed to embed in Node/Express or a browser.

This project is mid-TypeScript migration. The goal is strict, idiomatic TypeScript — same quality bar as the sibling litmus project, but without lifecycle/artifact concerns. Game correctness and type safety are the priorities here.

## Source Layout

```
src/
  Check4.js         # Game engine — the main class
  Pieces.js         # Piece hierarchy: Piece (base), Pawn, Rook, Knight, Bishop
  Check4Errors.js   # Exception hierarchy: GameException (base), Illegal/PlayerTurn/GameOver
  MiddlewareStack.js # Express-style middleware runner
  index.js          # ESM entry point
tests/              # Jest test suite (one file per class)
dist/               # Webpack build output (express / node / web targets)
```

## Key Architectural Concept: Middleware-Based Rule Validation

`Check4` routes every move through an Express-inspired `MiddlewareStack`. There are two stacks:

- `_ruleStack` — full validation + state mutation (the real move)
- `_validationStack` — same rules, but with `dryRun = true`, stops before commit

Each stack is an ordered chain of functions. Rules fire in sequence; any rule can throw a `GameException` subclass to reject the move. This is the dominant pattern in the codebase — understand the middleware chain and you understand the engine.

## The Gutter

Pieces don't start on the board. They begin at `(null, null)` — the "gutter." A piece's first move is always placement onto the board. Captured pieces return to the gutter rather than being removed. The coordinate `(null, null)` is valid and meaningful throughout the codebase.

## Error Model

All game rule violations throw a subclass of `GameException`. Never use plain `Error` for game logic. The hierarchy:

```
GameException
  IllegalMoveException   — invalid piece movement
  PlayerTurnException    — wrong player moved
  GameOverException      — move attempted after game ended
```

Each exception accepts an optional `data` object for context.

## Move Object

```ts
{
  player: 1 | 2,
  piece: 'pawn' | 'rook' | 'bishop' | 'knight',
  x: 0 | 1 | 2 | 3,
  y: 0 | 1 | 2 | 3
}
```

## Public API (Check4)

- `takeTurn(move)` — execute a move
- `moveIsValid(move)` — dry-run validation, no state change
- `forfeit(playerNum)` — declare forfeit
- `onWin(fn)` — register win callback
- `getState()` / `setState(state)` — read/write game state directly

## Commands

```bash
npm run build     # webpack
npm test          # jest
npm run coverage  # jest --coverage
```

## Code Style (ESLint enforced)

- Tabs for indentation (`SwitchCase: 1`)
- Double quotes
- Semicolons always
- Spaces inside parentheses (except `{}`)
- Target: ES2018

## TypeScript Migration Notes

- Migrating from plain ES6 JS to strict TypeScript
- Replace Webpack/Babel with `tsc` or `tsx` as appropriate
- The middleware callback typing is the tricky part: normal handlers are `(data, next)`, error handlers are `(err, data, next)` — these need discriminated union or overload treatment
- `(null, null)` gutter coordinates mean piece position types should be `number | null`, not just `number`
- Enums or union literals for player numbers (`1 | 2`) and piece names
- `GameException` and subclasses should carry typed `data` generics

## Coding Standards

- Strict TypeScript — no `any`
- No emoji or special unicode in source files
- Comment where logic is non-obvious; don't over-comment
- Don't add abstractions or helpers beyond what the task requires
- Keep `buildSuite`-equivalent structures (like middleware registration) readable as a table of contents
