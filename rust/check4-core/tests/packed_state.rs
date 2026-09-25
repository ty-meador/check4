//! Packed-state round-trip tests: the 83-bit representation must preserve
//! state_key() exactly for every state reachable by play.

use check4_core::fuzz::{game_seed, Xorshift32};
use check4_core::{Game, GameSetup, Move, PieceKind, Player, UnpackError};

#[test]
fn initial_position_round_trips() {
    let g = Game::new();
    let bits = g.pack();
    let back = Game::unpack(bits).unwrap();
    assert_eq!(back.state_key(), g.state_key());
    assert_eq!(back, g);
}

/// Field placement follows the documented layout: positions at 5*i, prevs
/// at 40 + 5*i, pawn-direction bits at 80/81, turn bit at 82.
#[test]
fn packed_layout_matches_documentation() {
    let mut setup = GameSetup::empty(Player::Two);
    let pawn = setup.piece_mut(Player::One, PieceKind::Pawn);
    pawn.pos = Some((2, 1)); // code 2*4+1 = 9
    pawn.prev = Some((0, 3)); // code 3
    setup.piece_mut(Player::Two, PieceKind::Knight).pos = Some((3, 3)); // code 15
    let g = Game::from_setup(&setup).unwrap();

    let bits = g.pack();
    assert_eq!(bits & 0x1F, 9, "p1 pawn position at bits 0..5");
    assert_eq!(bits >> 40 & 0x1F, 3, "p1 pawn prev at bits 40..45");
    assert_eq!(bits >> 35 & 0x1F, 15, "p2 knight position at bits 35..40");
    assert_eq!(bits >> 5 & 0x1F, 16, "p1 rook in the gutter");
    assert_eq!(bits >> 80 & 1, 0, "p1 pawn faces up");
    assert_eq!(bits >> 81 & 1, 1, "p2 pawn faces down");
    assert_eq!(bits >> 82 & 1, 1, "p2 to move");
    assert_eq!(bits >> 83, 0, "no bits above the payload");

    let back = Game::unpack(bits).unwrap();
    assert_eq!(back.state_key(), g.state_key());
}

/// Replay seeded fuzz games and assert pack -> unpack -> state_key
/// stability after every ply, including winning final positions (the
/// winner is recomputed from alignment on unpack).
#[test]
fn fuzz_replay_round_trips_every_ply() {
    let mut saw_winner = false;

    for game_index in 0..6 {
        let mut rng = Xorshift32::new(game_seed(12345, game_index));
        let mut g = Game::new();
        let mut plies = 0;

        while plies < 150 && g.winner().is_none() {
            let moves = g.legal_moves();
            if moves.is_empty() {
                break;
            }
            let mv: Move = moves[rng.next_u32() as usize % moves.len()];
            g.take_turn(mv).unwrap();
            plies += 1;

            let key = g.state_key();
            let back = Game::unpack(g.pack()).unwrap();
            assert_eq!(
                back.state_key(),
                key,
                "round-trip diverged in game {game_index} at ply {plies}"
            );
            assert_eq!(back.winner(), g.winner());
        }

        saw_winner |= g.winner().is_some();
    }

    assert!(
        saw_winner,
        "expected at least one decisive game in the sample"
    );
}

#[test]
fn unpack_recomputes_played_winner() {
    // Play a full win (P1 aligns on row y=1) and round-trip the final state.
    let mut g = Game::new();
    for (piece, x, y) in [
        (PieceKind::Pawn, 0, 1),
        (PieceKind::Rook, 1, 1),
        (PieceKind::Bishop, 2, 1),
        (PieceKind::Knight, 3, 1),
    ] {
        g.take_turn(Move {
            player: Player::One,
            piece,
            x,
            y,
        })
        .unwrap();
        if g.winner().is_none() {
            // P2 mirrors on row 2 to hand the turn back.
            g.take_turn(Move {
                player: Player::Two,
                piece,
                x,
                y: y + 1,
            })
            .unwrap();
        }
    }
    assert_eq!(g.winner(), Some(Player::One));

    let back = Game::unpack(g.pack()).unwrap();
    assert_eq!(back.winner(), Some(Player::One));
    assert_eq!(back.state_key(), g.state_key());
    // turn_count is documented as not preserved.
    assert_eq!(back.turn_count(), 0);
}

#[test]
fn unpack_rejects_invalid_encodings() {
    // A square code of 17 in the first position field.
    assert_eq!(
        Game::unpack(17),
        Err(UnpackError::InvalidSquareCode {
            bit_offset: 0,
            code: 17
        })
    );

    // A stray bit above the 83-bit payload.
    let good = Game::new().pack();
    assert_eq!(
        Game::unpack(good | 1 << 83),
        Err(UnpackError::UnusedBitsSet)
    );
}
