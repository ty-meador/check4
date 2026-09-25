//! Wire serialization: logs round-trip byte-exactly, and structurally
//! invalid inputs are rejected without touching chain verification.

mod common;

use check4_protocol::chain::verify;
use check4_protocol::wire::{from_bytes, to_bytes, WireError};
use check4_protocol::{GameResult, Recorder};
use common::{genesis, key_one, key_two, recorded_win};

#[test]
fn a_sealed_log_round_trips_and_still_verifies() {
    let log = recorded_win().into_log();
    let bytes = to_bytes(&log);
    let decoded = from_bytes(&bytes).expect("canonical bytes decode");
    assert_eq!(decoded, log);
    assert!(verify(&decoded).is_ok());
    assert_eq!(to_bytes(&decoded), bytes, "re-encoding is byte-identical");
}

#[test]
fn unsealed_and_empty_logs_round_trip() {
    let recorder = Recorder::new(genesis());
    let log = recorder.into_log();
    assert_eq!(from_bytes(&to_bytes(&log)).unwrap(), log);

    let mut recorder = Recorder::new(genesis());
    recorder
        .record(
            common::drop_at(check4_core::PieceKind::Pawn, 0, 0),
            &key_one(),
        )
        .unwrap();
    recorder
        .seal_local(GameResult::AdjudicatedDraw, &key_one(), &key_two())
        .unwrap();
    let log = recorder.into_log();
    assert_eq!(from_bytes(&to_bytes(&log)).unwrap(), log);
}

#[test]
fn bad_magic_is_rejected() {
    let mut bytes = to_bytes(&recorded_win().into_log());
    bytes[0] = b'X';
    assert_eq!(from_bytes(&bytes), Err(WireError::BadMagic));
}

#[test]
fn truncation_anywhere_is_rejected() {
    let bytes = to_bytes(&recorded_win().into_log());
    for len in [0, 3, 4, 40, 100, bytes.len() - 1] {
        assert_eq!(
            from_bytes(&bytes[..len]),
            Err(WireError::Truncated),
            "len {len}"
        );
    }
}

#[test]
fn an_oversized_record_count_is_truncation_not_an_allocation() {
    let mut bytes = to_bytes(&Recorder::new(genesis()).into_log());
    // Patch the record count (right after magic + two keys + nonce) to a
    // number the input cannot hold.
    bytes[100..104].copy_from_slice(&u32::MAX.to_be_bytes());
    assert_eq!(from_bytes(&bytes), Err(WireError::Truncated));
}

#[test]
fn trailing_bytes_are_rejected() {
    let mut bytes = to_bytes(&recorded_win().into_log());
    bytes.push(0);
    assert_eq!(from_bytes(&bytes), Err(WireError::TrailingBytes));
}

#[test]
fn an_invalid_action_byte_is_rejected() {
    let log = recorded_win().into_log();
    let mut bytes = to_bytes(&log);
    // Record 0's action byte sits after the header (104 bytes) and its ply.
    bytes[104 + 4] = 0x7F;
    assert_eq!(
        from_bytes(&bytes),
        Err(WireError::InvalidAction { index: 0 })
    );
}

#[test]
fn an_invalid_seal_flag_or_result_is_rejected() {
    let mut recorder = Recorder::new(genesis());
    recorder
        .seal_local(GameResult::AdjudicatedDraw, &key_one(), &key_two())
        .unwrap();
    let bytes = to_bytes(&recorder.into_log());

    let flag_at = bytes.len() - (1 + 1 + 64 + 64);
    let mut tampered = bytes.clone();
    tampered[flag_at] = 2;
    assert_eq!(from_bytes(&tampered), Err(WireError::InvalidSeal));

    let mut tampered = bytes;
    tampered[flag_at + 1] = 3;
    assert_eq!(from_bytes(&tampered), Err(WireError::InvalidSeal));
}

#[test]
fn an_invalid_seat_key_is_rejected() {
    // Find a compressed-point encoding that decodes to no curve point
    // (roughly half of all y candidates are off-curve).
    let bad_key = (0u8..=255)
        .map(|y| {
            let mut bytes = [0u8; 32];
            bytes[0] = y;
            bytes
        })
        .find(|bytes| check4_protocol::VerifyingKey::from_bytes(bytes).is_err())
        .expect("some single-byte y is off-curve");

    let mut bytes = to_bytes(&Recorder::new(genesis()).into_log());
    bytes[4..36].copy_from_slice(&bad_key);
    assert_eq!(from_bytes(&bytes), Err(WireError::InvalidKey { seat: 0 }));
}
