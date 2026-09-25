//! Packed 83-bit state representation, sized for the future solver.
//!
//! Layout inside the returned `u128` (bit 0 = least significant):
//!
//! | bits    | contents                                                    |
//! |---------|-------------------------------------------------------------|
//! | 0..40   | 8 x 5-bit piece positions, piece `i` at bit `5 * i`         |
//! | 40..80  | 8 x 5-bit prev squares, piece `i` at bit `40 + 5 * i`       |
//! | 80      | Player One's pawn direction (0 = up, 1 = down)              |
//! | 81      | Player Two's pawn direction (0 = up, 1 = down)              |
//! | 82      | turn (0 = Player One to move)                               |
//! | 83..128 | unused, always zero                                         |
//!
//! Each 5-bit square field holds `x * 4 + y` (0..=15) or 16 for the gutter.
//! Pieces are ordered Player One's pawn, rook, bishop, knight, then Player
//! Two's in the same order.

use crate::game::{Direction, Game, PieceState, Player};
use std::fmt;

const GUTTER_CODE: u8 = 16;
const PREV_BASE_BIT: u32 = 40;
const P1_PAWN_DIR_BIT: u32 = 80;
const P2_PAWN_DIR_BIT: u32 = 81;
const TURN_BIT: u32 = 82;
const PAYLOAD_BITS: u32 = 83;

/// Why a packed `u128` could not be decoded into a [`Game`].
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum UnpackError {
    /// A 5-bit square field held an invalid code (17..=31).
    InvalidSquareCode {
        /// The bit offset of the offending field inside the `u128`.
        bit_offset: u32,
        /// The invalid 5-bit value.
        code: u8,
    },
    /// One or more bits above the 83-bit payload were set.
    UnusedBitsSet,
}

impl fmt::Display for UnpackError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UnpackError::InvalidSquareCode { bit_offset, code } => write!(
                f,
                "invalid 5-bit square code {code} at bit offset {bit_offset} (valid codes are 0..=16)"
            ),
            UnpackError::UnusedBitsSet => {
                write!(f, "bits above the 83-bit payload are set")
            }
        }
    }
}

impl std::error::Error for UnpackError {}

fn encode_square(square: Option<(u8, u8)>) -> u128 {
    match square {
        Some((x, y)) => u128::from(x * 4 + y),
        None => u128::from(GUTTER_CODE),
    }
}

fn decode_square(bits: u128, bit_offset: u32) -> Result<Option<(u8, u8)>, UnpackError> {
    let code = ((bits >> bit_offset) & 0x1F) as u8;
    match code {
        0..=15 => Ok(Some((code / 4, code % 4))),
        GUTTER_CODE => Ok(None),
        _ => Err(UnpackError::InvalidSquareCode { bit_offset, code }),
    }
}

impl Game {
    /// Pack the position into 83 bits of a `u128` (see the module docs for
    /// the exact layout).
    ///
    /// Everything that [`Game::state_key`] covers is preserved except the
    /// winner: `turn_count` is not stored at all, and the winner is
    /// recomputed by [`Game::unpack`] from piece alignment. For every state
    /// reachable by play this reproduces the winner exactly (only the
    /// player who just moved can be aligned); a winner declared by
    /// [`Game::forfeit`] is not recoverable from the packed form — such a
    /// game round-trips as unfinished, or, if the forfeit overwrote an
    /// alignment win (forfeit has no game-over guard, matching TS), with
    /// the alignment winner restored instead.
    #[must_use]
    pub fn pack(&self) -> u128 {
        let mut bits = 0u128;

        for (i, piece) in self.pieces.iter().enumerate() {
            bits |= encode_square(piece.pos) << (5 * i as u32);
            bits |= encode_square(piece.prev) << (PREV_BASE_BIT + 5 * i as u32);
        }

        if self.pawn_dirs[0] == Direction::Down {
            bits |= 1 << P1_PAWN_DIR_BIT;
        }
        if self.pawn_dirs[1] == Direction::Down {
            bits |= 1 << P2_PAWN_DIR_BIT;
        }
        if self.turn == Player::Two {
            bits |= 1 << TURN_BIT;
        }

        bits
    }

    /// Decode a value produced by [`Game::pack`].
    ///
    /// `turn_count` is not stored in the packed form and comes back as 0.
    /// The winner is recomputed: if the last mover (the opponent of the
    /// side to move) has all four pieces aligned, they are the winner. Both
    /// are documented [`Game::pack`] round-trip caveats; `state_key()` is
    /// nevertheless stable across `pack`/`unpack` for every state reachable
    /// by play, because the key excludes `turn_count` and alignment fully
    /// determines a played win.
    pub fn unpack(bits: u128) -> Result<Game, UnpackError> {
        if bits >> PAYLOAD_BITS != 0 {
            return Err(UnpackError::UnusedBitsSet);
        }

        let mut pieces = [PieceState::GUTTER; 8];
        for (i, piece) in pieces.iter_mut().enumerate() {
            piece.pos = decode_square(bits, 5 * i as u32)?;
            piece.prev = decode_square(bits, PREV_BASE_BIT + 5 * i as u32)?;
        }

        let direction = |bit: u32| {
            if bits >> bit & 1 == 1 {
                Direction::Down
            } else {
                Direction::Up
            }
        };

        let mut game = Game {
            turn: if bits >> TURN_BIT & 1 == 1 {
                Player::Two
            } else {
                Player::One
            },
            turn_count: 0,
            winner: None,
            pieces,
            pawn_dirs: [direction(P1_PAWN_DIR_BIT), direction(P2_PAWN_DIR_BIT)],
        };

        let last_mover = game.turn.opponent();
        if game.player_aligned(last_mover) {
            game.winner = Some(last_mover);
        }

        Ok(game)
    }
}
