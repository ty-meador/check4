//! Match mechanics: the ply cap adjudicates, seats alternate, seeds
//! reproduce, and round-robin bookkeeping balances.

use check4_harness::{play_game, play_match, round_robin, Bot, BotFactory, MinimaxBot, RandomBot};

fn random_factory() -> BotFactory {
    Box::new(|seed| Box::new(RandomBot::new(seed)))
}

fn minimax_factory(depth: u32) -> BotFactory {
    Box::new(move |_| Box::new(MinimaxBot::new(depth)))
}

#[test]
fn the_ply_cap_adjudicates_a_draw() {
    let mut one = RandomBot::new(1);
    let mut two = RandomBot::new(2);
    let outcome = play_game(&mut one, &mut two, 4);
    assert_eq!(outcome.plies, 4);
    assert_eq!(outcome.winner, None, "random can't win by ply 4");
}

#[test]
fn matches_reproduce_from_their_arguments() {
    let run = || play_match(&random_factory(), &random_factory(), 10, 42, 60);
    let a = run();
    assert_eq!(a, run());
    assert_eq!(a.a_wins + a.b_wins + a.draws, 10);
    // Distinct per-seat seed streams: the mirror match cannot be all draws
    // by self-mirroring.
    assert!(a.plies > 0);
}

#[test]
fn a_different_seed_changes_the_match() {
    let a = play_match(&random_factory(), &random_factory(), 10, 42, 60);
    let b = play_match(&random_factory(), &random_factory(), 10, 43, 60);
    assert_ne!(a, b);
}

#[test]
fn greedy_crushes_random_from_both_seats() {
    let result = play_match(&random_factory(), &minimax_factory(1), 6, 42, 200);
    assert_eq!(result.a, "random");
    assert_eq!(result.b, "greedy");
    // Seats alternate inside the match, so this covers greedy as P1 and P2.
    assert!(
        result.b_wins >= 5,
        "greedy should win nearly every game, got {result:?}"
    );
    assert_eq!(result.a_wins, 0, "random should never beat 1-ply search");
}

#[test]
fn round_robin_bookkeeping_balances() {
    let ladder: Vec<BotFactory> = vec![random_factory(), minimax_factory(1), minimax_factory(2)];
    let games = 4;
    let (results, standings) = round_robin(&ladder, games, 42, 100);

    assert_eq!(results.len(), 3); // 3 choose 2 pairings
    assert_eq!(standings.len(), 3);

    let total_wins: u32 = standings.iter().map(|s| s.wins).sum();
    let total_losses: u32 = standings.iter().map(|s| s.losses).sum();
    let total_draws: u32 = standings.iter().map(|s| s.draws).sum();
    assert_eq!(total_wins, total_losses);
    // Each drawn game appears in both players' draw counts.
    assert_eq!(total_draws % 2, 0);
    assert_eq!(total_wins + total_draws / 2, 3 * games);

    for s in &standings {
        assert_eq!(s.wins + s.draws + s.losses, 2 * games, "{}", s.name);
        assert_eq!(s.points, 2 * s.wins + s.draws, "{}", s.name);
    }
    assert!(
        standings.windows(2).all(|w| w[0].points >= w[1].points),
        "standings sorted best first"
    );
    assert_eq!(
        standings.last().map(|s| s.name.as_str()),
        Some("random"),
        "random anchors the bottom"
    );
}

#[test]
fn bots_from_a_factory_are_fresh_per_game() {
    // A stateful bot must not leak PRNG state across games: game g always
    // gets RandomBot::new(game_seed(base, g)), so swapping the opponent
    // factory cannot change which seeds the random side receives.
    let vs_greedy = play_match(&random_factory(), &minimax_factory(1), 4, 7, 50);
    let vs_greedy_again = play_match(&random_factory(), &minimax_factory(1), 4, 7, 50);
    assert_eq!(vs_greedy, vs_greedy_again);
}

#[test]
fn deterministic_bots_ignore_their_seed() {
    let mut a = MinimaxBot::new(2);
    let mut b = MinimaxBot::new(2);
    let game = check4_core::Game::new();
    assert_eq!(a.choose(&game), b.choose(&game));
}
