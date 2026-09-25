//! Fixed-depth alpha-beta search over the shared [`eval`](crate::eval).
//!
//! Deterministic by construction: moves are examined in the engine's
//! canonical enumeration order and ties keep the first best, so the same
//! position always yields the same move. Wins score `WIN - ply`, making
//! faster wins (and slower losses) preferable.
//!
//! No transposition table yet — positions repeat under triangulation, and
//! keying one on `Game::pack()` is the natural upgrade when the ladder
//! needs deeper rungs.

use crate::bot::Bot;
use crate::eval::evaluate;
use check4_core::{Game, Move, PieceKind};

/// Reorder legal moves captures-first (stable within each class, so the
/// canonical order — and with it determinism — survives). Captures change
/// the eval most, so searching them first sharpens alpha-beta cutoffs.
fn order_moves(game: &Game, moves: &mut Vec<Move>) {
    let enemy = game.turn().opponent();
    let mut occupied = [false; 16];
    for kind in PieceKind::ALL {
        if let Some((x, y)) = game.piece_position(enemy, kind) {
            occupied[usize::from(x * 4 + y)] = true;
        }
    }

    let mut ordered = Vec::with_capacity(moves.len());
    ordered.extend(
        moves
            .iter()
            .copied()
            .filter(|mv| occupied[usize::from(mv.x * 4 + mv.y)]),
    );
    ordered.extend(
        moves
            .iter()
            .copied()
            .filter(|mv| !occupied[usize::from(mv.x * 4 + mv.y)]),
    );
    *moves = ordered;
}

/// Terminal win score at the root; decays by a point per ply of depth.
const WIN: i32 = 1_000_000;

/// Fixed-depth alpha-beta bot. Depth 1 is the ladder's "greedy" rung
/// (take a win or the best immediate eval); depths 2/4/6 are its
/// `minimax<d>` rungs.
#[derive(Debug, Clone)]
pub struct MinimaxBot {
    depth: u32,
}

impl MinimaxBot {
    /// A bot searching `depth` plies. `depth` must be at least 1.
    #[must_use]
    pub fn new(depth: u32) -> MinimaxBot {
        assert!(depth >= 1, "search depth must be at least 1");
        MinimaxBot { depth }
    }

    /// Negamax with alpha-beta over positions where the game is not yet
    /// decided, scoring from the perspective of the player to move.
    /// Stalemate (no legal moves) is draw-valued, mirroring the harness's
    /// adjudication.
    fn negamax(game: &Game, depth: u32, mut alpha: i32, beta: i32, ply: i32) -> i32 {
        if depth == 0 {
            return evaluate(game, game.turn());
        }

        let mut moves = game.legal_moves();
        if moves.is_empty() {
            return 0;
        }
        if depth >= 3 {
            // Deep nodes: spend an eval per child to sort best-first —
            // alpha-beta cutoff gains dwarf the sorting cost. Sort is
            // stable, so equal-eval moves keep canonical order.
            let me = game.turn();
            let mut scored: Vec<(i32, Move)> = moves
                .iter()
                .map(|&mv| {
                    let mut child = game.clone();
                    child
                        .take_turn(mv)
                        .expect("enumerated legal move must apply");
                    let score = if child.winner().is_some() {
                        i32::MAX
                    } else {
                        evaluate(&child, me)
                    };
                    (score, mv)
                })
                .collect();
            scored.sort_by_key(|&(score, _)| std::cmp::Reverse(score));
            moves = scored.into_iter().map(|(_, mv)| mv).collect();
        } else {
            order_moves(game, &mut moves);
        }

        let mut best = i32::MIN;
        for mv in moves {
            let mut child = game.clone();
            child
                .take_turn(mv)
                .expect("enumerated legal move must apply");

            // Only the mover can have just won; a decided child is a leaf,
            // and nothing at this node can beat an immediate win (deeper
            // wins score lower), so return without scanning siblings.
            if child.winner().is_some() {
                return WIN - ply;
            }
            let score = -Self::negamax(&child, depth - 1, -beta, -alpha, ply + 1);

            best = best.max(score);
            alpha = alpha.max(best);
            if alpha >= beta {
                break;
            }
        }
        best
    }
}

impl Bot for MinimaxBot {
    fn name(&self) -> String {
        match self.depth {
            1 => "greedy".to_string(),
            d => format!("minimax{d}"),
        }
    }

    fn choose(&mut self, game: &Game) -> Option<Move> {
        let moves = game.legal_moves();
        let mut best: Option<(Move, i32)> = None;
        let mut alpha = i32::MIN + 1;

        for mv in moves {
            let mut child = game.clone();
            child
                .take_turn(mv)
                .expect("enumerated legal move must apply");

            if child.winner().is_some() {
                return Some(mv); // an immediate win is unbeatable
            }
            let score = -Self::negamax(&child, self.depth - 1, i32::MIN + 1, -alpha, 1);

            if best.is_none_or(|(_, s)| score > s) {
                best = Some((mv, score));
            }
            alpha = alpha.max(score);
        }

        best.map(|(mv, _)| mv)
    }
}
