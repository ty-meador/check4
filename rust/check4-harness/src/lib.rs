//! # check4-harness
//!
//! The Check4 bot ladder and self-play harness (build-order item 4).
//!
//! The ladder gives LLM seats opponents of known, increasing strength —
//! random → greedy 1-ply → minimax depth 2/4/6 — so an LLM's results map
//! onto an Elo-style scale with meaningful rungs. The harness runs
//! ply-capped matches and round-robin tournaments between any two
//! [`Bot`]s; the solver (build-order item 5) will top the ladder with
//! perfect play.
//!
//! **The ply cap lives here, not in the rules.** Check4's no-backtrack
//! rule deliberately does not guarantee finite games (triangulation stays
//! legal), so the harness adjudicates a draw at the cap
//! ([`DEFAULT_PLY_CAP`], ~200 plies) and on the theoretical no-legal-move
//! stalemate. Game rules stay clean; benchmarks always terminate.
//!
//! Everything here is deterministic: the random bot runs the fuzz-contract
//! xorshift32, search breaks ties by the engine's canonical move order,
//! and match seeds derive per game exactly like the fuzz harness's. The
//! same seeds always reproduce the same tournament.

pub mod bot;
pub mod eval;
pub mod harness;
pub mod minimax;

pub use bot::{Bot, RandomBot};
pub use harness::{
    play_game, play_match, round_robin, BotFactory, GameOutcome, MatchResult, Standing,
    DEFAULT_PLY_CAP,
};
pub use minimax::MinimaxBot;
