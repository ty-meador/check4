//! Player identity: one Ed25519 keypair, stored on disk.
//!
//! Per the settled architecture, a player *is* an Ed25519 public key — the
//! same key is the iroh endpoint id (network address) and the game-log
//! signing key, so "who I'm connected to" and "who signed this move" are
//! one fact. There are no accounts: creating an identity is generating a
//! key, logging in is being able to read it.
//!
//! V1 storage is the raw 32-byte seed in a file with owner-only
//! permissions. Secure-enclave + biometric unlock is the mobile app's job
//! later; the seed file keeps the CLI and servers simple and portable.

use std::fmt;
use std::io;
use std::path::Path;

use check4_protocol::{SigningKey, VerifyingKey};
use iroh::{EndpointId, SecretKey};

/// The on-disk seed file's name inside a Check4 data directory.
pub const IDENTITY_FILE: &str = "identity.key";

/// One player: an Ed25519 keypair usable as both the iroh endpoint secret
/// and the game-log signing key.
#[derive(Clone)]
pub struct Identity {
    secret: SecretKey,
}

impl fmt::Debug for Identity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        // Never let the seed leak through debug output.
        f.debug_struct("Identity")
            .field("player_id", &self.player_id())
            .finish()
    }
}

impl Identity {
    /// A fresh random identity.
    #[must_use]
    pub fn generate() -> Identity {
        Identity {
            secret: SecretKey::generate(),
        }
    }

    /// The identity a 32-byte seed determines.
    #[must_use]
    pub fn from_seed(seed: [u8; 32]) -> Identity {
        Identity {
            secret: SecretKey::from_bytes(&seed),
        }
    }

    /// Load the identity stored at `path`, or generate one and store it
    /// there (owner-only permissions) if the file does not exist.
    pub fn load_or_create(path: &Path) -> io::Result<Identity> {
        match std::fs::read(path) {
            Ok(bytes) => {
                let seed: [u8; 32] = bytes.as_slice().try_into().map_err(|_| {
                    io::Error::new(
                        io::ErrorKind::InvalidData,
                        format!(
                            "{}: expected a 32-byte identity seed, found {} bytes",
                            path.display(),
                            bytes.len()
                        ),
                    )
                })?;
                Ok(Identity::from_seed(seed))
            }
            Err(err) if err.kind() == io::ErrorKind::NotFound => {
                let identity = Identity::generate();
                if let Some(dir) = path.parent() {
                    std::fs::create_dir_all(dir)?;
                }
                write_owner_only(path, &identity.secret.to_bytes())?;
                Ok(identity)
            }
            Err(err) => Err(err),
        }
    }

    /// The iroh endpoint secret (the keypair in its network role).
    #[must_use]
    pub fn secret(&self) -> &SecretKey {
        &self.secret
    }

    /// The keypair in its game-log signing role.
    #[must_use]
    pub fn signing_key(&self) -> &SigningKey {
        self.secret.as_signing_key()
    }

    /// The public key, as a game-log seat key.
    #[must_use]
    pub fn verifying_key(&self) -> VerifyingKey {
        self.secret.public().as_verifying_key()
    }

    /// The public key, as an iroh endpoint id.
    #[must_use]
    pub fn endpoint_id(&self) -> EndpointId {
        self.secret.public()
    }

    /// The canonical display form of the player id (z-base-32, the same
    /// string iroh prints for the endpoint id).
    #[must_use]
    pub fn player_id(&self) -> String {
        self.secret.public().to_z32()
    }
}

#[cfg(unix)]
fn write_owner_only(path: &Path, bytes: &[u8]) -> io::Result<()> {
    use io::Write;
    use std::os::unix::fs::OpenOptionsExt;
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(path)?;
    file.write_all(bytes)
}

#[cfg(not(unix))]
fn write_owner_only(path: &Path, bytes: &[u8]) -> io::Result<()> {
    use io::Write;
    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)?;
    file.write_all(bytes)
}
