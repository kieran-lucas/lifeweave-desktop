pub const ROOT_ID: &str = "life-root";
pub const CHILD_PAGE_SIZE: i64 = 8;

pub fn valid_title(value: &str) -> bool {
    let trimmed = value.trim();
    !trimmed.is_empty() && trimmed.chars().count() <= 120 && !trimmed.chars().any(char::is_control)
}

pub fn valid_description(value: &str) -> bool {
    value.chars().count() <= 320
        && value.lines().count().max(1) <= 3
        && !value
            .chars()
            .any(|c| c == '\0' || (c.is_control() && c != '\n'))
}

pub fn valid_icon(value: &str) -> bool {
    matches!(
        value,
        "life-root" | "life-branch" | "life-leaf" | "life-focus" | "life-note"
    )
}

pub fn valid_theme(value: &str) -> bool {
    matches!(value, "neutral" | "blue" | "green" | "amber" | "violet")
}

pub fn valid_id(value: &str) -> bool {
    value == ROOT_ID || (value.len() == 36 && uuid::Uuid::parse_str(value).is_ok())
}
