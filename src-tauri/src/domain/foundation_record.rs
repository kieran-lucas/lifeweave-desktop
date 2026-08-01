pub const LABEL_MAX_LEN: usize = 200;

#[derive(Debug)]
pub enum DomainError {
    EmptyLabel,
    LabelTooLong { max: usize, actual: usize },
    InvalidLabel { reason: &'static str },
}

pub fn validate_label(raw: &str) -> Result<String, DomainError> {
    let trimmed = raw.trim().to_string();
    if trimmed.is_empty() {
        return Err(DomainError::EmptyLabel);
    }
    if trimmed.len() > LABEL_MAX_LEN {
        return Err(DomainError::LabelTooLong {
            max: LABEL_MAX_LEN,
            actual: trimmed.len(),
        });
    }
    if trimmed.chars().any(|c| c.is_control() && c != '\t') {
        return Err(DomainError::InvalidLabel {
            reason: "control characters not allowed",
        });
    }
    Ok(trimmed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_label_rejected() {
        assert!(matches!(validate_label(""), Err(DomainError::EmptyLabel)));
        assert!(matches!(
            validate_label("   "),
            Err(DomainError::EmptyLabel)
        ));
    }

    #[test]
    fn label_trimmed_on_success() {
        assert_eq!(validate_label("  hello  ").unwrap(), "hello");
    }

    #[test]
    fn label_at_max_length_accepted() {
        let s = "a".repeat(LABEL_MAX_LEN);
        assert!(validate_label(&s).is_ok());
    }

    #[test]
    fn label_over_max_length_rejected() {
        let s = "a".repeat(LABEL_MAX_LEN + 1);
        assert!(matches!(
            validate_label(&s),
            Err(DomainError::LabelTooLong { .. })
        ));
    }

    #[test]
    fn control_characters_rejected() {
        assert!(matches!(
            validate_label("hello\x01world"),
            Err(DomainError::InvalidLabel { .. })
        ));
    }

    #[test]
    fn tab_allowed_in_label() {
        assert!(validate_label("hello\tworld").is_ok());
    }

    #[test]
    fn newline_rejected() {
        assert!(matches!(
            validate_label("hello\nworld"),
            Err(DomainError::InvalidLabel { .. })
        ));
    }
}
