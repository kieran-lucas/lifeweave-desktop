use chrono::TimeZone;
use rrule::{RRuleSet, Tz};

use super::repository::TaskError;

pub const MAX_EXPANSION_OCCURRENCES: u16 = 1_024;

pub fn normalize_rule(rule: &str) -> Result<String, TaskError> {
    let mut normalized = Vec::new();
    for part in rule.split(';') {
        let (key, value) = part
            .split_once('=')
            .ok_or(TaskError::Validation("Malformed recurrence rule."))?;
        let value = match key {
            "BYDAY" => value
                .split(',')
                .map(|day| match day {
                    "0" | "MO" => Ok("MO"),
                    "1" | "TU" => Ok("TU"),
                    "2" | "WE" => Ok("WE"),
                    "3" | "TH" => Ok("TH"),
                    "4" | "FR" => Ok("FR"),
                    "5" | "SA" => Ok("SA"),
                    "6" | "SU" => Ok("SU"),
                    _ => Err(TaskError::Validation("Malformed recurrence weekday.")),
                })
                .collect::<Result<Vec<_>, _>>()?
                .join(","),
            "UNTIL" if value.len() == 10 => format!("{}T235959Z", value.replace('-', "")),
            _ => value.to_string(),
        };
        normalized.push(format!("{key}={value}"));
    }
    Ok(normalized.join(";"))
}

pub fn occurs_on(dtstart: &str, local_date: &str, rule: &str) -> Result<bool, TaskError> {
    let start = parse_date(dtstart)?;
    let target = parse_date(local_date)?;
    if target < start {
        return Ok(false);
    }
    let normalized = normalize_rule(rule)?;
    let source = format!(
        "DTSTART:{}T000000Z\nRRULE:{normalized}",
        dtstart.replace('-', "")
    );
    let set: RRuleSet = source
        .parse()
        .map_err(|_| TaskError::Validation("Malformed recurrence rule."))?;
    let after = target - chrono::Duration::seconds(1);
    let before = target + chrono::Duration::days(1);
    let result = set
        .after(after)
        .before(before)
        .all(MAX_EXPANSION_OCCURRENCES);
    Ok(result
        .dates
        .iter()
        .any(|date| date.date_naive() == target.date_naive()))
}

pub fn occurrences_on_or_after(
    dtstart: &str,
    anchor_local_date: &str,
    rule: &str,
    limit: u16,
) -> Result<Vec<String>, TaskError> {
    let start = parse_date(dtstart)?;
    let anchor = parse_date(anchor_local_date)?;
    if limit == 0 {
        return Ok(Vec::new());
    }
    let normalized = normalize_rule(rule)?;
    let source = format!(
        "DTSTART:{}T000000Z\nRRULE:{normalized}",
        start.format("%Y%m%d")
    );
    let set: RRuleSet = source
        .parse()
        .map_err(|_| TaskError::Validation("Malformed recurrence rule."))?;
    let mut dates = set
        .after(anchor - chrono::Duration::seconds(1))
        .all(limit.min(MAX_EXPANSION_OCCURRENCES))
        .dates
        .into_iter()
        .map(|date| date.format("%Y-%m-%d").to_string())
        .collect::<Vec<_>>();
    dates.sort_unstable();
    dates.dedup();
    Ok(dates)
}

pub fn occurrences_between(
    dtstart: &str,
    range_start: &str,
    range_end: &str,
    rule: &str,
    limit: u16,
) -> Result<Vec<String>, TaskError> {
    let start = parse_date(dtstart)?;
    let from = parse_date(range_start)?;
    let through = parse_date(range_end)?;
    if from > through || limit == 0 {
        return Ok(Vec::new());
    }
    let normalized = normalize_rule(rule)?;
    let source = format!(
        "DTSTART:{}T000000Z\nRRULE:{normalized}",
        start.format("%Y%m%d")
    );
    let set: RRuleSet = source
        .parse()
        .map_err(|_| TaskError::Validation("Malformed recurrence rule."))?;
    let mut dates = set
        .after(from - chrono::Duration::seconds(1))
        .before(through)
        .all(limit.min(MAX_EXPANSION_OCCURRENCES))
        .dates
        .into_iter()
        .map(|date| date.format("%Y-%m-%d").to_string())
        .collect::<Vec<_>>();
    dates.sort_unstable();
    dates.dedup();
    Ok(dates)
}

