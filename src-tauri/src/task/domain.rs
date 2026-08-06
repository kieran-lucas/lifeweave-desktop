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
/// Active deadline state for a one-off Task, relative to an explicitly observed local date.
/// Only meaningful while the Task has no current evaluation.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[cfg_attr(test, derive(ts_rs::TS))]
#[serde(rename_all = "snake_case")]
pub enum DeadlineState {
    Overdue,
    DueToday,
    Upcoming,
}

impl DeadlineState {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Overdue => "overdue",
            Self::DueToday => "due_today",
            Self::Upcoming => "upcoming",
        }
    }
}

/// Date-only comparison against the observed local date. On the deadline date itself the state
/// is `DueToday`, never overdue. Both values are `YYYY-MM-DD`, so lexicographic ordering is
/// calendar ordering.
pub fn deadline_state(deadline: &str, observed_local_date: &str) -> DeadlineState {
    match deadline.cmp(observed_local_date) {
        std::cmp::Ordering::Less => DeadlineState::Overdue,
        std::cmp::Ordering::Equal => DeadlineState::DueToday,
        std::cmp::Ordering::Greater => DeadlineState::Upcoming,
    }
}

/// A user may knowingly schedule work after its own deadline. This reports that condition so
/// the product can surface it; it is never an error and never repairs either date.
pub fn scheduled_after_deadline(scheduled_local_date: &str, deadline: &str) -> bool {
    scheduled_local_date > deadline
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
    #[test]
    fn deadline_state_is_date_only_and_inclusive_of_the_deadline_day() {
        assert_eq!(
            deadline_state("2026-08-05", "2026-08-06"),
            DeadlineState::Overdue
        );
        assert_eq!(
            deadline_state("2026-08-06", "2026-08-06"),
            DeadlineState::DueToday
        );
        assert_eq!(
            deadline_state("2026-08-07", "2026-08-06"),
            DeadlineState::Upcoming
        );
        // Month, year, and leap-day boundaries stay ordinary date comparisons.
        assert_eq!(
            deadline_state("2026-07-31", "2026-08-01"),
            DeadlineState::Overdue
        );
        assert_eq!(
            deadline_state("2027-01-01", "2026-12-31"),
            DeadlineState::Upcoming
        );
        assert_eq!(
            deadline_state("2028-02-29", "2028-02-29"),
            DeadlineState::DueToday
        );
        assert!(validate_date("2028-02-29"));
        assert!(!validate_date("2027-02-29"));
    }
    #[test]
    fn scheduling_on_the_deadline_is_not_a_conflict() {
        assert!(scheduled_after_deadline("2026-08-13", "2026-08-12"));
        assert!(!scheduled_after_deadline("2026-08-12", "2026-08-12"));
        assert!(!scheduled_after_deadline("2026-08-11", "2026-08-12"));
    }
}
