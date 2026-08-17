use std::collections::HashSet;

use chrono::{NaiveDate, SecondsFormat, Utc};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use uuid::Uuid;

use super::dto::{
    CreateFocusPlanInput, CreateFocusPlanReviewInput, FocusPlanDetailView, FocusPlanLifecycle,
    FocusPlanLinkedWorkInput, FocusPlanLinkedWorkView, FocusPlanListInput, FocusPlanMutationAction,
    FocusPlanMutationResult, FocusPlanPhaseView, FocusPlanPriority, FocusPlanRecoveryDraftView,
    FocusPlanReviewHistoryView, FocusPlanReviewListInput, FocusPlanReviewView,
    FocusPlanRevisionView, FocusPlanSummaryView, FocusPlanTagView, FocusPlanVariantView,
    MutateFocusPlanInput, SaveFocusPlanDraftInput,
};
use crate::infrastructure::sqlite::DbError;

#[derive(Debug)]
pub enum FocusPlanError {
    Validation(String),
    NotFound,
    StaleRevision,
    Db(DbError),
}

impl From<rusqlite::Error> for FocusPlanError {
    fn from(value: rusqlite::Error) -> Self {
        Self::Db(DbError::from(value))
    }
}

impl From<DbError> for FocusPlanError {
    fn from(value: DbError) -> Self {
        Self::Db(value)
    }
}

type Result<T> = std::result::Result<T, FocusPlanError>;

fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn new_id() -> String {
    Uuid::now_v7().to_string()
}

pub(crate) fn lifecycle_from_db(value: &str) -> Result<FocusPlanLifecycle> {
    match value {
        "draft" => Ok(FocusPlanLifecycle::Draft),
        "active" => Ok(FocusPlanLifecycle::Active),
        "paused" => Ok(FocusPlanLifecycle::Paused),
        "completed" => Ok(FocusPlanLifecycle::Completed),
        _ => Err(FocusPlanError::Validation(
            "stored Focus Plan lifecycle is invalid".into(),
        )),
    }
}

pub(crate) fn priority_from_db(value: &str) -> Result<FocusPlanPriority> {
    match value {
        "critical" => Ok(FocusPlanPriority::Critical),
        "high" => Ok(FocusPlanPriority::High),
        "normal" => Ok(FocusPlanPriority::Normal),
        "low" => Ok(FocusPlanPriority::Low),
        _ => Err(FocusPlanError::Validation(
            "stored Focus Plan priority is invalid".into(),
        )),
    }
}

fn validate_id(value: &str, label: &str) -> Result<()> {
    if value.trim().is_empty() || value.len() > 200 {
        return Err(FocusPlanError::Validation(format!(
            "{label} is required and must be at most 200 characters"
        )));
    }
    Ok(())
}

fn validate_title(value: &str, label: &str, max: usize) -> Result<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.chars().count() > max {
        return Err(FocusPlanError::Validation(format!(
            "{label} is required and must be at most {max} characters"
        )));
    }
    Ok(trimmed.to_string())
}

fn validate_dates(start: Option<&str>, target: Option<&str>) -> Result<()> {
    let parse = |value: &str| {
        NaiveDate::parse_from_str(value, "%Y-%m-%d")
            .map_err(|_| FocusPlanError::Validation("Focus Plan dates must use YYYY-MM-DD".into()))
    };
    let start = start.map(parse).transpose()?;
    let target = target.map(parse).transpose()?;
    if let (Some(start), Some(target)) = (start, target)
        && start > target
    {
        return Err(FocusPlanError::Validation(
            "Focus Plan start date cannot be after target date".into(),
        ));
    }
    Ok(())
}

fn validate_criteria(values: &[String]) -> Result<Vec<String>> {
    if values.len() > 50 {
        return Err(FocusPlanError::Validation(
            "A Focus Plan may have at most 50 success criteria".into(),
        ));
    }
    let mut result = Vec::with_capacity(values.len());
    for value in values {
        let trimmed = value.trim();
        if trimmed.is_empty() || trimmed.chars().count() > 300 {
            return Err(FocusPlanError::Validation(
                "Each success criterion must contain 1–300 characters".into(),
            ));
        }
        result.push(trimmed.to_string());
    }
    let encoded = serde_json::to_string(&result)
        .map_err(|_| FocusPlanError::Validation("Success criteria are invalid".into()))?;
    if encoded.len() > 65_536 {
        return Err(FocusPlanError::Validation(
            "Success criteria exceed the Focus Plan limit".into(),
        ));
    }
    Ok(result)
}

fn validate_body(canonical_json: &str, plain_text: &str) -> Result<()> {
    if canonical_json.len() > 1_048_576 || plain_text.len() > 524_288 {
        return Err(FocusPlanError::Validation(
            "Focus Plan variant content exceeds its limit".into(),
        ));
    }
    let value: serde_json::Value = serde_json::from_str(canonical_json)
        .map_err(|_| FocusPlanError::Validation("Variant content must be valid JSON".into()))?;
    if value.get("type").and_then(serde_json::Value::as_str) != Some("doc")
        || !value
            .get("content")
            .is_some_and(serde_json::Value::is_array)
    {
        return Err(FocusPlanError::Validation(
            "Variant content must use the canonical rich-text document schema".into(),
        ));
    }
    Ok(())
}

fn validate_life_target(conn: &Connection, life_node_id: Option<&str>) -> Result<()> {
    let Some(id) = life_node_id else {
        return Ok(());
    };
    validate_id(id, "Life node ID")?;
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL AND id!='life-root')",
        [id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(FocusPlanError::Validation(
            "Focus Plans may link only to an active non-root Life node".into(),
        ));
    }
    Ok(())
}

fn validate_tags(conn: &Connection, tag_ids: &[String]) -> Result<Vec<String>> {
    if tag_ids.len() > 20 {
        return Err(FocusPlanError::Validation(
            "A Focus Plan may have at most 20 tags".into(),
        ));
    }
    let mut seen = HashSet::new();
    let mut result = Vec::with_capacity(tag_ids.len());
    for tag_id in tag_ids {
        validate_id(tag_id, "Tag ID")?;
        if !seen.insert(tag_id.as_str()) {
            return Err(FocusPlanError::Validation(
                "Focus Plan tags must be unique".into(),
            ));
        }
        let valid: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM tags WHERE id=?1 AND archived_at IS NULL AND merged_into_tag_id IS NULL)",
            [tag_id],
            |row| row.get(0),
        )?;
        if !valid {
            return Err(FocusPlanError::Validation(
                "Archived or merged tags cannot be assigned to a Focus Plan".into(),
            ));
        }
        result.push(tag_id.clone());
    }
    result.sort();
    Ok(result)
}

fn plan_exists(conn: &Connection, plan_id: &str) -> Result<()> {
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM focus_plans WHERE id=?1)",
        [plan_id],
        |row| row.get(0),
    )?;
    if exists {
        Ok(())
    } else {
        Err(FocusPlanError::NotFound)
    }
}

fn ensure_variant(conn: &Connection, plan_id: &str, variant_id: &str) -> Result<bool> {
    let archived: Option<Option<String>> = conn
        .query_row(
            "SELECT archived_at FROM focus_plan_variants WHERE id=?1 AND plan_id=?2",
            params![variant_id, plan_id],
            |row| row.get(0),
        )
        .optional()?;
    archived
        .map(|value| value.is_some())
        .ok_or(FocusPlanError::NotFound)
}

fn ensure_phase(
    conn: &Connection,
    plan_id: &str,
    variant_id: &str,
    phase_id: &str,
) -> Result<bool> {
    let archived: Option<Option<String>> = conn
        .query_row(
            "SELECT p.archived_at FROM focus_plan_phases p JOIN focus_plan_variants v ON v.id=p.variant_id WHERE p.id=?1 AND p.variant_id=?2 AND v.plan_id=?3",
            params![phase_id, variant_id, plan_id],
            |row| row.get(0),
        )
        .optional()?;
    archived
        .map(|value| value.is_some())
        .ok_or(FocusPlanError::NotFound)
}

