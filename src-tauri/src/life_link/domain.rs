pub const MAX_OUTGOING_LINKS: i64 = 100;
pub const MAX_INCOMING_LINKS: i64 = 500;
pub const MAX_TARGET_QUERY_CHARS: usize = 120;
pub const MAX_TARGET_RESULTS: i64 = 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EndpointRole {
    Source,
    Target,
}

#[derive(Debug, PartialEq, Eq)]
pub enum LifeLinkError {
    InvalidSource,
    InvalidTarget,
    ArchivedSource,
    ArchivedTarget,
    SourceNotLeaf,
    TargetNotLeaf,
    SourceMissingDocument,
    TargetMissingDocument,
    SelfLink,
    Duplicate,
    OutgoingCap,
    IncomingCap,
    MissingLink,
    InvalidSearchQuery,
    Storage,
}

impl From<rusqlite::Error> for LifeLinkError {
    fn from(_: rusqlite::Error) -> Self {
        Self::Storage
    }
}

pub fn endpoint_error(role: EndpointRole, kind: &str) -> LifeLinkError {
    match (role, kind) {
        (EndpointRole::Source, "invalid") => LifeLinkError::InvalidSource,
        (EndpointRole::Target, "invalid") => LifeLinkError::InvalidTarget,
        (EndpointRole::Source, "archived") => LifeLinkError::ArchivedSource,
        (EndpointRole::Target, "archived") => LifeLinkError::ArchivedTarget,
        (EndpointRole::Source, "branch") => LifeLinkError::SourceNotLeaf,
        (EndpointRole::Target, "branch") => LifeLinkError::TargetNotLeaf,
        (EndpointRole::Source, _) => LifeLinkError::SourceMissingDocument,
        (EndpointRole::Target, _) => LifeLinkError::TargetMissingDocument,
    }
}
