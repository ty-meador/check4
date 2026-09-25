//! # check4-core
//!
//! The Check4 rules engine in Rust: a proven-equivalent replica of the
//! repo's normative TypeScript engine (`src/Check4.ts` / `src/Pieces.ts`).
//!
//! Check4 is a two-player 4x4 abstract strategy game. Each player controls
//! four chess-flavored pieces (pawn, rook, bishop, knight); all pieces start
//! in the gutter (off the board), captures send pieces back to the gutter,
//! and a player wins by aligning all four pieces on a row, column or either
//! diagonal. A piece may never move straight back to the one square it just
//! left (the no-backtrack rule; the gutter counts as a position).
//!
//! Equivalence with the TypeScript engine is enforced by differential
//! fuzzing: [`fuzz::run_trace`] implements the shared V1 trace contract, and
//! traces from both engines must match byte for byte. [`Game::state_key`]
//! reproduces the TypeScript `stateKey()` format exactly.
//!
//! The crate is dependency-free. It is the future home of the solver's
//! packed state representation ([`Game::pack`] / [`Game::unpack`]) and will
//! later grow napi and WASM faces.
//!
//! ```
//! use check4_core::{Game, Move, PieceKind, Player};
//!
//! let mut game = Game::new();
//! assert_eq!(game.legal_moves().len(), 64); // 4 gutter pieces x 16 squares
//!
//! game.take_turn(Move { player: Player::One, piece: PieceKind::Pawn, x: 1, y: 3 })
//!     .unwrap();
//! assert_eq!(game.state_key(), "t2|w-|13--,----,----,----,d|----,----,----,----,d");
//! ```

mod game;
mod packed;
mod symmetry;

pub mod fuzz;

pub use symmetry::Transform;

pub use game::{
    Direction, Game, GameSetup, Move, MoveError, PieceKind, PieceSetup, Player, SetupError,
    BOARD_SIZE,
};
pub use packed::UnpackError;
