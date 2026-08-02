use crate::infrastructure::sqlite::DbError;

pub const SCHEMA_VERSION: i32 = 1;
pub const MAX_JSON_BYTES: usize = 1_048_576;
pub const MAX_MARKDOWN_BYTES: usize = 1_048_576;
pub const MAX_ASSET_BYTES: usize = 10 * 1024 * 1024;
pub const REVISION_RETENTION: i64 = 50;

#[derive(Debug)]
pub enum DocumentError {
    Validation(&'static str),
    NotFound,
    Stale,
    Conflict,
    Db(DbError),
    Io(std::io::Error),
}
impl From<rusqlite::Error> for DocumentError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(value.into())
    }
}
impl From<DbError> for DocumentError {
    fn from(value: DbError) -> Self {
        Self::Db(value)
    }
}
impl From<std::io::Error> for DocumentError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

pub fn valid_operation(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}
pub fn valid_id(value: &str) -> bool {
    value.len() == 36 && uuid::Uuid::parse_str(value).is_ok()
}
pub fn empty_document() -> String {
    r#"{"type":"doc","content":[{"type":"paragraph"}]}"#.into()
}
pub fn now() -> String {
    chrono::Utc::now().to_rfc3339()
}
pub fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}
