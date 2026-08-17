use std::collections::HashMap;

use rusqlite::Connection;

use super::{SearchError, normalize::normalize};

const MAX_LIFE_PATH_DEPTH: usize = 32;

#[derive(Debug)]
struct LifeEntry {
    parent_id: Option<String>,
    title: String,
}

#[derive(Debug)]
struct SearchablePlan {
    id: String,
    title: String,
    lifecycle: String,
    start_date: Option<String>,
    target_date: Option<String>,
    life_node_id: Option<String>,
    life_title: Option<String>,
    outcome: String,
    success_criteria_json: String,
    updated_at: String,
    variant_label: String,
    variant_plain_text: String,
    phase_titles: String,
    tag_names: String,
    tag_normalized_names: String,
    tag_aliases: String,
}

pub(crate) fn rebuild_focus_plans_scope(conn: &Connection) -> Result<(), SearchError> {
    conn.execute_batch("SAVEPOINT rebuild_focus_plans")
        .map_err(|_| SearchError::Storage)?;
    let result = rebuild_focus_plans_scope_inner(conn);
    if result.is_err() {
        let _ = conn.execute_batch("ROLLBACK TO SAVEPOINT rebuild_focus_plans");
    }
    conn.execute_batch("RELEASE SAVEPOINT rebuild_focus_plans")
        .map_err(|_| SearchError::Storage)?;
    result
}

fn rebuild_focus_plans_scope_inner(conn: &Connection) -> Result<(), SearchError> {
    conn.execute_batch("DELETE FROM search_documents WHERE entity_kind='focus_plan'")
        .map_err(|_| SearchError::Storage)?;

    let life = load_life_map(conn)?;
    let plans = load_plans(conn)?;
    let mut insert = conn
        .prepare(
            "INSERT OR REPLACE INTO search_documents
             (entity_kind,entity_id,navigation_id,title,context_text,body_text,
              normalized_title,normalized_context,normalized_body,
              local_date,original_local_date,source_updated_at)
             VALUES('focus_plan',?1,?1,?2,?3,?4,?5,?6,?7,NULL,NULL,?8)",
        )
        .map_err(|_| SearchError::Storage)?;

    for plan in plans {
        let life_path = plan
            .life_node_id
            .as_deref()
            .map(|id| build_life_path(id, &life))
            .filter(|value| !value.is_empty())
            .or(plan.life_title.clone())
            .unwrap_or_default();
        let date_range = match (&plan.start_date, &plan.target_date) {
            (Some(start), Some(target)) => format!("{start} — {target}"),
            (Some(start), None) => format!("From {start}"),
            (None, Some(target)) => format!("Target {target}"),
            (None, None) => String::new(),
        };
        let mut visible_context = vec![plan.lifecycle.clone()];
        if !date_range.is_empty() {
            visible_context.push(date_range);
        }
        if !life_path.is_empty() {
            visible_context.push(life_path);
        }
        if !plan.tag_names.is_empty() {
            visible_context.push(format!("Tags: {}", plan.tag_names));
        }
        let context = visible_context.join(" · ");
        let body = [
            plan.outcome.as_str(),
            plan.success_criteria_json.as_str(),
            plan.variant_label.as_str(),
            plan.variant_plain_text.as_str(),
            plan.phase_titles.as_str(),
        ]
        .join(" ");
        let normalized_tag_context = [
            plan.tag_normalized_names.as_str(),
            plan.tag_aliases.as_str(),
        ]
        .join(" ");
        let normalized_context = if normalized_tag_context.trim().is_empty() {
            normalize(&context)
        } else {
            format!("{} {}", normalize(&context), normalized_tag_context.trim())
        };
        insert
            .execute(rusqlite::params![
                plan.id,
                plan.title,
                context,
                body,
                normalize(&plan.title),
                normalized_context,
                normalize(&body),
                plan.updated_at,
            ])
            .map_err(|_| SearchError::Storage)?;
    }
    Ok(())
}

fn load_life_map(conn: &Connection) -> Result<HashMap<String, LifeEntry>, SearchError> {
    let mut statement = conn
        .prepare("SELECT id,parent_id,title FROM life_nodes WHERE archived_at IS NULL")
        .map_err(|_| SearchError::Storage)?;
    statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                LifeEntry {
                    parent_id: row.get(1)?,
                    title: row.get(2)?,
                },
            ))
        })
        .map_err(|_| SearchError::Storage)?
        .collect::<Result<HashMap<_, _>, _>>()
        .map_err(|_| SearchError::Storage)
}

fn build_life_path(node_id: &str, map: &HashMap<String, LifeEntry>) -> String {
    let mut path = Vec::new();
    let mut current = Some(node_id);
    let mut depth = 0;
    while let Some(id) = current {
        if depth >= MAX_LIFE_PATH_DEPTH {
            break;
        }
        let Some(entry) = map.get(id) else {
            break;
        };
        if id != "life-root" {
            path.push(entry.title.clone());
        }
        current = entry.parent_id.as_deref();
        depth += 1;
    }
    path.reverse();
    path.join(" › ")
}

