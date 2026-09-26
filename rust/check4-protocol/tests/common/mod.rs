//! Shared fixtures for the protocol test suites.

use check4_core::PieceKind;
use check4_protocol::{Action, GameResult, Genesis, Recorder, SigningKey};

pub fn key_one() -> SigningKey {
    SigningKey::from_bytes(&[0x11; 32])
}

pub fn key_two() -> SigningKey {
    SigningKey::from_bytes(&[0x22; 32])
}

pub fn genesis() -> Genesis {
    Genesis {
        keys: [key_one().verifying_key(), key_two().verifying_key()],
        nonce: [0x42; 32],
    }
}

pub fn drop_at(piece: PieceKind, x: u8, y: u8) -> Action {
    Action::Move { piece, x, y }
}

/// The scripted seven-ply game used across suites: Player One drops down
/// column 0 while Player Two drops down column 3, and Player One's fourth
/// drop aligns the column for the win.
pub fn winning_line() -> [Action; 7] {
    [
        drop_at(PieceKind::Pawn, 0, 0),
        drop_at(PieceKind::Pawn, 3, 0),
        drop_at(PieceKind::Rook, 0, 1),
        drop_at(PieceKind::Rook, 3, 1),
        drop_at(PieceKind::Bishop, 0, 2),
        drop_at(PieceKind::Bishop, 3, 2),
        drop_at(PieceKind::Knight, 0, 3),
    ]
}

/// Record the full winning line and seal it, returning the recorder.
#[allow(dead_code)] // not every suite exercises the sealed fixture
pub fn recorded_win() -> Recorder {
    let mut recorder = Recorder::new(genesis());
    let (one, two) = (key_one(), key_two());
    for (i, action) in winning_line().into_iter().enumerate() {
        let key = if i % 2 == 0 { &one } else { &two };
        recorder
            .record(action, key)
            .expect("scripted move is legal");
    }
    recorder
        .seal_local(GameResult::Winner(check4_core::Player::One), &one, &two)
        .expect("seal matches the established winner");
    recorder
}
