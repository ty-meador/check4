//! Live session semantics over in-memory pipes: handshake agreement,
//! record exchange with on-arrival verification, the seal exchange, and
//! rejection of hostile peers.

use std::time::Duration;

use check4_core::{PieceKind, Player};
use check4_net::identity::Identity;
use check4_net::session::{GameSession, SessionError, VERSION};
use check4_protocol::chain::verify;
use check4_protocol::{Action, ChainError};
use tokio::io::{duplex, split, AsyncReadExt, AsyncWriteExt, ReadHalf, WriteHalf};
use tokio::time::timeout;

type Pipe = tokio::io::DuplexStream;
type Session = GameSession<ReadHalf<Pipe>, WriteHalf<Pipe>>;

fn identities() -> (Identity, Identity) {
    (
        Identity::from_seed([0x11; 32]),
        Identity::from_seed([0x22; 32]),
    )
}

const NONCE: [u8; 32] = [0x42; 32];

/// Handshake a host/joiner pair over an in-memory pipe.
async fn sessions(host_seat: Player) -> (Session, Session) {
    let (host_pipe, join_pipe) = duplex(4096);
    let (host_id, join_id) = identities();

    let (host_read, host_write) = split(host_pipe);
    let (join_read, join_write) = split(join_pipe);

    let host = GameSession::host(
        host_read,
        host_write,
        host_id.signing_key().clone(),
        join_id.verifying_key(),
        host_seat,
        NONCE,
    );
    let join = GameSession::join(
        join_read,
        join_write,
        join_id.signing_key().clone(),
        host_id.verifying_key(),
    );

    let (host, join) = tokio::join!(host, join);
    (host.expect("host handshake"), join.expect("join handshake"))
}

fn drop_at(piece: PieceKind, x: u8, y: u8) -> Action {
    Action::Move { piece, x, y }
}

