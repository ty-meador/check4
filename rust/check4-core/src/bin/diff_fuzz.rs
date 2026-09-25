//! Differential-fuzz trace generator (contract V1).
//!
//! Prints the contract trace to stdout so it can be diffed byte-for-byte
//! against the normative TypeScript engine's trace for the same arguments.

use check4_core::fuzz::run_trace;
use std::process::ExitCode;

const USAGE: &str = "usage: diff_fuzz [--seed N] [--games N] [--ply-cap N]
	--seed N     base PRNG seed (default 42)
	--games N    number of games to play (default 100)
	--ply-cap N  adjudicated-draw ply cap per game (default 200)";

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();

    let mut seed: u32 = 42;
    let mut games: u32 = 100;
    let mut ply_cap: u32 = 200;

    let mut i = 0;
    while i < args.len() {
        let arg = &args[i];
        let (flag, inline_value) = match arg.split_once('=') {
            Some((flag, value)) => (flag, Some(value.to_string())),
            None => (arg.as_str(), None),
        };

        if flag == "--help" || flag == "-h" {
            println!("{USAGE}");
            return ExitCode::SUCCESS;
        }

        let slot: &mut u32 = match flag {
            "--seed" => &mut seed,
            "--games" => &mut games,
            "--ply-cap" => &mut ply_cap,
            _ => {
                eprintln!("diff_fuzz: unknown argument `{arg}`\n{USAGE}");
                return ExitCode::from(2);
            }
        };

        let value = match inline_value {
            Some(value) => value,
            None => {
                i += 1;
                match args.get(i) {
                    Some(value) => value.clone(),
                    None => {
                        eprintln!("diff_fuzz: missing value for `{flag}`\n{USAGE}");
                        return ExitCode::from(2);
                    }
                }
            }
        };

        match value.parse::<u32>() {
            Ok(parsed) => *slot = parsed,
            Err(_) => {
                eprintln!("diff_fuzz: invalid value `{value}` for `{flag}`\n{USAGE}");
                return ExitCode::from(2);
            }
        }

        i += 1;
    }

    print!("{}", run_trace(seed, games, ply_cap));
    ExitCode::SUCCESS
}