pub fn list(conn: &Connection, input: &FocusPlanListInput) -> Result<Vec<FocusPlanSummaryView>> {
    let filter = input.portfolio.as_str();
    let limit = input.limit.unwrap_or(100).clamp(1, 200);
    let offset = input.offset.unwrap_or(0);
    let mut statement = conn.prepare(
        "SELECT p.id,p.title,p.lifecycle,p.priority,p.score,p.start_date,p.target_date,p.life_node_id,
                ln.title,v.label,
                (SELECT COUNT(*) FROM focus_plan_variants av WHERE av.plan_id=p.id AND av.archived_at IS NULL),
                (SELECT COUNT(*) FROM focus_plan_phases ph JOIN focus_plan_variants pv ON pv.id=ph.variant_id WHERE pv.plan_id=p.id AND pv.archived_at IS NULL AND ph.archived_at IS NULL),
                COALESCE((SELECT group_concat(t.name,char(31)) FROM focus_plan_tags fpt JOIN tags t ON t.id=fpt.tag_id WHERE fpt.plan_id=p.id AND t.archived_at IS NULL ORDER BY t.normalized_name),''),
                p.revision,p.updated_at,p.archived_at
         FROM focus_plans p
         JOIN focus_plan_variants v ON v.id=p.selected_variant_id
         LEFT JOIN life_nodes ln ON ln.id=p.life_node_id
         WHERE ((?1='archived' AND p.archived_at IS NOT NULL)
            OR (?1!='archived' AND p.archived_at IS NULL AND p.lifecycle=?1))
         ORDER BY
            CASE p.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
            CASE WHEN p.start_date IS NULL AND p.target_date IS NULL THEN 1 ELSE 0 END,
            COALESCE(p.start_date,p.target_date) ASC,
            COALESCE(p.target_date,p.start_date) ASC,
            p.updated_at DESC,p.id
         LIMIT ?2 OFFSET ?3",
    )?;
    let rows = statement.query_map(params![filter, limit, offset], |row| {
        let lifecycle: String = row.get(2)?;
        let priority: String = row.get(3)?;
        let tags: String = row.get(12)?;
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            lifecycle,
            priority,
            row.get::<_, Option<u32>>(4)?,
            row.get::<_, Option<String>>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, Option<String>>(7)?,
            row.get::<_, Option<String>>(8)?,
            row.get::<_, String>(9)?,
            row.get::<_, u32>(10)?,
            row.get::<_, u32>(11)?,
            tags,
            row.get::<_, u32>(13)?,
            row.get::<_, String>(14)?,
            row.get::<_, Option<String>>(15)?,
        ))
    })?;
    rows.map(|row| {
        let (
            id,
            title,
            lifecycle,
            priority,
            score,
            start_date,
            target_date,
            life_node_id,
            life_title,
            selected_variant_label,
            active_variant_count,
            active_phase_count,
            tags,
            revision,
            updated_at,
            archived_at,
        ) = row?;
        Ok(FocusPlanSummaryView {
            id,
            title,
            lifecycle: lifecycle_from_db(&lifecycle)?,
            priority: priority_from_db(&priority)?,
            score,
            start_date,
            target_date,
            life_node_id,
            life_title,
            selected_variant_label,
            active_variant_count,
            active_phase_count,
            tag_names: if tags.is_empty() {
                Vec::new()
            } else {
                tags.split('\u{1f}').map(str::to_string).collect()
            },
            revision,
            updated_at,
            archived: archived_at.is_some(),
        })
    })
    .collect()
}

