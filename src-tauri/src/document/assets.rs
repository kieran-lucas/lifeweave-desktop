use super::{
    domain::{self, DocumentError, MAX_ASSET_BYTES},
    dto::{DocumentAssetBytes, DocumentAssetView, ImportDocumentAssetInput},
};
use rusqlite::{Connection, OptionalExtension, params};
use sha2::{Digest, Sha256};
use std::path::Path;

fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn safe_name(value: &str) -> Result<String, DocumentError> {
    let name = Path::new(value)
        .file_name()
        .and_then(|v| v.to_str())
        .ok_or(DocumentError::Validation("Asset name is invalid."))?
        .trim();
    if name.is_empty() || name.len() > 255 || name.chars().any(char::is_control) {
        return Err(DocumentError::Validation("Asset name is invalid."));
    }
    Ok(name.to_owned())
}
fn sniff(bytes: &[u8]) -> Result<(&'static str, &'static str, u32, u32), DocumentError> {
    if bytes.len() >= 24 && &bytes[..8] == b"\x89PNG\r\n\x1a\n" {
        return Ok((
            "image/png",
            "png",
            u32::from_be_bytes(bytes[16..20].try_into().unwrap()),
            u32::from_be_bytes(bytes[20..24].try_into().unwrap()),
        ));
    }
    if bytes.len() >= 10 && (&bytes[..6] == b"GIF87a" || &bytes[..6] == b"GIF89a") {
        return Ok((
            "image/gif",
            "gif",
            u16::from_le_bytes(bytes[6..8].try_into().unwrap()) as u32,
            u16::from_le_bytes(bytes[8..10].try_into().unwrap()) as u32,
        ));
    }
    if bytes.len() >= 30
        && &bytes[..4] == b"RIFF"
        && &bytes[8..12] == b"WEBP"
        && &bytes[12..16] == b"VP8X"
    {
        let w = 1 + u32::from_le_bytes([bytes[24], bytes[25], bytes[26], 0]);
        let h = 1 + u32::from_le_bytes([bytes[27], bytes[28], bytes[29], 0]);
        return Ok(("image/webp", "webp", w, h));
    }
    if bytes.len() > 4 && bytes[0..2] == [0xff, 0xd8] {
        let mut i = 2;
        while i + 9 < bytes.len() {
            if bytes[i] != 0xff {
                i += 1;
                continue;
            }
            let marker = bytes[i + 1];
            if matches!(
                marker,
                0xc0 | 0xc1
                    | 0xc2
                    | 0xc3
                    | 0xc5
                    | 0xc6
                    | 0xc7
                    | 0xc9
                    | 0xca
                    | 0xcb
                    | 0xcd
                    | 0xce
                    | 0xcf
            ) {
                let h = u16::from_be_bytes([bytes[i + 5], bytes[i + 6]]) as u32;
                let w = u16::from_be_bytes([bytes[i + 7], bytes[i + 8]]) as u32;
                return Ok(("image/jpeg", "jpg", w, h));
            }
            if i + 4 > bytes.len() {
                break;
            }
            let len = u16::from_be_bytes([bytes[i + 2], bytes[i + 3]]) as usize;
            if len < 2 {
                break;
            }
            i += 2 + len;
        }
    }
    Err(DocumentError::Validation(
        "Image format is unsupported or corrupt.",
    ))
}
fn view(row: &rusqlite::Row<'_>) -> rusqlite::Result<DocumentAssetView> {
    Ok(DocumentAssetView {
        asset_id: row.get(0)?,
        original_name: row.get(1)?,
        mime: row.get(2)?,
        byte_size: row.get::<_, i64>(3)? as u64,
        width: row.get::<_, i64>(4)? as u32,
        height: row.get::<_, i64>(5)? as u32,
        status: row.get(6)?,
    })
}
pub fn import(
    conn: &mut Connection,
    root: &Path,
    input: ImportDocumentAssetInput,
) -> Result<DocumentAssetView, DocumentError> {
    if input.bytes.is_empty() || input.bytes.len() > MAX_ASSET_BYTES {
        return Err(DocumentError::Validation("Image must be 10 MB or smaller."));
    }
    let name = safe_name(&input.original_name)?;
    let (mime, ext, _, _) = sniff(&input.bytes)?;
    let format = image_format(mime)?;
    let decoded = image::load_from_memory_with_format(&input.bytes, format)
        .map_err(|_| DocumentError::Validation("Image bytes are corrupt or unsupported."))?;
    let (width, height) = (decoded.width(), decoded.height());
    if width == 0 || height == 0 || width > 12000 || height > 12000 {
        return Err(DocumentError::Validation(
            "Image dimensions are unsupported.",
        ));
    }
    let checksum = hash(&input.bytes);
    if let Some(v)=conn.query_row("SELECT id,original_name,sniffed_mime,byte_size,width,height,status FROM assets WHERE checksum=?1",params![checksum],view).optional()?{return Ok(v)}
    let id = domain::new_id();
    let relative = format!("assets/original/{id}.{ext}");
    let dir = root.join("assets/original");
    std::fs::create_dir_all(&dir)?;
    let final_path = root.join(&relative);
    let temp = dir.join(format!(".{id}.tmp"));
    {
        let mut f = std::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temp)?;
        use std::io::Write;
        f.write_all(&input.bytes)?;
        f.sync_all()?;
    }
    std::fs::rename(&temp, &final_path)?;
    let result = conn.execute(
        "INSERT INTO assets VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'usable',?9)",
        params![
            id,
            checksum,
            name,
            mime,
            input.bytes.len() as i64,
            width,
            height,
            relative,
            domain::now()
        ],
    );
    if let Err(e) = result {
        return Err(e.into());
    }
    get(conn, root, &id).map(|v| v.asset)
}

