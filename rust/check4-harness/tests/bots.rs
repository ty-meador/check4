//! Bot behavior: determinism, ladder names, and the search rungs actually
//! finding wins and blocks.

use check4_core::{Game, GameSetup, Move, PieceKind, Player};
use check4_harness::{Bot, MinimaxBot, RandomBot};

/// P1 has pawn/rook/bishop on column 0 with the knight in the gutter:
/// knight@03 wins on the spot. P2 sits harmlessly on column 2.
fn win_in_one() -> Game {
    let mut setup = GameSetup::empty(Player::One);
    setup.piece_mut(Player::One, PieceKind::Pawn).pos = Some((0, 0));
    setup.piece_mut(Player::One, PieceKind::Rook).pos = Some((0, 1));
    setup.piece_mut(Player::One, PieceKind::Bishop).pos = Some((0, 2));
    setup.piece_mut(Player::Two, PieceKind::Rook).pos = Some((2, 1));
    setup.piece_mut(Player::Two, PieceKind::Bishop).pos = Some((2, 2));
    Game::from_setup(&setup).expect("setup is on-board")
}

/// P1 threatens pawn@30 to complete row 0; P2 (to move, all pieces in the
/// gutter) can only prevent it by occupying (3,0).
fn must_block() -> Game {
    let mut setup = GameSetup::empty(Player::Two);
    setup.piece_mut(Player::One, PieceKind::Rook).pos = Some((0, 0));
    setup.piece_mut(Player::One, PieceKind::Bishop).pos = Some((1, 0));
    setup.piece_mut(Player::One, PieceKind::Knight).pos = Some((2, 0));
    Game::from_setup(&setup).expect("setup is on-board")
}

#[test]
fn ladder_names() {
    assert_eq!(RandomBot::new(1).name(), "random");
    assert_eq!(MinimaxBot::new(1).name(), "greedy");
    assert_eq!(MinimaxBot::new(4).name(), "minimax4");
}

#[test]
fn random_bot_is_deterministic_per_seed_and_plays_legal_moves() {
    let picks = |seed: u32| -> Vec<Move> {
        let mut bot = RandomBot::new(seed);
        let mut game = Game::new();
        let mut picks = Vec::new();
        for _ in 0..20 {
            let mv = bot.choose(&game).expect("moves exist");
            assert!(game.move_is_valid(mv));
            game.take_turn(mv).unwrap();
            picks.push(mv);
        }
        picks
    };

    assert_eq!(picks(42), picks(42));
    assert_ne!(picks(42), picks(43));
    // Seed 0 is remapped off the PRNG's fixed point, not left degenerate.
    assert_eq!(picks(0), picks(0x9E37_79B9));
}

#[test]
fn every_search_depth_takes_an_immediate_win() {
    for depth in [1, 2, 4, 6] {
        let game = win_in_one();
        let mv = MinimaxBot::new(depth).choose(&game).expect("moves exist");
        assert_eq!(
            mv,
            Move {
                player: Player::One,
                piece: PieceKind::Knight,
                x: 0,
                y: 3
            },
            "depth {depth}"
        );
    }
}

#[test]
fn depth_two_blocks_an_immediate_threat() {
    let game = must_block();
    let mv = MinimaxBot::new(2).choose(&game).expect("moves exist");
    assert_eq!((mv.x, mv.y), (3, 0), "must occupy the winning square");

    // And the block works: after it, P1 has no move that wins on the spot.
    let mut after = game.clone();
    after.take_turn(mv).unwrap();
    for reply in after.legal_moves() {
        let mut probe = after.clone();
        probe.take_turn(reply).unwrap();
        assert_eq!(probe.winner(), None, "P1 still wins via {reply:?}");
    }
}

#[test]
fn search_is_deterministic() {
    let mut game = Game::new();
    // March a midgame deterministically with the bot itself, checking each
    // rebuilt bot agrees with a fresh one at every position.
    for _ in 0..12 {
        let mv = MinimaxBot::new(4).choose(&game).expect("moves exist");
        assert_eq!(MinimaxBot::new(4).choose(&game), Some(mv));
        game.take_turn(mv).unwrap();
    }
}

#[test]
fn no_move_is_offered_on_a_finished_game() {
    let mut game = Game::new();
    game.forfeit(None);
    assert_eq!(RandomBot::new(1).choose(&game), None);
    assert_eq!(MinimaxBot::new(2).choose(&game), None);
}
