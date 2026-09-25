//! Canonical action encoding: byte and text forms round-trip, and
//! everything outside them is rejected.

use check4_core::PieceKind;
use check4_protocol::{Action, NotationError};

fn all_moves() -> impl Iterator<Item = Action> {
    PieceKind::ALL.into_iter().flat_map(|piece| {
        (0..4u8).flat_map(move |x| (0..4u8).map(move |y| Action::Move { piece, x, y }))
    })
}

#[test]
fn byte_form_round_trips_every_action() {
    for action in all_moves().chain([Action::Resign]) {
        assert_eq!(Action::from_byte(action.to_byte()), Ok(action), "{action}");
    }
}

#[test]
fn move_bytes_are_distinct_and_low() {
    let mut seen = [false; 0x40];
    for action in all_moves() {
        let byte = action.to_byte();
        assert!(byte <= 0x3F, "{action} encodes to 0x{byte:02x}");
        assert!(!seen[usize::from(byte)], "0x{byte:02x} encodes two actions");
        seen[usize::from(byte)] = true;
    }
    assert!(seen.iter().all(|&s| s), "all 64 move bytes are used");
    assert_eq!(Action::Resign.to_byte(), 0x80);
}

#[test]
fn invalid_bytes_are_rejected() {
    for byte in 0x40..=0xFF {
        if byte == 0x80 {
            continue;
        }
        assert_eq!(
            Action::from_byte(byte),
            Err(NotationError::InvalidByte(byte)),
            "0x{byte:02x}"
        );
    }
}

#[test]
fn text_form_round_trips_every_action() {
    for action in all_moves().chain([Action::Resign]) {
        assert_eq!(action.to_string().parse(), Ok(action), "{action}");
    }
}

#[test]
fn text_form_matches_trace_shape() {
    let action = Action::Move {
        piece: PieceKind::Knight,
        x: 1,
        y: 3,
    };
    assert_eq!(action.to_string(), "knight@13");
    assert_eq!(Action::Resign.to_string(), "resign");
}

#[test]
fn invalid_text_is_rejected() {
    for text in [
        "", "queen@11", "pawn@41", "pawn@14", "pawn@1", "pawn@111", "pawn@ab", "pawn@-1", "pawn",
        "@11", "Resign", "resign ", " pawn@11", "pawn@11 ", "PAWN@11",
    ] {
        assert_eq!(
            text.parse::<Action>(),
            Err(NotationError::InvalidText(text.to_string())),
            "{text:?}"
        );
    }
}
