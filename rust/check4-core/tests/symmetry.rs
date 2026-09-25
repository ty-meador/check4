//! The symmetry group: group laws, equivariance with play (verified
//! against the engine over seeded random games), and canonicalization.

use check4_core::fuzz::{game_seed, Xorshift32};
use check4_core::{Direction, Game, GameSetup, Move, PieceKind, Player, Transform};
use std::collections::BTreeSet;

/// Play a short seeded random game and return every position visited.
fn random_positions(seed: u32, plies: u32) -> Vec<Game> {
    let mut rng = Xorshift32::new(game_seed(seed, 0));
    let mut game = Game::new();
    let mut positions = vec![game.clone()];

    for _ in 0..plies {
        let moves = game.legal_moves();
        if moves.is_empty() || game.winner().is_some() {
            break;
        }
        let mv = moves[rng.next_u32() as usize % moves.len()];
        game.take_turn(mv).unwrap();
        positions.push(game.clone());
    }
    positions
}

fn move_set(game: &Game) -> BTreeSet<(u8, usize, u8, u8)> {
    game.legal_moves()
        .into_iter()
        .map(|mv| {
            let piece = PieceKind::ALL.iter().position(|&k| k == mv.piece).unwrap();
            (mv.player.number(), piece, mv.x, mv.y)
        })
        .collect()
}

fn mapped_move_set(game: &Game, t: Transform) -> BTreeSet<(u8, usize, u8, u8)> {
    game.legal_moves()
        .into_iter()
        .map(|mv| {
            let mv = t.apply_move(mv);
            let piece = PieceKind::ALL.iter().position(|&k| k == mv.piece).unwrap();
            (mv.player.number(), piece, mv.x, mv.y)
        })
        .collect()
}

#[test]
fn the_group_has_eight_distinct_involutions() {
    let distinct: BTreeSet<_> = Transform::ALL
        .iter()
        .map(|t| (t.mirror_x, t.mirror_y, t.swap_players))
        .collect();
    assert_eq!(distinct.len(), 8);
    assert_eq!(Transform::ALL[0], Transform::default());

    let id = Transform::default();
    for t in Transform::ALL {
        assert_eq!(t.compose(t), id, "{t:?} is an involution");
        assert_eq!(t.compose(t.inverse()), id);
        for u in Transform::ALL {
            assert_eq!(t.compose(u), u.compose(t), "the group is abelian");
        }
    }
}

#[test]
fn the_identity_fixes_every_position() {
    for game in random_positions(42, 40) {
        let mapped = Transform::default().apply(&game);
        assert_eq!(mapped.state_key(), game.state_key());
        assert_eq!(mapped.turn_count(), game.turn_count());
    }
}

#[test]
fn applying_a_transform_twice_returns_the_original() {
    for game in random_positions(1337, 40) {
        for t in Transform::ALL {
            let round_trip = t.apply(&t.apply(&game));
            assert_eq!(round_trip.state_key(), game.state_key(), "{t:?}");
        }
    }
}

#[test]
fn legal_move_sets_map_bijectively() {
    for (i, game) in random_positions(7, 60).into_iter().enumerate() {
        for t in Transform::ALL {
            assert_eq!(
                move_set(&t.apply(&game)),
                mapped_move_set(&game, t),
                "ply {i}, {t:?}"
            );
        }
    }
}

#[test]
fn play_commutes_with_every_transform() {
    // t(g) then t(m) must equal t(g then m) - including pawn direction
    // flips, captures, backtrack memory and win declaration.
    for seed in [42u32, 99] {
        let mut rng = Xorshift32::new(game_seed(seed, 0));
        let mut game = Game::new();

        for _ in 0..120 {
            let moves = game.legal_moves();
            if moves.is_empty() || game.winner().is_some() {
                break;
            }
            let mv = moves[rng.next_u32() as usize % moves.len()];

            for t in Transform::ALL {
                let mut transformed_first = t.apply(&game);
                transformed_first
                    .take_turn(t.apply_move(mv))
                    .expect("transformed move must be legal in transformed position");

                let mut original = game.clone();
                original.take_turn(mv).unwrap();

                assert_eq!(
                    transformed_first.state_key(),
                    t.apply(&original).state_key(),
                    "{t:?}"
                );
            }

            game.take_turn(mv).unwrap();
        }
    }
}

#[test]
fn swap_players_swaps_turn_and_winner() {
    let mut game = Game::new();
    game.take_turn(Move {
        player: Player::One,
        piece: PieceKind::Rook,
        x: 0,
        y: 0,
    })
    .unwrap();
    game.forfeit(None);
    assert_eq!(game.winner(), Some(Player::One));

    let t = Transform {
        swap_players: true,
        ..Transform::default()
    };
    let swapped = t.apply(&game);
    assert_eq!(swapped.winner(), Some(Player::Two));
    assert_eq!(swapped.turn(), Player::One);
    assert_eq!(
        swapped.piece_position(Player::Two, PieceKind::Rook),
        Some((0, 0))
    );
    assert_eq!(swapped.piece_position(Player::One, PieceKind::Rook), None);
}

#[test]
fn mirror_y_flips_pawn_directions() {
    let mut setup = GameSetup::empty(Player::One);
    setup.piece_mut(Player::One, PieceKind::Pawn).pos = Some((1, 1));
    let game = Game::from_setup(&setup).unwrap();
    assert_eq!(game.pawn_direction(Player::One), Direction::Up);

    let t = Transform {
        mirror_y: true,
        ..Transform::default()
    };
    let mirrored = t.apply(&game);
    assert_eq!(mirrored.pawn_direction(Player::One), Direction::Down);
    assert_eq!(mirrored.pawn_direction(Player::Two), Direction::Up);
    assert_eq!(
        mirrored.piece_position(Player::One, PieceKind::Pawn),
        Some((1, 2))
    );
}

#[test]
fn canonical_pack_is_orbit_invariant_and_no_finer() {
    for game in random_positions(2024, 60) {
        let canon = game.canonical_pack();
        // Invariant across the whole orbit...
        for t in Transform::ALL {
            assert_eq!(t.apply(&game).canonical_pack(), canon, "{t:?}");
        }
        // ...and achieved by some orbit member (it is a real position's
        // packed form, not an arbitrary lower bound).
        assert!(Transform::ALL
            .iter()
            .any(|t| t.apply(&game).pack() == canon));
    }
}

#[test]
fn canonical_pack_separates_genuinely_different_positions() {
    // Two positions that are NOT symmetry images of one another must not
    // collide: rook at (0,0) vs rook at (1,0) (the latter is off every
    // mirror image of the former).
    let place = |x: u8| {
        let mut setup = GameSetup::empty(Player::One);
        setup.piece_mut(Player::One, PieceKind::Rook).pos = Some((x, 0));
        Game::from_setup(&setup).unwrap().canonical_pack()
    };
    assert_ne!(place(0), place(1));
}