fn image_format(mime: &str) -> Result<image::ImageFormat, DocumentError> {
    match mime {
        "image/png" => Ok(image::ImageFormat::Png),
        "image/jpeg" => Ok(image::ImageFormat::Jpeg),
        "image/webp" => Ok(image::ImageFormat::WebP),
        "image/gif" => Ok(image::ImageFormat::Gif),
        _ => Err(DocumentError::Validation("Image format is not supported.")),
    }
}

/// Portable export re-encodes pixels so EXIF, XMP, and location metadata from
/// the retained local original cannot cross the Markdown export boundary.
pub fn sanitized_export(bytes: &[u8], mime: &str) -> Result<Vec<u8>, DocumentError> {
    let format = image_format(mime)?;
    let decoded = image::load_from_memory_with_format(bytes, format)
        .map_err(|_| DocumentError::Validation("Image bytes are corrupt or unsupported."))?;
    let mut output = std::io::Cursor::new(Vec::new());
    decoded
        .write_to(&mut output, format)
        .map_err(|_| DocumentError::Validation("Image export failed."))?;
    Ok(output.into_inner())
}
pub fn get(conn: &Connection, root: &Path, id: &str) -> Result<DocumentAssetBytes, DocumentError> {
    if !domain::valid_id(id) {
        return Err(DocumentError::NotFound);
    }
    let (asset,relative,checksum):(DocumentAssetView,String,String)=conn.query_row("SELECT id,original_name,sniffed_mime,byte_size,width,height,status,relative_original_path,checksum FROM assets WHERE id=?1",params![id],|r|Ok((view(r)?,r.get(7)?,r.get(8)?))).optional()?.ok_or(DocumentError::NotFound)?;
    if relative.contains("..") || Path::new(&relative).is_absolute() {
        return Err(DocumentError::Validation(
            "Asset storage identity is invalid.",
        ));
    }
    let path = root.join(relative);
    let bytes =
        std::fs::read(path).map_err(|_| DocumentError::Validation("Asset file is missing."))?;
    if hash(&bytes) != checksum {
        return Err(DocumentError::Validation("Asset checksum is invalid."));
    }
    Ok(DocumentAssetBytes { asset, bytes })
}

#[cfg(test)]
pub fn tiny_png() -> Vec<u8> {
    let image = image::DynamicImage::new_rgba8(1, 1);
    let mut output = std::io::Cursor::new(Vec::new());
    image
        .write_to(&mut output, image::ImageFormat::Png)
        .unwrap();
    output.into_inner()
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, migrations::run_migrations,
    };
    #[test]
    fn mime_limits_checksum_and_dedup() {
        let mut c = open_memory_connection().unwrap();
        run_migrations(&mut c).unwrap();
        let root = std::env::temp_dir().join(format!("lw_asset_{}", domain::new_id()));
        std::fs::create_dir_all(&root).unwrap();
        let input = ImportDocumentAssetInput {
            original_name: "photo.not-trusted".into(),
            bytes: tiny_png(),
        };
        let a = import(&mut c, &root, input.clone()).unwrap();
        let b = import(&mut c, &root, input).unwrap();
        assert_eq!(a.asset_id, b.asset_id);
        assert_eq!(a.mime, "image/png");
        assert_eq!(get(&c, &root, &a.asset_id).unwrap().bytes, tiny_png());
        assert!(
            import(
                &mut c,
                &root,
                ImportDocumentAssetInput {
                    original_name: "x.svg".into(),
                    bytes: b"<svg/>".to_vec()
                }
            )
            .is_err()
        );
        let _ = std::fs::remove_dir_all(root);
    }
}
