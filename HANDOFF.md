# Check4 — Project Handoff

Working doc for continuing development. The repo's TypeScript engine is the
**normative rules implementation**; everything below builds around it.

## The product

Check4 is a two-player 4x4 abstract strategy game, designed to double as an
LLM training/benchmark environment. Ship targets:

- **MCP server** — LLM players get seats via MCP tools
- **React Native app** — human players
- **Multiplayer** — local, LAN, and WAN; every game type supports any seat
  combination (Human v Human, Human v LLM, LLM v LLM)
- **Training/benchmark harness** — high-throughput self-play, a solver as
  ground-truth oracle, and a bot ladder for Elo-style scoring of LLMs

## Rules (locked)

Base game (already implemented in `src/Check4.ts`):

- 4x4 board. Each player has 4 pieces: pawn, rook, bishop, knight
  (chess-style movement; rook/bishop cannot jump; pawn attacks diagonally
  forward only, flips direction when it reaches row 0 ("up") or row 3
  ("down")).
- All pieces start **in the gutter** (off-board). On your turn: a gutter
  piece may be placed on **any empty square** (no capturing from the
  gutter); a board piece moves by its movement rules.
- Capturing an enemy piece sends it back to the gutter (material never
  leaves the game).
- **Win:** all four of your pieces aligned in a row, column, or either
  diagonal.

**No-backtrack rule** (implemented):

- Each piece remembers the **one** position it last occupied (`prevCoords`).
  Moving a piece to its remembered position is illegal. The memory
  overwrites on every move — never a growing list.
- **The gutter counts as a position.** Consequences (all intended):
  - Capture wipes the piece's memory (it "moved" to the gutter).
  - A captured piece may re-drop anywhere empty, including the square it
    was captured on (once vacated).
  - A freshly dropped piece's first board move is unrestricted (its memory
    reads "gutter", which is unreachable).

**Termination:** the rule does not guarantee finite games (triangulation
remains legal — deliberate). The **harness** enforces a ply cap
(~200 plies → adjudicated draw). Game rules stay clean; benchmarks always
terminate. No draw rule exists in the game itself.

## Engine status (this branch, TypeScript)

Commit `e85e1aa` on `claude/adoring-feynman-a0qbe1` — 161 tests green,
lint clean on `src/`.

- **Fixed a gutter regression**: a `PieceProps` refactor had coerced null
  coords to `-1`, breaking `_inGutter` (which checks null). Off-board is
  `null` everywhere again; `Piece` constructor validates coordinates.
- `takeTurn` / `moveIsValid` / `legalMoves()` share one validation pipeline
  (`_validateMove`). `moveIsValid` now correctly rejects self-capture.
- `legalMoves()` enumerates all legal moves for the player to move.
- `getState()` / `setState()` round-trip a game **exactly**: piece coords,
  per-piece `prev` move memory, pawn `direction`.
- `stateKey()` — canonical position-identity string. Includes turn, winner,
  all coords + move memory + pawn directions; **excludes turnCount** so it
  works for repetition detection. Two states with equal keys have identical
  legal moves.
- Test map: `tests/Backtrack.test.ts` (no-backtrack semantics),
  `tests/LegalMoves.test.ts`, `tests/State.test.ts` (round-trip + stateKey),
  plus the original per-piece and engine suites.
- Known lint debt (pre-existing, left alone): unused vars in
  `tests/Piece.test.ts`.

## Architecture decisions (settled)

- **TS engine = the spec.** Human-readable, fully tested, stays in this
  repo. It referees interactive play until the Rust core lands, and remains
  the reference implementation forever.
- **Rust core** (`check4-core` crate) for performance surfaces. One crate,
  three faces:
  1. Native lib — solver + training harness (vectorized: one process, many
     games as packed structs; **never** process-per-game)
  2. napi-rs binding — Node MCP server calls the engine in-process
  3. FFI/WASM — React Native app (and browser later)
  - State packs into ~90 bits: 8 pieces x 5-bit position (16 squares +
    gutter), 8 x 5-bit prev, 2 pawn-direction bits, turn bit.
  - **Differential fuzzing is mandatory**: random games replayed through
    both engines must produce identical `stateKey()` sequences. TS is
    normative; Rust is a proven-equivalent replica.
- **Identity: Ed25519 keypair per player.** Pubkey = player ID. "Login" =
  unlocking the key locally (secure enclave + biometrics on mobile). Seed
  phrase backup. No accounts, no password DB. **An LLM seat is just a
  keypair held by its MCP server** — humans and LLMs are identical at the
  protocol level.
- **Anti-cheat: signed hash-chained move log, NOT a blockchain.** Each move
  record: `{ move, prevRecordHash, resultingStateKey/hash, signature }`.
  Both engines validate every move locally (deterministic, perfect info —
  no consensus needed). Chain gives tamper-evidence, non-repudiation,
  verifiable replay. Finished games are dual-signed records — portable,
  auditable, and double as provenance-verified training data. Blockchain
  was evaluated and rejected: it adds nothing here that the signed chain
  doesn't provide for free.
