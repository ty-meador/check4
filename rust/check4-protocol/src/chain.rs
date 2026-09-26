//! Signed, hash-chained game logs (wire format V1).
//!
//! A finished Check4 game is a portable, self-verifying artifact: a
//! [`Genesis`] binding the two seats' Ed25519 keys, a chain of signed
//! [`MoveRecord`]s, and optionally a dual-signed [`Seal`] attesting the
//! result. There is no consensus layer — Check4 is deterministic and
//! perfect-information, so [`verify`] replays the whole game through the
//! rules engine and every violation (illegal move, wrong signer, spliced or
//! tampered record, misreported result) is detected locally.
//!
//! ## Chain structure
//!
//! - `game_id = SHA-256( "C4G1" || pubkey1 || pubkey2 || nonce )` — the
//!   genesis hash names the game and seeds the chain.
//! - Record `i` signs `SHA-256`-sized links over
//!   `"C4M1" || game_id || prev_hash || ply(u32 BE) || action_byte ||
//!   state_hash`, where `prev_hash` is the previous record's hash (the
//!   `game_id` for record 0) and `state_hash = SHA-256(state_key())` of the
//!   position **after** the action applies. The record's own hash covers
//!   the signature too: `SHA-256( signing_bytes || signature )`.
//! - Every record is signed by **the player to move** — including resign.
//!   A player who wants to resign out of turn waits for their ply; clients
//!   queue the intent. (Locked V1 decision: it keeps signer identity
//!   derivable from replay alone.)
//! - The [`Seal`] signs `"C4S1" || game_id || head_hash || result_byte`
//!   with both seats' keys, attesting the final result (a winner, or a
//!   draw adjudicated by the harness ply cap — the game itself has no draw
//!   rule).
//!
//! Seat 0 of [`Genesis::keys`] is [`Player::One`]. The two seats may share
//! a key (self-play logs are legitimate training data).

use crate::notation::Action;
use check4_core::{Game, Move, MoveError, Player};
use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey};
use sha2::{Digest, Sha256};
use std::fmt;

/// A SHA-256 digest, as used for the game id, chain links and state hashes.
pub type Hash = [u8; 32];

const GENESIS_DOMAIN: &[u8; 4] = b"C4G1";
const MOVE_DOMAIN: &[u8; 4] = b"C4M1";
const SEAL_DOMAIN: &[u8; 4] = b"C4S1";

/// The game's birth certificate: who sits in each seat, plus a nonce so two
/// games between the same keys get distinct ids.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Genesis {
    /// Seat keys: `keys[0]` is [`Player::One`], `keys[1]` is
    /// [`Player::Two`]. The seats may share a key (self-play).
    pub keys: [VerifyingKey; 2],
    /// Caller-chosen uniqueness nonce (random, or a matchmaking handle).
    pub nonce: [u8; 32],
}

impl Genesis {
    /// The game id: the hash of the genesis. Seeds the chain as record 0's
    /// `prev_hash`.
    #[must_use]
    pub fn game_id(&self) -> Hash {
        let mut h = Sha256::new();
        h.update(GENESIS_DOMAIN);
        h.update(self.keys[0].as_bytes());
        h.update(self.keys[1].as_bytes());
        h.update(self.nonce);
        h.finalize().into()
    }

    /// The seat key for a player.
    #[must_use]
    pub fn key(&self, player: Player) -> &VerifyingKey {
        &self.keys[(player.number() - 1) as usize]
    }
}

/// One signed ply in the chain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MoveRecord {
    /// Zero-based ply index; must equal the record's position in the log.
    pub ply: u32,
    /// The action taken.
    pub action: Action,
    /// Hash of the previous record (the game id for ply 0).
    pub prev_hash: Hash,
    /// `SHA-256(state_key())` of the position after the action applies.
    pub state_hash: Hash,
    /// The acting player's signature over [`MoveRecord::signing_bytes`].
    pub signature: Signature,
}

