//! The heuristic evaluation the search bots share.
//!
//! Check4 has no material (captures recycle through the gutter), so the
//! eval is purely about **line potential**: progress toward putting all
//! four pieces on one of the ten winning lines (4 rows, 4 columns, 2
//! diagonals).
//!
//! For each line, count each side's on-board pieces on it. A line
//! contested by both sides scores nothing; an uncontested line scores
//! [`LINE_SCORE`]`[count]` for its owner, superlinear so one 3-piece
//! clean line outweighs several 2-piece ones. Gutter pieces score
//! nothing — they are maximally flexible but contribute to no line yet.
//!
//! The eval is deliberately cheap and deterministic. It is a move-quality
//! heuristic for the ladder's minimax rungs, not ground truth — that is
//! the solver's job (build-order item 5).

use check4_core::{Game, PieceKind, Player};

/// Uncontested-line score by piece count. `LINE_SCORE[4]` only arises in
/// handcrafted positions (legal play ends the game on alignment), but
/// scores decisively for robustness.
pub const LINE_SCORE: [i32; 5] = [0, 1, 8, 64, 4096];

/// The ten winning lines: for each, a function classifying a coordinate.
/// Rows 0..=3, columns 0..=3, main diagonal (x == y), anti-diagonal
/// (x + y == 3).
fn line_contains(line: usize, x: u8, y: u8) -> bool {
    match line {
        0..=3 => y == line as u8,
        4..=7 => x == (line - 4) as u8,
        8 => x == y,
        _ => x + y == 3,
    }
}

/// Static evaluation of `game` from `pov`'s perspective: positive is good
/// for `pov`. Purely positional; ignores whose turn it is.
#[must_use]
pub fn evaluate(game: &Game, pov: Player) -> i32 {
    let mut score = 0;

    for line in 0..10 {
        let mut own = 0usize;
        let mut enemy = 0usize;
        for player in [Player::One, Player::Two] {
            for kind in PieceKind::ALL {
                if let Some((x, y)) = game.piece_position(player, kind) {
                    if line_contains(line, x, y) {
                        if player == pov {
                            own += 1;
                        } else {
                            enemy += 1;
                        }
                    }
                }
            }
        }

        if enemy == 0 {
            score += LINE_SCORE[own];
        } else if own == 0 {
            score -= LINE_SCORE[enemy];
        }
    }

    score
}
