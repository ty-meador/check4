//! Run the bot ladder round-robin and print pairwise results + standings.
//!
//! Usage: `ladder [games_per_pair] [base_seed] [ply_cap]`
//! Defaults: 20 games per pair, seed 42, ply cap 200.

use check4_harness::{round_robin, BotFactory, MinimaxBot, RandomBot, DEFAULT_PLY_CAP};
use std::time::Instant;

fn arg(n: usize, default: u32) -> u32 {
    match std::env::args().nth(n) {
        None => default,
        Some(raw) => raw.parse().unwrap_or_else(|_| {
            eprintln!("ladder: argument {n} ({raw:?}) must be a decimal u32");
            std::process::exit(2);
        }),
    }
}

fn main() {
    let games = arg(1, 20);
    let seed = arg(2, 42);
    let ply_cap = arg(3, DEFAULT_PLY_CAP);

    let ladder: Vec<BotFactory> = vec![
        Box::new(|game_seed| Box::new(RandomBot::new(game_seed))),
        Box::new(|_| Box::new(MinimaxBot::new(1))),
        Box::new(|_| Box::new(MinimaxBot::new(2))),
        Box::new(|_| Box::new(MinimaxBot::new(4))),
        Box::new(|_| Box::new(MinimaxBot::new(6))),
    ];

    println!("ladder: {games} games/pair, seed {seed}, ply cap {ply_cap}");
    let start = Instant::now();
    let (results, standings) = round_robin(&ladder, games, seed, ply_cap);
    let elapsed = start.elapsed();

    println!("\npairwise (wins-draws-losses, left bot's view):");
    for r in &results {
        println!(
            "  {:>8} v {:<8} {:>3}-{:<3}-{:<3} ({} plies)",
            r.a, r.b, r.a_wins, r.draws, r.b_wins, r.plies
        );
    }

    println!("\nstandings (2/win, 1/draw):");
    for (rank, s) in standings.iter().enumerate() {
        println!(
            "  {}. {:<8} {:>3} pts  ({}W {}D {}L)",
            rank + 1,
            s.name,
            s.points,
            s.wins,
            s.draws,
            s.losses
        );
    }

    let total_plies: u64 = results.iter().map(|r| r.plies).sum();
    println!(
        "\n{total_plies} plies in {:.2?} ({:.0} plies/s)",
        elapsed,
        total_plies as f64 / elapsed.as_secs_f64()
    );
}
