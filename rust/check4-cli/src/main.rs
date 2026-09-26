//! `check4` — host, join and play signed peer-to-peer Check4 games from
//! the terminal.

mod play;
mod render;

use std::error::Error;

/// CLI errors are heterogeneous and only ever printed.
type AnyError = Box<dyn Error + Send + Sync + 'static>;
use std::path::PathBuf;
use std::time::Duration;

use check4_core::Player;
use check4_net::identity::{display_key, Identity, IDENTITY_FILE};
use check4_net::net::parse_ticket;
use check4_net::{GameSession, Node, PeerLink};
use check4_protocol::chain::verify;
use check4_protocol::{wire, GameResult};

const USAGE: &str = "\
check4 — signed peer-to-peer Check4

usage:
  check4 id                 show this player's id (creates the key on first use)
  check4 host [--seat 1|2]  host a game: advertises on the LAN and prints a ticket
  check4 join <ticket>      join a hosted game by ticket (works across the internet)
  check4 join --lan         find a host on the local network and join it
  check4 verify <log.c4l1>  verify an archived game log

data lives in $CHECK4_HOME (default ~/.check4): the identity key and
archived game logs. Every move is Ed25519-signed and hash-chained; a
finished game is a dual-signed, independently verifiable artifact.";

fn data_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("CHECK4_HOME") {
        return PathBuf::from(dir);
    }
    match std::env::var("HOME") {
        Ok(home) => PathBuf::from(home).join(".check4"),
        Err(_) => PathBuf::from(".check4"),
    }
}

fn load_identity() -> Result<Identity, AnyError> {
    Ok(Identity::load_or_create(&data_dir().join(IDENTITY_FILE))?)
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let args: Vec<&str> = args.iter().map(String::as_str).collect();

    let result = match args.as_slice() {
        ["id"] => cmd_id(),
        ["host"] => cmd_host(None).await,
        ["host", "--seat", seat] => match *seat {
            "1" => cmd_host(Some(Player::One)).await,
            "2" => cmd_host(Some(Player::Two)).await,
            _ => usage_error("--seat takes 1 or 2"),
        },
        ["join", "--lan"] => cmd_join_lan().await,
        ["join", ticket] => cmd_join_ticket(ticket).await,
        ["verify", path] => cmd_verify(path),
        ["help"] | ["--help"] | ["-h"] | [] => {
            println!("{USAGE}");
            Ok(())
        }
        _ => usage_error("unrecognized command"),
    };

    if let Err(err) = result {
        eprintln!("error: {err}");
        std::process::exit(1);
    }
}

fn usage_error(message: &str) -> Result<(), AnyError> {
    eprintln!("{message}\n\n{USAGE}");
    std::process::exit(2);
}

fn cmd_id() -> Result<(), AnyError> {
    let identity = load_identity()?;
    println!("{}", identity.player_id());
    println!("(key: {})", data_dir().join(IDENTITY_FILE).display());
    Ok(())
}

async fn cmd_host(seat: Option<Player>) -> Result<(), AnyError> {
    let identity = load_identity()?;
    let node = Node::bind(&identity, true).await?;
    // Wait for relay/published addresses so the ticket works across the
    // internet — but don't block hosting on it: direct addresses already
    // work on the local network (and mDNS discovery needs no ticket).
    if tokio::time::timeout(Duration::from_secs(10), node.online())
        .await
        .is_err()
    {
        eprintln!("(no relay reachable — the ticket may only work on this network)");
    }

    let seat = seat.unwrap_or(if rand::random::<bool>() {
        Player::One
    } else {
        Player::Two
    });

    println!("player id: {}", node.player_id());
    println!("you will play P{}", seat.number());
    println!("\nshare this ticket (or let LAN players discover you):\n");
    println!("{}\n", node.ticket());
    println!("waiting for an opponent...");

    let PeerLink {
        connection,
        remote,
        send,
        recv,
    } = node.accept().await?;
    println!("opponent connected: {}", display_key(&remote));

    let session = GameSession::host(
        recv,
        send,
        identity.signing_key().clone(),
        remote,
        seat,
        rand::random::<[u8; 32]>(),
    )
    .await?;

    let played = play::play(session, &data_dir()).await;
    connection.close(0u8.into(), b"done");
    node.close().await;
    played
}

async fn cmd_join_ticket(ticket: &str) -> Result<(), AnyError> {
    let addr = parse_ticket(ticket)?;
    join(addr).await
}

async fn cmd_join_lan() -> Result<(), AnyError> {
    let identity = load_identity()?;
    let node = Node::bind(&identity, false).await?;

    println!("listening for Check4 hosts on the local network...");
    let hosts = node.discover_lan(Duration::from_secs(3)).await;
    node.close().await;

    let Some(addr) = hosts.into_iter().next() else {
        return Err("no Check4 hosts found on the local network".into());
    };
    println!("found host: {}", addr.id);
    join(addr).await
}

async fn join(addr: check4_net::net::EndpointAddr) -> Result<(), AnyError> {
    let identity = load_identity()?;
    let node = Node::bind(&identity, false).await?;

    println!("player id: {}", node.player_id());
    println!("connecting...");
    let PeerLink {
        connection,
        remote,
        send,
        recv,
    } = node.connect(addr).await?;
    println!("connected to host: {}", display_key(&remote));

    let session = GameSession::join(recv, send, identity.signing_key().clone(), remote).await?;

    let played = play::play(session, &data_dir()).await;
    connection.close(0u8.into(), b"done");
    node.close().await;
    played
}

fn cmd_verify(path: &str) -> Result<(), AnyError> {
    let bytes = std::fs::read(path)?;
    let log = wire::from_bytes(&bytes)?;
    let verified = verify(&log)?;

    println!("game id: {}", hex(&log.genesis.game_id()));
    println!("P1: {}", display_key(&log.genesis.keys[0]));
    println!("P2: {}", display_key(&log.genesis.keys[1]));
    println!("plies: {}", log.records.len());
    match verified.outcome {
        Some(GameResult::Winner(player)) => println!("result: P{} wins", player.number()),
        Some(GameResult::AdjudicatedDraw) => println!("result: adjudicated draw"),
        None => println!("result: unfinished"),
    }
    println!(
        "chain: every move signed and verified; {}",
        if verified.sealed {
            "result sealed by both keys"
        } else {
            "no seal (unfinished or partial log)"
        }
    );
    Ok(())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
