//! Ply-capped games, seat-alternating matches, and round-robin
//! tournaments.

use crate::bot::Bot;
use check4_core::fuzz::game_seed;
use check4_core::{Game, Player};

/// The default adjudication cap (~200 plies), per the project handoff.
pub const DEFAULT_PLY_CAP: u32 = 200;

/// How one game ended.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GameOutcome {
    /// The winner, or `None` for an adjudicated draw (ply cap, or the
    /// theoretical no-legal-move stalemate).
    pub winner: Option<Player>,
    /// Plies actually played.
    pub plies: u32,
}

/// Play one game: `one` holds seat 1, `two` seat 2. The harness
/// adjudicates a draw at `ply_cap` plies and on stalemate — the rules
/// themselves never draw.
pub fn play_game<'a>(one: &'a mut dyn Bot, two: &'a mut dyn Bot, ply_cap: u32) -> GameOutcome {
    let mut game = Game::new();

    while game.winner().is_none() && game.turn_count() < ply_cap {
        let bot = match game.turn() {
            Player::One => &mut *one,
            Player::Two => &mut *two,
        };
        let Some(mv) = bot.choose(&game) else {
            break; // theoretical stalemate → adjudicated draw
        };
        game.take_turn(mv).expect("bots must choose legal moves");
    }

    GameOutcome {
        winner: game.winner(),
        plies: game.turn_count(),
    }
}

/// Builds a fresh bot for one game from that game's seed. Deterministic
/// bots may ignore the seed; the random bot must use it.
pub type BotFactory = Box<dyn Fn(u32) -> Box<dyn Bot>>;

/// An aggregated head-to-head result, scored from `a`'s perspective.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchResult {
    /// `a`'s ladder name.
    pub a: String,
    /// `b`'s ladder name.
    pub b: String,
    /// Games `a` won.
    pub a_wins: u32,
    /// Games `b` won.
    pub b_wins: u32,
    /// Adjudicated draws.
    pub draws: u32,
    /// Total plies played across the match (for throughput reporting).
    pub plies: u64,
}

/// Play `games` games between `a` and `b`, alternating seats (`a` holds
/// seat 1 in even-indexed games) so first-move advantage cancels out.
/// Per-game seeds derive from `base_seed` exactly like the fuzz
/// harness's, so a match is reproducible from its arguments.
pub fn play_match(
    a: &BotFactory,
    b: &BotFactory,
    games: u32,
    base_seed: u32,
    ply_cap: u32,
) -> MatchResult {
    let mut result = MatchResult {
        a: a(1).name(),
        b: b(1).name(),
        a_wins: 0,
        b_wins: 0,
        draws: 0,
        plies: 0,
    };

    for g in 0..games {
        let seed = game_seed(base_seed, g);
        // Distinct streams per seat: reusing one seed for both would make
        // random-vs-random mirror itself.
        let mut bot_a = a(seed);
        let mut bot_b = b(seed ^ 0xA5A5_A5A5);
        let a_is_one = g % 2 == 0;

        let outcome = if a_is_one {
            play_game(&mut *bot_a, &mut *bot_b, ply_cap)
        } else {
            play_game(&mut *bot_b, &mut *bot_a, ply_cap)
        };

        result.plies += u64::from(outcome.plies);
        match outcome.winner {
            None => result.draws += 1,
            Some(winner) => {
                let a_won = (winner == Player::One) == a_is_one;
                if a_won {
                    result.a_wins += 1;
                } else {
                    result.b_wins += 1;
                }
            }
        }
    }

    result
}

/// One ladder rung's tournament standing. Points: 2 per win, 1 per draw
/// (avoids fractional bookkeeping).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Standing {
    /// The bot's ladder name.
    pub name: String,
    /// Games won across all pairings.
    pub wins: u32,
    /// Draws across all pairings.
    pub draws: u32,
    /// Games lost across all pairings.
    pub losses: u32,
    /// 2 per win + 1 per draw.
    pub points: u32,
}

/// Full round-robin: every pair plays `games_per_pair` seat-alternating
/// games. Returns per-pair results and standings sorted best first
/// (points, then wins, then name for stability).
pub fn round_robin(
    contenders: &[BotFactory],
    games_per_pair: u32,
    base_seed: u32,
    ply_cap: u32,
) -> (Vec<MatchResult>, Vec<Standing>) {
    let mut results = Vec::new();
    let mut standings: Vec<Standing> = contenders
        .iter()
        .map(|make| Standing {
            name: make(1).name(),
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
        })
        .collect();

    for i in 0..contenders.len() {
        for j in (i + 1)..contenders.len() {
            // Decorrelate pairings: each pair gets its own seed stream.
            let pair_seed = base_seed
                .wrapping_add((i as u32).wrapping_mul(0x9E37_79B1))
                .wrapping_add((j as u32).wrapping_mul(0x85EB_CA6B));
            let result = play_match(
                &contenders[i],
                &contenders[j],
                games_per_pair,
                pair_seed,
                ply_cap,
            );

            standings[i].wins += result.a_wins;
            standings[i].losses += result.b_wins;
            standings[i].draws += result.draws;
            standings[j].wins += result.b_wins;
            standings[j].losses += result.a_wins;
            standings[j].draws += result.draws;
            results.push(result);
        }
    }

    for s in &mut standings {
        s.points = 2 * s.wins + s.draws;
    }
    standings.sort_by(|x, y| {
        (y.points, y.wins)
            .cmp(&(x.points, x.wins))
            .then_with(|| x.name.cmp(&y.name))
    });

    (results, standings)
}
