//! Portable binary serialization of a [`GameLog`] (wire format V1).
//!
//! Layout (all integers big-endian, records fixed-size):
//!
//! ```text
//! "C4L1"                       magic, 4 bytes
//! pubkey seat 0                32
//! pubkey seat 1                32
//! nonce                        32
//! record count                 u32
//! records, each:
//!   ply                        u32
//!   action byte                1
//!   prev_hash                  32
//!   state_hash                 32
//!   signature                  64
//! seal flag                    1  (0 = none, 1 = present)
//! if sealed:
//!   result byte                1  (0 draw, 1/2 winner)
//!   signature seat 0           64
//!   signature seat 1           64
//! ```
//!
//! [`from_bytes`] validates structure only (magic, lengths, decodable keys,
//! action and result bytes); chain semantics are [`crate::chain::verify`]'s
//! job.

use crate::chain::{GameLog, Genesis, MoveRecord, Seal};
use crate::notation::Action;
use ed25519_dalek::{Signature, VerifyingKey};
use std::fmt;

const MAGIC: &[u8; 4] = b"C4L1";

/// The fixed byte length of one encoded [`MoveRecord`]: ply (u32) +
/// action byte + prev_hash + state_hash + signature.
pub const RECORD_LEN: usize = 4 + 1 + 32 + 32 + 64;

/// Why a byte string failed to decode as a [`GameLog`].
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum WireError {
    /// The input does not start with the `C4L1` magic.
    BadMagic,
    /// The input is shorter than its structure requires.
    Truncated,
    /// The input has bytes beyond the end of the log.
    TrailingBytes,
    /// A seat's public key bytes are not a valid Ed25519 key.
    InvalidKey {
        /// The offending seat, 0 or 1.
        seat: usize,
    },
    /// A record's action byte is not a canonical action.
    InvalidAction {
        /// The offending record's position.
        index: u32,
    },
    /// The seal flag or result byte is out of range.
    InvalidSeal,
}

impl fmt::Display for WireError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WireError::BadMagic => write!(f, "not a C4L1 game log"),
            WireError::Truncated => write!(f, "log is truncated"),
            WireError::TrailingBytes => write!(f, "log has trailing bytes"),
            WireError::InvalidKey { seat } => write!(f, "seat {seat} public key is invalid"),
            WireError::InvalidAction { index } => {
                write!(f, "record {index} action byte is invalid")
            }
            WireError::InvalidSeal => write!(f, "seal flag or result byte is invalid"),
        }
    }
}

impl std::error::Error for WireError {}

/// Serialize one record to its canonical fixed-size layout (the same bytes
/// it occupies inside a `C4L1` log; also the live-play network frame).
#[must_use]
pub fn record_to_bytes(record: &MoveRecord) -> [u8; RECORD_LEN] {
    let mut out = [0u8; RECORD_LEN];
    out[0..4].copy_from_slice(&record.ply.to_be_bytes());
    out[4] = record.action.to_byte();
    out[5..37].copy_from_slice(&record.prev_hash);
    out[37..69].copy_from_slice(&record.state_hash);
    out[69..133].copy_from_slice(&record.signature.to_bytes());
    out
}

/// Deserialize one record from its canonical fixed-size layout. Structural
/// validation only; `index` is the record's position in its log (0 for a
/// standalone frame), used to attribute [`WireError::InvalidAction`].
pub fn record_from_bytes(bytes: &[u8; RECORD_LEN], index: u32) -> Result<MoveRecord, WireError> {
    let ply = u32::from_be_bytes(bytes[0..4].try_into().expect("fixed slice"));
    let action = Action::from_byte(bytes[4]).map_err(|_| WireError::InvalidAction { index })?;
    let prev_hash: [u8; 32] = bytes[5..37].try_into().expect("fixed slice");
    let state_hash: [u8; 32] = bytes[37..69].try_into().expect("fixed slice");
    let signature = Signature::from_bytes(&bytes[69..133].try_into().expect("fixed slice"));
    Ok(MoveRecord {
        ply,
        action,
        prev_hash,
        state_hash,
        signature,
    })
}

