//! On-disk identity: create-on-first-use, stable reload, owner-only
//! permissions, and the key's two roles staying one key.

use check4_net::identity::{Identity, IDENTITY_FILE};

#[test]
fn load_or_create_round_trips_and_reloads_the_same_key() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("nested").join(IDENTITY_FILE);

    let created = Identity::load_or_create(&path).expect("create");
    let reloaded = Identity::load_or_create(&path).expect("reload");
    assert_eq!(created.player_id(), reloaded.player_id());
    assert_eq!(created.verifying_key(), reloaded.verifying_key());
}

#[cfg(unix)]
#[test]
fn the_seed_file_is_owner_only() {
    use std::os::unix::fs::PermissionsExt;

    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join(IDENTITY_FILE);
    Identity::load_or_create(&path).expect("create");

    let mode = std::fs::metadata(&path)
        .expect("metadata")
        .permissions()
        .mode();
    assert_eq!(mode & 0o777, 0o600);
}

#[test]
fn a_corrupt_seed_file_is_an_error_not_a_new_key() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join(IDENTITY_FILE);
    std::fs::write(&path, b"not a seed").expect("write junk");

    let err = Identity::load_or_create(&path).expect_err("junk rejected");
    assert_eq!(err.kind(), std::io::ErrorKind::InvalidData);
}

#[test]
fn network_and_signing_roles_are_the_same_key() {
    let identity = Identity::from_seed([7; 32]);
    assert_eq!(
        identity.endpoint_id().as_verifying_key(),
        identity.verifying_key(),
    );
    assert_eq!(
        identity.signing_key().verifying_key(),
        identity.verifying_key(),
    );
}
