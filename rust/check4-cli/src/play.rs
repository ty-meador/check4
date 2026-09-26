//! The interactive game loop: render, prompt, exchange signed records,
//! seal, archive.

use crate::AnyError;
use std::io::Write as _;
use std::path::Path;

use check4_net::session::{GameSession, SessionError};
use check4_protocol::chain::verify;
use check4_protocol::{wire, Action, ChainError, GameLog};
use tokio::io::{AsyncRead, AsyncWrite};

use crate::render::{render_legal_moves, render_state};

/// Read one line from the terminal without blocking the async runtime
/// (the QUIC connection keeps itself alive on other tasks).
async fn read_line(prompt: &str) -> std::io::Result<String> {
    let prompt = prompt.to_string();
    tokio::task::spawn_blocking(move || {
        print!("{prompt}");
        std::io::stdout().flush()?;
        let mut line = String::new();
        let read = std::io::stdin().read_line(&mut line)?;
        if read == 0 {
            // EOF (^D): treat as resigning intent; the loop confirms.
            line.push_str("resign");
        }
        Ok(line.trim().to_string())
    })
    .await
    .expect("stdin task never panics")
}

/// Drive a handshaken session to its sealed end, saving the log under
/// `data_dir/games/`. On a lost connection the unsealed partial log is
/// saved instead, so the game so far remains provable.
pub async fn play<R, W>(mut session: GameSession<R, W>, data_dir: &Path) -> Result<(), AnyError>
where
    R: AsyncRead + Unpin,
    W: AsyncWrite + Unpin,
{
    println!(
        "\nyou are P{} — moves look like pawn@01; `moves` lists legal moves, `board` reprints, `resign` concedes\n",
        session.seat().number()
    );
    println!("{}\n", render_state(session.game()));

    while session.game().winner().is_none() {
        if session.my_turn() {
            let line = read_line("your move> ").await?;
            match line.as_str() {
                "" => continue,
                "moves" => {
                    println!("{}", render_legal_moves(&session.game().legal_moves()));
                    continue;
                }
                "board" => {
                    println!("{}", render_state(session.game()));
                    continue;
                }
                _ => {}
            }

            let action: Action = match line.parse() {
                Ok(action) => action,
                Err(_) => {
                    println!("unrecognized — try e.g. pawn@01, `moves`, `board`, or `resign`");
                    continue;
                }
            };
            match session.play(action).await {
                Ok(_) => {}
                Err(SessionError::Chain(ChainError::IllegalAction { source, .. })) => {
                    // Rejected locally before anything was signed or sent.
                    println!("illegal: {source}");
                    continue;
                }
                Err(err) => return on_session_error(err, session.log(), data_dir),
            }
        } else {
            println!("waiting for opponent...");
            match session.wait_for_move().await {
                Ok(record) => println!("opponent played {}\n", record.action),
                Err(err) => return on_session_error(err, session.log(), data_dir),
            }
        }
        println!("{}\n", render_state(session.game()));
    }

    let winner = session.game().winner().expect("loop exits on winner");
    let me = session.seat();
    println!(
        "P{} wins — {}",
        winner.number(),
        if winner == me {
            "that's you"
        } else {
            "opponent"
        }
    );

    let log = session.finish().await?;
    verify(&log).expect("a log this side just co-signed verifies");
    let path = save_log(&log, data_dir, true)?;
    println!("game sealed by both keys and archived: {path}");
    Ok(())
}

fn on_session_error(err: SessionError, partial: &GameLog, data_dir: &Path) -> Result<(), AnyError> {
    if !partial.records.is_empty() {
        if let Ok(path) = save_log(partial, data_dir, false) {
            eprintln!("partial log saved (every move so far is signed): {path}");
        }
    }
    Err(Box::new(err))
}

/// Archive a log as `games/<game-id-prefix>[.partial].c4l1`.
fn save_log(log: &GameLog, data_dir: &Path, sealed: bool) -> Result<String, std::io::Error> {
    let games = data_dir.join("games");
    std::fs::create_dir_all(&games)?;

    let id = log.genesis.game_id();
    let hex: String = id[..8].iter().map(|b| format!("{b:02x}")).collect();
    let suffix = if sealed { "" } else { ".partial" };
    let path = games.join(format!("{hex}{suffix}.c4l1"));
    std::fs::write(&path, wire::to_bytes(log))?;
    Ok(path.display().to_string())
}