impl MoveRecord {
    /// The bytes this record's signature covers.
    #[must_use]
    pub fn signing_bytes(
        game_id: &Hash,
        prev_hash: &Hash,
        ply: u32,
        action: Action,
        state_hash: &Hash,
    ) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(4 + 32 + 32 + 4 + 1 + 32);
        bytes.extend_from_slice(MOVE_DOMAIN);
        bytes.extend_from_slice(game_id);
        bytes.extend_from_slice(prev_hash);
        bytes.extend_from_slice(&ply.to_be_bytes());
        bytes.push(action.to_byte());
        bytes.extend_from_slice(state_hash);
        bytes
    }

    /// This record's chain hash: `SHA-256( signing_bytes || signature )`,
    /// so the chain commits to signatures as well as content.
    #[must_use]
    pub fn hash(&self, game_id: &Hash) -> Hash {
        let mut h = Sha256::new();
        h.update(Self::signing_bytes(
            game_id,
            &self.prev_hash,
            self.ply,
            self.action,
            &self.state_hash,
        ));
        h.update(self.signature.to_bytes());
        h.finalize().into()
    }
}

/// The final result a [`Seal`] attests.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum GameResult {
    /// Drawn by harness adjudication (ply cap). The rules have no draws, so
    /// this is only valid on a game with no winner.
    AdjudicatedDraw,
    /// The given player won (by alignment or the opponent's resignation).
    Winner(Player),
}

impl GameResult {
    /// The canonical result byte: `0` draw, `1`/`2` winner.
    #[must_use]
    pub fn to_byte(self) -> u8 {
        match self {
            GameResult::AdjudicatedDraw => 0,
            GameResult::Winner(p) => p.number(),
        }
    }

    /// Decode the canonical result byte.
    #[must_use]
    pub fn from_byte(byte: u8) -> Option<GameResult> {
        match byte {
            0 => Some(GameResult::AdjudicatedDraw),
            1 => Some(GameResult::Winner(Player::One)),
            2 => Some(GameResult::Winner(Player::Two)),
            _ => None,
        }
    }
}

/// Both seats' attestation of the final result.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Seal {
    /// The attested result.
    pub result: GameResult,
    /// `signatures[0]` by seat 0's key, `signatures[1]` by seat 1's, both
    /// over the same [`Seal::signing_bytes`].
    pub signatures: [Signature; 2],
}

impl Seal {
    /// The bytes both seal signatures cover.
    #[must_use]
    pub fn signing_bytes(game_id: &Hash, head_hash: &Hash, result: GameResult) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(4 + 32 + 32 + 1);
        bytes.extend_from_slice(SEAL_DOMAIN);
        bytes.extend_from_slice(game_id);
        bytes.extend_from_slice(head_hash);
        bytes.push(result.to_byte());
        bytes
    }
}

/// A complete (or in-progress) game log: genesis, move chain, optional seal.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameLog {
    /// The game's genesis.
    pub genesis: Genesis,
    /// The signed move chain, in ply order.
    pub records: Vec<MoveRecord>,
    /// The dual-signed result attestation, once the game is settled.
    pub seal: Option<Seal>,
}

/// Why a log (or an attempted append) failed verification.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ChainError {
    /// A record's `ply` disagrees with its position in the log.
    PlyMismatch {
        /// The position in the log (the expected ply).
        expected: u32,
        /// The `ply` the record claims.
        found: u32,
    },
    /// A record's `prev_hash` does not match the chain head.
    BrokenChain {
        /// The offending record's position.
        ply: u32,
    },
    /// A record's signature does not verify against the seat key of the
    /// player to move.
    BadSignature {
        /// The offending record's position.
        ply: u32,
    },
    /// The action violates the rules at its position (resigning a finished
    /// game reports [`MoveError::GameOver`]).
    IllegalAction {
        /// The offending record's position.
        ply: u32,
        /// The rule the action violates.
        source: MoveError,
    },
    /// A record's `state_hash` does not match the replayed position.
    StateHashMismatch {
        /// The offending record's position.
        ply: u32,
    },
    /// The seal's result contradicts the replayed game (wrong winner, or a
    /// draw sealed onto a decided game / a winner sealed onto an undecided
    /// one).
    SealResultMismatch,
    /// A seal signature does not verify against its seat key.
    BadSealSignature {
        /// The offending seat, 0 or 1.
        seat: usize,
    },
    /// (Recorder only) The signing key does not match the seat key of the
    /// player to move.
    WrongKey,
    /// (Recorder only) Sealing was attempted twice.
    AlreadySealed,
}

