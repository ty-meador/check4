//! The live game session protocol (V1): two peers exchanging the signed
//! records of one Check4 game over an ordered, reliable byte stream.
//!
//! This module is transport-agnostic — it speaks over any async
//! reader/writer pair (an iroh QUIC stream in production, an in-memory
//! duplex pipe in tests). Peer authentication is the transport's job: iroh
//! proves each side holds its Ed25519 key during the QUIC TLS handshake,
//! so the [`VerifyingKey`]s handed to [`GameSession::host`] /
//! [`GameSession::join`] arrive pre-authenticated.
//!
//! ## Wire format (normative)
//!
//! Every message is a tag byte followed by a fixed-size payload:
//!
//! ```text
//! HELLO  = 0x01, version(u8)                joiner -> host
//! OFFER  = 0x02, version(u8),               host -> joiner
//!          host_seat(u8: 1|2), nonce[32]
//! ACCEPT = 0x03                             joiner -> host
//! RECORD = 0x10, record[RECORD_LEN]         player to move -> opponent
//! SEAL   = 0x20, result(u8), signature[64]  both directions, once each
//! ```
//!
//! A `RECORD` payload is exactly the record's canonical `C4L1` in-log
//! bytes ([`wire::record_to_bytes`]) — the network frame and the archived
//! log share one byte format.
//!
//! ## Session shape
//!
//! The handshake fixes the [`Genesis`]: the host picks the nonce and its
//! own seat; seat keys are the two authenticated endpoint keys. Both sides
//! then run a [`Recorder`] — [`Recorder::record`] for their own moves,
//! [`Recorder::ingest`] for the opponent's — so every incoming move is
//! fully verified (chain link, signature, legality, state commitment) the
//! moment it arrives, and the two logs stay byte-identical. When the game
//! has a winner, each side sends its half of the seal exchange and
//! [`GameSession::finish`] yields the sealed, portable [`GameLog`].
//!
//! Turns strictly alternate, so the session is half-duplex by nature: on
//! your turn call [`GameSession::play`], otherwise
//! [`GameSession::wait_for_move`]. Resignation is an in-turn action
//! ([`Action::Resign`]) per the locked protocol rule; a client wanting to
//! resign out of turn queues the intent locally.

use std::fmt;
use std::io;

use check4_core::{Game, Player};
use check4_protocol::{
    wire, Action, ChainError, GameLog, GameResult, Genesis, MoveRecord, Recorder, Signature,
    SigningKey, VerifyingKey, WireError,
};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

/// The session protocol version this build speaks.
pub const VERSION: u8 = 1;

const TAG_HELLO: u8 = 0x01;
const TAG_OFFER: u8 = 0x02;
const TAG_ACCEPT: u8 = 0x03;
const TAG_RECORD: u8 = 0x10;
const TAG_SEAL: u8 = 0x20;

/// Why a session failed.
#[derive(Debug)]
pub enum SessionError {
    /// The underlying stream failed (includes the peer disconnecting).
    Io(io::Error),
    /// A received record or seal failed chain verification, or a local
    /// action was rejected (illegal move, wrong turn).
    Chain(ChainError),
    /// A record frame failed structural decoding.
    Frame(WireError),
    /// The peer sent a message the protocol does not allow here.
    UnexpectedMessage {
        /// What the session was waiting for.
        expected: &'static str,
        /// The tag byte the peer sent.
        found: u8,
    },
    /// The peer speaks a different protocol version.
    VersionMismatch {
        /// The version this build speaks.
        ours: u8,
        /// The version the peer offered.
        theirs: u8,
    },
    /// The host offered an invalid seat byte.
    InvalidSeat(u8),
    /// The peer's seal names an invalid or disagreeing result.
    InvalidResult(u8),
    /// The peers' seals disagree about the result.
    ResultDisagreement {
        /// The result this side established.
        ours: GameResult,
        /// The result the peer sealed.
        theirs: GameResult,
    },
    /// [`GameSession::finish`] was called before the game had a winner.
    GameNotOver,
}

impl fmt::Display for SessionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SessionError::Io(err) => write!(f, "session stream failed: {err}"),
            SessionError::Chain(err) => write!(f, "chain verification failed: {err}"),
            SessionError::Frame(err) => write!(f, "record frame is malformed: {err}"),
            SessionError::UnexpectedMessage { expected, found } => {
                write!(f, "expected {expected}, peer sent tag 0x{found:02x}")
            }
            SessionError::VersionMismatch { ours, theirs } => {
                write!(
                    f,
                    "peer speaks protocol V{theirs}, this build speaks V{ours}"
                )
            }
            SessionError::InvalidSeat(byte) => write!(f, "invalid seat byte {byte}"),
            SessionError::InvalidResult(byte) => write!(f, "invalid result byte {byte}"),
            SessionError::ResultDisagreement { ours, theirs } => {
                write!(f, "peer sealed {theirs:?}, this side established {ours:?}")
            }
            SessionError::GameNotOver => write!(f, "the game has no winner yet"),
        }
    }
}