fn parse_date(value: &str) -> Result<chrono::DateTime<Tz>, TaskError> {
    let date = chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|_| TaskError::Validation("Enter a valid recurrence date."))?;
    let datetime = date
        .and_hms_opt(0, 0, 0)
        .ok_or(TaskError::Validation("Enter a valid recurrence date."))?;
    Ok(Tz::UTC.from_utc_datetime(&datetime))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rfc_engine_handles_interval_count_until_and_leap_day() {
        assert!(occurs_on("2024-02-29", "2024-03-02", "FREQ=DAILY;INTERVAL=2").unwrap());
        assert!(!occurs_on("2024-02-29", "2024-03-04", "FREQ=DAILY;COUNT=2").unwrap());
        assert!(!occurs_on("2024-02-29", "2024-03-02", "FREQ=DAILY;UNTIL=2024-03-01").unwrap());
    }

    #[test]
    fn rfc_engine_handles_weekly_and_monthly_boundaries() {
        assert!(
            occurs_on(
                "2026-01-01",
                "2026-01-08",
                "FREQ=WEEKLY;INTERVAL=1;BYDAY=TH"
            )
            .unwrap()
        );
        assert!(occurs_on("2025-12-31", "2026-01-31", "FREQ=MONTHLY;INTERVAL=1").unwrap());
        assert!(!occurs_on("2025-12-31", "2026-02-28", "FREQ=MONTHLY;INTERVAL=1").unwrap());
    }

    #[test]
    fn malformed_rule_fails_closed() {
        assert!(occurs_on("2026-01-01", "2026-01-02", "NOT-A-RULE").is_err());
    }

    #[test]
    fn occurrences_include_matching_anchor_and_next_interval() {
        assert_eq!(
            occurrences_on_or_after("2026-01-01", "2026-01-03", "FREQ=DAILY", 2).unwrap(),
            ["2026-01-03", "2026-01-04"]
        );
        assert_eq!(
            occurrences_on_or_after("2026-01-01", "2026-01-02", "FREQ=DAILY;INTERVAL=3", 1)
                .unwrap(),
            ["2026-01-04"]
        );
    }

    #[test]
    fn occurrences_handle_weekly_monthly_and_leap_boundaries() {
        assert_eq!(
            occurrences_on_or_after("2026-01-01", "2026-01-02", "FREQ=WEEKLY;BYDAY=MO,WE", 2)
                .unwrap(),
            ["2026-01-05", "2026-01-07"]
        );
        assert_eq!(
            occurrences_on_or_after("2025-12-31", "2026-02-01", "FREQ=MONTHLY", 2).unwrap(),
            ["2026-03-31", "2026-05-31"]
        );
        assert_eq!(
            occurrences_on_or_after("2024-02-29", "2025-01-01", "FREQ=YEARLY", 2).unwrap(),
            ["2028-02-29", "2032-02-29"]
        );
    }

    #[test]
    fn occurrences_respect_count_until_validation_order_and_bound() {
        assert!(
            occurrences_on_or_after("2026-01-01", "2026-01-03", "FREQ=DAILY;COUNT=2", 4)
                .unwrap()
                .is_empty()
        );
        assert!(
            occurrences_on_or_after("2026-01-01", "2026-01-03", "FREQ=DAILY;UNTIL=2026-01-02", 4)
                .unwrap()
                .is_empty()
        );
        assert!(occurrences_on_or_after("bad", "2026-01-01", "FREQ=DAILY", 2).is_err());
        assert!(occurrences_on_or_after("2026-01-01", "bad", "FREQ=DAILY", 2).is_err());
        assert!(occurrences_on_or_after("2026-01-01", "2026-01-01", "BAD", 2).is_err());
        let dates = occurrences_on_or_after(
            "2026-01-01",
            "2026-01-01",
            "FREQ=DAILY",
            MAX_EXPANSION_OCCURRENCES + 1,
        )
        .unwrap();
        assert_eq!(dates.len(), MAX_EXPANSION_OCCURRENCES as usize);
        assert!(dates.windows(2).all(|pair| pair[0] < pair[1]));
    }

    #[test]
    fn occurrences_between_is_inclusive_bounded_and_respects_finite_rules() {
        assert_eq!(
            occurrences_between("2026-08-01", "2026-08-03", "2026-08-05", "FREQ=DAILY", 8).unwrap(),
            ["2026-08-03", "2026-08-04", "2026-08-05"]
        );
        assert!(
            occurrences_between(
                "2026-08-01",
                "2026-08-03",
                "2026-08-05",
                "FREQ=DAILY;COUNT=2",
                8
            )
            .unwrap()
            .is_empty()
        );
        assert_eq!(
            occurrences_between("2024-02-29", "2028-02-29", "2028-02-29", "FREQ=YEARLY", 8)
                .unwrap(),
            ["2028-02-29"]
        );
        assert!(occurrences_between("bad", "2026-01-01", "2026-01-02", "FREQ=DAILY", 8).is_err());
    }
}