impl fmt::Display for ChainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ChainError::PlyMismatch { expected, found } => {
                write!(f, "record at position {expected} claims ply {found}")
            }
            ChainError::BrokenChain { ply } => {
                write!(f, "record {ply}: prev_hash does not match the chain head")
            }
            ChainError::BadSignature { ply } => {
                write!(
                    f,
                    "record {ply}: signature does not verify for the player to move"
                )
            }
            ChainError::IllegalAction { ply, source } => {
                write!(f, "record {ply}: illegal action: {source}")
            }
            ChainError::StateHashMismatch { ply } => {
                write!(
                    f,
                    "record {ply}: state hash does not match the replayed position"
                )
            }
            ChainError::SealResultMismatch => {
                write!(f, "seal result contradicts the replayed game")
            }
            ChainError::BadSealSignature { seat } => {
                write!(f, "seal signature for seat {seat} does not verify")
            }
            ChainError::WrongKey => {
                write!(
                    f,
                    "signing key does not match the seat of the player to move"
                )
            }
            ChainError::AlreadySealed => write!(f, "the log is already sealed"),
        }
    }
}

impl std::error::Error for ChainError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ChainError::IllegalAction { source, .. } => Some(source),
            _ => None,
        }
    }
}

/// Apply an action for the player to move; on success the game state is the
/// position the record's `state_hash` must commit to.
fn apply_action(game: &mut Game, action: Action) -> Result<(), MoveError> {
    match action {
        Action::Move { piece, x, y } => game.take_turn(Move {
            player: game.turn(),
            piece,
            x,
            y,
        }),
        Action::Resign => {
            if game.winner().is_some() {
                return Err(MoveError::GameOver);
            }
            game.forfeit(None);
            Ok(())
        }
    }
}

fn state_hash(game: &Game) -> Hash {
    Sha256::digest(game.state_key().as_bytes()).into()
}

/// The result the replayed game itself establishes: a winner once one
/// exists (alignment or resignation), otherwise `None` (still running, or
/// awaiting draw adjudication).
fn established_result(game: &Game) -> Option<GameResult> {
    game.winner().map(GameResult::Winner)
}

/// Validate `record` as the next link (`expected` is its position) on a
/// chain whose head is `head`, then apply its action to `game`. Returns the
/// new head. The single source of per-record chain semantics, shared by
/// [`verify`] and [`Recorder::ingest`].
fn validate_and_apply(
    genesis: &Genesis,
    game_id: &Hash,
    head: &Hash,
    game: &mut Game,
    expected: u32,
    record: &MoveRecord,
) -> Result<Hash, ChainError> {
    if record.ply != expected {
        return Err(ChainError::PlyMismatch {
            expected,
            found: record.ply,
        });
    }
    if record.prev_hash != *head {
        return Err(ChainError::BrokenChain { ply: expected });
    }

    let signer = genesis.key(game.turn());
    let signing_bytes = MoveRecord::signing_bytes(
        game_id,
        &record.prev_hash,
        record.ply,
        record.action,
        &record.state_hash,
    );
    if signer
        .verify_strict(&signing_bytes, &record.signature)
        .is_err()
    {
        return Err(ChainError::BadSignature { ply: expected });
    }

    apply_action(game, record.action).map_err(|source| ChainError::IllegalAction {
        ply: expected,
        source,
    })?;

    if record.state_hash != state_hash(game) {
        return Err(ChainError::StateHashMismatch { ply: expected });
    }

    Ok(record.hash(game_id))
}

