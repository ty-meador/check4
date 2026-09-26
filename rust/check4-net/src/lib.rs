//! Check4 peer-to-peer play: on-disk identity, live signed game sessions,
//! and the iroh transport that carries them.
//!
//! Layer map (each usable without the ones above it):
//!
//! - [`identity`] — one Ed25519 keypair per player, stored on disk. The
//!   public key is simultaneously the iroh endpoint id (network address)
//!   and the game-log seat key.
//! - [`session`] — the live game protocol over any ordered byte stream:
//!   handshake fixing the [`Genesis`](check4_protocol::Genesis), signed
//!   record exchange with full verification on arrival, and the seal
//!   exchange yielding a portable, dual-signed
//!   [`GameLog`](check4_protocol::GameLog). Transport-agnostic and tested
//!   over in-memory pipes.
//! - [`net`] — iroh QUIC transport: LAN discovery via mDNS, join-anywhere
//!   tickets with public-relay fallback, and authenticated streams for
//!   the session layer.

#![warn(missing_docs)]

pub mod identity;
pub mod net;
pub mod session;

pub use identity::Identity;
pub use net::{Node, PeerLink, ALPN};
pub use session::{GameSession, SessionError, VERSION};