/// Serialize a log to the canonical V1 byte layout.
#[must_use]
pub fn to_bytes(log: &GameLog) -> Vec<u8> {
    let seal_len = match log.seal {
        Some(_) => 1 + 64 + 64,
        None => 0,
    };
    let mut out = Vec::with_capacity(4 + 96 + 4 + log.records.len() * RECORD_LEN + 1 + seal_len);

    out.extend_from_slice(MAGIC);
    out.extend_from_slice(log.genesis.keys[0].as_bytes());
    out.extend_from_slice(log.genesis.keys[1].as_bytes());
    out.extend_from_slice(&log.genesis.nonce);
    out.extend_from_slice(&(log.records.len() as u32).to_be_bytes());

    for record in &log.records {
        out.extend_from_slice(&record_to_bytes(record));
    }

    match &log.seal {
        None => out.push(0),
        Some(seal) => {
            out.push(1);
            out.push(seal.result.to_byte());
            out.extend_from_slice(&seal.signatures[0].to_bytes());
            out.extend_from_slice(&seal.signatures[1].to_bytes());
        }
    }

    out
}

/// A cursor over the input that fails with [`WireError::Truncated`] instead
/// of panicking.
struct Reader<'a> {
    bytes: &'a [u8],
}

impl<'a> Reader<'a> {
    fn take<const N: usize>(&mut self) -> Result<[u8; N], WireError> {
        let (head, rest) = self.bytes.split_at_checked(N).ok_or(WireError::Truncated)?;
        self.bytes = rest;
        Ok(head.try_into().expect("split_at_checked returned N bytes"))
    }

    fn take_u32(&mut self) -> Result<u32, WireError> {
        Ok(u32::from_be_bytes(self.take::<4>()?))
    }
}

/// Deserialize the canonical V1 byte layout. Structural validation only —
/// run [`crate::chain::verify`] on the result to check the chain itself.
pub fn from_bytes(bytes: &[u8]) -> Result<GameLog, WireError> {
    let mut r = Reader { bytes };

    if &r.take::<4>()? != MAGIC {
        return Err(WireError::BadMagic);
    }

    let key0 = VerifyingKey::from_bytes(&r.take::<32>()?)
        .map_err(|_| WireError::InvalidKey { seat: 0 })?;
    let key1 = VerifyingKey::from_bytes(&r.take::<32>()?)
        .map_err(|_| WireError::InvalidKey { seat: 1 })?;
    let keys = [key0, key1];
    let nonce = r.take::<32>()?;
    let genesis = Genesis { keys, nonce };

    let count = r.take_u32()?;
    // A count the input cannot possibly hold is truncation; checking first
    // keeps a hostile header from reserving unbounded memory.
    if r.bytes.len() < (count as usize).saturating_mul(RECORD_LEN) {
        return Err(WireError::Truncated);
    }
    let mut records = Vec::with_capacity(count as usize);
    for index in 0..count {
        records.push(record_from_bytes(&r.take::<RECORD_LEN>()?, index)?);
    }

    let seal = match r.take::<1>()?[0] {
        0 => None,
        1 => {
            let result = crate::chain::GameResult::from_byte(r.take::<1>()?[0])
                .ok_or(WireError::InvalidSeal)?;
            let signatures = [
                Signature::from_bytes(&r.take::<64>()?),
                Signature::from_bytes(&r.take::<64>()?),
            ];
            Some(Seal { result, signatures })
        }
        _ => return Err(WireError::InvalidSeal),
    };

    if !r.bytes.is_empty() {
        return Err(WireError::TrailingBytes);
    }

    Ok(GameLog {
        genesis,
        records,
        seal,
    })
}
