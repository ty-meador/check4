//! Live-play chain building: `Recorder::ingest` (appending the opponent's
//! foreign-signed records), `Recorder::seal_signature` (the seal-exchange
//! half), and the standalone record wire frame.

mod common;

use check4_core::{PieceKind, Player};
use check4_protocol::{wire, ChainError, GameResult, MoveRecord, Recorder, Signature};
use common::{drop_at, genesis, key_one, key_two, winning_line};

/// Play the scripted win as two live peers: each seat records its own moves
/// and ingests the opponent's, exactly as a network session would.
fn live_peers() -> (Recorder, Recorder) {
    let mut peer_one = Recorder::new(genesis());
    let mut peer_two = Recorder::new(genesis());
    let (one, two) = (key_one(), key_two());

    for (i, action) in winning_line().into_iter().enumerate() {
        if i % 2 == 0 {
            let record = *peer_one.record(action, &one).expect("legal scripted move");
            peer_two.ingest(record).expect("honest record ingests");
        } else {
            let record = *peer_two.record(action, &two).expect("legal scripted move");
            peer_one.ingest(record).expect("honest record ingests");
        }
    }
    (peer_one, peer_two)
}

#[test]
fn live_peers_build_identical_chains() {
    let (peer_one, peer_two) = live_peers();
    assert_eq!(peer_one.head(), peer_two.head());
    assert_eq!(peer_one.log(), peer_two.log());
    assert_eq!(peer_one.game().winner(), Some(Player::One));
}

#[test]
fn seal_signature_exchange_seals_both_sides() {
    let (mut peer_one, mut peer_two) = live_peers();
    let result = GameResult::Winner(Player::One);

    // Each side signs locally and sends its signature to the other.
    let sig_one = peer_one
        .seal_signature(result, &key_one())
        .expect("true result signs");
    let sig_two = peer_two
        .seal_signature(result, &key_two())
        .expect("true result signs");

    for peer in [&mut peer_one, &mut peer_two] {
        peer.seal_with_signatures(result, [sig_one, sig_two])
            .expect("exchanged signatures seal");
    }
    assert_eq!(peer_one.log(), peer_two.log());
    check4_protocol::chain::verify(peer_one.log()).expect("sealed live log verifies");
}

#[test]
fn seal_signature_rejects_a_false_result_and_a_foreign_key() {
    let (peer_one, _) = live_peers();

    assert_eq!(
        peer_one.seal_signature(GameResult::Winner(Player::Two), &key_one()),
        Err(ChainError::SealResultMismatch)
    );
    assert_eq!(
        peer_one.seal_signature(GameResult::AdjudicatedDraw, &key_one()),
        Err(ChainError::SealResultMismatch)
    );

    let outsider = check4_protocol::SigningKey::from_bytes(&[0x99; 32]);
    assert_eq!(
        peer_one.seal_signature(GameResult::Winner(Player::One), &outsider),
        Err(ChainError::WrongKey)
    );
}

/// A record the honest side produced, for tampering with in transit.
fn honest_first_record() -> (Recorder, MoveRecord) {
    let mut sender = Recorder::new(genesis());
    let record = *sender
        .record(drop_at(PieceKind::Pawn, 0, 0), &key_one())
        .expect("legal opening drop");
    (sender, record)
}

#[test]
fn ingest_rejects_every_tampered_record_without_appending() {
    let (_, record) = honest_first_record();

    // Each tamper case runs against a fresh receiver; the receiver must be
    // unchanged (head still the game id, no records) after the rejection.
    let cases: Vec<(&str, MoveRecord, ChainError)> = vec![
        (
            "relabeled ply",
            MoveRecord { ply: 1, ..record },
            ChainError::PlyMismatch {
                expected: 0,
                found: 1,
            },
        ),
        (
            "broken chain link",
            MoveRecord {
                prev_hash: [0xAB; 32],
                ..record
            },
            ChainError::BrokenChain { ply: 0 },
        ),
        (
            "forged signature",
            MoveRecord {
                signature: Signature::from_bytes(&[0xCD; 64]),
                ..record
            },
            ChainError::BadSignature { ply: 0 },
        ),
        (
            "altered action",
            MoveRecord {
                action: drop_at(PieceKind::Rook, 0, 0),
                ..record
            },
            ChainError::BadSignature { ply: 0 },
        ),
        (
            "altered state commitment",
            MoveRecord {
                state_hash: [0xEF; 32],
                ..record
            },
            ChainError::BadSignature { ply: 0 },
        ),
    ];

    for (label, tampered, expected) in cases {
        let mut receiver = Recorder::new(genesis());
        assert_eq!(receiver.ingest(tampered), Err(expected), "{label}");
        assert_eq!(receiver.head(), receiver.game_id(), "{label}: head moved");
        assert!(receiver.log().records.is_empty(), "{label}: record kept");
    }
}

