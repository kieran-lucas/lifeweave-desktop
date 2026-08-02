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
}
