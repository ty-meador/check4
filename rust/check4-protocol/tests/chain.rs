//! Hash-chain semantics: honest logs verify; every class of tampering,
//! misuse and result misreporting is rejected with the right error.

mod common;

use check4_core::fuzz::{game_seed, Xorshift32};
use check4_core::{MoveError, PieceKind, Player};
use check4_protocol::chain::verify;
use check4_protocol::{
    Action, ChainError, GameResult, Genesis, MoveRecord, Recorder, Seal, SigningKey,
};
use common::{drop_at, genesis, key_one, key_two, recorded_win, winning_line};
use ed25519_dalek::Signer;

/* =========================
   Honest logs
========================= */

#[test]
fn scripted_win_records_seals_and_verifies() {
    let recorder = recorded_win();
    assert_eq!(recorder.game().winner(), Some(Player::One));

    let verified = verify(recorder.log()).expect("honest log verifies");
    assert_eq!(verified.outcome, Some(GameResult::Winner(Player::One)));
    assert!(verified.sealed);
    assert_eq!(verified.game.state_key(), recorder.game().state_key());
}

#[test]
fn empty_and_partial_logs_verify_with_no_outcome() {
    let mut recorder = Recorder::new(genesis());
    let verified = verify(recorder.log()).expect("empty log verifies");
    assert_eq!(verified.outcome, None);
    assert!(!verified.sealed);

    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();
    let verified = verify(recorder.log()).expect("one-ply log verifies");
    assert_eq!(verified.outcome, None);
}

#[test]
fn resignation_gives_the_opponent_the_win() {
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();
    recorder.record(Action::Resign, &key_two()).unwrap();

    assert_eq!(recorder.game().winner(), Some(Player::One));
    recorder
        .seal_local(GameResult::Winner(Player::One), &key_one(), &key_two())
        .unwrap();

    let verified = verify(recorder.log()).expect("resignation log verifies");
    assert_eq!(verified.outcome, Some(GameResult::Winner(Player::One)));
}

#[test]
fn adjudicated_draw_seals_an_undecided_game() {
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();
    recorder
        .seal_local(GameResult::AdjudicatedDraw, &key_one(), &key_two())
        .unwrap();

    let verified = verify(recorder.log()).expect("draw-sealed log verifies");
    assert_eq!(verified.outcome, Some(GameResult::AdjudicatedDraw));
    assert!(verified.sealed);
}

#[test]
fn self_play_with_one_key_in_both_seats_verifies() {
    let key = key_one();
    let mut recorder = Recorder::new(Genesis {
        keys: [key.verifying_key(), key.verifying_key()],
        nonce: [7; 32],
    });
    for action in winning_line() {
        recorder.record(action, &key).unwrap();
    }
    recorder
        .seal_local(GameResult::Winner(Player::One), &key, &key)
        .unwrap();
    assert!(verify(recorder.log()).is_ok());
}

#[test]
fn random_games_record_seal_and_verify() {
    for base_seed in [42u32, 1337] {
        let mut rng = Xorshift32::new(game_seed(base_seed, 0));
        let mut recorder = Recorder::new(genesis());
        let (one, two) = (key_one(), key_two());
        let ply_cap = 200;

        while recorder.game().turn_count() < ply_cap && recorder.game().winner().is_none() {
            let moves = recorder.game().legal_moves();
            if moves.is_empty() {
                break;
            }
            let mv = moves[rng.next_u32() as usize % moves.len()];
            let key = match mv.player {
                Player::One => &one,
                Player::Two => &two,
            };
            recorder
                .record(
                    Action::Move {
                        piece: mv.piece,
                        x: mv.x,
                        y: mv.y,
                    },
                    key,
                )
                .expect("enumerated legal move records");
        }

        let result = match recorder.game().winner() {
            Some(winner) => GameResult::Winner(winner),
            None => GameResult::AdjudicatedDraw,
        };
        recorder.seal_local(result, &one, &two).unwrap();

        let verified = verify(recorder.log()).expect("random game log verifies");
        assert_eq!(verified.outcome, Some(result));
        assert_eq!(verified.game.state_key(), recorder.game().state_key());
    }
}