/// A seal's result must match what the replayed game establishes: the
/// winner when decided, or an adjudicated draw only on an undecided game.
fn check_seal_result(game: &Game, result: GameResult) -> Result<(), ChainError> {
    match (established_result(game), result) {
        (Some(established), sealed) if established == sealed => Ok(()),
        (None, GameResult::AdjudicatedDraw) => Ok(()),
        _ => Err(ChainError::SealResultMismatch),
    }
}

/// A fully verified log: the replayed final position and the settled
/// result, if any.
#[derive(Debug, Clone)]
pub struct VerifiedGame {
    /// The final position after replaying every record.
    pub game: Game,
    /// The game's settled result: the seal's result when sealed, otherwise
    /// the winner established by replay, otherwise `None`.
    pub outcome: Option<GameResult>,
    /// Whether the log carries a valid dual-signed seal.
    pub sealed: bool,
}

/// Verify a log end to end: replay every record through the rules engine,
/// checking chain links, signatures, legality and state commitments, then
/// the seal if present.
pub fn verify(log: &GameLog) -> Result<VerifiedGame, ChainError> {
    let game_id = log.genesis.game_id();
    let mut game = Game::new();
    let mut head = game_id;

    for (i, record) in log.records.iter().enumerate() {
        head = validate_and_apply(&log.genesis, &game_id, &head, &mut game, i as u32, record)?;
    }

    let mut outcome = established_result(&game);
    if let Some(seal) = &log.seal {
        check_seal_result(&game, seal.result)?;

        let signing_bytes = Seal::signing_bytes(&game_id, &head, seal.result);
        for (seat, (key, sig)) in log.genesis.keys.iter().zip(&seal.signatures).enumerate() {
            if key.verify_strict(&signing_bytes, sig).is_err() {
                return Err(ChainError::BadSealSignature { seat });
            }
        }
        outcome = Some(seal.result);
    }

    Ok(VerifiedGame {
        game,
        outcome,
        sealed: log.seal.is_some(),
    })
}

/// Writer-side chain builder: owns the replayed game and appends signed
/// records, guaranteeing the log it produces verifies.
#[derive(Debug, Clone)]
pub struct Recorder {
    log: GameLog,
    game: Game,
    game_id: Hash,
    head: Hash,
}

impl Recorder {
    /// Start an empty log from a genesis.
    #[must_use]
    pub fn new(genesis: Genesis) -> Recorder {
        let game_id = genesis.game_id();
        Recorder {
            log: GameLog {
                genesis,
                records: Vec::new(),
                seal: None,
            },
            game: Game::new(),
            game_id,
            head: game_id,
        }
    }

    /// The replayed game state (the position after the last record).
    #[must_use]
    pub fn game(&self) -> &Game {
        &self.game
    }

    /// The game id.
    #[must_use]
    pub fn game_id(&self) -> Hash {
        self.game_id
    }

    /// The chain head: the last record's hash, or the game id when empty.
    #[must_use]
    pub fn head(&self) -> Hash {
        self.head
    }

    /// The log built so far.
    #[must_use]
    pub fn log(&self) -> &GameLog {
        &self.log
    }

    /// Consume the recorder, yielding the log.
    #[must_use]
    pub fn into_log(self) -> GameLog {
        self.log
    }