pub fn get(conn: &Connection, plan_id: &str) -> Result<FocusPlanDetailView> {
    validate_id(plan_id, "Focus Plan ID")?;
    let plan = conn
        .query_row(
            "SELECT p.id,p.title,p.lifecycle,p.priority,p.score,p.start_date,p.target_date,p.life_node_id,ln.title,p.outcome,p.success_criteria_json,p.selected_variant_id,p.revision,p.created_at,p.updated_at,p.archived_at
             FROM focus_plans p LEFT JOIN life_nodes ln ON ln.id=p.life_node_id WHERE p.id=?1",
            [plan_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?, row.get::<_, Option<u32>>(4)?, row.get::<_, Option<String>>(5)?,
                    row.get::<_, Option<String>>(6)?, row.get::<_, Option<String>>(7)?, row.get::<_, Option<String>>(8)?,
                    row.get::<_, String>(9)?, row.get::<_, String>(10)?, row.get::<_, String>(11)?,
                    row.get::<_, u32>(12)?, row.get::<_, String>(13)?, row.get::<_, String>(14)?,
                    row.get::<_, Option<String>>(15)?,
                ))
            },
        )
        .optional()?
        .ok_or(FocusPlanError::NotFound)?;

    let mut variant_statement = conn.prepare(
        "SELECT id,label,canonical_json,plain_text,sort_key,archived_at FROM focus_plan_variants WHERE plan_id=?1 ORDER BY sort_key,id",
    )?;
    let variant_rows = variant_statement
        .query_map([plan_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, u32>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    let mut variants = Vec::with_capacity(variant_rows.len());
    for (id, label, canonical_json, plain_text, sort_key, archived_at) in variant_rows {
        let mut phase_statement = conn.prepare(
            "SELECT id,title,sort_key,archived_at FROM focus_plan_phases WHERE variant_id=?1 ORDER BY sort_key,id",
        )?;
        let phases = phase_statement
            .query_map([&id], |row| {
                Ok(FocusPlanPhaseView {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    sort_key: row.get(2)?,
                    archived: row.get::<_, Option<String>>(3)?.is_some(),
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        variants.push(FocusPlanVariantView {
            id,
            label,
            canonical_json,
            plain_text,
            sort_key,
            archived: archived_at.is_some(),
            phases,
        });
    }

    let mut tag_statement = conn.prepare(
        "SELECT t.id,t.name FROM focus_plan_tags fpt JOIN tags t ON t.id=fpt.tag_id WHERE fpt.plan_id=?1 AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL ORDER BY t.normalized_name,t.id",
    )?;
    let tags = tag_statement
        .query_map([plan_id], |row| {
            Ok(FocusPlanTagView {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let mut revision_statement = conn.prepare(
        "SELECT revision,reason,created_at FROM focus_plan_revisions WHERE plan_id=?1 ORDER BY revision DESC LIMIT 50",
    )?;
    let revisions = revision_statement
        .query_map([plan_id], |row| {
            Ok(FocusPlanRevisionView {
                revision: row.get(0)?,
                reason: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    let recovery_draft = conn
        .query_row(
            "SELECT base_revision,draft_json,recovery_state,updated_at FROM focus_plan_drafts WHERE plan_id=?1",
            [plan_id],
            |row| {
                Ok(FocusPlanRecoveryDraftView {
                    base_revision: row.get(0)?,
                    draft_json: row.get(1)?,
                    conflict: row.get::<_, String>(2)? == "conflict",
                    updated_at: row.get(3)?,
                })
            },
        )
        .optional()?;

    let success_criteria = serde_json::from_str::<Vec<String>>(&plan.10)
        .map_err(|_| FocusPlanError::Validation("Stored success criteria are invalid".into()))?;
    Ok(FocusPlanDetailView {
        id: plan.0,
        title: plan.1,
        lifecycle: lifecycle_from_db(&plan.2)?,
        priority: priority_from_db(&plan.3)?,
        score: plan.4,
        start_date: plan.5,
        target_date: plan.6,
        life_node_id: plan.7,
        life_title: plan.8,
        outcome: plan.9,
        success_criteria,
        selected_variant_id: plan.11,
        variants,
        tags,
        revisions,
        recovery_draft,
        revision: plan.12,
        created_at: plan.13,
        updated_at: plan.14,
        archived: plan.15.is_some(),
    })
}

fn snapshot(conn: &Connection, plan_id: &str) -> Result<String> {
    let detail = get(conn, plan_id)?;
    let mut value = serde_json::to_value(detail)
        .map_err(|_| FocusPlanError::Validation("Focus Plan snapshot failed".into()))?;
    if let Some(object) = value.as_object_mut() {
        object.remove("revisions");
        object.remove("recovery_draft");
    }
    serde_json::to_string(&value)
        .map_err(|_| FocusPlanError::Validation("Focus Plan snapshot failed".into()))
}

fn trim_revisions(tx: &Transaction<'_>, plan_id: &str) -> Result<()> {
    tx.execute(
        "DELETE FROM focus_plan_revisions WHERE plan_id=?1 AND revision NOT IN (SELECT revision FROM focus_plan_revisions WHERE plan_id=?1 ORDER BY revision DESC LIMIT 50)",
        [plan_id],
    )?;
    Ok(())
}

fn existing_operation(
    conn: &Connection,
    operation_id: &str,
) -> Result<Option<FocusPlanMutationResult>> {
    let value = conn
        .query_row(
            "SELECT plan_id,result_revision FROM focus_plan_save_operations WHERE operation_id=?1",
            [operation_id],
            |row| {
                Ok(FocusPlanMutationResult {
                    plan_id: row.get(0)?,
                    revision: row.get(1)?,
                    created_id: None,
                    replayed: true,
                })
            },
        )
        .optional()?;
    Ok(value)
}

pub fn create(conn: &mut Connection, input: CreateFocusPlanInput) -> Result<FocusPlanDetailView> {
    let title = validate_title(&input.title, "Focus Plan title", 200)?;
    let label = validate_title(&input.initial_variant_label, "Variant label", 120)?;
    if input.outcome.len() > 8192 {
        return Err(FocusPlanError::Validation(
            "Focus Plan outcome exceeds 8192 characters".into(),
        ));
    }
    validate_dates(input.start_date.as_deref(), input.target_date.as_deref())?;
    let criteria = validate_criteria(&input.success_criteria)?;
    validate_id(&input.operation_id, "Operation ID")?;
    validate_life_target(conn, input.life_node_id.as_deref())?;
    if let Some(existing) = existing_operation(conn, &input.operation_id)? {
        return get(conn, &existing.plan_id);
    }

    let plan_id = new_id();
    let variant_id = new_id();
    let timestamp = now();
    let criteria_json = serde_json::to_string(&criteria)
        .map_err(|_| FocusPlanError::Validation("Success criteria are invalid".into()))?;
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO focus_plans(id,life_node_id,selected_variant_id,title,lifecycle,priority,start_date,target_date,outcome,success_criteria_json,revision,created_at,updated_at) VALUES(?1,?2,?3,?4,'draft',?5,?6,?7,?8,?9,0,?10,?10)",
        params![plan_id, input.life_node_id, variant_id, title, input.priority.as_str(), input.start_date, input.target_date, input.outcome, criteria_json, timestamp],
    )?;
    tx.execute(
        "INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at) VALUES(?1,?2,?3,'{\"type\":\"doc\",\"content\":[]}','',0,?4,?4)",
        params![variant_id, plan_id, label, timestamp],
    )?;
    let canonical = snapshot(&tx, &plan_id)?;
    tx.execute(
        "INSERT INTO focus_plan_revisions(id,plan_id,revision,canonical_json,reason,created_at) VALUES(?1,?2,0,?3,'create_plan',?4)",
        params![new_id(), plan_id, canonical, timestamp],
    )?;
    tx.execute(
        "INSERT INTO focus_plan_save_operations(operation_id,plan_id,result_revision,created_at) VALUES(?1,?2,0,?3)",
        params![input.operation_id, plan_id, timestamp],
    )?;
    tx.commit()?;
    get(conn, &plan_id)
}

fn mutation_reason(action: &FocusPlanMutationAction) -> &'static str {
    match action {
        FocusPlanMutationAction::UpdatePlan { .. } => "update_plan",
        FocusPlanMutationAction::SetScore { .. } => "set_score",
        FocusPlanMutationAction::AddVariant { .. } => "add_variant",
        FocusPlanMutationAction::RenameVariant { .. } => "rename_variant",
        FocusPlanMutationAction::SelectVariant { .. } => "select_variant",
        FocusPlanMutationAction::UpdateVariantBody { .. } => "update_variant_body",
        FocusPlanMutationAction::ArchiveVariant { .. } => "archive_variant",
        FocusPlanMutationAction::RestoreVariant { .. } => "restore_variant",
        FocusPlanMutationAction::AddPhase { .. } => "add_phase",
        FocusPlanMutationAction::RenamePhase { .. } => "rename_phase",
        FocusPlanMutationAction::MovePhase { .. } => "move_phase",
        FocusPlanMutationAction::ArchivePhase { .. } => "archive_phase",
        FocusPlanMutationAction::RestorePhase { .. } => "restore_phase",
        FocusPlanMutationAction::ArchivePlan => "archive_plan",
        FocusPlanMutationAction::RestorePlan => "restore_plan",
    }
}

fn replace_tags(
    tx: &Transaction<'_>,
    plan_id: &str,
    tag_ids: &[String],
    timestamp: &str,
) -> Result<()> {
    let tag_ids = validate_tags(tx, tag_ids)?;
    tx.execute(
        "DELETE FROM focus_plan_tags WHERE plan_id=?1
         AND tag_id IN (SELECT id FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL)",
        [plan_id],
    )?;
    for tag_id in tag_ids {
        tx.execute(
            "INSERT INTO focus_plan_tags(plan_id,tag_id,created_at) VALUES(?1,?2,?3)",
            params![plan_id, tag_id, timestamp],
        )?;
    }
    Ok(())
}

fn apply_mutation(
    tx: &Transaction<'_>,
    plan_id: &str,
    action: &FocusPlanMutationAction,
    timestamp: &str,
) -> Result<Option<String>> {
    let created_id = match action {
        FocusPlanMutationAction::UpdatePlan {
            title,
            lifecycle,
            priority,
            life_node_id,
            start_date,
            target_date,
            outcome,
            success_criteria,
            tag_ids,
        } => {
            let title = validate_title(title, "Focus Plan title", 200)?;
            if outcome.len() > 8192 {
                return Err(FocusPlanError::Validation(
                    "Focus Plan outcome exceeds 8192 characters".into(),
                ));
            }
            validate_dates(start_date.as_deref(), target_date.as_deref())?;
            validate_life_target(tx, life_node_id.as_deref())?;
            let criteria = validate_criteria(success_criteria)?;
            let criteria_json = serde_json::to_string(&criteria)
                .map_err(|_| FocusPlanError::Validation("Success criteria are invalid".into()))?;
            tx.execute(
                "UPDATE focus_plans SET title=?2,lifecycle=?3,priority=?4,life_node_id=?5,start_date=?6,target_date=?7,outcome=?8,success_criteria_json=?9 WHERE id=?1",
                params![plan_id, title, lifecycle.as_str(), priority.as_str(), life_node_id, start_date, target_date, outcome, criteria_json],
            )?;
            replace_tags(tx, plan_id, tag_ids, timestamp)?;
            None
        }
        FocusPlanMutationAction::SetScore { score } => {
            if score.is_some_and(|value| !(1..=100).contains(&value)) {
                return Err(FocusPlanError::Validation(
                    "Focus Plan score must be between 1 and 100".into(),
                ));
            }
            tx.execute(
                "UPDATE focus_plans
                    SET score=?2,
                        lifecycle=CASE WHEN ?2 IS NULL THEN lifecycle ELSE 'completed' END
                  WHERE id=?1",
                params![plan_id, score],
            )?;
            None
        }
        FocusPlanMutationAction::AddVariant { label } => {
            let label = validate_title(label, "Variant label", 120)?;
            let id = new_id();
            let sort_key: u32 = tx.query_row(
                "SELECT COALESCE(MAX(sort_key)+1,0) FROM focus_plan_variants WHERE plan_id=?1",
                [plan_id],
                |row| row.get(0),
            )?;
            tx.execute(
                "INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at) VALUES(?1,?2,?3,'{\"type\":\"doc\",\"content\":[]}','',?4,?5,?5)",
                params![id, plan_id, label, sort_key, timestamp],
            )?;
            Some(id)
        }
        FocusPlanMutationAction::RenameVariant { variant_id, label } => {
            ensure_variant(tx, plan_id, variant_id)?;
            let label = validate_title(label, "Variant label", 120)?;
            tx.execute(
                "UPDATE focus_plan_variants SET label=?3,updated_at=?4 WHERE id=?1 AND plan_id=?2",
                params![variant_id, plan_id, label, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::SelectVariant { variant_id } => {
            if ensure_variant(tx, plan_id, variant_id)? {
                return Err(FocusPlanError::Validation(
                    "Archived variants cannot be selected".into(),
                ));
            }
            tx.execute(
                "UPDATE focus_plans SET selected_variant_id=?2 WHERE id=?1",
                params![plan_id, variant_id],
            )?;
            None
        }
        FocusPlanMutationAction::UpdateVariantBody {
            variant_id,
            canonical_json,
            plain_text,
        } => {
            ensure_variant(tx, plan_id, variant_id)?;
            validate_body(canonical_json, plain_text)?;
            tx.execute(
                "UPDATE focus_plan_variants SET canonical_json=?3,plain_text=?4,updated_at=?5 WHERE id=?1 AND plan_id=?2",
                params![variant_id, plan_id, canonical_json, plain_text, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::ArchiveVariant { variant_id } => {
            if ensure_variant(tx, plan_id, variant_id)? {
                return Err(FocusPlanError::Validation(
                    "Variant is already archived".into(),
                ));
            }
            tx.execute(
                "UPDATE focus_plan_variants SET archived_at=?3,updated_at=?3 WHERE id=?1 AND plan_id=?2",
                params![variant_id, plan_id, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::RestoreVariant { variant_id } => {
            if !ensure_variant(tx, plan_id, variant_id)? {
                return Err(FocusPlanError::Validation("Variant is not archived".into()));
            }
            tx.execute(
                "UPDATE focus_plan_variants SET archived_at=NULL,updated_at=?3 WHERE id=?1 AND plan_id=?2",
                params![variant_id, plan_id, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::AddPhase { variant_id, title } => {
            ensure_variant(tx, plan_id, variant_id)?;
            let title = validate_title(title, "Phase title", 160)?;
            let id = new_id();
            let sort_key: u32 = tx.query_row(
                "SELECT COALESCE(MAX(sort_key)+1,0) FROM focus_plan_phases WHERE variant_id=?1",
                [variant_id],
                |row| row.get(0),
            )?;
            tx.execute(
                "INSERT INTO focus_plan_phases(id,variant_id,title,sort_key,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?5)",
                params![id, variant_id, title, sort_key, timestamp],
            )?;
            Some(id)
        }
        FocusPlanMutationAction::RenamePhase {
            variant_id,
            phase_id,
            title,
        } => {
            ensure_phase(tx, plan_id, variant_id, phase_id)?;
            let title = validate_title(title, "Phase title", 160)?;
            tx.execute(
                "UPDATE focus_plan_phases SET title=?4,updated_at=?5 WHERE id=?1 AND variant_id=?2 AND EXISTS(SELECT 1 FROM focus_plan_variants WHERE id=?2 AND plan_id=?3)",
                params![phase_id, variant_id, plan_id, title, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::MovePhase {
            variant_id,
            phase_id,
            new_index,
        } => {
            if ensure_phase(tx, plan_id, variant_id, phase_id)? {
                return Err(FocusPlanError::Validation(
                    "Archived phases cannot be reordered".into(),
                ));
            }
            let mut statement = tx.prepare(
                "SELECT id,archived_at FROM focus_plan_phases WHERE variant_id=?1 ORDER BY sort_key,id",
            )?;
            let ordered = statement
                .query_map([variant_id], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, Option<String>>(1)?.is_some(),
                    ))
                })?
                .collect::<std::result::Result<Vec<_>, _>>()?;
            let mut active_ids = ordered
                .iter()
                .filter(|(_, archived)| !archived)
                .map(|(id, _)| id.clone())
                .collect::<Vec<_>>();
            let old_index = active_ids
                .iter()
                .position(|id| id == phase_id)
                .ok_or(FocusPlanError::NotFound)?;
            let item = active_ids.remove(old_index);
            let target = (*new_index as usize).min(active_ids.len());
            active_ids.insert(target, item);

            let mut active = active_ids.into_iter();
            let reordered = ordered
                .into_iter()
                .map(|(id, archived)| {
                    if archived {
                        Ok(id)
                    } else {
                        active.next().ok_or_else(|| {
                            FocusPlanError::Validation(
                                "Focus Plan phase ordering is inconsistent".into(),
                            )
                        })
                    }
                })
                .collect::<Result<Vec<_>>>()?;
            if active.next().is_some() {
                return Err(FocusPlanError::Validation(
                    "Focus Plan phase ordering is inconsistent".into(),
                ));
            }
            for (index, id) in reordered.iter().enumerate() {
                tx.execute(
                    "UPDATE focus_plan_phases SET sort_key=?2,updated_at=?3 WHERE id=?1",
                    params![id, index as u32, timestamp],
                )?;
            }
            None
        }
        FocusPlanMutationAction::ArchivePhase {
            variant_id,
            phase_id,
        } => {
            if ensure_phase(tx, plan_id, variant_id, phase_id)? {
                return Err(FocusPlanError::Validation(
                    "Phase is already archived".into(),
                ));
            }
            tx.execute(
                "UPDATE focus_plan_phases SET archived_at=?3,updated_at=?3 WHERE id=?1 AND variant_id=?2",
                params![phase_id, variant_id, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::RestorePhase {
            variant_id,
            phase_id,
        } => {
            if !ensure_phase(tx, plan_id, variant_id, phase_id)? {
                return Err(FocusPlanError::Validation("Phase is not archived".into()));
            }
            tx.execute(
                "UPDATE focus_plan_phases SET archived_at=NULL,updated_at=?3 WHERE id=?1 AND variant_id=?2",
                params![phase_id, variant_id, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::ArchivePlan => {
            let archived: Option<String> = tx.query_row(
                "SELECT archived_at FROM focus_plans WHERE id=?1",
                [plan_id],
                |row| row.get(0),
            )?;
            if archived.is_some() {
                return Err(FocusPlanError::Validation(
                    "Focus Plan is already archived".into(),
                ));
            }
            tx.execute(
                "UPDATE focus_plans SET archived_at=?2 WHERE id=?1",
                params![plan_id, timestamp],
            )?;
            None
        }
        FocusPlanMutationAction::RestorePlan => {
            let archived: Option<String> = tx.query_row(
                "SELECT archived_at FROM focus_plans WHERE id=?1",
                [plan_id],
                |row| row.get(0),
            )?;
            if archived.is_none() {
                return Err(FocusPlanError::Validation(
                    "Focus Plan is not archived".into(),
                ));
            }
            tx.execute(
                "UPDATE focus_plans SET archived_at=NULL WHERE id=?1",
                [plan_id],
            )?;
            None
        }
    };
    Ok(created_id)
}

pub fn mutate(
    conn: &mut Connection,
    input: MutateFocusPlanInput,
) -> Result<FocusPlanMutationResult> {
    validate_id(&input.plan_id, "Focus Plan ID")?;
    validate_id(&input.operation_id, "Operation ID")?;
    if let Some(existing) = existing_operation(conn, &input.operation_id)? {
        if existing.plan_id != input.plan_id {
            return Err(FocusPlanError::Validation(
                "Operation ID was already used for another Focus Plan".into(),
            ));
        }
        return Ok(existing);
    }
    plan_exists(conn, &input.plan_id)?;

    let expected_revision = input.expected_revision;
    let tx = conn.transaction()?;
    let current_revision: u32 = tx.query_row(
        "SELECT revision FROM focus_plans WHERE id=?1",
        [&input.plan_id],
        |row| row.get(0),
    )?;
    if current_revision != expected_revision {
        let attempted = serde_json::to_string(&input.mutation).map_err(|_| {
            FocusPlanError::Validation("Focus Plan recovery draft could not be encoded".into())
        })?;
        if attempted.len() <= 2_097_152 {
            tx.execute(
                "INSERT INTO focus_plan_drafts(plan_id,base_revision,draft_json,recovery_state,updated_at) VALUES(?1,?2,?3,'conflict',?4) ON CONFLICT(plan_id) DO UPDATE SET base_revision=excluded.base_revision,draft_json=excluded.draft_json,recovery_state='conflict',updated_at=excluded.updated_at",
                params![input.plan_id, expected_revision, attempted, now()],
            )?;
            tx.commit()?;
        }
        return Err(FocusPlanError::StaleRevision);
    }

    let timestamp = now();
    let created_id = apply_mutation(&tx, &input.plan_id, &input.mutation, &timestamp)?;
    let changed = tx.execute(
        "UPDATE focus_plans SET revision=revision+1,updated_at=?2 WHERE id=?1 AND revision=?3",
        params![input.plan_id, timestamp, expected_revision],
    )?;
    if changed != 1 {
        return Err(FocusPlanError::StaleRevision);
    }
    let revision = expected_revision + 1;
    let canonical = snapshot(&tx, &input.plan_id)?;
    tx.execute(
        "INSERT INTO focus_plan_revisions(id,plan_id,revision,canonical_json,reason,created_at) VALUES(?1,?2,?3,?4,?5,?6)",
        params![new_id(), input.plan_id, revision, canonical, mutation_reason(&input.mutation), timestamp],
    )?;
    trim_revisions(&tx, &input.plan_id)?;
    tx.execute(
        "INSERT INTO focus_plan_save_operations(operation_id,plan_id,result_revision,created_at) VALUES(?1,?2,?3,?4)",
        params![input.operation_id, input.plan_id, revision, timestamp],
    )?;
    tx.commit()?;
    Ok(FocusPlanMutationResult {
        plan_id: input.plan_id,
        revision,
        created_id,
        replayed: false,
    })
}

pub fn save_draft(conn: &mut Connection, input: SaveFocusPlanDraftInput) -> Result<()> {
    validate_id(&input.plan_id, "Focus Plan ID")?;
    if input.draft_json.len() > 2_097_152
        || serde_json::from_str::<serde_json::Value>(&input.draft_json).is_err()
    {
        return Err(FocusPlanError::Validation(
            "Recovery draft must be valid JSON within the 2 MiB limit".into(),
        ));
    }
    plan_exists(conn, &input.plan_id)?;
    let base_revision = input.base_revision;
    conn.execute(
        "INSERT INTO focus_plan_drafts(plan_id,base_revision,draft_json,recovery_state,updated_at) VALUES(?1,?2,?3,'available',?4) ON CONFLICT(plan_id) DO UPDATE SET base_revision=excluded.base_revision,draft_json=excluded.draft_json,recovery_state='available',updated_at=excluded.updated_at",
        params![input.plan_id, base_revision, input.draft_json, now()],
    )?;
    Ok(())
}

pub fn discard_draft(conn: &mut Connection, plan_id: &str) -> Result<()> {
    validate_id(plan_id, "Focus Plan ID")?;
    plan_exists(conn, plan_id)?;
    conn.execute("DELETE FROM focus_plan_drafts WHERE plan_id=?1", [plan_id])?;
    Ok(())
}

pub const MAX_REVIEW_REFLECTION: usize = 4_000;
pub const MAX_REVIEW_NEXT_FOCUS: usize = 2_000;
pub const DEFAULT_REVIEW_PAGE: u32 = 50;
pub const MAX_REVIEW_PAGE: u32 = 200;

fn review_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<FocusPlanReviewView> {
    Ok(FocusPlanReviewView {
        id: row.get(0)?,
        reviewed_local_date: row.get(1)?,
        reflection: row.get(2)?,
        next_focus: row.get(3)?,
        created_at: row.get(4)?,
    })
}

/// Creates one manual review. This deliberately does not route through `mutate`: a review is
/// history about the Plan, so it must not advance `focus_plans.revision` or write a revision
/// snapshot. Idempotency comes from the UNIQUE `operation_id` instead.
pub fn create_review(
    conn: &mut Connection,
    input: CreateFocusPlanReviewInput,
) -> Result<FocusPlanReviewView> {
    validate_id(&input.plan_id, "Focus Plan ID")?;
    validate_id(&input.operation_id, "Operation ID")?;

    if let Some(existing) = existing_review(conn, &input.operation_id)? {
        if existing.0 != input.plan_id {
            return Err(FocusPlanError::Validation(
                "Operation ID was already used for another Focus Plan".into(),
            ));
        }
        return Ok(existing.1);
    }

    let reflection = input.reflection.trim();
    if reflection.is_empty() {
        return Err(FocusPlanError::Validation(
            "Write a reflection before saving the review".into(),
        ));
    }
    if reflection.chars().count() > MAX_REVIEW_REFLECTION {
        return Err(FocusPlanError::Validation(format!(
            "Reflection must be at most {MAX_REVIEW_REFLECTION} characters"
        )));
    }
    let next_focus = input
        .next_focus
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    if let Some(value) = next_focus.as_deref() {
        if value.chars().count() > MAX_REVIEW_NEXT_FOCUS {
            return Err(FocusPlanError::Validation(format!(
                "Next focus must be at most {MAX_REVIEW_NEXT_FOCUS} characters"
            )));
        }
    }
    if NaiveDate::parse_from_str(&input.reviewed_local_date, "%Y-%m-%d").is_err() {
        return Err(FocusPlanError::Validation(
            "Focus Plan review dates must use YYYY-MM-DD".into(),
        ));
    }

    let archived: bool = conn
        .query_row(
            "SELECT archived_at IS NOT NULL FROM focus_plans WHERE id=?1",
            params![input.plan_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or(FocusPlanError::NotFound)?;
    if archived {
        return Err(FocusPlanError::Validation(
            "Restore the Focus Plan before adding a review".into(),
        ));
    }

    let review = FocusPlanReviewView {
        id: new_id(),
        reviewed_local_date: input.reviewed_local_date,
        reflection: reflection.to_string(),
        next_focus,
        created_at: now(),
    };
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO focus_plan_reviews(id,plan_id,operation_id,reviewed_local_date,reflection,next_focus,created_at)
         VALUES(?1,?2,?3,?4,?5,?6,?7)",
        params![
            review.id,
            input.plan_id,
            input.operation_id,
            review.reviewed_local_date,
            review.reflection,
            review.next_focus,
            review.created_at
        ],
    )?;
    tx.commit()?;
    Ok(review)
}

fn existing_review(
    conn: &Connection,
    operation_id: &str,
) -> Result<Option<(String, FocusPlanReviewView)>> {
    Ok(conn
        .query_row(
            "SELECT plan_id,id,reviewed_local_date,reflection,next_focus,created_at
             FROM focus_plan_reviews WHERE operation_id=?1",
            params![operation_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    FocusPlanReviewView {
                        id: row.get(1)?,
                        reviewed_local_date: row.get(2)?,
                        reflection: row.get(3)?,
                        next_focus: row.get(4)?,
                        created_at: row.get(5)?,
                    },
                ))
            },
        )
        .optional()?)
}

/// Bounded newest-first history. `created_at` then `id` break ties so two reviews sharing a
/// review date always come back in the same order.
pub fn list_reviews(
    conn: &Connection,
    input: &FocusPlanReviewListInput,
) -> Result<FocusPlanReviewHistoryView> {
    validate_id(&input.plan_id, "Focus Plan ID")?;
    plan_exists(conn, &input.plan_id)?;
    let limit = input
        .limit
        .unwrap_or(DEFAULT_REVIEW_PAGE)
        .clamp(1, MAX_REVIEW_PAGE);
    let mut statement = conn.prepare(
        "SELECT id,reviewed_local_date,reflection,next_focus,created_at
         FROM focus_plan_reviews WHERE plan_id=?1
         ORDER BY reviewed_local_date DESC,created_at DESC,id DESC
         LIMIT ?2",
    )?;
    let reviews = statement
        .query_map(params![input.plan_id, limit], review_row)?
        .collect::<std::result::Result<Vec<_>, _>>()?;
    let review_count: u32 = conn.query_row(
        "SELECT COUNT(*) FROM focus_plan_reviews WHERE plan_id=?1",
        params![input.plan_id],
        |row| row.get(0),
    )?;
    let latest_reviewed_local_date = conn
        .query_row(
            "SELECT MAX(reviewed_local_date) FROM focus_plan_reviews WHERE plan_id=?1",
            params![input.plan_id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?
        .flatten();
    Ok(FocusPlanReviewHistoryView {
        review_count,
        latest_reviewed_local_date,
        reviews,
    })
}

/// Linked work for a Focus Plan detail. Counts are factual and never turned into progress.
pub fn linked_work(
    conn: &Connection,
    input: &FocusPlanLinkedWorkInput,
) -> Result<FocusPlanLinkedWorkView> {
    validate_id(&input.plan_id, "Focus Plan ID")?;
    let items = crate::task::repository::related_for_focus_plan(
        conn,
        &input.plan_id,
        &input.anchor_local_date,
    )
    .map_err(|error| match error {
        crate::task::repository::TaskError::NotFound => FocusPlanError::NotFound,
        crate::task::repository::TaskError::Validation(message) => {
            FocusPlanError::Validation(message.into())
        }
        crate::task::repository::TaskError::Conflict => {
            FocusPlanError::Validation("Linked work could not be projected".into())
        }
        crate::task::repository::TaskError::Db(error) => FocusPlanError::Db(DbError::from(error)),
    })?;
    let one_off_count = items
        .iter()
        .filter(|item| matches!(item.kind, crate::task::dto::RelatedTaskKind::OneOff))
        .count() as u32;
    Ok(FocusPlanLinkedWorkView {
        series_count: items.len() as u32 - one_off_count,
        one_off_count,
        items,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::focus_plan::dto::FocusPlanPortfolio;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task56_migration::run_all_migrations,
    };

    fn connection() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn create_input(operation_id: &str) -> CreateFocusPlanInput {
        CreateFocusPlanInput {
            priority: crate::focus_plan::dto::FocusPlanPriority::Normal,
            title: "AI Foundations".into(),
            life_node_id: None,
            start_date: Some("2026-08-15".into()),
            target_date: Some("2026-12-20".into()),
            outcome: "Build foundations".into(),
            success_criteria: vec!["Finish the core sequence".into()],
            initial_variant_label: "Textbook first".into(),
            operation_id: operation_id.into(),
        }
    }

    #[test]
    fn create_is_idempotent_and_has_one_variant() {
        let mut conn = connection();
        let first = create(&mut conn, create_input("op-create")).unwrap();
        let replay = create(&mut conn, create_input("op-create")).unwrap();
        assert_eq!(first.id, replay.id);
        assert_eq!(first.revision, 0);
        assert_eq!(first.variants.len(), 1);
        assert_eq!(first.selected_variant_id, first.variants[0].id);
    }

    #[test]
    fn list_orders_plans_by_start_then_target_with_undated_last() {
        let mut conn = connection();
        let mut later = create_input("op-later");
        later.title = "Later start".into();
        later.start_date = Some("2026-09-01".into());
        later.target_date = Some("2026-11-01".into());
        create(&mut conn, later).unwrap();

        let mut target_only = create_input("op-target-only");
        target_only.title = "Earlier target".into();
        target_only.start_date = None;
        target_only.target_date = Some("2026-08-20".into());
        create(&mut conn, target_only).unwrap();

        let mut undated = create_input("op-undated");
        undated.title = "Undated".into();
        undated.start_date = None;
        undated.target_date = None;
        create(&mut conn, undated).unwrap();

        let summaries = list(
            &conn,
            &FocusPlanListInput {
                portfolio: FocusPlanPortfolio::Draft,
                limit: None,
                offset: None,
            },
        )
        .unwrap();
        assert_eq!(
            summaries
                .iter()
                .map(|plan| plan.title.as_str())
                .collect::<Vec<_>>(),
            vec!["Earlier target", "Later start", "Undated"]
        );
    }

    #[test]
    fn priority_outranks_dates_and_survives_the_revision_snapshot() {
        let mut conn = connection();

        // Identical dates on every Plan, so only priority can decide the order.
        let mut low = create_input("op-low");
        low.title = "Low".into();
        low.priority = FocusPlanPriority::Low;
        create(&mut conn, low).unwrap();

        let mut critical = create_input("op-critical");
        critical.title = "Critical".into();
        critical.priority = FocusPlanPriority::Critical;
        let critical = create(&mut conn, critical).unwrap();

        let mut normal = create_input("op-normal");
        normal.title = "Normal".into();
        create(&mut conn, normal).unwrap();

        let mut high = create_input("op-high");
        high.title = "High".into();
        high.priority = FocusPlanPriority::High;
        create(&mut conn, high).unwrap();

        // A Plan created without an explicit choice lands on the neutral level.
        assert_eq!(
            get(&conn, &critical.id).unwrap().priority,
            FocusPlanPriority::Critical
        );

        let titles = |conn: &Connection| {
            list(
                conn,
                &FocusPlanListInput {
                    portfolio: FocusPlanPortfolio::Draft,
                    limit: None,
                    offset: None,
                },
            )
            .unwrap()
            .into_iter()
            .map(|plan| plan.title)
            .collect::<Vec<_>>()
        };
        assert_eq!(titles(&conn), vec!["Critical", "High", "Normal", "Low"]);

        // Demoting the top Plan re-sorts the portfolio and advances the revision exactly once.
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: critical.id.clone(),
                expected_revision: critical.revision,
                operation_id: "op-demote".into(),
                mutation: FocusPlanMutationAction::UpdatePlan {
                    title: critical.title.clone(),
                    lifecycle: critical.lifecycle,
                    priority: FocusPlanPriority::Low,
                    life_node_id: None,
                    start_date: critical.start_date.clone(),
                    target_date: critical.target_date.clone(),
                    outcome: critical.outcome.clone(),
                    success_criteria: critical.success_criteria.clone(),
                    tag_ids: vec![],
                },
            },
        )
        .unwrap();

        let demoted = get(&conn, &critical.id).unwrap();
        assert_eq!(demoted.priority, FocusPlanPriority::Low);
        assert_eq!(demoted.revision, critical.revision + 1);
        assert_eq!(titles(&conn), vec!["High", "Normal", "Critical", "Low"]);

        // Recovery must be able to restore the priority, so the committed revision has to carry it.
        let snapshot: serde_json::Value = serde_json::from_str(
            &conn
                .query_row(
                    "SELECT canonical_json FROM focus_plan_revisions WHERE plan_id=?1 ORDER BY revision DESC LIMIT 1",
                    [&critical.id],
                    |row| row.get::<_, String>(0),
                )
                .unwrap(),
        )
        .unwrap();
        assert_eq!(snapshot["priority"], "low");
    }

    #[test]
    fn stored_priority_outside_the_plan_scale_is_rejected() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        conn.execute(
            "UPDATE focus_plans SET priority='medium' WHERE id=?1",
            [&plan.id],
        )
        .unwrap_err();
    }

    #[test]
    fn mutation_advances_once_and_replay_does_not_advance() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let input = MutateFocusPlanInput {
            plan_id: plan.id.clone(),
            expected_revision: 0,
            operation_id: "op-add".into(),
            mutation: FocusPlanMutationAction::AddVariant {
                label: "Course first".into(),
            },
        };
        let result = mutate(&mut conn, input.clone()).unwrap();
        let replay = mutate(&mut conn, input).unwrap();
        assert_eq!(result.revision, 1);
        assert_eq!(replay.revision, 1);
        assert!(replay.replayed);
        assert_eq!(get(&conn, &plan.id).unwrap().variants.len(), 2);
    }

    #[test]
    fn manual_score_is_bounded_revisioned_and_completes_plan() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create-score")).unwrap();

        let invalid = mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 0,
                operation_id: "op-score-invalid".into(),
                mutation: FocusPlanMutationAction::SetScore { score: Some(101) },
            },
        )
        .unwrap_err();
        assert!(matches!(invalid, FocusPlanError::Validation(_)));
        assert_eq!(get(&conn, &plan.id).unwrap().revision, 0);

        let input = MutateFocusPlanInput {
            plan_id: plan.id.clone(),
            expected_revision: 0,
            operation_id: "op-score".into(),
            mutation: FocusPlanMutationAction::SetScore { score: Some(100) },
        };
        let result = mutate(&mut conn, input.clone()).unwrap();
        let replay = mutate(&mut conn, input).unwrap();
        assert_eq!(result.revision, 1);
        assert_eq!(replay.revision, 1);
        assert!(replay.replayed);

        let detail = get(&conn, &plan.id).unwrap();
        assert_eq!(detail.score, Some(100));
        assert_eq!(detail.lifecycle, FocusPlanLifecycle::Completed);
        assert_eq!(detail.revisions[0].reason, "set_score");
        let summary = list(
            &conn,
            &FocusPlanListInput {
                portfolio: FocusPlanPortfolio::Completed,
                limit: None,
                offset: None,
            },
        )
        .unwrap();
        assert_eq!(summary[0].score, Some(100));
        assert_eq!(summary[0].lifecycle, FocusPlanLifecycle::Completed);
        assert!(
            list(
                &conn,
                &FocusPlanListInput {
                    portfolio: FocusPlanPortfolio::Draft,
                    limit: None,
                    offset: None,
                },
            )
            .unwrap()
            .is_empty()
        );

        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 1,
                operation_id: "op-score-clear".into(),
                mutation: FocusPlanMutationAction::SetScore { score: None },
            },
        )
        .unwrap();
        let cleared = get(&conn, &plan.id).unwrap();
        assert_eq!(cleared.score, None);
        assert_eq!(cleared.lifecycle, FocusPlanLifecycle::Completed);
    }

    #[test]
    fn stale_mutation_preserves_conflict_draft() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let err = mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 9,
                operation_id: "op-stale".into(),
                mutation: FocusPlanMutationAction::AddVariant { label: "B".into() },
            },
        )
        .unwrap_err();
        assert!(matches!(err, FocusPlanError::StaleRevision));
        let detail = get(&conn, &plan.id).unwrap();
        assert!(detail.recovery_draft.unwrap().conflict);
        assert_eq!(detail.revision, 0);
    }

    #[test]
    fn selected_variant_and_last_variant_guards_surface_as_errors() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let err = mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 0,
                operation_id: "op-archive-selected".into(),
                mutation: FocusPlanMutationAction::ArchiveVariant {
                    variant_id: plan.selected_variant_id,
                },
            },
        )
        .unwrap_err();
        assert!(matches!(err, FocusPlanError::Db(_)));
        assert_eq!(get(&conn, &plan.id).unwrap().revision, 0);
    }

    #[test]
    fn variant_body_never_creates_reader_document() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 0,
                operation_id: "op-body".into(),
                mutation: FocusPlanMutationAction::UpdateVariantBody {
                    variant_id: plan.selected_variant_id,
                    canonical_json: "{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\"}]}"
                        .into(),
                    plain_text: "Plan".into(),
                },
            },
        )
        .unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM reader_documents", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn archive_restore_preserves_nested_state() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let before = get(&conn, &plan.id).unwrap();
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 0,
                operation_id: "op-archive".into(),
                mutation: FocusPlanMutationAction::ArchivePlan,
            },
        )
        .unwrap();
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 1,
                operation_id: "op-restore".into(),
                mutation: FocusPlanMutationAction::RestorePlan,
            },
        )
        .unwrap();
        let after = get(&conn, &plan.id).unwrap();
        assert_eq!(before.selected_variant_id, after.selected_variant_id);
        assert_eq!(
            before.variants[0].canonical_json,
            after.variants[0].canonical_json
        );
        assert!(!after.archived);
        assert_eq!(after.revision, 2);
    }

    #[test]
    fn phase_reorder_preserves_archived_slot_and_contiguous_restore_order() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let variant_id = plan.selected_variant_id.clone();

        let add_phase =
            |conn: &mut Connection, revision: u32, operation_id: &str, title: &str| -> String {
                mutate(
                    conn,
                    MutateFocusPlanInput {
                        plan_id: plan.id.clone(),
                        expected_revision: revision,
                        operation_id: operation_id.into(),
                        mutation: FocusPlanMutationAction::AddPhase {
                            variant_id: variant_id.clone(),
                            title: title.into(),
                        },
                    },
                )
                .unwrap()
                .created_id
                .unwrap()
            };

        let phase_a = add_phase(&mut conn, 0, "op-phase-a", "A");
        let phase_b = add_phase(&mut conn, 1, "op-phase-b", "B");
        let phase_c = add_phase(&mut conn, 2, "op-phase-c", "C");

        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 3,
                operation_id: "op-archive-b".into(),
                mutation: FocusPlanMutationAction::ArchivePhase {
                    variant_id: variant_id.clone(),
                    phase_id: phase_b.clone(),
                },
            },
        )
        .unwrap();
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 4,
                operation_id: "op-move-c".into(),
                mutation: FocusPlanMutationAction::MovePhase {
                    variant_id: variant_id.clone(),
                    phase_id: phase_c.clone(),
                    new_index: 0,
                },
            },
        )
        .unwrap();
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 5,
                operation_id: "op-restore-b".into(),
                mutation: FocusPlanMutationAction::RestorePhase {
                    variant_id,
                    phase_id: phase_b.clone(),
                },
            },
        )
        .unwrap();

        let detail = get(&conn, &plan.id).unwrap();
        let phases = &detail.variants[0].phases;
        assert_eq!(
            phases
                .iter()
                .map(|phase| phase.id.as_str())
                .collect::<Vec<_>>(),
            vec![phase_c.as_str(), phase_b.as_str(), phase_a.as_str()]
        );
        assert_eq!(
            phases
                .iter()
                .map(|phase| phase.sort_key)
                .collect::<Vec<_>>(),
            vec![0, 1, 2]
        );
        assert!(phases.iter().all(|phase| !phase.archived));
    }

    #[test]
    fn archived_tag_joins_are_hidden_and_do_not_block_plan_updates() {
        let mut conn = connection();
        let plan = create(&mut conn, create_input("op-create")).unwrap();
        let tag = crate::tag::repository::create(
            &conn,
            crate::tag::dto::CreateTagInput {
                name: "Foundations".into(),
            },
        )
        .unwrap();

        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: 0,
                operation_id: "op-assign-tag".into(),
                mutation: FocusPlanMutationAction::UpdatePlan {
                    title: plan.title.clone(),
                    lifecycle: plan.lifecycle,
                    priority: plan.priority,
                    life_node_id: plan.life_node_id.clone(),
                    start_date: plan.start_date.clone(),
                    target_date: plan.target_date.clone(),
                    outcome: plan.outcome.clone(),
                    success_criteria: plan.success_criteria.clone(),
                    tag_ids: vec![tag.id.clone()],
                },
            },
        )
        .unwrap();
        assert_eq!(get(&conn, &plan.id).unwrap().tags.len(), 1);

        crate::tag::repository::archive(
            &conn,
            crate::tag::dto::MutateTagInput {
                tag_id: tag.id.clone(),
                expected_revision: tag.revision,
            },
        )
        .unwrap();

        let hidden = get(&conn, &plan.id).unwrap();
        assert!(hidden.tags.is_empty());
        mutate(
            &mut conn,
            MutateFocusPlanInput {
                plan_id: plan.id.clone(),
                expected_revision: hidden.revision,
                operation_id: "op-update-after-tag-archive".into(),
                mutation: FocusPlanMutationAction::UpdatePlan {
                    title: "AI Foundations Updated".into(),
                    lifecycle: hidden.lifecycle,
                    priority: hidden.priority,
                    life_node_id: hidden.life_node_id,
                    start_date: hidden.start_date,
                    target_date: hidden.target_date,
                    outcome: hidden.outcome,
                    success_criteria: hidden.success_criteria,
                    tag_ids: Vec::new(),
                },
            },
        )
        .unwrap();

        let preserved_join_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_tags WHERE plan_id=?1 AND tag_id=?2",
                params![plan.id, tag.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(preserved_join_count, 1);
        assert_eq!(
            get(&conn, &plan.id).unwrap().title,
            "AI Foundations Updated"
        );
    }

    // ---- Task 37: linked work and manual reviews ----

    fn review_input(plan_id: &str, operation: &str, date: &str) -> CreateFocusPlanReviewInput {
        CreateFocusPlanReviewInput {
            plan_id: plan_id.into(),
            operation_id: operation.into(),
            reviewed_local_date: date.into(),
            reflection: "Momentum held through the week.".into(),
            next_focus: None,
        }
    }

    fn seeded_plan(conn: &mut Connection) -> String {
        create(conn, create_input("create-1")).unwrap().id
    }

    #[test]
    fn review_creation_is_validated_and_idempotent() {
        let mut conn = connection();
        let plan = seeded_plan(&mut conn);

        let first = create_review(&mut conn, review_input(&plan, "op-1", "2026-08-06")).unwrap();
        assert_eq!(first.reviewed_local_date, "2026-08-06");
        assert!(first.next_focus.is_none());

        // Retrying the same operation returns the stored review instead of duplicating.
        let replay = create_review(&mut conn, review_input(&plan, "op-1", "2026-08-07")).unwrap();
        assert_eq!(replay.id, first.id);
        assert_eq!(replay.reviewed_local_date, "2026-08-06");

        // A distinct operation on the same date is a distinct review.
        let same_date =
            create_review(&mut conn, review_input(&plan, "op-2", "2026-08-06")).unwrap();
        assert_ne!(same_date.id, first.id);

        let mut blank = review_input(&plan, "op-3", "2026-08-06");
        blank.reflection = "   \n\t ".into();
        assert!(matches!(
            create_review(&mut conn, blank),
            Err(FocusPlanError::Validation(_))
        ));

        let mut bad_date = review_input(&plan, "op-4", "06-08-2026");
        bad_date.next_focus = Some("Keep going".into());
        assert!(matches!(
            create_review(&mut conn, bad_date),
            Err(FocusPlanError::Validation(_))
        ));

        let mut too_long = review_input(&plan, "op-5", "2026-08-06");
        too_long.reflection = "x".repeat(MAX_REVIEW_REFLECTION + 1);
        assert!(matches!(
            create_review(&mut conn, too_long),
            Err(FocusPlanError::Validation(_))
        ));

        let mut with_focus = review_input(&plan, "op-6", "2026-08-08");
        with_focus.next_focus = Some("  Ship the migration  ".into());
        let saved = create_review(&mut conn, with_focus).unwrap();
        assert_eq!(saved.next_focus.as_deref(), Some("Ship the migration"));

        // Only op-1, op-2, and op-6 were committed.
        let history = list_reviews(
            &conn,
            &FocusPlanReviewListInput {
                plan_id: plan.clone(),
                limit: None,
            },
        )
        .unwrap();
        assert_eq!(history.review_count, 3);
    }

    #[test]
    fn review_history_is_newest_first_stable_and_bounded() {
        let mut conn = connection();
        let plan = seeded_plan(&mut conn);
        for (index, date) in ["2026-08-01", "2026-08-09", "2026-08-05", "2026-08-09"]
            .iter()
            .enumerate()
        {
            create_review(&mut conn, review_input(&plan, &format!("op-{index}"), date)).unwrap();
        }
        let history = list_reviews(
            &conn,
            &FocusPlanReviewListInput {
                plan_id: plan.clone(),
                limit: None,
            },
        )
        .unwrap();
        assert_eq!(history.review_count, 4);
        assert_eq!(
            history.latest_reviewed_local_date.as_deref(),
            Some("2026-08-09")
        );
        let dates: Vec<&str> = history
            .reviews
            .iter()
            .map(|review| review.reviewed_local_date.as_str())
            .collect();
        assert_eq!(
            dates,
            ["2026-08-09", "2026-08-09", "2026-08-05", "2026-08-01"]
        );
        // Same-date ordering is stable across repeated reads.
        let again = list_reviews(
            &conn,
            &FocusPlanReviewListInput {
                plan_id: plan.clone(),
                limit: None,
            },
        )
        .unwrap();
        let ids: Vec<&str> = history.reviews.iter().map(|r| r.id.as_str()).collect();
        let ids_again: Vec<&str> = again.reviews.iter().map(|r| r.id.as_str()).collect();
        assert_eq!(ids, ids_again);

        let bounded = list_reviews(
            &conn,
            &FocusPlanReviewListInput {
                plan_id: plan.clone(),
                limit: Some(2),
            },
        )
        .unwrap();
        assert_eq!(bounded.reviews.len(), 2);
        assert_eq!(bounded.review_count, 4, "count reports the whole history");

        // An out-of-range limit is clamped rather than trusted.
        let clamped = list_reviews(
            &conn,
            &FocusPlanReviewListInput {
                plan_id: plan,
                limit: Some(u32::MAX),
            },
        )
        .unwrap();
        assert_eq!(clamped.reviews.len(), 4);
    }

    #[test]
    fn creating_a_review_leaves_the_plan_untouched() {
        let mut conn = connection();
        let plan = seeded_plan(&mut conn);
        let before = get(&conn, &plan).unwrap();
        let revisions_before: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_revisions WHERE plan_id=?1",
                params![plan],
                |row| row.get(0),
            )
            .unwrap();

        create_review(&mut conn, review_input(&plan, "op-1", "2026-08-06")).unwrap();

        let after = get(&conn, &plan).unwrap();
        assert_eq!(before.revision, after.revision);
        assert_eq!(before.updated_at, after.updated_at);
        assert_eq!(before.lifecycle, after.lifecycle);
        assert_eq!(before.variants.len(), after.variants.len());
        assert_eq!(before.tags, after.tags);
        assert_eq!(before.recovery_draft, after.recovery_draft);
        let revisions_after: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_revisions WHERE plan_id=?1",
                params![plan],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(revisions_before, revisions_after);
    }

    #[test]
    fn reviews_reject_unknown_and_archived_plans() {
        let mut conn = connection();
        let plan = seeded_plan(&mut conn);
        assert!(matches!(
            create_review(
                &mut conn,
                review_input("missing-plan", "op-x", "2026-08-06")
            ),
            Err(FocusPlanError::NotFound)
        ));
        conn.execute(
            "UPDATE focus_plans SET archived_at='now' WHERE id=?1",
            params![plan],
        )
        .unwrap();
        assert!(matches!(
            create_review(&mut conn, review_input(&plan, "op-y", "2026-08-06")),
            Err(FocusPlanError::Validation(_))
        ));
    }

    #[test]
    fn reviews_and_links_survive_close_and_reopen() {
        let path = std::env::temp_dir().join(format!(
            "lw_task37_reviews_{}_{}.db",
            std::process::id(),
            uuid::Uuid::now_v7()
        ));
        let plan_id;
        {
            let mut conn =
                crate::infrastructure::sqlite::connection::open_file_connection(&path).unwrap();
            run_all_migrations(&mut conn).unwrap();
            plan_id = create(&mut conn, create_input("create-1")).unwrap().id;
            create_review(&mut conn, review_input(&plan_id, "op-1", "2026-08-06")).unwrap();
            conn.execute(
                "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at,focus_plan_id) VALUES('task-1','2026-08-06',600,660,'Linked','','general','medium','1','1',?1)",
                params![plan_id],
            )
            .unwrap();
        }
        {
            let mut conn =
                crate::infrastructure::sqlite::connection::open_file_connection(&path).unwrap();
            run_all_migrations(&mut conn).unwrap();
            let history = list_reviews(
                &conn,
                &FocusPlanReviewListInput {
                    plan_id: plan_id.clone(),
                    limit: None,
                },
            )
            .unwrap();
            assert_eq!(history.review_count, 1);
            assert_eq!(
                history.reviews[0].reflection,
                "Momentum held through the week."
            );
            let linked: Option<String> = conn
                .query_row(
                    "SELECT focus_plan_id FROM tasks WHERE id='task-1'",
                    [],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(linked.as_deref(), Some(plan_id.as_str()));
        }
        for suffix in ["", "-wal", "-shm"] {
            let _ = std::fs::remove_file(format!("{}{suffix}", path.display()));
        }
    }

    #[test]
    fn linked_work_projects_counts_and_survives_plan_archive() {
        let mut conn = connection();
        let plan = seeded_plan(&mut conn);
        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at,focus_plan_id) VALUES('task-1','2026-08-10',600,660,'Essay','','general','medium','1','1',?1)",
            params![plan],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at,focus_plan_id) VALUES('series-1','Weekly review','','general','medium',700,760,'2026-08-06','local','FREQ=WEEKLY;INTERVAL=1','1','1',?1)",
            params![plan],
        )
        .unwrap();

        let input = FocusPlanLinkedWorkInput {
            plan_id: plan.clone(),
            anchor_local_date: "2026-08-06".into(),
        };
        let work = linked_work(&conn, &input).unwrap();
        assert_eq!((work.one_off_count, work.series_count), (1, 1));
        assert_eq!(work.items.len(), 2);
        let series_item = work
            .items
            .iter()
            .find(|item| item.series_id.is_some())
            .expect("series is linked");
        assert_eq!(
            series_item.navigation_local_date, "2026-08-06",
            "a series navigates to its appropriate occurrence"
        );
        let one_off_item = work
            .items
            .iter()
            .find(|item| item.series_id.is_none())
            .expect("one-off is linked");
        assert_eq!(one_off_item.navigation_local_date, "2026-08-10");

        // Archiving the Plan must not unlink or hide the work.
        conn.execute(
            "UPDATE focus_plans SET archived_at='now' WHERE id=?1",
            params![plan],
        )
        .unwrap();
        let archived = linked_work(&conn, &input).unwrap();
        assert_eq!((archived.one_off_count, archived.series_count), (1, 1));

        assert!(matches!(
            linked_work(
                &conn,
                &FocusPlanLinkedWorkInput {
                    plan_id: "missing".into(),
                    anchor_local_date: "2026-08-06".into(),
                },
            ),
            Err(FocusPlanError::NotFound)
        ));
        assert!(matches!(
            linked_work(
                &conn,
                &FocusPlanLinkedWorkInput {
                    plan_id: plan,
                    anchor_local_date: "not-a-date".into(),
                },
            ),
            Err(FocusPlanError::Validation(_))
        ));
    }
}
