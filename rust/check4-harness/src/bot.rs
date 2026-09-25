//! The [`Bot`] trait and the ladder's bottom rung, [`RandomBot`].

use check4_core::fuzz::Xorshift32;
use check4_core::{Game, Move};

/// A Check4 player: given a position, pick a move for the player to move.
///
/// Bots are `&mut self` because they may carry mutable state (a PRNG, and
/// later transposition tables); they must be deterministic given their
/// construction arguments and the sequence of positions seen.
pub trait Bot {
    /// The bot's ladder name, e.g. `random` or `minimax4`.
    fn name(&self) -> String;

    /// Choose a move for the player to move, or `None` when no legal move
    /// exists (game over, or the theoretical stalemate).
    fn choose(&mut self, game: &Game) -> Option<Move>;
}

/// Uniform-random legal play, driven by the fuzz-contract xorshift32 so a
/// seeded bot reproduces exactly. The ladder's zero point.
#[derive(Debug, Clone)]
pub struct RandomBot {
    rng: Xorshift32,
}

impl RandomBot {
    /// Seed the bot. Seed 0 is the PRNG's fixed point and is remapped the
    /// same way the fuzz contract remaps it.
    #[must_use]
    pub fn new(seed: u32) -> RandomBot {
        RandomBot {
            rng: Xorshift32::new(if seed == 0 { 0x9E37_79B9 } else { seed }),
        }
    }
}

impl Bot for RandomBot {
    fn name(&self) -> String {
        "random".to_string()
    }

    fn choose(&mut self, game: &Game) -> Option<Move> {
        let moves = game.legal_moves();
        if moves.is_empty() {
            return None;
        }
        Some(moves[self.rng.next_u32() as usize % moves.len()])
    }
}
