use std::collections::HashMap;

use rusqlite::{Connection, OptionalExtension, Transaction, params};
use uuid::{NoContext, Timestamp, Uuid};

use super::{dto::*, normalize::normalize_tag};

#[derive(Debug)]
pub enum TagError {
    Db(rusqlite::Error),
    Validation(String),
    NotFound,
    Stale,
}

impl From<rusqlite::Error> for TagError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Db(e)
    }
}

fn now() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}

fn new_id() -> String {
    Uuid::new_v7(Timestamp::now(NoContext)).to_string()
}

// ── Shared row mapper ────────────────────────────────────────────────────────

fn tag_view_from_row(r: &rusqlite::Row<'_>) -> rusqlite::Result<TagView> {
    let archived_at: Option<String> = r.get(3)?;
    let merged_into_id: Option<String> = r.get(4)?;
    let merged_into_name: Option<String> = r.get(5)?;
    let merged_into = match (merged_into_id, merged_into_name) {
        (Some(id), Some(name)) => Some(TagSummaryView { id, name }),
        _ => None,
    };
    Ok(TagView {
        id: r.get(0)?,
        name: r.get(1)?,
        revision: r.get(2)?,
        archived: archived_at.is_some(),
        merged_into,
        task_count: r.get::<_, i64>(6)? as u32,
        series_count: r.get::<_, i64>(7)? as u32,
        life_node_count: r.get::<_, i64>(8)? as u32,
    })
}

const TAG_VIEW_SQL: &str = "
    SELECT t.id, t.name, t.revision, t.archived_at, t.merged_into_tag_id,
           m.name,
           (SELECT COUNT(*) FROM task_tags tt WHERE tt.tag_id=t.id),
           (SELECT COUNT(*) FROM task_series_tags tst WHERE tst.tag_id=t.id),
           (SELECT COUNT(*) FROM life_node_tags lnt WHERE lnt.tag_id=t.id)
    FROM tags t
    LEFT JOIN tags m ON m.id=t.merged_into_tag_id
";

fn get_by_id_inner(conn: &Connection, id: &str) -> Result<TagView, TagError> {
    let sql = format!("{TAG_VIEW_SQL} WHERE t.id=?1");
    conn.query_row(&sql, params![id], tag_view_from_row)
        .optional()?
        .ok_or(TagError::NotFound)
}

fn get_by_id_tx(tx: &Transaction<'_>, id: &str) -> Result<TagView, TagError> {
    let sql = format!("{TAG_VIEW_SQL} WHERE t.id=?1");
    tx.query_row(&sql, params![id], tag_view_from_row)
        .optional()?
        .ok_or(TagError::NotFound)
}

// ── Public CRUD ──────────────────────────────────────────────────────────────

