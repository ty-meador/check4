#!/usr/bin/env bash
# Differential fuzz harness: build both engines, run the shared CONTRACT (V1)
# trace through each with identical args, and diff the outputs. The TS engine
# is normative; the Rust engine must match byte-for-byte.
#
# Usage: scripts/diff-fuzz.sh [seed] [games] [ply-cap]
#   or:  SEED=42 GAMES=200 PLY_CAP=200 scripts/diff-fuzz.sh
# Positional args override env vars; defaults are 42/200/200.
set -euo pipefail

REPO_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

SEED="${1:-${SEED:-42}}"
GAMES="${2:-${GAMES:-200}}"
PLY_CAP="${3:-${PLY_CAP:-200}}"

WORK_DIR="$( mktemp -d "${TMPDIR:-/tmp}/check4-diff-fuzz.XXXXXX" )"
trap 'rm -rf "$WORK_DIR"' EXIT
TS_TRACE="$WORK_DIR/ts-trace.txt"
RUST_TRACE="$WORK_DIR/rust-trace.txt"
DIFF_OUT="$WORK_DIR/diff.txt"

echo "diff-fuzz: building TypeScript engine..." >&2
npm run build --prefix "$REPO_ROOT" >&2

echo "diff-fuzz: building Rust engine..." >&2
cargo build --release --manifest-path "$REPO_ROOT/rust/Cargo.toml" >&2

echo "diff-fuzz: running both drivers (seed=$SEED games=$GAMES ply-cap=$PLY_CAP)..." >&2
node "$REPO_ROOT/scripts/diff-fuzz.js" --seed "$SEED" --games "$GAMES" --ply-cap "$PLY_CAP" > "$TS_TRACE"
cargo run --release --quiet --manifest-path "$REPO_ROOT/rust/Cargo.toml" -- \
	--seed "$SEED" --games "$GAMES" --ply-cap "$PLY_CAP" > "$RUST_TRACE"

if diff "$TS_TRACE" "$RUST_TRACE" > "$DIFF_OUT"; then
	PLY_COUNT="$( grep -cE '^G[0-9]+ P[0-9]+ ' "$TS_TRACE" || true )"
	GAME_COUNT="$( grep -cE '^G[0-9]+ END ' "$TS_TRACE" || true )"
	echo "PASS: $GAME_COUNT games / $PLY_COUNT plies identical between TS and Rust (seed=$SEED, ply-cap=$PLY_CAP)."
else
	echo "FAIL: TS and Rust traces differ (seed=$SEED games=$GAMES ply-cap=$PLY_CAP). First 20 differing lines:"
	head -n 20 "$DIFF_OUT"
	exit 1
fi
