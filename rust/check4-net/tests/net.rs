//! The session over real iroh QUIC on localhost: two endpoints, no relays
//! or lookup services (so the test needs no network egress), a full game
//! sealed and verified on both sides.
//!
//! LAN mDNS discovery is deliberately untested here — multicast is
//! unreliable in CI containers; the CLI exercises it on real networks.

use std::time::Duration;

use check4_core::{PieceKind, Player};
use check4_net::identity::Identity;
use check4_net::net::{accept_link, connect_link, ALPN};
use check4_net::session::GameSession;
use check4_protocol::chain::verify;
use check4_protocol::Action;
use iroh::endpoint::presets;
use iroh::{Endpoint, EndpointAddr};
use tokio::time::timeout;

async fn bind_local(identity: &Identity) -> Endpoint {
    Endpoint::builder(presets::Minimal)
        .secret_key(identity.secret().clone())
        .alpns(vec![ALPN.to_vec()])
        .bind()
        .await
        .expect("local endpoint binds")
}

/// The endpoint's directly reachable localhost address.
fn local_addr(endpoint: &Endpoint) -> EndpointAddr {
    let mut addr = EndpointAddr::new(endpoint.id());
    for socket in endpoint.bound_sockets() {
        let port = socket.port();
        let localhost: std::net::IpAddr = if socket.is_ipv4() {
            std::net::Ipv4Addr::LOCALHOST.into()
        } else {
            std::net::Ipv6Addr::LOCALHOST.into()
        };
        addr = addr.with_ip_addr((localhost, port).into());
    }
    addr
}

#[tokio::test]
async fn a_game_over_real_quic_seals_and_verifies() {
    let host_id = Identity::from_seed([0x51; 32]);
    let join_id = Identity::from_seed([0x52; 32]);

    let host_ep = bind_local(&host_id).await;
    let join_ep = bind_local(&join_id).await;
    let host_addr = local_addr(&host_ep);

    let nonce = [0x77; 32];
    let host_task = async {
        let link = accept_link(&host_ep).await.expect("host accepts");
        assert_eq!(link.remote, join_id.verifying_key());
        let mut session = GameSession::host(
            link.recv,
            link.send,
            host_id.signing_key().clone(),
            link.remote,
            Player::One,
            nonce,
        )
        .await
        .expect("host handshake");

        // Host opens; the joiner resigns; seal.
        session
            .play(Action::Move {
                piece: PieceKind::Pawn,
                x: 1,
                y: 1,
            })
            .await
            .expect("opening move");
        session.wait_for_move().await.expect("joiner's resignation");
        let log = session.finish().await.expect("seal exchange");
        (log, link.connection)
    };

    let join_task = async {
        let link = connect_link(&join_ep, host_addr)
            .await
            .expect("joiner connects");
        assert_eq!(link.remote, host_id.verifying_key());
        let mut session = GameSession::join(
            link.recv,
            link.send,
            join_id.signing_key().clone(),
            link.remote,
        )
        .await
        .expect("join handshake");

        session.wait_for_move().await.expect("host's opening move");
        session.play(Action::Resign).await.expect("resign");
        let log = session.finish().await.expect("seal exchange");
        (log, link.connection)
    };

    let ((host_log, host_conn), (join_log, join_conn)) = timeout(Duration::from_secs(30), async {
        tokio::join!(host_task, join_task)
    })
    .await
    .expect("game over real QUIC completes");

    assert_eq!(host_log, join_log);
    let verified = verify(&host_log).expect("log verifies");
    assert!(verified.sealed);
    assert_eq!(
        verified.outcome,
        Some(check4_protocol::GameResult::Winner(Player::One))
    );

    host_conn.close(0u8.into(), b"done");
    join_conn.close(0u8.into(), b"done");
    host_ep.close().await;
    join_ep.close().await;
}
