use super::dto::SaveMilestoneInput;
use chrono::NaiveDate;

#[derive(Debug)]
pub enum MilestoneError {
    Validation(&'static str),
    NotFound,
    StaleRevision,
    Storage,
}
pub fn validate_id(id: &str) -> Result<(), MilestoneError> {
    uuid::Uuid::parse_str(id)
        .map_err(|_| MilestoneError::Validation("Invalid milestone identity."))?;
    Ok(())
}
pub fn validate(input: &SaveMilestoneInput) -> Result<(), MilestoneError> {
    use MilestoneError::Validation;
    validate_id(&input.id)?;
    let title = input.title.trim();
    if title.is_empty() || title.chars().count() > 200 || title.chars().any(char::is_control) {
        return Err(Validation(
            "Use a title of 1–200 characters without line breaks.",
        ));
    }
    if input.description.chars().count() > 4000 || input.description.contains('\0') {
        return Err(Validation("Description must be at most 4,000 characters."));
    }
    let date = NaiveDate::parse_from_str(&input.date, "%Y-%m-%d")
        .map_err(|_| Validation("Enter a valid calendar date."))?;
    if input.date.len() != 10
        || date.format("%Y-%m-%d").to_string() != input.date
        || input.date.as_str() < "0100-01-01"
        || input.date.as_str() > "9999-12-31"
    {
        return Err(Validation("Choose a date between years 0100 and 9999."));
    }
    Ok(())
}
