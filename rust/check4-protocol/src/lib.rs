//! The Check4 wire protocol (V1): canonical move encoding, Ed25519-signed
//! hash-chained game logs, and their portable binary serialization.
//!
//! This crate is the single source of truth for the protocol's byte-level
//! formats; the rules themselves live in `check4-core` (itself a proven
//! replica of the repo's normative TypeScript engine).
//!
//! Design (settled in the project handoff):
//!
//! - **Identity is a keypair.** A player *is* an Ed25519 public key —
//!   human, LLM seat, or bot; all identical at the protocol level.
//! - **Tamper evidence, not consensus.** Check4 is deterministic and
//!   perfect-information, so every party can validate every move locally.
//!   The hash chain plus signatures give tamper evidence, non-repudiation
//!   and verifiable replay; a finished, dual-signed log is a portable
//!   artifact that doubles as provenance-verified training data.
//!
//! Module map:
//!
//! - [`notation`] — [`Action`](notation::Action) and its canonical byte and
//!   text forms.
//! - [`chain`] — [`Genesis`](chain::Genesis) /
//!   [`MoveRecord`](chain::MoveRecord) / [`Seal`](chain::Seal), the
//!   writer-side [`Recorder`](chain::Recorder), and full replay
//!   [`verify`](chain::verify).
//! - [`wire`] — [`to_bytes`](wire::to_bytes) / [`from_bytes`](wire::from_bytes)
//!   for whole logs.

#![warn(missing_docs)]

pub mod chain;
pub mod notation;
pub mod wire;

pub use chain::{
    ChainError, GameLog, GameResult, Genesis, MoveRecord, Recorder, Seal, VerifiedGame,
};
pub use notation::{Action, NotationError};
pub use wire::WireError;

// Re-export the signature types that appear in this crate's public API, so
// downstream users need not add their own ed25519-dalek dependency to hold
// keys.
pub use ed25519_dalek::{Signature, SigningKey, VerifyingKey};
