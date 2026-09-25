//! Canonical encoding of game actions (wire format V1).
//!
//! An [`Action`] is what a player submits on their ply: move (or drop) one
//! of their pieces, or resign. The acting player is never part of the
//! encoding — in a signed game log it is always the player to move, and the
//! record's signature proves it.
//!
//! Two canonical forms exist, and this module is their single source of
//! truth:
//!
//! - **Byte form** ([`Action::to_byte`] / [`Action::from_byte`]) — used in
//!   signing bytes and the wire format. A move packs into the low six bits
//!   (`piece << 4 | x << 2 | y`, values `0x00..=0x3F`); resign is `0x80`.
//!   Every other byte value is invalid.
//! - **Text form** ([`Action`]'s `Display` / `FromStr`) — `<piece>@<x><y>`
//!   with the lowercase piece name (the same shape as the diff-fuzz trace's
//!   legal-move lists, e.g. `knight@13`), or `resign`.

use check4_core::PieceKind;
use std::fmt;
use std::str::FromStr;

/// The byte encoding of [`Action::Resign`].
const RESIGN_BYTE: u8 = 0x80;

/// One player's action on their ply.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Action {
    /// Move (or drop from the gutter) the acting player's `piece` to
    /// `(x, y)`.
    Move {
        /// Which of the acting player's pieces to move.
        piece: PieceKind,
        /// Target x coordinate, 0..=3.
        x: u8,
        /// Target y coordinate, 0..=3.
        y: u8,
    },
    /// Forfeit the game; the acting player's opponent wins.
    Resign,
}

/// Why an action failed to decode or parse.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum NotationError {
    /// The byte is neither a packed move (`0x00..=0x3F`) nor resign
    /// (`0x80`).
    InvalidByte(u8),
    /// The text is neither `<piece>@<x><y>` nor `resign`.
    InvalidText(String),
}

impl fmt::Display for NotationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            NotationError::InvalidByte(b) => write!(f, "invalid action byte 0x{b:02x}"),
            NotationError::InvalidText(s) => write!(f, "invalid action text {s:?}"),
        }
    }
}

impl std::error::Error for NotationError {}

impl Action {
    /// The canonical single-byte encoding.
    #[must_use]
    pub fn to_byte(self) -> u8 {
        match self {
            Action::Move { piece, x, y } => {
                let piece = PieceKind::ALL
                    .iter()
                    .position(|&k| k == piece)
                    .expect("PieceKind::ALL contains every kind") as u8;
                piece << 4 | x << 2 | y
            }
            Action::Resign => RESIGN_BYTE,
        }
    }

    /// Decode the canonical single-byte encoding.
    pub fn from_byte(byte: u8) -> Result<Action, NotationError> {
        if byte == RESIGN_BYTE {
            return Ok(Action::Resign);
        }
        if byte > 0x3F {
            return Err(NotationError::InvalidByte(byte));
        }
        Ok(Action::Move {
            piece: PieceKind::ALL[usize::from(byte >> 4)],
            x: byte >> 2 & 0b11,
            y: byte & 0b11,
        })
    }
}

impl fmt::Display for Action {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Action::Move { piece, x, y } => write!(f, "{piece}@{x}{y}"),
            Action::Resign => f.write_str("resign"),
        }
    }
}

impl FromStr for Action {
    type Err = NotationError;

    fn from_str(s: &str) -> Result<Action, NotationError> {
        if s == "resign" {
            return Ok(Action::Resign);
        }

        let invalid = || NotationError::InvalidText(s.to_string());
        let (name, target) = s.split_once('@').ok_or_else(invalid)?;
        let piece = *PieceKind::ALL
            .iter()
            .find(|k| k.name() == name)
            .ok_or_else(invalid)?;

        let digits: Vec<u8> = target
            .chars()
            .map(|c| c.to_digit(10).map(|d| d as u8))
            .collect::<Option<_>>()
            .ok_or_else(invalid)?;
        match digits[..] {
            [x, y] if x < 4 && y < 4 => Ok(Action::Move { piece, x, y }),
            _ => Err(invalid()),
        }
    }
}
