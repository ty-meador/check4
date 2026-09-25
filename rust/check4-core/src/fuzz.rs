//! The shared differential-fuzz contract (V1).
//!
//! Both engines (this crate and the normative TypeScript engine) implement
//! this contract exactly, so their traces for the same arguments must match
//! byte for byte:
//!
//! - PRNG: [`Xorshift32`], seeded per game by [`game_seed`].
//! - Move choice each ply: `next() % legal_moves.len()`, indexing the
//!   canonical enumeration order of [`crate::Game::legal_moves`].
//! - Game loop: new game; while `ply < ply_cap` and no winner: enumerate
//!   legal moves; break if empty (theoretical stalemate); pick by PRNG;
//!   apply; emit a ply line. Then emit the game's END line.
//! - Trace format (LF newlines):
//!   - header: `SEED <baseSeed> GAMES <games> PLYCAP <cap> V1`
//!   - ply: `G<g> P<p> A<list> M<player>:<piece>:<x><y> L<n> K<stateKey>`
//!     with `list` the legal moves as `<piece>@<x><y>` joined by `;`, and
//!     the state key taken AFTER the move is applied.
//!   - end: `G<g> END W<winner or -> N<pliesPlayed>`

use crate::game::{Game, Move};
use std::fmt::Write as _;

/// A xorshift32 PRNG with u32 wrapping arithmetic and logical shifts.
///
/// The all-zero state is a fixed point of xorshift32; per the contract,
/// [`game_seed`] never produces 0.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Xorshift32 {
    state: u32,
}

impl Xorshift32 {
    /// Seed the generator. Seed 0 is degenerate (the sequence stays 0);
    /// use [`game_seed`] to derive contract-conformant per-game seeds.
    #[must_use]
    pub fn new(seed: u32) -> Xorshift32 {
        Xorshift32 { state: seed }
    }

    /// Advance the generator and return the new state:
    /// `s ^= s << 13; s ^= s >> 17; s ^= s << 5` (all in u32).
    pub fn next_u32(&mut self) -> u32 {
        let mut s = self.state;
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        self.state = s;
        s
    }
}

/// The per-game seed: `baseSeed + gameIndex * 0x9E3779B1` (u32 wrapping),
/// remapped to `0x9E3779B9` if it lands on 0.
#[must_use]
pub fn game_seed(base_seed: u32, game_index: u32) -> u32 {
    let seed = base_seed.wrapping_add(game_index.wrapping_mul(0x9E37_79B1));
    if seed == 0 {
        0x9E37_79B9
    } else {
        seed
    }
}

/// Run the full contract and return the trace, one line per ply plus the
/// header and per-game END lines, every line terminated by `\n`.
#[must_use]
pub fn run_trace(base_seed: u32, games: u32, ply_cap: u32) -> String {
    let mut out = String::new();
    writeln!(out, "SEED {base_seed} GAMES {games} PLYCAP {ply_cap} V1").unwrap();

    for g in 0..games {
        let mut rng = Xorshift32::new(game_seed(base_seed, g));
        let mut game = Game::new();
        let mut plies = 0u32;

        while plies < ply_cap && game.winner().is_none() {
            let moves = game.legal_moves();
            if moves.is_empty() {
                break;
            }

            let list = move_list(&moves);
            let mv = moves[rng.next_u32() as usize % moves.len()];
            game.take_turn(mv)
                .expect("enumerated legal move must apply");

            writeln!(
                out,
                "G{g} P{plies} A{list} M{player}:{piece}:{x}{y} L{len} K{key}",
                player = mv.player.number(),
                piece = mv.piece.name(),
                x = mv.x,
                y = mv.y,
                len = moves.len(),
                key = game.state_key()
            )
            .unwrap();

            plies += 1;
        }

        let winner = match game.winner() {
            Some(p) => char::from(b'0' + p.number()),
            None => '-',
        };
        writeln!(out, "G{g} END W{winner} N{plies}").unwrap();
    }

    out
}

/// The `A` field: legal moves as `<piece>@<x><y>` joined by `;`.
fn move_list(moves: &[Move]) -> String {
    let mut list = String::with_capacity(moves.len() * 10);
    for (i, mv) in moves.iter().enumerate() {
        if i > 0 {
            list.push(';');
        }
        list.push_str(mv.piece.name());
        list.push('@');
        list.push(char::from(b'0' + mv.x));
        list.push(char::from(b'0' + mv.y));
    }
    list
}