#[test]
fn ingest_rejects_a_signed_but_illegal_action() {
    // The opponent signs an action that is illegal at this position (two
    // pieces on one square): the signature verifies, the rules reject it.
    let (sender, record) = honest_first_record();
    let mut receiver = Recorder::new(genesis());
    receiver.ingest(record).expect("honest record ingests");

    // Build ply 1 by hand: signed correctly by seat two, but dropping onto
    // the occupied square. Recorder::record would refuse to produce it, so
    // forge the chain fields directly. The state hash has no legal position
    // to commit to; legality fails before the commitment is checked.
    let action = drop_at(PieceKind::Pawn, 0, 0);
    let state_hash = [0x55; 32];
    let signing_bytes =
        MoveRecord::signing_bytes(&sender.game_id(), &sender.head(), 1, action, &state_hash);
    use ed25519_dalek::Signer;
    let record = MoveRecord {
        ply: 1,
        action,
        prev_hash: sender.head(),
        state_hash,
        signature: key_two().sign(&signing_bytes),
    };

    match receiver.ingest(record) {
        Err(ChainError::IllegalAction { ply: 1, .. }) => {}
        other => panic!("expected IllegalAction, got {other:?}"),
    }
    assert_eq!(receiver.log().records.len(), 1);
}

#[test]
fn ingest_rejects_a_correctly_signed_false_state_commitment() {
    // A legal action whose state hash commits to the wrong position: the
    // signature is genuine, the commitment lies.
    let (_, honest) = honest_first_record();
    let action = honest.action;
    let genesis = genesis();
    let game_id = genesis.game_id();

    let false_hash = [0x77; 32];
    let signing_bytes = MoveRecord::signing_bytes(&game_id, &game_id, 0, action, &false_hash);
    use ed25519_dalek::Signer;
    let record = MoveRecord {
        ply: 0,
        action,
        prev_hash: game_id,
        state_hash: false_hash,
        signature: key_one().sign(&signing_bytes),
    };

    let mut receiver = Recorder::new(genesis);
    assert_eq!(
        receiver.ingest(record),
        Err(ChainError::StateHashMismatch { ply: 0 })
    );
    assert!(receiver.log().records.is_empty());
}

#[test]
fn a_sealed_recorder_ingests_nothing() {
    let (peer_one, mut peer_two) = live_peers();
    let result = GameResult::Winner(Player::One);
    let sigs = [
        peer_one.seal_signature(result, &key_one()).expect("signs"),
        peer_two.seal_signature(result, &key_two()).expect("signs"),
    ];
    peer_two
        .seal_with_signatures(result, sigs)
        .expect("exchanged signatures seal");

    let (_, record) = honest_first_record();
    assert_eq!(peer_two.ingest(record), Err(ChainError::AlreadySealed));
}

#[test]
fn record_wire_frame_round_trips() {
    let (_, record) = honest_first_record();
    let bytes = wire::record_to_bytes(&record);
    assert_eq!(bytes.len(), wire::RECORD_LEN);
    let decoded = wire::record_from_bytes(&bytes, 0).expect("frame decodes");
    assert_eq!(decoded, record);

    // Frame layout matches the record's bytes inside a whole C4L1 log.
    let mut sender = Recorder::new(genesis());
    sender
        .record(record.action, &key_one())
        .expect("legal opening drop");
    let log_bytes = wire::to_bytes(sender.log());
    let in_log = &log_bytes[4 + 96 + 4..4 + 96 + 4 + wire::RECORD_LEN];
    assert_eq!(in_log, bytes);
}

#[test]
fn record_wire_frame_rejects_an_invalid_action_byte() {
    let (_, record) = honest_first_record();
    let mut bytes = wire::record_to_bytes(&record);
    bytes[4] = 0x40; // neither a packed move (0x00..=0x3F) nor resign (0x80)
    assert_eq!(
        wire::record_from_bytes(&bytes, 7),
        Err(check4_protocol::WireError::InvalidAction { index: 7 })
    );
}