/// The scripted seven-ply win: Player One drops down column 0, Player Two
/// down column 3; One's fourth drop aligns the column.
fn winning_line() -> [Action; 7] {
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

/// Drive one side of a live game: play scripted actions on our turns,
/// ingest the opponent's otherwise, then run the seal exchange.
async fn drive(
    mut session: Session,
    script: Vec<Action>,
) -> Result<check4_protocol::GameLog, SessionError> {
    let mut next = script.into_iter();
    while session.game().winner().is_none() {
        if session.my_turn() {
            session
                .play(next.next().expect("script covers our turns"))
                .await?;
        } else {
            session.wait_for_move().await?;
        }
    }
    session.finish().await
}

/// Split the full move script into per-seat scripts (plies alternate,
/// Player One first).
fn per_seat(actions: &[Action], seat: Player) -> Vec<Action> {
    let parity = match seat {
        Player::One => 0,
        Player::Two => 1,
    };
    actions
        .iter()
        .copied()
        .enumerate()
        .filter(|(i, _)| i % 2 == parity)
        .map(|(_, a)| a)
        .collect()
}

#[tokio::test]
async fn handshake_agrees_on_genesis_and_seats() {
    for host_seat in [Player::One, Player::Two] {
        let (host, join) = sessions(host_seat).await;
        assert_eq!(host.seat(), host_seat);
        assert_eq!(join.seat(), host_seat.opponent());
        assert_eq!(host.genesis(), join.genesis());
        assert_eq!(host.genesis().nonce, NONCE);

        let (host_id, join_id) = identities();
        assert_eq!(host.genesis().key(host_seat), &host_id.verifying_key());
        assert_eq!(
            host.genesis().key(host_seat.opponent()),
            &join_id.verifying_key()
        );
    }
}

#[tokio::test]
async fn a_full_game_plays_seals_and_verifies_on_both_sides() {
    let (host, join) = sessions(Player::One).await;
    let script = winning_line();

    let host_task = drive(host, per_seat(&script, Player::One));
    let join_task = drive(join, per_seat(&script, Player::Two));
    let (host_log, join_log) = timeout(Duration::from_secs(10), async {
        tokio::join!(host_task, join_task)
    })
    .await
    .expect("game completes");

    let host_log = host_log.expect("host side completes");
    let join_log = join_log.expect("join side completes");
    assert_eq!(host_log, join_log);

    let verified = verify(&host_log).expect("live log verifies");
    assert!(verified.sealed);
    assert_eq!(
        verified.outcome,
        Some(check4_protocol::GameResult::Winner(Player::One))
    );
}

#[tokio::test]
async fn resignation_ends_and_seals_the_game() {
    let (host, join) = sessions(Player::One).await;

    // Host (Player One) opens, joiner resigns on its first turn.
    let host_task = drive(host, vec![drop_at(PieceKind::Pawn, 1, 1)]);
    let join_task = drive(join, vec![Action::Resign]);
    let (host_log, join_log) = timeout(Duration::from_secs(10), async {
        tokio::join!(host_task, join_task)
    })
    .await
    .expect("game completes");

    let log = host_log.expect("host side completes");
    assert_eq!(log, join_log.expect("join side completes"));
    let verified = verify(&log).expect("resigned log verifies");
    assert_eq!(
        verified.outcome,
        Some(check4_protocol::GameResult::Winner(Player::One))
    );
}

#[tokio::test]
async fn a_long_random_exchange_stays_verified_across_the_wire() {
    // Both sides pick pseudo-random legal moves for 40 plies (captures,
    // drops and no-backtrack all cross the wire), then the side to move
    // resigns. Deterministic via the shared fuzz-contract PRNG.
    let (host, join) = sessions(Player::One).await;

    async fn drive_random(mut session: Session, seed: u32) -> check4_protocol::GameLog {
        let mut rng = check4_core::fuzz::Xorshift32::new(seed);
        loop {
            if session.game().winner().is_some() {
                break;
            }
            if session.my_turn() {
                if session.game().turn_count() >= 40 {
                    session.play(Action::Resign).await.expect("resign is legal");
                    break;
                }
                let moves = session.game().legal_moves();
                assert!(!moves.is_empty(), "no theoretical stalemate expected here");
                let pick = moves[(rng.next_u32() as usize) % moves.len()];
                session
                    .play(Action::Move {
                        piece: pick.piece,
                        x: pick.x,
                        y: pick.y,
                    })
                    .await
                    .expect("legal move plays");
            } else {
                session
                    .wait_for_move()
                    .await
                    .expect("opponent move ingests");
            }
        }
        session.finish().await.expect("seal exchange completes")
    }

    let (host_log, join_log) = timeout(Duration::from_secs(30), async {
        tokio::join!(drive_random(host, 7), drive_random(join, 1337))
    })
    .await
    .expect("random game completes");

    assert_eq!(host_log, join_log);
    let verified = verify(&host_log).expect("random live log verifies");
    assert!(verified.sealed);
}

#[tokio::test]
async fn the_host_rejects_a_version_mismatch() {
    let (host_pipe, mut attacker) = duplex(4096);
    let (host_id, join_id) = identities();
    let (host_read, host_write) = split(host_pipe);

    let host = GameSession::host(
        host_read,
        host_write,
        host_id.signing_key().clone(),
        join_id.verifying_key(),
        Player::One,
        NONCE,
    );
    let hostile_hello = async {
        attacker.write_all(&[0x01, VERSION + 1]).await.unwrap();
        attacker
    };

    let (host, _attacker) = tokio::join!(host, hostile_hello);
    match host {
        Err(SessionError::VersionMismatch { ours, theirs }) => {
            assert_eq!(ours, VERSION);
            assert_eq!(theirs, VERSION + 1);
        }
        other => panic!("expected VersionMismatch, got {other:?}"),
    }
}

#[tokio::test]
async fn a_peer_signing_with_a_key_other_than_its_authenticated_one_is_rejected() {
    // The attacker completes an honest joiner handshake, but signs its
    // move with a key that is not the one the transport authenticated.
    // Its forged genesis diverges from the host's, so its very first
    // record fails the chain check on arrival (and could only trade that
    // for BadSignature, never acceptance).
    let (host_pipe, attacker_pipe) = duplex(4096);
    let (host_id, join_id) = identities();
    let wrong_key = Identity::from_seed([0x99; 32]);

    let (host_read, host_write) = split(host_pipe);
    let (attacker_read, attacker_write) = split(attacker_pipe);

    let host = GameSession::host(
        host_read,
        host_write,
        host_id.signing_key().clone(),
        join_id.verifying_key(),
        Player::Two, // attacker moves first
        NONCE,
    );
    // The attacker runs a genuine join handshake, then builds its session
    // as if its seat key were `wrong_key`.
    let attacker = GameSession::join(
        attacker_read,
        attacker_write,
        wrong_key.signing_key().clone(),
        host_id.verifying_key(),
    );

    let (host, attacker) = tokio::join!(host, attacker);
    let mut host = host.expect("host handshake");
    let mut attacker = attacker.expect("attacker handshake");

    // The attacker's own recorder accepts the move (its genesis lies about
    // its seat key), but the host verifies against the authenticated key.
    attacker
        .play(drop_at(PieceKind::Pawn, 0, 0))
        .await
        .expect("attacker signs locally");

    match host.wait_for_move().await {
        Err(SessionError::Chain(ChainError::BrokenChain { ply: 0 })) => {}
        other => panic!("expected BrokenChain, got {other:?}"),
    }
}

#[tokio::test]
async fn garbage_after_the_handshake_is_an_unexpected_message() {
    let (host_pipe, attacker_pipe) = duplex(4096);
    let (host_id, join_id) = identities();

    let (host_read, host_write) = split(host_pipe);
    let (mut attacker_read, mut attacker_write) = split(attacker_pipe);

    let host = GameSession::host(
        host_read,
        host_write,
        host_id.signing_key().clone(),
        join_id.verifying_key(),
        Player::Two,
        NONCE,
    );
    let attacker = async {
        attacker_write.write_all(&[0x01, VERSION]).await.unwrap();
        let mut offer = [0u8; 35];
        attacker_read.read_exact(&mut offer).await.unwrap();
        attacker_write.write_all(&[0x03]).await.unwrap();
        // Not a RECORD tag.
        attacker_write.write_all(&[0x7F]).await.unwrap();
    };

    let (host, ()) = tokio::join!(host, attacker);
    let mut host = host.expect("host handshake");
    match host.wait_for_move().await {
        Err(SessionError::UnexpectedMessage {
            expected: "RECORD",
            found: 0x7F,
        }) => {}
        other => panic!("expected UnexpectedMessage, got {other:?}"),
    }
}

#[tokio::test]
async fn finish_refuses_an_unfinished_game() {
    let (host, join) = sessions(Player::One).await;
    match host.finish().await {
        Err(SessionError::GameNotOver) => {}
        other => panic!("expected GameNotOver, got {other:?}"),
    }
    drop(join);
}
