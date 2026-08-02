use serde::Serialize;

/// IPC-safe error envelope. Stable discriminants, no raw SQL, no file paths,
/// no stack traces. All variants are safe to transmit to the frontend.
#[derive(Debug, Serialize)]
#[serde(tag = "code")]
#[cfg_attr(test, derive(ts_rs::TS))]
pub enum IpcError {
    /// A field or business-rule constraint was violated.
    /// `message` is a user-safe description; never embed SQL or paths.
    Validation { message: String },
    /// The requested entity was not found.
    NotFound,
    /// The supplied revision did not match the stored revision.
    /// The caller must re-fetch and retry.
    StaleRevision,
    /// A storage layer error occurred. No raw details are forwarded.
    Storage,
    /// The database reported integrity or foreign-key failure.
    Corruption,
    /// The requested operation or format version is not supported.
    Unsupported,
    /// A previous restore completed and the live DB is usable, but cleanup
    /// artifacts have not been fully removed. Restart the application to
    /// resolve before attempting another restore. No filesystem details are
    /// included in this variant.
    RecoveryPending,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validation_error_contains_message() {
        let err = IpcError::Validation {
            message: "label is required".to_string(),
        };
        let json = serde_json::to_value(&err).unwrap();
        assert_eq!(json["code"], "Validation");
        assert_eq!(json["message"], "label is required");
    }

    #[test]
    fn unit_variants_serialize_to_code_only() {
        let cases: &[(&str, IpcError)] = &[
            ("NotFound", IpcError::NotFound),
            ("StaleRevision", IpcError::StaleRevision),
            ("Storage", IpcError::Storage),
            ("Corruption", IpcError::Corruption),
            ("Unsupported", IpcError::Unsupported),
            ("RecoveryPending", IpcError::RecoveryPending),
        ];
        for (expected_code, err) in cases {
            let json = serde_json::to_value(err).unwrap();
            assert_eq!(
                json["code"].as_str().unwrap(),
                *expected_code,
                "wrong code for {expected_code}"
            );
            assert!(json.get("message").is_none());
        }
    }
}