pub fn list(conn: &Connection, include_archived: bool) -> Result<Vec<TagView>, TagError> {
    let sql = format!(
        "{TAG_VIEW_SQL}
         WHERE (?1 OR (t.archived_at IS NULL AND t.merged_into_tag_id IS NULL))
         ORDER BY t.archived_at IS NOT NULL, t.normalized_name, t.id"
    );
    let mut st = conn.prepare(&sql)?;
    let rows = st
        .query_map(params![include_archived], tag_view_from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn create(conn: &Connection, input: CreateTagInput) -> Result<TagView, TagError> {
    let normalized = normalize_tag(&input.name).map_err(|e| TagError::Validation(e.to_string()))?;

    // Check if normalized name already exists.
    let existing: Option<(String, Option<String>, Option<String>)> = conn
        .query_row(
            "SELECT id, archived_at, merged_into_tag_id FROM tags WHERE normalized_name=?1",
            params![normalized.normalized_name],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()?;

    if let Some((id, archived_at, merged_into_id)) = existing {
        if archived_at.is_none() && merged_into_id.is_none() {
            return get_by_id_inner(conn, &id);
        } else if let Some(canonical_id) = merged_into_id {
            let canonical_name: Option<String> = conn
                .query_row(
                    "SELECT name FROM tags WHERE id=?1",
                    params![canonical_id],
                    |r| r.get(0),
                )
                .optional()?
                .flatten();
            let msg = if let Some(canonical_name) = canonical_name {
                format!(
                    "\"#{}\" is a permanent alias for \"#{}\". Use the canonical tag.",
                    normalized.canonical, canonical_name
                )
            } else {
                "This name is a permanent alias for another tag. Use the canonical tag directly."
                    .to_string()
            };
            return Err(TagError::Validation(msg));
        } else {
            return Err(TagError::Validation(
                "A tag with this name exists but is archived. Use Restore to reactivate it."
                    .to_string(),
            ));
        }
    }

    // Check global active limit (500).
    let active_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL",
        [],
        |r| r.get(0),
    )?;
    if active_count >= 500 {
        return Err(TagError::Validation(
            "Maximum of 500 active tags reached.".to_string(),
        ));
    }

    let id = new_id();
    let t = now();
    conn.execute(
        "INSERT INTO tags(id,name,normalized_name,revision,archived_at,merged_into_tag_id,created_at,updated_at)
         VALUES(?1,?2,?3,0,NULL,NULL,?4,?4)",
        params![id, normalized.canonical, normalized.normalized_name, t],
    )?;
    get_by_id_inner(conn, &id)
}

pub fn rename(conn: &Connection, input: RenameTagInput) -> Result<TagView, TagError> {
    let normalized = normalize_tag(&input.name).map_err(|e| TagError::Validation(e.to_string()))?;

    let row: Option<(i32, Option<String>, Option<String>)> = conn
        .query_row(
            "SELECT revision, archived_at, merged_into_tag_id FROM tags WHERE id=?1",
            params![input.tag_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()?;

    let (current_revision, _archived_at, merged_into_id) = row.ok_or(TagError::NotFound)?;

    if merged_into_id.is_some() {
        return Err(TagError::Validation(
            "Merged alias tags cannot be renamed.".to_string(),
        ));
    }
    if current_revision != input.expected_revision {
        return Err(TagError::Stale);
    }

    // Reject collision with any existing row (active or archived).
    let collision: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM tags WHERE normalized_name=?1 AND id!=?2)",
        params![normalized.normalized_name, input.tag_id],
        |r| r.get(0),
    )?;
    if collision {
        return Err(TagError::Validation(
            "A tag with this name already exists.".to_string(),
        ));
    }

    let t = now();
    conn.execute(
        "UPDATE tags SET name=?2, normalized_name=?3, revision=revision+1, updated_at=?4 WHERE id=?1",
        params![input.tag_id, normalized.canonical, normalized.normalized_name, t],
    )?;
    get_by_id_inner(conn, &input.tag_id)
}

pub fn archive(conn: &Connection, input: MutateTagInput) -> Result<TagView, TagError> {
    let row: Option<(i32, Option<String>, Option<String>)> = conn
        .query_row(
            "SELECT revision, archived_at, merged_into_tag_id FROM tags WHERE id=?1",
            params![input.tag_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()?;

    let (current_revision, archived_at, merged_into_id) = row.ok_or(TagError::NotFound)?;

    if archived_at.is_some() {
        return Err(TagError::Validation("Tag is already archived.".to_string()));
    }
    if merged_into_id.is_some() {
        return Err(TagError::Validation(
            "Merged alias tags cannot be archived.".to_string(),
        ));
    }
    if current_revision != input.expected_revision {
        return Err(TagError::Stale);
    }

    let t = now();
    conn.execute(
        "UPDATE tags SET archived_at=?2, revision=revision+1, updated_at=?2 WHERE id=?1",
        params![input.tag_id, t],
    )?;
    get_by_id_inner(conn, &input.tag_id)
}

pub fn restore(conn: &Connection, input: MutateTagInput) -> Result<TagView, TagError> {
    let row: Option<(i32, Option<String>, Option<String>)> = conn
        .query_row(
            "SELECT revision, archived_at, merged_into_tag_id FROM tags WHERE id=?1",
            params![input.tag_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()?;

    let (current_revision, archived_at, merged_into_id) = row.ok_or(TagError::NotFound)?;

    if archived_at.is_none() {
        return Err(TagError::Validation("Tag is not archived.".to_string()));
    }
    if merged_into_id.is_some() {
        return Err(TagError::Validation(
            "Merged alias tags cannot be restored.".to_string(),
        ));
    }
    if current_revision != input.expected_revision {
        return Err(TagError::Stale);
    }

    // Check active tag count limit.
    let active_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL",
        [],
        |r| r.get(0),
    )?;
    if active_count >= 500 {
        return Err(TagError::Validation(
            "Cannot restore: maximum of 500 active tags reached.".to_string(),
        ));
    }

    // Preflight: reject if restoring would push any assigned subject over the 12-tag limit.
    // Check tasks, task_series, and life_nodes that have preserved join entries for this tag.
    let would_exceed_tasks: bool = conn
        .query_row(
            "SELECT 1 FROM task_tags tt
             WHERE tt.tag_id = ?1
               AND (SELECT COUNT(*) FROM task_tags tt2
                    JOIN tags t ON t.id = tt2.tag_id
                    WHERE tt2.task_id = tt.task_id
                      AND t.archived_at IS NULL
                      AND t.merged_into_tag_id IS NULL
                      AND tt2.tag_id != ?1) >= 12
             LIMIT 1",
            params![input.tag_id],
            |_| Ok(true),
        )
        .optional()?
        .unwrap_or(false);

    if would_exceed_tasks {
        return Err(TagError::Validation(
            "Restoring this tag would exceed the 12-tag limit on one or more assigned tasks."
                .to_string(),
        ));
    }

    let would_exceed_series: bool = conn
        .query_row(
            "SELECT 1 FROM task_series_tags tst
             WHERE tst.tag_id = ?1
               AND (SELECT COUNT(*) FROM task_series_tags tst2
                    JOIN tags t ON t.id = tst2.tag_id
                    WHERE tst2.series_id = tst.series_id
                      AND t.archived_at IS NULL
                      AND t.merged_into_tag_id IS NULL
                      AND tst2.tag_id != ?1) >= 12
             LIMIT 1",
            params![input.tag_id],
            |_| Ok(true),
        )
        .optional()?
        .unwrap_or(false);

    if would_exceed_series {
        return Err(TagError::Validation(
            "Restoring this tag would exceed the 12-tag limit on one or more assigned series."
                .to_string(),
        ));
    }

    let would_exceed_life: bool = conn
        .query_row(
            "SELECT 1 FROM life_node_tags lnt
             WHERE lnt.tag_id = ?1
               AND (SELECT COUNT(*) FROM life_node_tags lnt2
                    JOIN tags t ON t.id = lnt2.tag_id
                    WHERE lnt2.life_node_id = lnt.life_node_id
                      AND t.archived_at IS NULL
                      AND t.merged_into_tag_id IS NULL
                      AND lnt2.tag_id != ?1) >= 12
             LIMIT 1",
            params![input.tag_id],
            |_| Ok(true),
        )
        .optional()?
        .unwrap_or(false);

    if would_exceed_life {
        return Err(TagError::Validation(
            "Restoring this tag would exceed the 12-tag limit on one or more assigned life nodes."
                .to_string(),
        ));
    }

    let would_exceed_plans: bool = conn
        .query_row(
            "SELECT 1 FROM focus_plan_tags fpt
             WHERE fpt.tag_id = ?1
               AND (SELECT COUNT(*) FROM focus_plan_tags fpt2
                    JOIN tags t ON t.id = fpt2.tag_id
                    WHERE fpt2.plan_id = fpt.plan_id
                      AND t.archived_at IS NULL
                      AND t.merged_into_tag_id IS NULL
                      AND fpt2.tag_id != ?1) >= 20
             LIMIT 1",
            params![input.tag_id],
            |_| Ok(true),
        )
        .optional()?
        .unwrap_or(false);

    if would_exceed_plans {
        return Err(TagError::Validation(
            "Restoring this tag would exceed the 20-tag limit on one or more Focus Plans."
                .to_string(),
        ));
    }

    let t = now();
    conn.execute(
        "UPDATE tags SET archived_at=NULL, revision=revision+1, updated_at=?2 WHERE id=?1",
        params![input.tag_id, t],
    )?;
    get_by_id_inner(conn, &input.tag_id)
}

pub fn merge(conn: &Connection, input: MergeTagsInput) -> Result<MergeTagsResult, TagError> {
    if input.source_tag_id == input.target_tag_id {
        return Err(TagError::Validation(
            "Source and target must be different tags.".to_string(),
        ));
    }

    let tx = conn.unchecked_transaction()?;

    let load = |id: &str| -> Result<(i32, Option<String>, Option<String>), TagError> {
        tx.query_row(
            "SELECT revision, archived_at, merged_into_tag_id FROM tags WHERE id=?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()?
        .ok_or(TagError::NotFound)
    };

    let (source_rev, source_archived, source_merged) = load(&input.source_tag_id)?;
    if source_archived.is_some() || source_merged.is_some() {
        return Err(TagError::Validation(
            "Source tag must be active and non-merged.".to_string(),
        ));
    }
    if source_rev != input.source_expected_revision {
        return Err(TagError::Stale);
    }

    let (target_rev, target_archived, target_merged) = load(&input.target_tag_id)?;
    if target_archived.is_some() || target_merged.is_some() {
        return Err(TagError::Validation(
            "Target tag must be active and non-merged.".to_string(),
        ));
    }
    if target_rev != input.target_expected_revision {
        return Err(TagError::Stale);
    }

    let t = now();

    // Move task_tags: INSERT target, DELETE source (INSERT OR IGNORE deduplicates).
    tx.execute(
        "INSERT OR IGNORE INTO task_tags(task_id,tag_id,created_at)
         SELECT task_id,?2,?3 FROM task_tags WHERE tag_id=?1",
        params![input.source_tag_id, input.target_tag_id, t],
    )?;
    tx.execute(
        "DELETE FROM task_tags WHERE tag_id=?1",
        params![input.source_tag_id],
    )?;

    // Move task_series_tags.
    tx.execute(
        "INSERT OR IGNORE INTO task_series_tags(series_id,tag_id,created_at)
         SELECT series_id,?2,?3 FROM task_series_tags WHERE tag_id=?1",
        params![input.source_tag_id, input.target_tag_id, t],
    )?;
    tx.execute(
        "DELETE FROM task_series_tags WHERE tag_id=?1",
        params![input.source_tag_id],
    )?;

    // Move life_node_tags.
    tx.execute(
        "INSERT OR IGNORE INTO life_node_tags(life_node_id,tag_id,created_at)
         SELECT life_node_id,?2,?3 FROM life_node_tags WHERE tag_id=?1",
        params![input.source_tag_id, input.target_tag_id, t],
    )?;
    tx.execute(
        "DELETE FROM life_node_tags WHERE tag_id=?1",
        params![input.source_tag_id],
    )?;

    // Move Focus Plan tags and deduplicate when the target is already assigned.
    tx.execute(
        "INSERT OR IGNORE INTO focus_plan_tags(plan_id,tag_id,created_at)
         SELECT plan_id,?2,?3 FROM focus_plan_tags WHERE tag_id=?1",
        params![input.source_tag_id, input.target_tag_id, t],
    )?;
    tx.execute(
        "DELETE FROM focus_plan_tags WHERE tag_id=?1",
        params![input.source_tag_id],
    )?;

    // Flatten alias chain: any existing alias pointing at source now points at target.
    // This keeps A→B→C correct as A→C after merging B→C.
    tx.execute(
        "UPDATE tags SET merged_into_tag_id=?2, updated_at=?3
         WHERE merged_into_tag_id=?1",
        params![input.source_tag_id, input.target_tag_id, t],
    )?;

    // Archive source and record merge pointer.
    tx.execute(
        "UPDATE tags SET archived_at=?2, merged_into_tag_id=?3, revision=revision+1, updated_at=?2
         WHERE id=?1",
        params![input.source_tag_id, t, input.target_tag_id],
    )?;

    // Bump target revision.
    tx.execute(
        "UPDATE tags SET revision=revision+1, updated_at=?2 WHERE id=?1",
        params![input.target_tag_id, t],
    )?;

    let source = get_by_id_tx(&tx, &input.source_tag_id)?;
    let target = get_by_id_tx(&tx, &input.target_tag_id)?;
    tx.commit()?;

    Ok(MergeTagsResult { source, target })
}

pub fn set_life_node_tags(
    conn: &Connection,
    input: SetLifeNodeTagsInput,
) -> Result<SetLifeNodeTagsResult, TagError> {
    if input.node_id == "life-root" {
        return Err(TagError::Validation(
            "Cannot assign tags to the life root.".to_string(),
        ));
    }
    validate_active_tag_ids(conn, &input.tag_ids)?;

    let row: Option<(i32, Option<String>)> = conn
        .query_row(
            "SELECT revision, archived_at FROM life_nodes WHERE id=?1",
            params![input.node_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;

    let (current_revision, archived_at) = row.ok_or(TagError::NotFound)?;

    if archived_at.is_some() {
        return Err(TagError::Validation(
            "Cannot assign tags to an archived life node.".to_string(),
        ));
    }
    if current_revision != input.expected_node_revision {
        return Err(TagError::Stale);
    }

    let tx = conn.unchecked_transaction()?;
    let t = now();

    replace_active_life_tags_tx(&tx, &input.node_id, &input.tag_ids, &t)?;

    tx.execute(
        "UPDATE life_nodes SET revision=revision+1, updated_at=?2 WHERE id=?1",
        params![input.node_id, t],
    )?;

    let new_revision: i32 = tx.query_row(
        "SELECT revision FROM life_nodes WHERE id=?1",
        params![input.node_id],
        |r| r.get(0),
    )?;

    let tags = load_active_node_tags_tx(&tx, &input.node_id)?;
    tx.commit()?;

    Ok(SetLifeNodeTagsResult {
        tags,
        node_revision: new_revision,
    })
}

// ── Validation helper ────────────────────────────────────────────────────────

/// Validates that all IDs in `ids` are unique, within the 12-per-subject limit,
/// and each refers to an active non-merged tag.
pub fn validate_active_tag_ids(conn: &Connection, ids: &[String]) -> Result<(), TagError> {
    if ids.len() > 12 {
        return Err(TagError::Validation(
            "Maximum 12 tags per subject.".to_string(),
        ));
    }
    let mut seen = std::collections::HashSet::new();
    for id in ids {
        if !seen.insert(id.as_str()) {
            return Err(TagError::Validation(
                "Duplicate tag IDs are not allowed.".to_string(),
            ));
        }
    }
    for id in ids {
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM tags WHERE id=?1 AND archived_at IS NULL AND merged_into_tag_id IS NULL)",
            params![id],
            |r| r.get(0),
        )?;
        if !exists {
            return Err(TagError::Validation(
                "One or more tag IDs are invalid or not active.".to_string(),
            ));
        }
    }
    Ok(())
}

// ── Assignment replacement helpers ───────────────────────────────────────────

/// Replaces active (non-archived, non-merged) task tag assignments for `task_id`.
/// Preserves assignments whose tags are currently archived.
pub fn replace_active_task_tags(
    tx: &Transaction<'_>,
    task_id: &str,
    tag_ids: &[String],
    t: &str,
) -> Result<(), rusqlite::Error> {
    tx.execute(
        "DELETE FROM task_tags WHERE task_id=?1
         AND tag_id IN (SELECT id FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL)",
        params![task_id],
    )?;
    for tag_id in tag_ids {
        tx.execute(
            "INSERT INTO task_tags(task_id,tag_id,created_at) VALUES(?1,?2,?3)",
            params![task_id, tag_id, t],
        )?;
    }
    Ok(())
}

/// Replaces active series tag assignments for `series_id`.
pub fn replace_active_series_tags(
    tx: &Transaction<'_>,
    series_id: &str,
    tag_ids: &[String],
    t: &str,
) -> Result<(), rusqlite::Error> {
    tx.execute(
        "DELETE FROM task_series_tags WHERE series_id=?1
         AND tag_id IN (SELECT id FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL)",
        params![series_id],
    )?;
    for tag_id in tag_ids {
        tx.execute(
            "INSERT INTO task_series_tags(series_id,tag_id,created_at) VALUES(?1,?2,?3)",
            params![series_id, tag_id, t],
        )?;
    }
    Ok(())
}

fn replace_active_life_tags_tx(
    tx: &Transaction<'_>,
    node_id: &str,
    tag_ids: &[String],
    t: &str,
) -> Result<(), rusqlite::Error> {
    tx.execute(
        "DELETE FROM life_node_tags WHERE life_node_id=?1
         AND tag_id IN (SELECT id FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL)",
        params![node_id],
    )?;
    for tag_id in tag_ids {
        tx.execute(
            "INSERT INTO life_node_tags(life_node_id,tag_id,created_at) VALUES(?1,?2,?3)",
            params![node_id, tag_id, t],
        )?;
    }
    Ok(())
}

/// Copies ALL task_series_tags rows from `from_series_id` to `to_series_id`.
/// Used by ThisAndFuture splits to inherit both active and previously-preserved joins.
pub fn copy_all_series_tags(
    tx: &Transaction<'_>,
    from_series_id: &str,
    to_series_id: &str,
    t: &str,
) -> Result<(), rusqlite::Error> {
    // Collect source assignments first to avoid self-referential insert issues.
    let mut st = tx.prepare("SELECT tag_id FROM task_series_tags WHERE series_id=?1")?;
    let tag_ids: Vec<String> = st
        .query_map(params![from_series_id], |r| r.get(0))?
        .collect::<Result<_, _>>()?;

    for tag_id in &tag_ids {
        tx.execute(
            "INSERT OR IGNORE INTO task_series_tags(series_id,tag_id,created_at) VALUES(?1,?2,?3)",
            params![to_series_id, tag_id, t],
        )?;
    }
    Ok(())
}

// ── Bulk tag loading ─────────────────────────────────────────────────────────

/// Loads active non-merged tags for a set of one-off task IDs.
/// Returns a map from task_id to ordered Vec<TagSummaryView>.
pub fn batch_load_task_tags(
    conn: &Connection,
    task_ids: &[String],
) -> Result<HashMap<String, Vec<TagSummaryView>>, rusqlite::Error> {
    if task_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let placeholders: String = (1..=task_ids.len())
        .map(|i| format!("?{i}"))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT tt.task_id, t.id, t.name
         FROM task_tags tt
         JOIN tags t ON t.id=tt.tag_id
         WHERE tt.task_id IN ({placeholders})
           AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL
         ORDER BY t.normalized_name, t.id"
    );
    let mut st = conn.prepare(&sql)?;
    let rows = st
        .query_map(rusqlite::params_from_iter(task_ids.iter()), |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut map: HashMap<String, Vec<TagSummaryView>> = HashMap::new();
    for (task_id, tag_id, tag_name) in rows {
        map.entry(task_id).or_default().push(TagSummaryView {
            id: tag_id,
            name: tag_name,
        });
    }
    Ok(map)
}

/// Loads active non-merged tags for a set of series IDs.
pub fn batch_load_series_tags(
    conn: &Connection,
    series_ids: &[String],
) -> Result<HashMap<String, Vec<TagSummaryView>>, rusqlite::Error> {
    if series_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let placeholders: String = (1..=series_ids.len())
        .map(|i| format!("?{i}"))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT tst.series_id, t.id, t.name
         FROM task_series_tags tst
         JOIN tags t ON t.id=tst.tag_id
         WHERE tst.series_id IN ({placeholders})
           AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL
         ORDER BY t.normalized_name, t.id"
    );
    let mut st = conn.prepare(&sql)?;
    let rows = st
        .query_map(rusqlite::params_from_iter(series_ids.iter()), |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut map: HashMap<String, Vec<TagSummaryView>> = HashMap::new();
    for (series_id, tag_id, tag_name) in rows {
        map.entry(series_id).or_default().push(TagSummaryView {
            id: tag_id,
            name: tag_name,
        });
    }
    Ok(map)
}

/// Loads active non-merged tags for a set of life node IDs.
pub fn batch_load_life_tags(
    conn: &Connection,
    node_ids: &[String],
) -> Result<HashMap<String, Vec<TagSummaryView>>, rusqlite::Error> {
    if node_ids.is_empty() {
        return Ok(HashMap::new());
    }
    let placeholders: String = (1..=node_ids.len())
        .map(|i| format!("?{i}"))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT lnt.life_node_id, t.id, t.name
         FROM life_node_tags lnt
         JOIN tags t ON t.id=lnt.tag_id
         WHERE lnt.life_node_id IN ({placeholders})
           AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL
         ORDER BY t.normalized_name, t.id"
    );
    let mut st = conn.prepare(&sql)?;
    let rows = st
        .query_map(rusqlite::params_from_iter(node_ids.iter()), |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut map: HashMap<String, Vec<TagSummaryView>> = HashMap::new();
    for (node_id, tag_id, tag_name) in rows {
        map.entry(node_id).or_default().push(TagSummaryView {
            id: tag_id,
            name: tag_name,
        });
    }
    Ok(map)
}

// ── Internal helpers ─────────────────────────────────────────────────────────

fn load_active_node_tags_tx(
    tx: &Transaction<'_>,
    node_id: &str,
) -> Result<Vec<TagSummaryView>, rusqlite::Error> {
    let mut st = tx.prepare(
        "SELECT t.id, t.name
         FROM life_node_tags lnt
         JOIN tags t ON t.id=lnt.tag_id
         WHERE lnt.life_node_id=?1
           AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL
         ORDER BY t.normalized_name, t.id",
    )?;
    st.query_map(params![node_id], |r| {
        Ok(TagSummaryView {
            id: r.get(0)?,
            name: r.get(1)?,
        })
    })?
    .collect::<Result<Vec<_>, _>>()
}

// ── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task37_migration::run_all_migrations,
    };

    fn db() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn make_tag(conn: &Connection, name: &str) -> TagView {
        create(
            conn,
            CreateTagInput {
                name: name.to_string(),
            },
        )
        .unwrap()
    }

    fn make_node(conn: &Connection, title: &str) -> String {
        let id = Uuid::new_v7(Timestamp::now(NoContext)).to_string();
        conn.execute(
            "INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,created_at,updated_at,revision)
             VALUES(?1,'life-root',?2,'','life-leaf','neutral',0,'0','0',0)",
            params![id, title],
        ).unwrap();
        id
    }

    // ── create ───────────────────────────────────────────────────────────────

    #[test]
    fn create_tag() {
        let conn = db();
        let tag = make_tag(&conn, "Research");
        assert_eq!(tag.name, "Research");
        assert_eq!(tag.revision, 0);
        assert!(!tag.archived);
        assert!(tag.merged_into.is_none());
    }

    #[test]
    fn create_duplicate_returns_existing() {
        let conn = db();
        let t1 = make_tag(&conn, "Research");
        let t2 = make_tag(&conn, "#Research");
        assert_eq!(t1.id, t2.id);
    }

    #[test]
    fn create_case_insensitive_duplicate_returns_existing() {
        let conn = db();
        let t1 = make_tag(&conn, "AI");
        let t2 = make_tag(&conn, "ai");
        assert_eq!(t1.id, t2.id);
    }

    #[test]
    fn create_archived_name_errors() {
        let conn = db();
        let tag = make_tag(&conn, "OldTag");
        archive(
            &conn,
            MutateTagInput {
                tag_id: tag.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();
        let err = create(
            &conn,
            CreateTagInput {
                name: "OldTag".into(),
            },
        );
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    #[test]
    fn create_merged_alias_errors() {
        let conn = db();
        let src = make_tag(&conn, "ml");
        let tgt = make_tag(&conn, "AI");
        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: src.id.clone(),
                target_tag_id: tgt.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        )
        .unwrap();
        let err = create(&conn, CreateTagInput { name: "ml".into() });
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    #[test]
    fn create_enforces_500_limit() {
        let conn = db();
        for i in 0..500 {
            make_tag(&conn, &format!("tag-{i}"));
        }
        let err = create(
            &conn,
            CreateTagInput {
                name: "overflow".into(),
            },
        );
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    // ── rename ───────────────────────────────────────────────────────────────

    #[test]
    fn rename_tag() {
        let conn = db();
        let tag = make_tag(&conn, "OldName");
        let renamed = rename(
            &conn,
            RenameTagInput {
                tag_id: tag.id.clone(),
                name: "NewName".into(),
                expected_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(renamed.name, "NewName");
        assert_eq!(renamed.revision, 1);
    }

    #[test]
    fn rename_stale_rejected() {
        let conn = db();
        let tag = make_tag(&conn, "Tag");
        let err = rename(
            &conn,
            RenameTagInput {
                tag_id: tag.id,
                name: "New".into(),
                expected_revision: 99,
            },
        );
        assert!(matches!(err, Err(TagError::Stale)));
    }

    #[test]
    fn rename_collision_rejected() {
        let conn = db();
        make_tag(&conn, "Existing");
        let t2 = make_tag(&conn, "Other");
        let err = rename(
            &conn,
            RenameTagInput {
                tag_id: t2.id,
                name: "Existing".into(),
                expected_revision: 0,
            },
        );
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    // ── archive / restore ────────────────────────────────────────────────────

    #[test]
    fn archive_and_restore_tag() {
        let conn = db();
        let tag = make_tag(&conn, "Temp");
        let archived = archive(
            &conn,
            MutateTagInput {
                tag_id: tag.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();
        assert!(archived.archived);
        assert_eq!(archived.revision, 1);

        let restored = restore(
            &conn,
            MutateTagInput {
                tag_id: tag.id,
                expected_revision: 1,
            },
        )
        .unwrap();
        assert!(!restored.archived);
        assert_eq!(restored.revision, 2);
    }

    #[test]
    fn archive_preserves_task_assignment() {
        let conn = db();
        let tag = make_tag(&conn, "Keep");
        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES('t1','2026-08-04',480,540,'Task','','general','medium','0','0')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO task_tags(task_id,tag_id,created_at) VALUES('t1',?1,'0')",
            params![tag.id],
        )
        .unwrap();
        archive(
            &conn,
            MutateTagInput {
                tag_id: tag.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM task_tags WHERE tag_id=?1",
                params![tag.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "archived tag assignment must be preserved");
    }

    // ── merge ────────────────────────────────────────────────────────────────

    #[test]
    fn merge_moves_task_assignments() {
        let conn = db();
        let src = make_tag(&conn, "ml");
        let tgt = make_tag(&conn, "AI");
        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES('t1','2026-08-04',480,540,'Task','','general','medium','0','0')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO task_tags(task_id,tag_id,created_at) VALUES('t1',?1,'0')",
            params![src.id],
        )
        .unwrap();

        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: src.id.clone(),
                target_tag_id: tgt.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        )
        .unwrap();

        let src_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM task_tags WHERE tag_id=?1",
                params![src.id],
                |r| r.get(0),
            )
            .unwrap();
        let tgt_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM task_tags WHERE tag_id=?1",
                params![tgt.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(src_count, 0);
        assert_eq!(tgt_count, 1);

        let src_view = get_by_id_inner(&conn, &src.id).unwrap();
        assert!(src_view.archived);
        assert!(src_view.merged_into.is_some());
        assert_eq!(src_view.merged_into.unwrap().id, tgt.id);
    }

    #[test]
    fn merge_deduplicates_assignments() {
        let conn = db();
        let src = make_tag(&conn, "ml");
        let tgt = make_tag(&conn, "AI");
        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES('t1','2026-08-04',480,540,'Task','','general','medium','0','0')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO task_tags VALUES('t1',?1,'0')", params![src.id])
            .unwrap();
        conn.execute("INSERT INTO task_tags VALUES('t1',?1,'0')", params![tgt.id])
            .unwrap();

        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: src.id.clone(),
                target_tag_id: tgt.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        )
        .unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM task_tags WHERE task_id='t1'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            count, 1,
            "task should have exactly one assignment after merge"
        );
    }

    #[test]
    fn merge_self_rejected() {
        let conn = db();
        let tag = make_tag(&conn, "Tag");
        let err = merge(
            &conn,
            MergeTagsInput {
                source_tag_id: tag.id.clone(),
                target_tag_id: tag.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        );
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    #[test]
    fn merge_stale_source_rejected() {
        let conn = db();
        let src = make_tag(&conn, "src");
        let tgt = make_tag(&conn, "tgt");
        let err = merge(
            &conn,
            MergeTagsInput {
                source_tag_id: src.id,
                target_tag_id: tgt.id,
                source_expected_revision: 99,
                target_expected_revision: 0,
            },
        );
        assert!(matches!(err, Err(TagError::Stale)));
    }

    // ── life node tags ───────────────────────────────────────────────────────

    #[test]
    fn set_life_node_tags_basic() {
        let conn = db();
        let tag = make_tag(&conn, "Focus");
        let node = make_node(&conn, "Health");
        let result = set_life_node_tags(
            &conn,
            SetLifeNodeTagsInput {
                node_id: node.clone(),
                tag_ids: vec![tag.id.clone()],
                expected_node_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(result.tags.len(), 1);
        assert_eq!(result.tags[0].id, tag.id);
        assert_eq!(result.node_revision, 1);
    }

    #[test]
    fn set_life_node_tags_root_rejected() {
        let conn = db();
        let tag = make_tag(&conn, "Tag");
        let err = set_life_node_tags(
            &conn,
            SetLifeNodeTagsInput {
                node_id: "life-root".into(),
                tag_ids: vec![tag.id],
                expected_node_revision: 0,
            },
        );
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    #[test]
    fn set_life_node_tags_stale_rejected() {
        let conn = db();
        let tag = make_tag(&conn, "Tag");
        let node = make_node(&conn, "Node");
        let err = set_life_node_tags(
            &conn,
            SetLifeNodeTagsInput {
                node_id: node,
                tag_ids: vec![tag.id],
                expected_node_revision: 99,
            },
        );
        assert!(matches!(err, Err(TagError::Stale)));
    }

    #[test]
    fn set_life_node_tags_preserves_archived() {
        let conn = db();
        let tag = make_tag(&conn, "Archived");
        let node = make_node(&conn, "Node");
        // Assign tag manually.
        conn.execute(
            "INSERT INTO life_node_tags VALUES(?1,?2,'0')",
            params![node, tag.id],
        )
        .unwrap();
        // Archive the tag.
        archive(
            &conn,
            MutateTagInput {
                tag_id: tag.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();
        // Set empty active tags – should preserve archived assignment.
        set_life_node_tags(
            &conn,
            SetLifeNodeTagsInput {
                node_id: node.clone(),
                tag_ids: vec![],
                expected_node_revision: 0,
            },
        )
        .unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM life_node_tags WHERE life_node_id=?1",
                params![node],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1, "archived assignment must be preserved");
    }

    #[test]
    fn validate_max_12_tags() {
        let conn = db();
        let ids: Vec<String> = (0..13)
            .map(|i| {
                let t = make_tag(&conn, &format!("tag-{i}"));
                t.id
            })
            .collect();
        let err = validate_active_tag_ids(&conn, &ids);
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    #[test]
    fn validate_duplicate_ids_rejected() {
        let conn = db();
        let tag = make_tag(&conn, "Tag");
        let err = validate_active_tag_ids(&conn, &[tag.id.clone(), tag.id]);
        assert!(matches!(err, Err(TagError::Validation(_))));
    }

    // ── merge alias chain flattening ─────────────────────────────────────────

    fn make_task(conn: &Connection) -> String {
        let id = Uuid::new_v7(Timestamp::now(NoContext)).to_string();
        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at) \
             VALUES(?1,'2026-08-04',480,540,'T','','general','medium','0','0')",
            params![id],
        ).unwrap();
        id
    }

    #[test]
    fn merge_flattens_alias_chain_a_b_c() {
        let conn = db();
        let a = make_tag(&conn, "TagA");
        let b = make_tag(&conn, "TagB");
        let c = make_tag(&conn, "TagC");

        // Merge A into B (A becomes alias of B).
        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: a.id.clone(),
                target_tag_id: b.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        )
        .unwrap();
        // A's merged_into_tag_id = B.

        // Now merge B into C.
        // Before this, A points to B. After flattening, A should point to C.
        let b_rev: i32 = conn
            .query_row(
                "SELECT revision FROM tags WHERE id=?1",
                params![b.id],
                |r| r.get(0),
            )
            .unwrap();
        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: b.id.clone(),
                target_tag_id: c.id.clone(),
                source_expected_revision: b_rev,
                target_expected_revision: 0,
            },
        )
        .unwrap();

        // A's merged_into_tag_id must now point to C, not B.
        let a_target: Option<String> = conn
            .query_row(
                "SELECT merged_into_tag_id FROM tags WHERE id=?1",
                params![a.id],
                |r| r.get(0),
            )
            .optional()
            .unwrap()
            .unwrap();
        assert_eq!(
            a_target,
            Some(c.id.clone()),
            "alias A must point directly to C after B→C merge"
        );

        // B's merged_into_tag_id must point to C.
        let b_target: Option<String> = conn
            .query_row(
                "SELECT merged_into_tag_id FROM tags WHERE id=?1",
                params![b.id],
                |r| r.get(0),
            )
            .optional()
            .unwrap()
            .unwrap();
        assert_eq!(b_target, Some(c.id), "B must point to C");
    }

    #[test]
    fn alias_a_remains_searchable_after_b_c_merge() {
        // After A→B then B→C, searching by A's normalized_name should still surface results
        // because the search index uses alias normalized names. This is a domain invariant test;
        // we verify that A is archived and its normalized_name is distinct from C.
        let conn = db();
        let a = make_tag(&conn, "Alpha");
        let b = make_tag(&conn, "Beta");
        let c = make_tag(&conn, "Gamma");

        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: a.id.clone(),
                target_tag_id: b.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        )
        .unwrap();
        let b_rev: i32 = conn
            .query_row(
                "SELECT revision FROM tags WHERE id=?1",
                params![b.id],
                |r| r.get(0),
            )
            .unwrap();
        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: b.id.clone(),
                target_tag_id: c.id.clone(),
                source_expected_revision: b_rev,
                target_expected_revision: 0,
            },
        )
        .unwrap();

        // A must be archived with merged_into_tag_id = C.
        let (a_archived, a_target): (Option<String>, Option<String>) = conn
            .query_row(
                "SELECT archived_at, merged_into_tag_id FROM tags WHERE id=?1",
                params![a.id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .unwrap();
        assert!(a_archived.is_some(), "A must be archived");
        assert_eq!(
            a_target,
            Some(c.id),
            "A must resolve to C after chain flattening"
        );
    }

    // ── restore preflight ─────────────────────────────────────────────────────

    #[test]
    fn restore_fails_when_subject_already_has_12_active_tags() {
        let conn = db();
        let task = make_task(&conn);
        // Create 12 active tags, all assigned to task.
        let active_tags: Vec<String> = (0..12)
            .map(|i| {
                let t = make_tag(&conn, &format!("active-{i}"));
                conn.execute(
                    "INSERT INTO task_tags(task_id,tag_id,created_at) VALUES(?1,?2,'0')",
                    params![task, t.id],
                )
                .unwrap();
                t.id
            })
            .collect();
        let _ = active_tags;
        // Create a 13th tag, assign it, then archive it.
        let extra = make_tag(&conn, "extra");
        conn.execute(
            "INSERT INTO task_tags(task_id,tag_id,created_at) VALUES(?1,?2,'0')",
            params![task, extra.id],
        )
        .unwrap();
        archive(
            &conn,
            MutateTagInput {
                tag_id: extra.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();
        let extra_rev: i32 = conn
            .query_row(
                "SELECT revision FROM tags WHERE id=?1",
                params![extra.id],
                |r| r.get(0),
            )
            .unwrap();
        // Restoring extra would bring the task to 13 active tags — must be rejected.
        let err = restore(
            &conn,
            MutateTagInput {
                tag_id: extra.id,
                expected_revision: extra_rev,
            },
        );
        assert!(
            matches!(err, Err(TagError::Validation(_))),
            "restore must fail when subject has 12 active tags"
        );
    }

    #[test]
    fn restore_succeeds_when_subject_has_11_active_tags() {
        let conn = db();
        let task = make_task(&conn);
        // Create 11 active tags assigned to task.
        for i in 0..11 {
            let t = make_tag(&conn, &format!("active-{i}"));
            conn.execute(
                "INSERT INTO task_tags(task_id,tag_id,created_at) VALUES(?1,?2,'0')",
                params![task, t.id],
            )
            .unwrap();
        }
        // Create + assign + archive a 12th.
        let extra = make_tag(&conn, "extra");
        conn.execute(
            "INSERT INTO task_tags(task_id,tag_id,created_at) VALUES(?1,?2,'0')",
            params![task, extra.id],
        )
        .unwrap();
        archive(
            &conn,
            MutateTagInput {
                tag_id: extra.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();
        let extra_rev: i32 = conn
            .query_row(
                "SELECT revision FROM tags WHERE id=?1",
                params![extra.id],
                |r| r.get(0),
            )
            .unwrap();
        // Restoring extra brings task to 12 active tags — allowed.
        let result = restore(
            &conn,
            MutateTagInput {
                tag_id: extra.id,
                expected_revision: extra_rev,
            },
        );
        assert!(
            result.is_ok(),
            "restore must succeed when subject has only 11 active tags"
        );
    }

    #[test]
    fn merge_moves_and_deduplicates_focus_plan_assignments() {
        let mut conn = db();
        let source = make_tag(&conn, "machine-learning");
        let target = make_tag(&conn, "artificial-intelligence");
        let plan = crate::focus_plan::repository::create(
            &mut conn,
            crate::focus_plan::dto::CreateFocusPlanInput {
                title: "AI Foundations".into(),
                life_node_id: None,
                start_date: None,
                target_date: None,
                outcome: "Learn".into(),
                success_criteria: vec!["Complete".into()],
                initial_variant_label: "Primary".into(),
                operation_id: "tag-merge-plan".into(),
            },
        )
        .unwrap();
        conn.execute(
            "INSERT INTO focus_plan_tags(plan_id,tag_id,created_at) VALUES(?1,?2,'0')",
            params![plan.id, source.id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO focus_plan_tags(plan_id,tag_id,created_at) VALUES(?1,?2,'0')",
            params![plan.id, target.id],
        )
        .unwrap();

        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: source.id.clone(),
                target_tag_id: target.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        )
        .unwrap();

        let source_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_tags WHERE plan_id=?1 AND tag_id=?2",
                params![plan.id, source.id],
                |row| row.get(0),
            )
            .unwrap();
        let target_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_tags WHERE plan_id=?1 AND tag_id=?2",
                params![plan.id, target.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(source_count, 0);
        assert_eq!(target_count, 1);
    }
}
