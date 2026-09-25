//! The line-potential eval: zero-sum symmetry and line accounting.

use check4_core::{Game, GameSetup, PieceKind, Player};
use check4_harness::eval::{evaluate, LINE_SCORE};
use check4_harness::{Bot, RandomBot};

#[test]
fn empty_board_is_level() {
    let game = Game::new();
    assert_eq!(evaluate(&game, Player::One), 0);
    assert_eq!(evaluate(&game, Player::Two), 0);
}

#[test]
fn a_single_piece_scores_its_lines() {
    // (0,0) lies on row 0, column 0 and the main diagonal: three
    // uncontested one-piece lines.
    let mut setup = GameSetup::empty(Player::One);
    setup.piece_mut(Player::One, PieceKind::Rook).pos = Some((0, 0));
    let game = Game::from_setup(&setup).unwrap();
    assert_eq!(evaluate(&game, Player::One), 3 * LINE_SCORE[1]);
    assert_eq!(evaluate(&game, Player::Two), -3 * LINE_SCORE[1]);
}

#[test]
fn contested_lines_score_nothing() {
    // Both rooks on row 0: the row is contested; each still owns its
    // column, and (0,0)/(3,0) each sit on one diagonal.
    let mut setup = GameSetup::empty(Player::One);
    setup.piece_mut(Player::One, PieceKind::Rook).pos = Some((0, 0));
    setup.piece_mut(Player::Two, PieceKind::Rook).pos = Some((3, 0));
    let game = Game::from_setup(&setup).unwrap();
    // Own: column 0 + main diagonal. Enemy: column 3 + anti-diagonal.
    assert_eq!(evaluate(&game, Player::One), 0);
    assert_eq!(evaluate(&game, Player::Two), 0);
}

#[test]
fn superlinear_growth_rewards_concentration() {
    // Three on one clean line must outweigh three pieces on separate
    // clean lines.
    assert!(LINE_SCORE[3] > 3 * LINE_SCORE[2]);
    assert!(LINE_SCORE[2] > 2 * LINE_SCORE[1]);
}

#[test]
fn eval_is_antisymmetric_across_random_play() {
    let mut one = RandomBot::new(7);
    let mut two = RandomBot::new(11);
    let mut game = Game::new();
    for _ in 0..60 {
        let bot: &mut dyn Bot = match game.turn() {
            Player::One => &mut one,
            Player::Two => &mut two,
        };
        let Some(mv) = bot.choose(&game) else { break };
        game.take_turn(mv).unwrap();
        assert_eq!(
            evaluate(&game, Player::One),
            -evaluate(&game, Player::Two),
            "eval must be zero-sum at every position"
        );
        if game.winner().is_some() {
            break;
        }
    }
}