/* =========================
   Recorder misuse
========================= */

#[test]
fn recorder_rejects_the_wrong_seat_key() {
    let mut recorder = Recorder::new(genesis());
    let err = recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_two())
        .unwrap_err();
    assert_eq!(err, ChainError::WrongKey);

    let stranger = SigningKey::from_bytes(&[0x33; 32]);
    let err = recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &stranger)
        .unwrap_err();
    assert_eq!(err, ChainError::WrongKey);
    assert!(
        recorder.log().records.is_empty(),
        "rejections append nothing"
    );
}

#[test]
fn recorder_rejects_illegal_moves_without_appending() {
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();

    let err = recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_two())
        .unwrap_err();
    assert_eq!(
        err,
        ChainError::IllegalAction {
            ply: 1,
            source: MoveError::GutterDropOnOccupiedSquare,
        }
    );
    assert_eq!(recorder.log().records.len(), 1);
}

#[test]
fn recorder_rejects_actions_on_a_finished_or_sealed_game() {
    let mut recorder = recorded_win();
    let err = recorder.record(Action::Resign, &key_two()).unwrap_err();
    assert_eq!(err, ChainError::AlreadySealed);

    // Rebuild the win without the seal: the game itself is over, so both a
    // move and a resignation report GameOver.
    let mut recorder = Recorder::new(genesis());
    let (one, two) = (key_one(), key_two());
    for (i, action) in winning_line().into_iter().enumerate() {
        let key = if i % 2 == 0 { &one } else { &two };
        recorder.record(action, key).unwrap();
    }
    for action in [Action::Resign, drop_at(PieceKind::Knight, 2, 2)] {
        let err = recorder.record(action, &two).unwrap_err();
        assert_eq!(
            err,
            ChainError::IllegalAction {
                ply: 7,
                source: MoveError::GameOver,
            }
        );
    }
}

#[test]
fn recorder_rejects_misreported_and_repeated_seals() {
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();

    // Undecided game: only a draw seals.
    let err = recorder
        .seal_local(GameResult::Winner(Player::One), &key_one(), &key_two())
        .unwrap_err();
    assert_eq!(err, ChainError::SealResultMismatch);

    // Decided game: only the actual winner seals.
    let mut recorder = recorded_win();
    let err = recorder
        .seal_local(GameResult::Winner(Player::One), &key_one(), &key_two())
        .unwrap_err();
    assert_eq!(err, ChainError::AlreadySealed);

    let mut recorder = Recorder::new(genesis());
    let (one, two) = (key_one(), key_two());
    for (i, action) in winning_line().into_iter().enumerate() {
        recorder
            .record(action, if i % 2 == 0 { &one } else { &two })
            .unwrap();
    }
    for wrong in [GameResult::Winner(Player::Two), GameResult::AdjudicatedDraw] {
        let err = recorder.seal_local(wrong, &one, &two).unwrap_err();
        assert_eq!(err, ChainError::SealResultMismatch);
    }
}

#[test]
fn seal_with_signatures_rejects_a_bad_seat_signature() {
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();

    let bytes = Seal::signing_bytes(
        &recorder.game_id(),
        &recorder.head(),
        GameResult::AdjudicatedDraw,
    );
    let err = recorder
        .seal_with_signatures(
            GameResult::AdjudicatedDraw,
            [key_one().sign(&bytes), key_one().sign(&bytes)],
        )
        .unwrap_err();
    assert_eq!(err, ChainError::BadSealSignature { seat: 1 });
    assert!(recorder.log().seal.is_none());
}

/* =========================
   Tampered logs
========================= */

#[test]
fn a_relabeled_ply_is_rejected() {
    let mut log = recorded_win().into_log();
    log.records[3].ply = 4;
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::PlyMismatch {
            expected: 3,
            found: 4
        }
    );
}

#[test]
fn a_broken_or_reordered_chain_is_rejected() {
    let mut log = recorded_win().into_log();
    log.records[2].prev_hash = [0; 32];
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::BrokenChain { ply: 2 }
    );

    let mut log = recorded_win().into_log();
    log.records.swap(2, 4);
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::PlyMismatch {
            expected: 2,
            found: 4
        }
    );
}