impl std::error::Error for SessionError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            SessionError::Io(err) => Some(err),
            SessionError::Chain(err) => Some(err),
            SessionError::Frame(err) => Some(err),
            _ => None,
        }
    }
}

impl From<io::Error> for SessionError {
    fn from(err: io::Error) -> SessionError {
        SessionError::Io(err)
    }
}

impl From<ChainError> for SessionError {
    fn from(err: ChainError) -> SessionError {
        SessionError::Chain(err)
    }
}

fn seat_from_byte(byte: u8) -> Result<Player, SessionError> {
    match byte {
        1 => Ok(Player::One),
        2 => Ok(Player::Two),
        _ => Err(SessionError::InvalidSeat(byte)),
    }
}

/// One side of a live game: the verified chain state plus the stream to
/// the opponent.
pub struct GameSession<R, W> {
    reader: R,
    writer: W,
    recorder: Recorder,
    seat: Player,
    key: SigningKey,
}

impl<R, W> fmt::Debug for GameSession<R, W> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Streams and the signing key stay out of debug output.
        f.debug_struct("GameSession")
            .field("seat", &self.seat)
            .field("ply", &self.recorder.log().records.len())
            .finish()
    }
}

impl<R, W> GameSession<R, W>
where
    R: AsyncRead + Unpin,
    W: AsyncWrite + Unpin,
{
    /// Run the handshake as the host: answer the joiner's `HELLO` with an
    /// `OFFER` carrying `nonce` and the host's chosen seat, and await the
    /// `ACCEPT`. `key` must be the keypair the transport authenticated as
    /// this endpoint; `remote` the peer's authenticated key.
    pub async fn host(
        mut reader: R,
        mut writer: W,
        key: SigningKey,
        remote: VerifyingKey,
        host_seat: Player,
        nonce: [u8; 32],
    ) -> Result<GameSession<R, W>, SessionError> {
        let mut hello = [0u8; 2];
        reader.read_exact(&mut hello).await?;
        if hello[0] != TAG_HELLO {
            return Err(SessionError::UnexpectedMessage {
                expected: "HELLO",
                found: hello[0],
            });
        }
        if hello[1] != VERSION {
            return Err(SessionError::VersionMismatch {
                ours: VERSION,
                theirs: hello[1],
            });
        }

        let mut offer = [0u8; 35];
        offer[0] = TAG_OFFER;
        offer[1] = VERSION;
        offer[2] = host_seat.number();
        offer[3..].copy_from_slice(&nonce);
        writer.write_all(&offer).await?;
        writer.flush().await?;

        let mut accept = [0u8; 1];
        reader.read_exact(&mut accept).await?;
        if accept[0] != TAG_ACCEPT {
            return Err(SessionError::UnexpectedMessage {
                expected: "ACCEPT",
                found: accept[0],
            });
        }

        let genesis = make_genesis(&key, &remote, host_seat, nonce);
        Ok(GameSession {
            reader,
            writer,
            recorder: Recorder::new(genesis),
            seat: host_seat,
            key,
        })
    }

    /// Run the handshake as the joiner: send `HELLO`, take the host's
    /// `OFFER` (nonce and seats), and confirm with `ACCEPT`.
    pub async fn join(
        mut reader: R,
        mut writer: W,
        key: SigningKey,
        remote: VerifyingKey,
    ) -> Result<GameSession<R, W>, SessionError> {
        writer.write_all(&[TAG_HELLO, VERSION]).await?;
        writer.flush().await?;

        let mut offer = [0u8; 35];
        reader.read_exact(&mut offer).await?;
        if offer[0] != TAG_OFFER {
            return Err(SessionError::UnexpectedMessage {
                expected: "OFFER",
                found: offer[0],
            });
        }
        if offer[1] != VERSION {
            return Err(SessionError::VersionMismatch {
                ours: VERSION,
                theirs: offer[1],
            });
        }
        let host_seat = seat_from_byte(offer[2])?;
        let mut nonce = [0u8; 32];
        nonce.copy_from_slice(&offer[3..]);

        writer.write_all(&[TAG_ACCEPT]).await?;
        writer.flush().await?;

        // The host holds `host_seat`; from this side, `remote` is the host.
        let genesis = make_genesis(&key, &remote, host_seat.opponent(), nonce);
        Ok(GameSession {
            reader,
            writer,
            recorder: Recorder::new(genesis),
            seat: host_seat.opponent(),
            key,
        })
    }

    /// The verified game state (the position after the last record).
    #[must_use]
    pub fn game(&self) -> &Game {
        self.recorder.game()
    }

    /// The seat this side plays.
    #[must_use]
    pub fn seat(&self) -> Player {
        self.seat
    }

    /// The game's genesis (seat keys and nonce).
    #[must_use]
    pub fn genesis(&self) -> &Genesis {
        &self.recorder.log().genesis
    }

    /// The signed log built so far (unsealed until [`GameSession::finish`];
    /// useful for saving a partial log when the peer disconnects).
    #[must_use]
    pub fn log(&self) -> &GameLog {
        self.recorder.log()
    }

    /// Whether it is this side's turn (false once the game is over).
    #[must_use]
    pub fn my_turn(&self) -> bool {
        self.game().winner().is_none() && self.game().turn() == self.seat
    }

    /// Take this side's turn: record `action` (validating turn order and
    /// legality), sign it, and send it to the opponent.
    pub async fn play(&mut self, action: Action) -> Result<MoveRecord, SessionError> {
        let record = *self.recorder.record(action, &self.key)?;

        let mut frame = [0u8; 1 + wire::RECORD_LEN];
        frame[0] = TAG_RECORD;
        frame[1..].copy_from_slice(&wire::record_to_bytes(&record));
        self.writer.write_all(&frame).await?;
        self.writer.flush().await?;

        Ok(record)
    }

    /// Await the opponent's move and ingest it, fully verifying the record
    /// (chain link, signature, legality, state commitment) before it
    /// touches this side's game state.
    pub async fn wait_for_move(&mut self) -> Result<MoveRecord, SessionError> {
        let mut tag = [0u8; 1];
        self.reader.read_exact(&mut tag).await?;
        if tag[0] != TAG_RECORD {
            return Err(SessionError::UnexpectedMessage {
                expected: "RECORD",
                found: tag[0],
            });
        }

        let mut frame = [0u8; wire::RECORD_LEN];
        self.reader.read_exact(&mut frame).await?;
        let ply = self.recorder.log().records.len() as u32;
        let record = wire::record_from_bytes(&frame, ply).map_err(SessionError::Frame)?;

        Ok(*self.recorder.ingest(record)?)
    }

    /// Seal the finished game: exchange seal signatures with the opponent
    /// and return the sealed, portable log. Call once a winner exists
    /// (alignment or resignation); live sessions have no draws — the
    /// adjudicated draw belongs to the offline harness.
    pub async fn finish(mut self) -> Result<GameLog, SessionError> {
        let winner = self.game().winner().ok_or(SessionError::GameNotOver)?;
        let result = GameResult::Winner(winner);

        let my_signature = self.recorder.seal_signature(result, &self.key)?;
        let mut seal = [0u8; 1 + 1 + 64];
        seal[0] = TAG_SEAL;
        seal[1] = result.to_byte();
        seal[2..].copy_from_slice(&my_signature.to_bytes());
        self.writer.write_all(&seal).await?;
        self.writer.flush().await?;

        let mut frame = [0u8; 1 + 1 + 64];
        self.reader.read_exact(&mut frame).await?;
        if frame[0] != TAG_SEAL {
            return Err(SessionError::UnexpectedMessage {
                expected: "SEAL",
                found: frame[0],
            });
        }
        let their_result =
            GameResult::from_byte(frame[1]).ok_or(SessionError::InvalidResult(frame[1]))?;
        if their_result != result {
            return Err(SessionError::ResultDisagreement {
                ours: result,
                theirs: their_result,
            });
        }
        let their_signature = Signature::from_bytes(frame[2..].try_into().expect("fixed slice"));

        // Order the two signatures by seat.
        let signatures = match self.seat {
            Player::One => [my_signature, their_signature],
            Player::Two => [their_signature, my_signature],
        };
        self.recorder.seal_with_signatures(result, signatures)?;

        Ok(self.recorder.into_log())
    }
}

/// Build the genesis both sides must agree on: `my` key in `my_seat`,
/// `remote` in the other.
fn make_genesis(
    my: &SigningKey,
    remote: &VerifyingKey,
    my_seat: Player,
    nonce: [u8; 32],
) -> Genesis {
    let mine = my.verifying_key();
    let keys = match my_seat {
        Player::One => [mine, *remote],
        Player::Two => [*remote, mine],
    };
    Genesis { keys, nonce }
}
