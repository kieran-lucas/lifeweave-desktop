#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Priority {
    Low,
    Medium,
    High,
}

impl Priority {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
        }
    }
    pub fn parse(v: &str) -> Option<Self> {
        match v {
            "low" => Some(Self::Low),
            "medium" => Some(Self::Medium),
            "high" => Some(Self::High),
            _ => None,
        }
    }
}

pub fn validate_date(value: &str) -> bool {
    let bytes = value.as_bytes();
    if bytes.len() != 10
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || !bytes
            .iter()
            .enumerate()
            .all(|(i, b)| i == 4 || i == 7 || b.is_ascii_digit())
    {
        return false;
    }
    let year: u32 = value[0..4].parse().unwrap_or(0);
    let month: u32 = value[5..7].parse().unwrap_or(0);
    let day: u32 = value[8..10].parse().unwrap_or(0);
    year >= 1970 && (1..=12).contains(&month) && (1..=days_in_month(year, month)).contains(&day)
}
fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        2 if year % 4 == 0 && (year % 100 != 0 || year % 400 == 0) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}
pub fn validate_range(start: i32, end: i32) -> bool {
    (240..=1439).contains(&start) && (241..=1440).contains(&end) && start < end
}
pub fn validate_title(value: &str) -> bool {
    let v = value.trim();
    !v.is_empty() && v.chars().count() <= 200 && !v.chars().any(char::is_control)
}
pub fn validate_description(value: &str) -> bool {
    value.chars().count() <= 4000 && !value.chars().any(|c| c == '\0')
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn task_boundaries_and_dates() {
        assert!(validate_range(240, 1440));
        assert!(!validate_range(239, 300));
        assert!(!validate_range(600, 600));
        assert!(validate_date("2026-08-02"));
        assert!(!validate_date("2026-02-30"));
    }
    #[test]
    fn title_validation() {
        assert!(!validate_title("   "));
        assert!(validate_title("Task"));
    }
}