#[test]
fn a_replayed_log_under_a_different_genesis_is_rejected() {
    // Splice an honest chain into a different game (fresh nonce): the game
    // id changes, so record 0 no longer links.
    let mut log = recorded_win().into_log();
    log.genesis.nonce = [0x43; 32];
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::BrokenChain { ply: 0 }
    );
}

#[test]
fn a_forged_signature_or_altered_record_is_rejected() {
    // Replace a record's signature with another record's (both by Player
    // One, but over different bytes).
    let mut log = recorded_win().into_log();
    log.records[2].signature = log.records[0].signature;
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::BadSignature { ply: 2 }
    );

    // Alter a signed field (the action): the signature no longer covers it.
    let mut log = recorded_win().into_log();
    log.records[6].action = drop_at(PieceKind::Knight, 1, 3);
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::BadSignature { ply: 6 }
    );

    // Alter the state commitment: same story.
    let mut log = recorded_win().into_log();
    log.records[6].state_hash = [0; 32];
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::BadSignature { ply: 6 }
    );
}

#[test]
fn a_correctly_signed_illegal_action_is_rejected() {
    // A malicious (or buggy) client CAN produce a well-formed, correctly
    // signed record for an illegal move; replay catches it.
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();
    let mut log = recorder.log().clone();

    let action = drop_at(PieceKind::Pawn, 0, 0); // occupied square
    let game_id = log.genesis.game_id();
    let prev_hash = log.records[0].hash(&game_id);
    let state_hash = [0xAA; 32];
    let signing_bytes = MoveRecord::signing_bytes(&game_id, &prev_hash, 1, action, &state_hash);
    log.records.push(MoveRecord {
        ply: 1,
        action,
        prev_hash,
        state_hash,
        signature: key_two().sign(&signing_bytes),
    });

    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::IllegalAction {
            ply: 1,
            source: MoveError::GutterDropOnOccupiedSquare,
        }
    );
}

#[test]
fn a_correctly_signed_wrong_state_commitment_is_rejected() {
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();
    let mut log = recorder.log().clone();

    // Legal action, honest signature, dishonest resulting-state claim.
    let action = drop_at(PieceKind::Pawn, 3, 3);
    let game_id = log.genesis.game_id();
    let prev_hash = log.records[0].hash(&game_id);
    let state_hash = [0xAA; 32];
    let signing_bytes = MoveRecord::signing_bytes(&game_id, &prev_hash, 1, action, &state_hash);
    log.records.push(MoveRecord {
        ply: 1,
        action,
        prev_hash,
        state_hash,
        signature: key_two().sign(&signing_bytes),
    });

    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::StateHashMismatch { ply: 1 }
    );
}

#[test]
fn truncating_a_sealed_log_is_rejected() {
    // Dropping the winning ply leaves an undecided game under a winner
    // seal.
    let mut log = recorded_win().into_log();
    log.records.pop();
    assert_eq!(verify(&log).unwrap_err(), ChainError::SealResultMismatch);

    // For a draw-sealed log, truncation moves the head out from under the
    // seal signatures.
    let mut recorder = Recorder::new(genesis());
    recorder
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .unwrap();
    recorder
        .record(drop_at(PieceKind::Pawn, 3, 3), &key_two())
        .unwrap();
    recorder
        .seal_local(GameResult::AdjudicatedDraw, &key_one(), &key_two())
        .unwrap();
    let mut log = recorder.into_log();
    log.records.pop();
    assert_eq!(
        verify(&log).unwrap_err(),
        ChainError::BadSealSignature { seat: 0 }
    );
}

#[test]
fn an_unsealed_truncation_is_a_valid_prefix() {
    // Without a seal, a truncated log is indistinguishable from a game in
    // progress — that's exactly what the seal exists to close off.
    let mut log = recorded_win().into_log();
    log.seal = None;
    log.records.pop();
    let verified = verify(&log).expect("prefix verifies");
    assert_eq!(verified.outcome, None);
    assert!(!verified.sealed);
}