fn load_plans(conn: &Connection) -> Result<Vec<SearchablePlan>, SearchError> {
    let mut statement = conn
        .prepare(
            "WITH phase_context AS (
                SELECT variant_id,group_concat(title,' ') AS titles
                FROM focus_plan_phases
                WHERE archived_at IS NULL
                GROUP BY variant_id
             ), tag_context AS (
                SELECT fpt.plan_id,
                       group_concat(t.name,', ') AS names,
                       group_concat(t.normalized_name,' ') AS normalized_names
                FROM focus_plan_tags fpt
                JOIN tags t ON t.id=fpt.tag_id
                WHERE t.archived_at IS NULL AND t.merged_into_tag_id IS NULL
                GROUP BY fpt.plan_id
             ), alias_context AS (
                SELECT fpt.plan_id,group_concat(alias.normalized_name,' ') AS aliases
                FROM focus_plan_tags fpt
                JOIN tags canonical ON canonical.id=fpt.tag_id
                JOIN tags alias ON alias.merged_into_tag_id=canonical.id
                WHERE canonical.archived_at IS NULL
                  AND canonical.merged_into_tag_id IS NULL
                GROUP BY fpt.plan_id
             )
             SELECT p.id,p.title,p.lifecycle,p.start_date,p.target_date,
                    p.life_node_id,ln.title,p.outcome,p.success_criteria_json,
                    p.updated_at,v.label,v.plain_text,COALESCE(pc.titles,''),
                    COALESCE(tc.names,''),COALESCE(tc.normalized_names,''),
                    COALESCE(ac.aliases,'')
             FROM focus_plans p
             JOIN focus_plan_variants v
               ON v.id=p.selected_variant_id AND v.archived_at IS NULL
             LEFT JOIN phase_context pc ON pc.variant_id=v.id
             LEFT JOIN life_nodes ln ON ln.id=p.life_node_id AND ln.archived_at IS NULL
             LEFT JOIN tag_context tc ON tc.plan_id=p.id
             LEFT JOIN alias_context ac ON ac.plan_id=p.id
             WHERE p.archived_at IS NULL
             ORDER BY p.updated_at DESC,p.id",
        )
        .map_err(|_| SearchError::Storage)?;
    statement
        .query_map([], |row| {
            Ok(SearchablePlan {
                id: row.get(0)?,
                title: row.get(1)?,
                lifecycle: row.get(2)?,
                start_date: row.get(3)?,
                target_date: row.get(4)?,
                life_node_id: row.get(5)?,
                life_title: row.get(6)?,
                outcome: row.get(7)?,
                success_criteria_json: row.get(8)?,
                updated_at: row.get(9)?,
                variant_label: row.get(10)?,
                variant_plain_text: row.get(11)?,
                phase_titles: row.get(12)?,
                tag_names: row.get(13)?,
                tag_normalized_names: row.get(14)?,
                tag_aliases: row.get(15)?,
            })
        })
        .map_err(|_| SearchError::Storage)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| SearchError::Storage)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        focus_plan::{dto::CreateFocusPlanInput, repository as focus_plan_repository},
        infrastructure::sqlite::{
            connection::open_memory_connection, task56_migration::run_all_migrations,
        },
    };

    #[test]
    fn rebuild_indexes_plan_context_without_reader_rows() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        let plan = focus_plan_repository::create(
            &mut conn,
            CreateFocusPlanInput {
                priority: crate::focus_plan::dto::FocusPlanPriority::Normal,
                title: "AI Foundations".into(),
                life_node_id: None,
                start_date: Some("2026-08-15".into()),
                target_date: Some("2026-12-20".into()),
                outcome: "Build a reliable machine learning foundation".into(),
                success_criteria: vec!["Complete the core sequence".into()],
                initial_variant_label: "Textbook first".into(),
                operation_id: "search-create".into(),
            },
        )
        .unwrap();
        rebuild_focus_plans_scope(&conn).unwrap();
        let indexed: (String, String, String) = conn
            .query_row(
                "SELECT entity_kind,title,body_text FROM search_documents WHERE entity_id=?1",
                [&plan.id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        assert_eq!(indexed.0, "focus_plan");
        assert_eq!(indexed.1, "AI Foundations");
        assert!(indexed.2.contains("machine learning"));
        let reader_rows: i64 = conn
            .query_row("SELECT COUNT(*) FROM reader_documents", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(reader_rows, 0);
    }

    #[test]
    fn archived_plan_is_removed_from_search_projection() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        let plan = focus_plan_repository::create(
            &mut conn,
            CreateFocusPlanInput {
                priority: crate::focus_plan::dto::FocusPlanPriority::Normal,
                title: "Temporary Strategy".into(),
                life_node_id: None,
                start_date: None,
                target_date: None,
                outcome: "Should disappear".into(),
                success_criteria: vec!["Archive it".into()],
                initial_variant_label: "Only variant".into(),
                operation_id: "search-archive-create".into(),
            },
        )
        .unwrap();
        rebuild_focus_plans_scope(&conn).unwrap();
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM search_documents WHERE entity_id=?1",
                [&plan.id],
                |row| row.get(0),
            )
            .unwrap(),
            1
        );
        conn.execute(
            "UPDATE focus_plans SET archived_at='now' WHERE id=?1",
            [&plan.id],
        )
        .unwrap();
        rebuild_focus_plans_scope(&conn).unwrap();
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM search_documents WHERE entity_id=?1",
                [&plan.id],
                |row| row.get(0),
            )
            .unwrap(),
            0
        );
    }
}