- **Networking: [iroh](https://github.com/n0-computer/iroh)** (Rust p2p,
  QUIC hole-punching, public relay fallback, mobile FFI). Iroh node IDs are
  Ed25519 pubkeys, so player identity == network address. Relays are
  untrusted plumbing (signed chain means they can only deliver or not).
  - **LAN play:** mDNS discovery, fully serverless.
  - **WAN play: folded into matchmaking entirely** (decision). No separate
    serverless friend-code WAN path for v1 — WAN games go through the
    matchmaking layer when it's built. Deferred with it: stranger lobby,
    ratings/leaderboard (aggregator is untrusted-verifiable via signed
    logs), correspondence/offline play.
- **MCP server design:** tools `new_game`, `get_state` (JSON + ASCII board
  render), `legal_moves`, `make_move`, `resign`, plus a long-polling
  `wait_for_turn` (block until opponent moves — never make the model poll).
  `make_move` returns resulting state + opponent's reply when available.
  Optimize **tokens**, not wire latency: model inference dominates every
  latency budget by ~6 orders of magnitude.

## Benchmark/training design

- Check4's value as an LLM benchmark: zero training-data contamination
  (novel game), small LLM-friendly geometry, no material simplification
  (captures recycle), cheap short episodes, and a computable ground-truth
  oracle.
- **Solver**: retrograde-analysis strong solve of the **memoryless
  abstraction** (ignore prev-square memory; treat cycles as draw-valued) —
  keeps state space in tractable range (~1e9-1e10 raw, /8 symmetry). The
  backtrack memory would multiply states by ~1e9; the abstraction is a
  tight approximation for move-quality scoring. Exact-rules reference play
  comes from the search-bot ladder instead.
- **Bot ladder:** random → greedy 1-ply → minimax depth 2/4/6 → solver
  (perfect play). Gives LLMs an Elo with a true ceiling.
- **Two eval modes:** *assisted* (rules + legal move list each turn — tests
  planning) and *raw* (rules only — tests rule internalization;
  illegal-move-attempt rate is its own metric).
- **Oracle metrics:** blunder rate, mean value loss per move, held-won-
  position %, conversion length vs optimal.
- Solver doubles as a supervised-label factory; Rust core is the RL env.

## Build order / next steps

1. ~~**Rust workspace scaffolding**~~ **DONE** — `rust/` workspace,
   `check4-core` crate (dependency-free, edition 2021): rules port,
   packed state repr (83 bits in a u128: 8x5-bit pos + 8x5-bit prev +
   2 pawn-dir bits + turn bit; `pos = x*4 + y`, 16 = gutter),
   `state_key()` byte-exact to the TS format, `diff_fuzz` binary.
   - **Differential fuzz harness**: `npm run fuzz:diff` (or
     `bash scripts/diff-fuzz.sh [seed] [games] [plyCap]`) plays seeded
     random games through both engines and diffs full traces — the
     complete legal-move list *and* `stateKey()` after every ply, so any
     rules divergence is caught at the exact ply it occurs. Shared
     contract (xorshift32 PRNG, canonical move order pawn/rook/bishop/
     knight x-outer y-inner, trace format V1) is implemented in
     `rust/check4-core/src/fuzz.rs` and `scripts/diff-fuzz.js`.
   - Verified: byte-identical over 2,700 games / ~400k plies across
     seeds 42, 1337, 987654321, 0 (ply caps 200 and 400). A TS-generated
     golden trace is checked in at
     `rust/check4-core/tests/fixtures/golden_seed42.txt` so `cargo test`
     re-proves parity without Node.
   - `cargo test --manifest-path rust/Cargo.toml` — rules semantics,
     packed round-trip, golden trace. Clippy (`-D warnings`) and fmt
     clean.
2. Move notation + protocol crate (**next up**): canonical move encoding,
   Ed25519 signing, hash-chained game log.
3. MCP server (Node + napi binding, or pure TS engine to start) — gets LLM
   seats playing earliest.
4. Bot ladder + harness (ply cap lives here).
5. Solver (memoryless abstraction).
6. iroh transport + matchmaking layer (WAN lives here).
7. React Native app (last — protocol proven by then; keys in secure
   enclave, board UI uses `legalMoves` for highlighting).

## Conventions

- Repo style (TS/JS): tabs, `space-in-parens` eslint style (`fn( arg )`),
  jest tests in `tests/*.test.ts`, one concern per suite. Rust follows
  rustfmt defaults; keep clippy clean with `-D warnings`.
- Branch: currently `claude/upbeat-euler-52mn7q` (carries the full
  `claude/adoring-feynman-a0qbe1` history); push with
  `git push -u origin <branch>`.
- The tests are the spec — when code and tests disagree, the tests win
  (this is how the gutter regression was caught).
