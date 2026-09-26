//! Terminal rendering of a game state.
//!
//! Mirrors the layout of the repo's normative TS renderer
//! (`src/mcp/render.ts`) so humans and LLM seats read the same board:
//! y=3 prints on top ("up" is up), Player 1 UPPERCASE / Player 2
//! lowercase, `.` empty, one-line legend, situational lines omitted when
//! empty.

use check4_core::{Game, Move, PieceKind, Player};

fn glyph(player: Player, piece: PieceKind) -> char {
    let ch = match piece {
        PieceKind::Pawn => 'P',
        PieceKind::Rook => 'R',
        PieceKind::Bishop => 'B',
        PieceKind::Knight => 'N',
    };
    match player {
        Player::One => ch,
        Player::Two => ch.to_ascii_lowercase(),
    }
}

/// The 4x4 board with axis labels.
pub fn render_board(game: &Game) -> String {
    let mut cells = [['.'; 4]; 4];
    for player in [Player::One, Player::Two] {
        for piece in PieceKind::ALL {
            if let Some((x, y)) = game.piece_position(player, piece) {
                cells[y as usize][x as usize] = glyph(player, piece);
            }
        }
    }

    let mut rows = Vec::with_capacity(5);
    for y in (0..4).rev() {
        let row: Vec<String> = (0..4).map(|x| cells[y][x].to_string()).collect();
        rows.push(format!("{y} {}", row.join(" ")));
    }
    rows.push("  0 1 2 3".to_string());
    rows.join("\n")
}

/// Full state text: status, board, legend, and situational lines.
pub fn render_state(game: &Game) -> String {
    let mut lines = Vec::new();

    match game.winner() {
        Some(winner) => lines.push(format!(
            "winner: P{} (ply {})",
            winner.number(),
            game.turn_count()
        )),
        None => lines.push(format!(
            "turn: P{} (ply {})",
            game.turn().number(),
            game.turn_count()
        )),
    }

    lines.push(render_board(game));
    lines.push("P1=UPPER P2=lower P/p=pawn R/r=rook B/b=bishop N/n=knight .=empty".to_string());

    let mut gutter: [Vec<String>; 2] = [Vec::new(), Vec::new()];
    let mut blocked: [Vec<String>; 2] = [Vec::new(), Vec::new()];
    for player in [Player::One, Player::Two] {
        let index = (player.number() - 1) as usize;
        for piece in PieceKind::ALL {
            match game.piece_position(player, piece) {
                None => gutter[index].push(glyph(player, piece).to_string()),
                Some(_) => {
                    if let Some((px, py)) = game.piece_prev(player, piece) {
                        blocked[index].push(format!("{}!=({px},{py})", glyph(player, piece)));
                    }
                }
            }
        }
    }

    if gutter.iter().any(|side| !side.is_empty()) {
        let parts: Vec<String> = gutter
            .iter()
            .enumerate()
            .filter(|(_, side)| !side.is_empty())
            .map(|(i, side)| format!("P{} [{}]", i + 1, side.join(",")))
            .collect();
        lines.push(format!(
            "gutter (drop on any empty square): {}",
            parts.join(" ")
        ));
    }

    let direction_word = |player| match game.pawn_direction(player) {
        check4_core::Direction::Up => "up",
        check4_core::Direction::Down => "down",
    };
    lines.push(format!(
        "pawn directions: P1 {} P2 {}",
        direction_word(Player::One),
        direction_word(Player::Two)
    ));

    if blocked.iter().any(|side| !side.is_empty()) {
        let parts: Vec<String> = blocked
            .iter()
            .enumerate()
            .filter(|(_, side)| !side.is_empty())
            .map(|(i, side)| format!("P{} {}", i + 1, side.join(" ")))
            .collect();
        lines.push(format!(
            "no-backtrack (piece cannot return to that square): {}",
            parts.join(" | ")
        ));
    }

    lines.join("\n")
}

/// Legal moves as canonical text, e.g. `pawn@01 rook@00 ...`.
pub fn render_legal_moves(moves: &[Move]) -> String {
    if moves.is_empty() {
        return "(none - game over)".to_string();
    }
    moves
        .iter()
        .map(|m| format!("{}@{}{}", m.piece, m.x, m.y))
        .collect::<Vec<_>>()
        .join(" ")
}