    /// Append an action for the player to move, signed with their key. The
    /// key must match the seat of the player to move; the action must be
    /// legal; a sealed log accepts nothing.
    pub fn record(&mut self, action: Action, key: &SigningKey) -> Result<&MoveRecord, ChainError> {
        if self.log.seal.is_some() {
            return Err(ChainError::AlreadySealed);
        }
        if &key.verifying_key() != self.log.genesis.key(self.game.turn()) {
            return Err(ChainError::WrongKey);
        }

        let ply = self.log.records.len() as u32;
        let mut game = self.game.clone();
        apply_action(&mut game, action)
            .map_err(|source| ChainError::IllegalAction { ply, source })?;

        let state_hash = state_hash(&game);
        let signing_bytes =
            MoveRecord::signing_bytes(&self.game_id, &self.head, ply, action, &state_hash);
        let record = MoveRecord {
            ply,
            action,
            prev_hash: self.head,
            state_hash,
            signature: key.sign(&signing_bytes),
        };

        self.head = record.hash(&self.game_id);
        self.game = game;
        self.log.records.push(record);
        Ok(self.log.records.last().expect("record just pushed"))
    }

    /// Append a foreign record — one produced and signed elsewhere (live
    /// play: the opponent's move arriving over the network). Runs the full
    /// per-record verification ([`verify`]'s checks: ply order, chain link,
    /// signature of the player to move, legality, state commitment) before
    /// accepting; on any error the recorder is unchanged. Two recorders fed
    /// the same game through [`Recorder::record`] on one side and
    /// [`Recorder::ingest`] on the other stay byte-identical.
    pub fn ingest(&mut self, record: MoveRecord) -> Result<&MoveRecord, ChainError> {
        if self.log.seal.is_some() {
            return Err(ChainError::AlreadySealed);
        }

        let expected = self.log.records.len() as u32;
        let mut game = self.game.clone();
        let head = validate_and_apply(
            &self.log.genesis,
            &self.game_id,
            &self.head,
            &mut game,
            expected,
            &record,
        )?;

        self.head = head;
        self.game = game;
        self.log.records.push(record);
        Ok(self.log.records.last().expect("record just pushed"))
    }

    /// This seat's seal signature over the current head, for exchange with
    /// the opponent (each side signs locally, then both attach via
    /// [`Recorder::seal_with_signatures`]). Refuses to sign a result the
    /// replayed game contradicts, or with a key that holds no seat.
    pub fn seal_signature(
        &self,
        result: GameResult,
        key: &SigningKey,
    ) -> Result<Signature, ChainError> {
        check_seal_result(&self.game, result)?;
        if !self.log.genesis.keys.contains(&key.verifying_key()) {
            return Err(ChainError::WrongKey);
        }
        Ok(key.sign(&Seal::signing_bytes(&self.game_id, &self.head, result)))
    }

    /// Attach a seal from two independently produced signatures (each seat
    /// signs [`Seal::signing_bytes`] over the current head). Validates the
    /// result against the replayed game and both signatures before
    /// attaching.
    pub fn seal_with_signatures(
        &mut self,
        result: GameResult,
        signatures: [Signature; 2],
    ) -> Result<&Seal, ChainError> {
        if self.log.seal.is_some() {
            return Err(ChainError::AlreadySealed);
        }
        check_seal_result(&self.game, result)?;

        let signing_bytes = Seal::signing_bytes(&self.game_id, &self.head, result);
        for (seat, (key, sig)) in self.log.genesis.keys.iter().zip(&signatures).enumerate() {
            if key.verify_strict(&signing_bytes, sig).is_err() {
                return Err(ChainError::BadSealSignature { seat });
            }
        }

        self.log.seal = Some(Seal { result, signatures });
        Ok(self.log.seal.as_ref().expect("seal just attached"))
    }

    /// Convenience for harness/self-play use where both keys are local:
    /// sign the seal with both seats' keys and attach it.
    pub fn seal_local(
        &mut self,
        result: GameResult,
        key_one: &SigningKey,
        key_two: &SigningKey,
    ) -> Result<&Seal, ChainError> {
        let signing_bytes = Seal::signing_bytes(&self.game_id, &self.head, result);
        self.seal_with_signatures(
            result,
            [key_one.sign(&signing_bytes), key_two.sign(&signing_bytes)],
        )
    }
}
