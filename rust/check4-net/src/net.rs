//! The iroh transport: binding an endpoint on this player's key,
//! connecting peers (LAN via mDNS discovery, anywhere via tickets and the
//! public relay fallback), and handing authenticated streams to the
//! session layer.
//!
//! Identity and address are one fact: the endpoint id *is* the player's
//! Ed25519 public key, proven during the QUIC TLS handshake. Relays are
//! untrusted plumbing — with every move signed and chain-linked, a relay
//! can deliver bytes or not deliver them, nothing else.

use std::collections::BTreeMap;
use std::str::FromStr;
use std::time::Duration;

use check4_protocol::VerifyingKey;
use iroh::endpoint::presets;
use iroh::endpoint::{Connection, RecvStream, SendStream};
use iroh::endpoint_info::UserData;
use iroh::{Endpoint, EndpointAddr, EndpointId};
use iroh_mdns_address_lookup::{DiscoveryEvent, MdnsAddressLookup};
use iroh_tickets::endpoint::EndpointTicket;
use n0_future::StreamExt;

use crate::identity::Identity;

/// The ALPN identifying Check4 live-session connections (protocol V1).
pub const ALPN: &[u8] = b"check4/1";

/// The mDNS user-data marker a hosting node advertises on the local
/// network, so joiners can find open Check4 tables without a ticket.
pub const LAN_MARKER: &str = "check4-host";

/// Transport-layer errors are heterogeneous iroh error types; nothing
/// matches on them, so they travel boxed.
pub type NetError = Box<dyn std::error::Error + Send + Sync + 'static>;

/// A Check4 node: an iroh endpoint bound on this player's key, with
/// local-network discovery attached.
#[derive(Debug)]
pub struct Node {
    endpoint: Endpoint,
    mdns: MdnsAddressLookup,
}

/// An authenticated, connected peer: the QUIC connection (which must
/// outlive the streams) and the session's byte streams.
#[derive(Debug)]
pub struct PeerLink {
    /// The underlying connection; dropping it closes the streams.
    pub connection: Connection,
    /// The peer's authenticated key (their endpoint id).
    pub remote: VerifyingKey,
    /// Session bytes to the peer.
    pub send: SendStream,
    /// Session bytes from the peer.
    pub recv: RecvStream,
}

impl Node {
    /// Bind an endpoint on this identity's key, with the n0 defaults
    /// (public relays + DNS lookup) plus local-network mDNS discovery.
    /// A node that will host sets `advertise` so LAN peers can find it;
    /// a joiner binds without advertising.
    pub async fn bind(identity: &Identity, advertise: bool) -> Result<Node, NetError> {
        let mut builder = Endpoint::builder(presets::N0)
            .secret_key(identity.secret().clone())
            .alpns(vec![ALPN.to_vec()]);
        if advertise {
            let marker = UserData::from_str(LAN_MARKER)?;
            builder = builder.user_data_for_address_lookup(marker);
        }
        let endpoint = builder.bind().await?;

        let mdns = MdnsAddressLookup::builder()
            .advertise(advertise)
            .build(endpoint.id())?;
        endpoint.address_lookup()?.add(mdns.clone());

        Ok(Node { endpoint, mdns })
    }

    /// The underlying iroh endpoint.
    #[must_use]
    pub fn endpoint(&self) -> &Endpoint {
        &self.endpoint
    }

    /// This node's player id (= endpoint id) display form.
    #[must_use]
    pub fn player_id(&self) -> String {
        self.endpoint.id().to_z32()
    }

    /// Wait until the endpoint has usable addresses (direct or relay).
    pub async fn online(&self) {
        self.endpoint.online().await;
    }

    /// A ticket a peer anywhere can join with (carries this endpoint's
    /// current addresses; call [`Node::online`] first).
    #[must_use]
    pub fn ticket(&self) -> String {
        EndpointTicket::new(self.endpoint.addr()).to_string()
    }

    /// Accept one inbound game connection, yielding the authenticated
    /// peer and the session streams. The host side of the session reads
    /// first, so the streams appear as soon as the joiner's `HELLO`
    /// arrives.
    pub async fn accept(&self) -> Result<PeerLink, NetError> {
        accept_link(&self.endpoint).await
    }

    /// Connect to a peer (by ticket-derived address, or bare endpoint id
    /// resolvable via mDNS/DNS lookup) and open the session streams.
    pub async fn connect(&self, addr: impl Into<EndpointAddr>) -> Result<PeerLink, NetError> {
        connect_link(&self.endpoint, addr).await
    }

    /// Listen on the local network for `wait`, returning the Check4 hosts
    /// heard advertising (deduplicated by endpoint id).
    pub async fn discover_lan(&self, wait: Duration) -> Vec<EndpointAddr> {
        let mut events = self.mdns.subscribe().await;
        let mut found: BTreeMap<EndpointId, EndpointAddr> = BTreeMap::new();

        let deadline = tokio::time::sleep(wait);
        tokio::pin!(deadline);
        loop {
            tokio::select! {
                _ = &mut deadline => break,
                event = events.next() => match event {
                    Some(DiscoveryEvent::Discovered { endpoint_info, .. }) => {
                        let is_host = endpoint_info
                            .user_data()
                            .is_some_and(|data| data.as_ref() == LAN_MARKER);
                        if is_host {
                            found.insert(endpoint_info.endpoint_id, endpoint_info.to_endpoint_addr());
                        }
                    }
                    Some(DiscoveryEvent::Expired { endpoint_id }) => {
                        found.remove(&endpoint_id);
                    }
                    Some(_) => {}
                    None => break,
                },
            }
        }
        found.into_values().collect()
    }

    /// Close the endpoint, notifying peers.
    pub async fn close(self) {
        self.endpoint.close().await;
    }
}

/// Accept one inbound game connection on `endpoint` (see [`Node::accept`]).
pub async fn accept_link(endpoint: &Endpoint) -> Result<PeerLink, NetError> {
    loop {
        let incoming = endpoint
            .accept()
            .await
            .ok_or("endpoint closed while accepting")?;
        // A peer that fails the QUIC handshake is not a game; keep
        // listening rather than failing the host loop.
        let Ok(accepting) = incoming.accept() else {
            continue;
        };
        let Ok(connection) = accepting.await else {
            continue;
        };
        let remote = connection.remote_id().as_verifying_key();
        let (send, recv) = connection.accept_bi().await?;
        return Ok(PeerLink {
            connection,
            remote,
            send,
            recv,
        });
    }
}

/// Connect to a peer from `endpoint` (see [`Node::connect`]).
pub async fn connect_link(
    endpoint: &Endpoint,
    addr: impl Into<EndpointAddr>,
) -> Result<PeerLink, NetError> {
    let connection = endpoint.connect(addr, ALPN).await?;
    let remote = connection.remote_id().as_verifying_key();
    let (send, recv) = connection.open_bi().await?;
    Ok(PeerLink {
        connection,
        remote,
        send,
        recv,
    })
}

/// Parse a join ticket into the address it carries.
pub fn parse_ticket(ticket: &str) -> Result<EndpointAddr, NetError> {
    Ok(EndpointTicket::from_str(ticket.trim())?
        .endpoint_addr()
        .clone())
}
