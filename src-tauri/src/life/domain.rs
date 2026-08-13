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
        "life-root"
            | "life-branch"
            | "life-leaf"
            | "life-focus"
            | "life-note"
            | "life-system"
            | "life-vitality"
            | "life-body"
            | "life-sleep"
            | "life-fitness"
            | "life-nutrition"
            | "life-mind"
            | "life-emotional"
            | "life-stress"
            | "life-mental-health"
            | "life-rest-play"
            | "life-detachment"
            | "life-entertainment"
            | "life-hobbies"
            | "life-capability"
            | "life-learning"
            | "life-formal-learning"
            | "life-domain-knowledge"
            | "life-language"
            | "life-craft"
            | "life-technical"
            | "life-research"
            | "life-projects"
            | "life-work"
            | "life-career"
            | "life-performance"
            | "life-leadership"
            | "life-relationships"
            | "life-family"
            | "life-parents"
            | "life-partner"
            | "life-children"
            | "life-friends-mentors"
            | "life-close-friends"
            | "life-peers"
            | "life-mentors"
            | "life-community"
            | "life-academic-community"
            | "life-civic"
            | "life-belonging"
            | "life-security"
            | "life-finance"
            | "life-cash-flow"
            | "life-investing"
            | "life-insurance"
            | "life-home"
            | "life-housing"
            | "life-location"
            | "life-living-environment"
            | "life-safety"
            | "life-digital-safety"
            | "life-documents"
            | "life-contingency"
    )
}

pub fn valid_theme(value: &str) -> bool {
    matches!(value, "neutral" | "blue" | "green" | "amber" | "violet")
}

pub fn valid_id(value: &str) -> bool {
    value == ROOT_ID || (value.len() == 36 && uuid::Uuid::parse_str(value).is_ok())
}
