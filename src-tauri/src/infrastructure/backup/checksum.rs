use std::io::Read as _;
use std::path::Path;

use sha2::{Digest, Sha256};

use super::BackupError;

/// Returns the lowercase hex SHA-256 of the file at `path`.
pub fn sha256_file(path: &Path) -> Result<String, BackupError> {
    let mut file = std::fs::File::open(path).map_err(BackupError::Io)?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 65536];
    loop {
        let n = file.read(&mut buf).map_err(BackupError::Io)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn write_temp_file(content: &[u8]) -> std::path::PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let p = std::env::temp_dir().join(format!("lw_cs_{}_{n}.bin", std::process::id()));
        std::fs::write(&p, content).unwrap();
        p
    }

    #[test]
    fn sha256_of_known_bytes() {
        // SHA-256 of empty string is the well-known value below.
        let p = write_temp_file(b"");
        let h = sha256_file(&p).unwrap();
        assert_eq!(
            h,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn sha256_changes_on_mutation() {
        let p1 = write_temp_file(b"hello");
        let p2 = write_temp_file(b"world");
        let h1 = sha256_file(&p1).unwrap();
        let h2 = sha256_file(&p2).unwrap();
        assert_ne!(h1, h2);
    }
}
