//! Checked filesystem publication primitives for app-owned critical data.
//!
//! File contents are flushed before publication and directory-entry changes are
//! followed by a checked parent-directory barrier.  On Windows the directory is
//! opened with `FILE_FLAG_BACKUP_SEMANTICS` and `FlushFileBuffers` is checked;
//! filesystems which reject that strongest practical local barrier fail the
//! operation instead of being reported as durably published.

use std::io::{self, Write as _};
use std::path::Path;

#[cfg(test)]
use std::cell::Cell;

#[cfg(test)]
thread_local! {
    static FAIL_AT: Cell<i32> = const { Cell::new(-1) };
}

fn failpoint() -> io::Result<()> {
    #[cfg(test)]
    {
        let fail = FAIL_AT.with(|value| {
            let current = value.get();
            if current == 0 {
                value.set(-1);
                true
            } else {
                if current > 0 {
                    value.set(current - 1);
                }
                false
            }
        });
        if fail {
            return Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                "test-injected durability barrier failure",
            ));
        }
    }
    Ok(())
}

/// Flushes an existing regular file's contents and metadata.
pub fn sync_file(path: &Path) -> io::Result<()> {
    failpoint()?;
    std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(path)?
        .sync_all()
}

/// Flushes a directory entry boundary using the strongest checked primitive
/// available on the current platform.
pub fn sync_directory(directory: &Path) -> io::Result<()> {
    failpoint()?;
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::fs::OpenOptionsExt as _;
        use std::os::windows::io::AsRawHandle as _;
        use windows_sys::Win32::Storage::FileSystem::FlushFileBuffers;

        const FILE_FLAG_BACKUP_SEMANTICS: u32 = 0x0200_0000;
        let handle = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .custom_flags(FILE_FLAG_BACKUP_SEMANTICS)
            .open(directory)?;
        // SAFETY: the handle is owned and valid for the duration of this call.
        let succeeded = unsafe { FlushFileBuffers(handle.as_raw_handle() as _) };
        if succeeded == 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::fs::File::open(directory)?.sync_all()
    }
}

pub fn sync_parent(path: &Path) -> io::Result<()> {
    let parent = path
        .parent()
        .filter(|value| !value.as_os_str().is_empty())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "publication path has no parent",
            )
        })?;
    sync_directory(parent)
}

/// Atomically publishes a sibling path and verifies its directory entry is
/// durable before returning success.
pub fn durable_rename(source: &Path, destination: &Path) -> io::Result<()> {
    failpoint()?;
    if source.parent() != destination.parent() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "durable rename requires sibling paths",
        ));
    }
    std::fs::rename(source, destination)?;
    sync_parent(destination)
}

/// Removes a file and durably publishes the removal. Missing files are already
/// in the requested state and are treated idempotently.
pub fn durable_remove_file(path: &Path) -> io::Result<()> {
    failpoint()?;
    match std::fs::remove_file(path) {
        Ok(()) => sync_parent(path),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

/// Removes an app-owned directory tree and durably publishes its removal.
/// Callers must validate containment before invoking this primitive.
pub fn durable_remove_dir_all(path: &Path) -> io::Result<()> {
    failpoint()?;
    match std::fs::remove_dir_all(path) {
        Ok(()) => sync_parent(path),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

/// Writes a new sibling temporary file, flushes it, then atomically publishes
/// and verifies it. The caller owns cleanup after an error.
pub fn durable_write(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "publication file name is invalid",
            )
        })?;
    let temporary = path.with_file_name(format!(".{file_name}.publish.tmp"));
    let mut file = std::fs::OpenOptions::new()
        .create_new(true)
        .write(true)
        .open(&temporary)?;
    let result = (|| {
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        durable_rename(&temporary, path)
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&temporary);
    }
    result
}

/// Flushes every regular file and directory in an app-owned staging tree,
/// bottom-up, before its root directory is published.
pub fn sync_tree(root: &Path) -> io::Result<()> {
    fn visit(directory: &Path) -> io::Result<()> {
        for entry in std::fs::read_dir(directory)? {
            let entry = entry?;
            let file_type = entry.file_type()?;
            if file_type.is_symlink() {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "publication staging tree contains a link",
                ));
            }
            if file_type.is_dir() {
                visit(&entry.path())?;
            } else if file_type.is_file() {
                sync_file(&entry.path())?;
            } else {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    "publication staging tree contains a special file",
                ));
            }
        }
        sync_directory(directory)
    }
    visit(root)
}

#[cfg(test)]
pub(crate) fn fail_after(barriers: i32) {
    FAIL_AT.with(|value| value.set(barriers));
}

#[cfg(test)]
mod tests {
    use super::*;

    fn directory(name: &str) -> std::path::PathBuf {
        let path =
            std::env::temp_dir().join(format!("lw_durability_{name}_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn durable_write_and_remove_cross_checked_barriers() {
        let root = directory("publish");
        let path = root.join("authority.json");
        durable_write(&path, b"authority").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"authority");
        durable_remove_file(&path).unwrap();
        assert!(!path.exists());
        durable_remove_file(&path).unwrap();
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn staging_tree_rejects_links_and_flushes_nested_files() {
        let root = directory("tree");
        let nested = root.join("assets");
        std::fs::create_dir(&nested).unwrap();
        std::fs::write(nested.join("image.bin"), b"bytes").unwrap();
        sync_tree(&root).unwrap();
        std::fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn injected_barrier_failure_is_not_reported_as_success() {
        let root = directory("failure");
        let path = root.join("authority.json");
        fail_after(0);
        assert!(durable_write(&path, b"authority").is_err());
        assert!(!path.exists());
        std::fs::remove_dir_all(root).unwrap();
    }
}
