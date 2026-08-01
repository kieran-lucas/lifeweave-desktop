/// Per-entity monotonic revision counter for optimistic concurrency control.
///
/// On write commands, the caller supplies their last-known revision.
/// A mismatch causes `IpcError::StaleRevision`; the caller must re-fetch and retry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Revision(u32);

impl Revision {
    pub const INITIAL: Self = Self(0);

    pub fn new(value: u32) -> Self {
        Self(value)
    }

    pub fn value(self) -> u32 {
        self.0
    }

    pub fn next(self) -> Self {
        Self(self.0 + 1)
    }
}

/// Caller-supplied idempotency/deduplication token.
///
/// Must be a UUIDv7 string in production; format is validated at the IPC boundary,
/// not inside the domain. Using a type alias keeps the domain free of UUID parsing.
pub type OperationId = String;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initial_revision_is_zero() {
        assert_eq!(Revision::INITIAL.value(), 0);
    }

    #[test]
    fn next_increments_by_one() {
        assert_eq!(Revision::INITIAL.next().value(), 1);
        assert_eq!(Revision::new(5).next().value(), 6);
    }

    #[test]
    fn revisions_are_ordered() {
        assert!(Revision::new(1) > Revision::INITIAL);
        assert!(Revision::new(100) > Revision::new(99));
    }

    #[test]
    fn revision_equality() {
        assert_eq!(Revision::new(3), Revision::new(3));
        assert_ne!(Revision::new(3), Revision::new(4));
    }
}
