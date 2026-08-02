use std::collections::HashMap;

use chrono::TimeZone;
use rrule::{RRuleSet, Tz};
use rusqlite::Connection;

use super::SearchError;
use super::dto::{
    GlobalSearchProjection, SearchEntityKind, SearchGlobalInput, SearchNavigationTarget,
    SearchResultGroup, SearchResultGroupKind, SearchResultView, SearchTextFragment,
};
use super::normalize::{build_fts_expression, normalize};

const MAX_RESULTS_PER_GROUP: usize = 8;
const MAX_FTS_RESULTS: usize = 100;
const MAX_SNIPPET_TOKENS: u32 = 6;
const MAX_BREADCRUMB_DEPTH: usize = 32;

// STX / ETX sentinels used in highlight() and snippet() FTS5 functions.
// Never forwarded as raw markup; parsed into SearchTextFragment arrays in Rust.
const SENTINEL_START: char = '\x02';
const SENTINEL_END: char = '\x03';

struct LifeNodeEntry {
    id: String,
    parent_id: Option<String>,
    title: String,
    short_description: String,
    archived_at: Option<String>,
    updated_at: String,
}

pub fn refresh_dirty_and_query(
    conn: &Connection,
    input: SearchGlobalInput,
) -> Result<GlobalSearchProjection, SearchError> {
    let dirty_scopes = load_dirty_scopes(conn)?;
    if !dirty_scopes.is_empty() {
        let has = |s: &str| dirty_scopes.iter().any(|d| d == s);
        let rebuild_all = has("all");
        let rebuild_tasks = rebuild_all || has("tasks");
        let rebuild_life = rebuild_all || has("life");
        let rebuild_docs = rebuild_all || has("documents");

        // Life nodes are needed for both life and documents scopes.
        let life_nodes: Option<Vec<LifeNodeEntry>> = if rebuild_life || rebuild_docs {
            Some(load_all_life_nodes(conn)?)
        } else {
            None
        };

        if rebuild_tasks {
            rebuild_tasks_scope(conn)?;
        }
        if rebuild_life {
            if let Some(ref nodes) = life_nodes {
                rebuild_life_scope(conn, nodes)?;
            }
        }
        if rebuild_docs {
            if let Some(ref nodes) = life_nodes {
                rebuild_documents_scope(conn, nodes)?;
            }
        }
        clear_dirty_scopes(conn)?;

        if rebuild_all {
            update_search_meta_rebuild(conn)?;
        }
    }

    let expr = match build_fts_expression(&input.query) {
        Some(e) => e,
        None => {
            return Ok(GlobalSearchProjection {
                groups: vec![],
                total_visible_results: 0,
            });
        }
    };

    run_fts_query(conn, &expr, &input.observed_local_date)
}

fn load_dirty_scopes(conn: &Connection) -> Result<Vec<String>, SearchError> {
    let mut stmt = conn
        .prepare("SELECT scope FROM search_dirty_scopes")
        .map_err(|_| SearchError::Storage)?;
    let scopes: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|_| SearchError::Storage)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(scopes)
}

fn clear_dirty_scopes(conn: &Connection) -> Result<(), SearchError> {
    conn.execute_batch("DELETE FROM search_dirty_scopes")
        .map_err(|_| SearchError::Storage)
}

fn update_search_meta_rebuild(conn: &Connection) -> Result<(), SearchError> {
    conn.execute(
        "UPDATE search_meta SET last_full_rebuild_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = 1",
        [],
    )
    .map_err(|_| SearchError::Storage)?;
    Ok(())
}

fn load_all_life_nodes(conn: &Connection) -> Result<Vec<LifeNodeEntry>, SearchError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, parent_id, title, short_description, archived_at, updated_at
             FROM life_nodes",
        )
        .map_err(|_| SearchError::Storage)?;
    let nodes: Vec<LifeNodeEntry> = stmt
        .query_map([], |row| {
            Ok(LifeNodeEntry {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                title: row.get(2)?,
                short_description: row.get(3)?,
                archived_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
        .map_err(|_| SearchError::Storage)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(nodes)
}

fn build_node_map(nodes: &[LifeNodeEntry]) -> HashMap<&str, &LifeNodeEntry> {
    nodes.iter().map(|n| (n.id.as_str(), n)).collect()
}

fn build_breadcrumb(node_id: &str, map: &HashMap<&str, &LifeNodeEntry>) -> String {
    let mut path: Vec<String> = Vec::new();
    let mut current_id: Option<&str> = Some(node_id);
    let mut depth = 0;

    while let Some(id) = current_id {
        if depth >= MAX_BREADCRUMB_DEPTH {
            break;
        }
        match map.get(id) {
            Some(node) => {
                path.push(node.title.clone());
                current_id = node.parent_id.as_deref();
                depth += 1;
            }
            None => break,
        }
    }
    path.reverse();
    path.join(" › ")
}

fn rebuild_tasks_scope(conn: &Connection) -> Result<(), SearchError> {
    conn.execute_batch("SAVEPOINT rebuild_tasks")
        .map_err(|_| SearchError::Storage)?;

    let result = rebuild_tasks_scope_inner(conn);

    if result.is_err() {
        let _ = conn.execute_batch("ROLLBACK TO SAVEPOINT rebuild_tasks");
    }
    conn.execute_batch("RELEASE SAVEPOINT rebuild_tasks")
        .map_err(|_| SearchError::Storage)?;
    result
}

fn rebuild_tasks_scope_inner(conn: &Connection) -> Result<(), SearchError> {
    conn.execute_batch(
        "DELETE FROM search_documents
         WHERE entity_kind IN ('task_one_off','task_series','task_override')",
    )
    .map_err(|_| SearchError::Storage)?;

    // One-off tasks.
    {
        let mut stmt = conn
            .prepare(
                "SELECT t.id, t.title, t.description, t.local_date, t.updated_at, tc.name
                 FROM tasks t
                 JOIN task_categories tc ON tc.id = t.category_id",
            )
            .map_err(|_| SearchError::Storage)?;
        let rows: Vec<(String, String, String, String, String, String)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            })
            .map_err(|_| SearchError::Storage)?
            .filter_map(|r| r.ok())
            .collect();

        let mut ins = conn
            .prepare(
                "INSERT OR REPLACE INTO search_documents
                 (entity_kind,entity_id,navigation_id,title,context_text,body_text,
                  normalized_title,normalized_context,normalized_body,
                  local_date,original_local_date,source_updated_at)
                 VALUES ('task_one_off',?1,?1,?2,?3,?4,?5,?6,?7,?8,NULL,?9)",
            )
            .map_err(|_| SearchError::Storage)?;

        for (id, title, description, local_date, updated_at, category_name) in rows {
            let context = format!("{} · {}", category_name, local_date);
            ins.execute(rusqlite::params![
                id,
                title,
                context,
                description,
                normalize(&title),
                normalize(&context),
                normalize(&description),
                local_date,
                updated_at,
            ])
            .map_err(|_| SearchError::Storage)?;
        }
    }

    // Task series.
    {
        let mut stmt = conn
            .prepare(
                "SELECT ts.id, ts.title, ts.description, ts.updated_at, tc.name
                 FROM task_series ts
                 JOIN task_categories tc ON tc.id = ts.category_id
                 WHERE ts.archived_at IS NULL",
            )
            .map_err(|_| SearchError::Storage)?;
        let rows: Vec<(String, String, String, String, String)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            })
            .map_err(|_| SearchError::Storage)?
            .filter_map(|r| r.ok())
            .collect();

        let mut ins = conn
            .prepare(
                "INSERT OR REPLACE INTO search_documents
                 (entity_kind,entity_id,navigation_id,title,context_text,body_text,
                  normalized_title,normalized_context,normalized_body,
                  local_date,original_local_date,source_updated_at)
                 VALUES ('task_series',?1,?1,?2,?3,?4,?5,?6,?7,NULL,NULL,?8)",
            )
            .map_err(|_| SearchError::Storage)?;

        for (id, title, description, updated_at, category_name) in rows {
            let context = format!("{} · Recurring", category_name);
            ins.execute(rusqlite::params![
                id,
                title,
                context,
                description,
                normalize(&title),
                normalize(&context),
                normalize(&description),
                updated_at,
            ])
            .map_err(|_| SearchError::Storage)?;
        }
    }

    // Task occurrence overrides (non-cancelled, series not archived).
    {
        let mut stmt = conn
            .prepare(
                "SELECT too.id, too.series_id, too.original_local_date,
                        COALESCE(too.title_override, ts.title),
                        COALESCE(too.description_override, ts.description),
                        too.replacement_local_date,
                        COALESCE(tc2.name, tc.name),
                        too.updated_at
                 FROM task_occurrence_overrides too
                 JOIN task_series ts ON ts.id = too.series_id
                 JOIN task_categories tc ON tc.id = ts.category_id
                 LEFT JOIN task_categories tc2 ON tc2.id = too.category_id_override
                 WHERE too.cancelled = 0 AND ts.archived_at IS NULL",
            )
            .map_err(|_| SearchError::Storage)?;
        #[allow(clippy::type_complexity)]
        let rows: Vec<(
            String,
            String,
            String,
            String,
            String,
            Option<String>,
            String,
            String,
        )> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            })
            .map_err(|_| SearchError::Storage)?
            .filter_map(|r| r.ok())
            .collect();

        let mut ins = conn
            .prepare(
                "INSERT OR REPLACE INTO search_documents
                 (entity_kind,entity_id,navigation_id,title,context_text,body_text,
                  normalized_title,normalized_context,normalized_body,
                  local_date,original_local_date,source_updated_at)
                 VALUES ('task_override',?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            )
            .map_err(|_| SearchError::Storage)?;

        for (
            id,
            series_id,
            original_date,
            title,
            description,
            replacement_date,
            category_name,
            updated_at,
        ) in rows
        {
            let effective_date = replacement_date
                .as_deref()
                .unwrap_or(original_date.as_str());
            let context = format!("{} · {}", category_name, effective_date);
            ins.execute(rusqlite::params![
                id,
                series_id,
                title,
                context,
                description,
                normalize(&title),
                normalize(&context),
                normalize(&description),
                effective_date,
                original_date,
                updated_at,
            ])
            .map_err(|_| SearchError::Storage)?;
        }
    }

    Ok(())
}

fn rebuild_life_scope(conn: &Connection, nodes: &[LifeNodeEntry]) -> Result<(), SearchError> {
    conn.execute_batch("SAVEPOINT rebuild_life")
        .map_err(|_| SearchError::Storage)?;

    let result = rebuild_life_scope_inner(conn, nodes);

    if result.is_err() {
        let _ = conn.execute_batch("ROLLBACK TO SAVEPOINT rebuild_life");
    }
    conn.execute_batch("RELEASE SAVEPOINT rebuild_life")
        .map_err(|_| SearchError::Storage)?;
    result
}

fn rebuild_life_scope_inner(conn: &Connection, nodes: &[LifeNodeEntry]) -> Result<(), SearchError> {
    conn.execute_batch("DELETE FROM search_documents WHERE entity_kind = 'life_node'")
        .map_err(|_| SearchError::Storage)?;

    let map = build_node_map(nodes);

    let mut ins = conn
        .prepare(
            "INSERT OR REPLACE INTO search_documents
             (entity_kind,entity_id,navigation_id,title,context_text,body_text,
              normalized_title,normalized_context,normalized_body,
              local_date,original_local_date,source_updated_at)
             VALUES ('life_node',?1,?1,?2,?3,?4,?5,?6,?7,NULL,NULL,?8)",
        )
        .map_err(|_| SearchError::Storage)?;

    for node in nodes {
        // Only index active nodes.
        if node.archived_at.is_some() {
            continue;
        }
        // Skip the protected root; it has no meaningful search content.
        if node.id == "life-root" {
            continue;
        }
        let breadcrumb = build_breadcrumb(&node.id, &map);
        let body = &node.short_description;
        ins.execute(rusqlite::params![
            node.id,
            node.title,
            breadcrumb,
            body,
            normalize(&node.title),
            normalize(&breadcrumb),
            normalize(body),
            node.updated_at,
        ])
        .map_err(|_| SearchError::Storage)?;
    }

    Ok(())
}

fn rebuild_documents_scope(conn: &Connection, nodes: &[LifeNodeEntry]) -> Result<(), SearchError> {
    conn.execute_batch("SAVEPOINT rebuild_documents")
        .map_err(|_| SearchError::Storage)?;

    let result = rebuild_documents_scope_inner(conn, nodes);

    if result.is_err() {
        let _ = conn.execute_batch("ROLLBACK TO SAVEPOINT rebuild_documents");
    }
    conn.execute_batch("RELEASE SAVEPOINT rebuild_documents")
        .map_err(|_| SearchError::Storage)?;
    result
}

fn rebuild_documents_scope_inner(
    conn: &Connection,
    nodes: &[LifeNodeEntry],
) -> Result<(), SearchError> {
    conn.execute_batch("DELETE FROM search_documents WHERE entity_kind = 'reader_document'")
        .map_err(|_| SearchError::Storage)?;

    let map = build_node_map(nodes);

    let mut stmt = conn
        .prepare(
            "SELECT rd.id, rd.life_node_id, rd.plain_text, rd.updated_at
             FROM reader_documents rd
             JOIN life_nodes ln ON ln.id = rd.life_node_id
             WHERE rd.archived_at IS NULL AND ln.archived_at IS NULL",
        )
        .map_err(|_| SearchError::Storage)?;
    let docs: Vec<(String, String, String, String)> = stmt
        .query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })
        .map_err(|_| SearchError::Storage)?
        .filter_map(|r| r.ok())
        .collect();

    let mut ins = conn
        .prepare(
            "INSERT OR REPLACE INTO search_documents
             (entity_kind,entity_id,navigation_id,title,context_text,body_text,
              normalized_title,normalized_context,normalized_body,
              local_date,original_local_date,source_updated_at)
             VALUES ('reader_document',?1,?2,?3,?4,?5,?6,?7,?8,NULL,NULL,?9)",
        )
        .map_err(|_| SearchError::Storage)?;

    for (doc_id, life_node_id, plain_text, updated_at) in docs {
        let node_title = map
            .get(life_node_id.as_str())
            .map(|n| n.title.as_str())
            .unwrap_or("");
        let breadcrumb = build_breadcrumb(&life_node_id, &map);
        // Truncate body to 524288 chars (matches DB constraint on plain_text).
        let body: String = plain_text.chars().take(524288).collect();
        ins.execute(rusqlite::params![
            doc_id,
            life_node_id,
            node_title,
            breadcrumb,
            body,
            normalize(node_title),
            normalize(&breadcrumb),
            normalize(&body),
            updated_at,
        ])
        .map_err(|_| SearchError::Storage)?;
    }

    Ok(())
}

fn run_fts_query(
    conn: &Connection,
    fts_expr: &str,
    observed_local_date: &str,
) -> Result<GlobalSearchProjection, SearchError> {
    // BM25 weights: normalized_title=10, normalized_context=3, normalized_body=1.
    let query = format!(
        "SELECT sd.entity_kind, sd.entity_id, sd.navigation_id, sd.title,
                sd.context_text, sd.local_date, sd.original_local_date,
                highlight(search_fts, 0, X'02', X'03') as hl_title,
                snippet(search_fts, 2, X'02', X'03', '...', {MAX_SNIPPET_TOKENS}) as snip_body,
                bm25(search_fts, 10, 3, 1) as rank
         FROM search_fts
         JOIN search_documents sd ON sd.rowid = search_fts.rowid
         WHERE search_fts MATCH ?1
         ORDER BY rank
         LIMIT {MAX_FTS_RESULTS}"
    );

    let mut stmt = conn.prepare(&query).map_err(|_| SearchError::Storage)?;

    struct RawRow {
        entity_kind: String,
        entity_id: String,
        navigation_id: String,
        title: String,
        context_text: String,
        local_date: Option<String>,
        original_local_date: Option<String>,
        hl_title: String,
        snip_body: String,
        rank: f64,
    }

    let raw_rows: Vec<RawRow> = stmt
        .query_map(rusqlite::params![fts_expr], |row| {
            Ok(RawRow {
                entity_kind: row.get(0)?,
                entity_id: row.get(1)?,
                navigation_id: row.get(2)?,
                title: row.get(3)?,
                context_text: row.get(4)?,
                local_date: row.get(5)?,
                original_local_date: row.get(6)?,
                hl_title: row.get::<_, Option<String>>(7)?.unwrap_or_default(),
                snip_body: row.get::<_, Option<String>>(8)?.unwrap_or_default(),
                rank: row.get(9)?,
            })
        })
        .map_err(|_| SearchError::Storage)?
        .filter_map(|r| r.ok())
        .collect();

    // Collect series IDs that need next-occurrence resolution.
    let series_ids: Vec<String> = raw_rows
        .iter()
        .filter(|r| r.entity_kind == "task_series")
        .map(|r| r.entity_id.clone())
        .collect();

    let series_recurrence: HashMap<String, (String, String)> = if !series_ids.is_empty() {
        load_series_recurrence(conn, &series_ids)?
    } else {
        HashMap::new()
    };

    let mut task_results: Vec<SearchResultView> = Vec::new();
    let mut life_results: Vec<SearchResultView> = Vec::new();
    let mut doc_results: Vec<SearchResultView> = Vec::new();

    for row in raw_rows {
        let entity_kind = match row.entity_kind.as_str() {
            "task_one_off" => SearchEntityKind::TaskOneOff,
            "task_series" => SearchEntityKind::TaskSeries,
            "task_override" => SearchEntityKind::TaskOverride,
            "life_node" => SearchEntityKind::LifeNode,
            "reader_document" => SearchEntityKind::ReaderDocument,
            _ => continue,
        };

        let navigation_target = match &entity_kind {
            SearchEntityKind::TaskOneOff => SearchNavigationTarget::Today {
                local_date: row.local_date.clone().unwrap_or_default(),
                task_id: Some(row.entity_id.clone()),
                series_id: None,
                original_local_date: None,
            },
            SearchEntityKind::TaskSeries => {
                let next_date = series_recurrence
                    .get(&row.entity_id)
                    .and_then(|(dtstart, rrule)| {
                        next_occurrence_on_or_after(dtstart, observed_local_date, rrule)
                    })
                    .or_else(|| {
                        series_recurrence
                            .get(&row.entity_id)
                            .map(|(dtstart, _)| dtstart.clone())
                    })
                    .unwrap_or_else(|| observed_local_date.to_string());

                SearchNavigationTarget::Today {
                    local_date: next_date,
                    task_id: None,
                    series_id: Some(row.entity_id.clone()),
                    original_local_date: None,
                }
            }
            SearchEntityKind::TaskOverride => SearchNavigationTarget::Today {
                local_date: row.local_date.clone().unwrap_or_default(),
                task_id: None,
                series_id: Some(row.navigation_id.clone()),
                original_local_date: row.original_local_date.clone(),
            },
            SearchEntityKind::LifeNode => SearchNavigationTarget::LifeBrowse {
                node_id: row.entity_id.clone(),
            },
            SearchEntityKind::ReaderDocument => SearchNavigationTarget::LifeReader {
                node_id: row.navigation_id.clone(),
            },
        };

        let title_fragments = parse_fragments(&row.hl_title);
        let snippet_fragments = parse_fragments(&row.snip_body);

        let result = SearchResultView {
            entity_id: row.entity_id.clone(),
            entity_kind: entity_kind.clone(),
            title: row.title.clone(),
            title_fragments,
            context_text: row.context_text.clone(),
            snippet_fragments,
            navigation_target,
            rank: row.rank,
        };

        match entity_kind {
            SearchEntityKind::TaskOneOff
            | SearchEntityKind::TaskSeries
            | SearchEntityKind::TaskOverride => task_results.push(result),
            SearchEntityKind::LifeNode => life_results.push(result),
            SearchEntityKind::ReaderDocument => doc_results.push(result),
        }
    }

    let mut groups: Vec<SearchResultGroup> = Vec::new();

    let add_group = |results: Vec<SearchResultView>,
                     kind: SearchResultGroupKind,
                     groups: &mut Vec<SearchResultGroup>| {
        if results.is_empty() {
            return;
        }
        let total = results.len();
        let capped: Vec<SearchResultView> =
            results.into_iter().take(MAX_RESULTS_PER_GROUP).collect();
        groups.push(SearchResultGroup {
            kind,
            results: capped,
            total_count: total,
        });
    };

    add_group(task_results, SearchResultGroupKind::Tasks, &mut groups);
    add_group(life_results, SearchResultGroupKind::Life, &mut groups);
    add_group(doc_results, SearchResultGroupKind::Documents, &mut groups);

    let total_visible_results: usize = groups.iter().map(|g| g.results.len()).sum();

    Ok(GlobalSearchProjection {
        groups,
        total_visible_results,
    })
}

fn load_series_recurrence(
    conn: &Connection,
    ids: &[String],
) -> Result<HashMap<String, (String, String)>, SearchError> {
    let placeholders: String = ids
        .iter()
        .enumerate()
        .map(|(i, _)| format!("?{}", i + 1))
        .collect::<Vec<_>>()
        .join(",");
    let sql = format!(
        "SELECT id, dtstart_local_date, rrule FROM task_series WHERE id IN ({placeholders})"
    );
    let mut stmt = conn.prepare(&sql).map_err(|_| SearchError::Storage)?;
    let params: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
    let map: HashMap<String, (String, String)> = stmt
        .query_map(params.as_slice(), |row| {
            Ok((row.get(0)?, (row.get(1)?, row.get(2)?)))
        })
        .map_err(|_| SearchError::Storage)?
        .filter_map(|r| r.ok())
        .collect();
    Ok(map)
}

fn next_occurrence_on_or_after(dtstart: &str, from_date: &str, rrule: &str) -> Option<String> {
    let normalized = crate::task::recurrence::normalize_rule(rrule).ok()?;
    let source = format!(
        "DTSTART:{}T000000Z\nRRULE:{normalized}",
        dtstart.replace('-', "")
    );
    let from_naive = chrono::NaiveDate::parse_from_str(from_date, "%Y-%m-%d").ok()?;
    let from_dt = Tz::UTC.from_utc_datetime(&from_naive.and_hms_opt(0, 0, 0)?);
    let after = from_dt - chrono::Duration::seconds(1);
    let until = from_dt + chrono::Duration::days(366);
    let set: RRuleSet = source.parse().ok()?;
    set.after(after)
        .before(until)
        .all(1024)
        .dates
        .first()
        .map(|d| d.date_naive().format("%Y-%m-%d").to_string())
}

fn parse_fragments(marked: &str) -> Vec<SearchTextFragment> {
    let mut fragments: Vec<SearchTextFragment> = Vec::new();
    let mut in_emphasis = false;
    let mut current = String::new();

    for ch in marked.chars() {
        match ch {
            c if c == SENTINEL_START => {
                if !current.is_empty() {
                    fragments.push(SearchTextFragment {
                        text: current.clone(),
                        emphasized: false,
                    });
                    current.clear();
                }
                in_emphasis = true;
            }
            c if c == SENTINEL_END => {
                if !current.is_empty() {
                    fragments.push(SearchTextFragment {
                        text: current.clone(),
                        emphasized: true,
                    });
                    current.clear();
                }
                in_emphasis = false;
            }
            c => current.push(c),
        }
    }
    if !current.is_empty() {
        fragments.push(SearchTextFragment {
            text: current,
            emphasized: in_emphasis,
        });
    }
    fragments
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, migrations::run_migrations,
    };

    fn setup() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        conn
    }

    // ── Migration / schema ────────────────────────────────────────────────────

    #[test]
    fn search_tables_created_by_migration_10() {
        let conn = setup();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE name IN
                 ('search_documents','search_fts','search_dirty_scopes','search_meta')",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 4, "all four search schema objects must exist");
    }

    #[test]
    fn bootstrap_all_scope_present_after_migration() {
        let conn = setup();
        let scope: String = conn
            .query_row(
                "SELECT scope FROM search_dirty_scopes WHERE scope = 'all'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(scope, "all");
    }

    #[test]
    fn fts5_virtual_table_is_queryable() {
        let conn = setup();
        // If FTS5 is not compiled in, this would fail with "no such module: fts5".
        let _count: i64 = conn
            .query_row("SELECT COUNT(*) FROM search_fts", [], |r| r.get(0))
            .unwrap();
    }

    // ── Dirty scope triggers ──────────────────────────────────────────────────

    #[test]
    fn task_insert_marks_tasks_dirty() {
        let conn = setup();
        conn.execute_batch("DELETE FROM search_dirty_scopes")
            .unwrap();
        conn.execute(
            "INSERT INTO tasks VALUES('t1','2026-08-03',540,600,'Test','',
             'general','medium','2026-08-03','2026-08-03')",
            [],
        )
        .unwrap();
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM search_dirty_scopes WHERE scope='tasks'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn life_node_insert_marks_life_and_documents_dirty() {
        let conn = setup();
        conn.execute_batch("DELETE FROM search_dirty_scopes")
            .unwrap();
        conn.execute(
            "INSERT INTO life_nodes VALUES('n1','life-root','Child','','life-branch','neutral',1,NULL,'now','now',0)",
            [],
        )
        .unwrap();
        let scopes: Vec<String> = conn
            .prepare("SELECT scope FROM search_dirty_scopes ORDER BY scope")
            .unwrap()
            .query_map([], |r| r.get(0))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(scopes.contains(&"life".to_string()));
        assert!(scopes.contains(&"documents".to_string()));
    }

    // ── Normalization + indexing ──────────────────────────────────────────────

    #[test]
    fn task_one_off_indexed_and_searchable() {
        let conn = setup();
        conn.execute(
            "INSERT INTO tasks VALUES('t1','2026-08-03',540,600,'Lập kế hoạch','mô tả',
             'general','medium','2026-08-03','2026-08-03')",
            [],
        )
        .unwrap();

        let input = SearchGlobalInput {
            query: "lap".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        assert!(!proj.groups.is_empty(), "should find task matching 'lap'");
        let tasks_group = proj
            .groups
            .iter()
            .find(|g| g.kind == SearchResultGroupKind::Tasks)
            .expect("tasks group must be present");
        assert!(!tasks_group.results.is_empty());
        let first = &tasks_group.results[0];
        assert_eq!(first.entity_kind, SearchEntityKind::TaskOneOff);
        assert_eq!(first.entity_id, "t1");
    }

    #[test]
    fn vietnamese_accent_insensitive_search() {
        let conn = setup();
        conn.execute(
            "INSERT INTO tasks VALUES('t1','2026-08-03',540,600,'Nguyễn Văn A','',
             'general','medium','2026-08-03','2026-08-03')",
            [],
        )
        .unwrap();

        // Search with unaccented form should match accented title.
        let input = SearchGlobalInput {
            query: "nguyen".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        let tasks_group = proj
            .groups
            .iter()
            .find(|g| g.kind == SearchResultGroupKind::Tasks)
            .expect("tasks group");
        assert!(!tasks_group.results.is_empty());
    }

    #[test]
    fn d_stroke_search_matches_d_stroke_title() {
        let conn = setup();
        conn.execute(
            "INSERT INTO tasks VALUES('t1','2026-08-03',540,600,'Đường phố','',
             'general','medium','2026-08-03','2026-08-03')",
            [],
        )
        .unwrap();
        // "duong" should match "Đường" after normalization.
        let input = SearchGlobalInput {
            query: "duong".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        let tasks = proj
            .groups
            .iter()
            .find(|g| g.kind == SearchResultGroupKind::Tasks)
            .expect("tasks group");
        assert!(!tasks.results.is_empty());
    }

    #[test]
    fn archived_life_node_not_indexed() {
        let conn = setup();
        conn.execute(
            "INSERT INTO life_nodes VALUES('n1','life-root','Archived','','life-branch','neutral',1,'2026-01-01','now','now',0)",
            [],
        )
        .unwrap();
        let input = SearchGlobalInput {
            query: "Archived".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        let life_group = proj
            .groups
            .iter()
            .find(|g| g.kind == SearchResultGroupKind::Life);
        assert!(life_group.is_none() || life_group.unwrap().results.is_empty());
    }

    #[test]
    fn empty_query_returns_empty_projection() {
        let conn = setup();
        let input = SearchGlobalInput {
            query: "".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        assert!(proj.groups.is_empty());
        assert_eq!(proj.total_visible_results, 0);
    }

    #[test]
    fn dirty_scope_cleared_after_query() {
        let conn = setup();
        let input = SearchGlobalInput {
            query: "test".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        refresh_dirty_and_query(&conn, input).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM search_dirty_scopes", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0, "dirty scopes must be cleared after rebuild");
    }

    // ── Fragment parsing ──────────────────────────────────────────────────────

    #[test]
    fn parse_fragments_plain_text() {
        let fragments = parse_fragments("hello world");
        assert_eq!(fragments.len(), 1);
        assert_eq!(fragments[0].text, "hello world");
        assert!(!fragments[0].emphasized);
    }

    #[test]
    fn parse_fragments_with_sentinels() {
        let marked = format!("pre {SENTINEL_START}match{SENTINEL_END} post");
        let frags = parse_fragments(&marked);
        assert_eq!(frags.len(), 3);
        assert_eq!(frags[0].text, "pre ");
        assert!(!frags[0].emphasized);
        assert_eq!(frags[1].text, "match");
        assert!(frags[1].emphasized);
        assert_eq!(frags[2].text, " post");
        assert!(!frags[2].emphasized);
    }

    #[test]
    fn parse_fragments_empty_returns_empty() {
        assert!(parse_fragments("").is_empty());
    }

    // ── Navigation targets ────────────────────────────────────────────────────

    #[test]
    fn one_off_task_navigation_target_uses_local_date() {
        let conn = setup();
        conn.execute(
            "INSERT INTO tasks VALUES('t1','2026-08-05',540,600,'Nav test','',
             'general','medium','2026-08-03','2026-08-03')",
            [],
        )
        .unwrap();
        let input = SearchGlobalInput {
            query: "nav".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        let result = &proj
            .groups
            .iter()
            .find(|g| g.kind == SearchResultGroupKind::Tasks)
            .unwrap()
            .results[0];
        match &result.navigation_target {
            SearchNavigationTarget::Today {
                local_date,
                task_id,
                ..
            } => {
                assert_eq!(local_date, "2026-08-05");
                assert_eq!(task_id.as_deref(), Some("t1"));
            }
            other => panic!("expected Today, got {other:?}"),
        }
    }

    #[test]
    fn life_node_navigation_target_is_browse() {
        let conn = setup();
        conn.execute(
            "INSERT INTO life_nodes VALUES('n1','life-root','Searchable Node','','life-branch','neutral',1,NULL,'now','now',0)",
            [],
        )
        .unwrap();
        let input = SearchGlobalInput {
            query: "searchable".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        let result = &proj
            .groups
            .iter()
            .find(|g| g.kind == SearchResultGroupKind::Life)
            .unwrap()
            .results[0];
        match &result.navigation_target {
            SearchNavigationTarget::LifeBrowse { node_id } => {
                assert_eq!(node_id, "n1");
            }
            other => panic!("expected LifeBrowse, got {other:?}"),
        }
    }

    #[test]
    fn result_cap_per_group_enforced() {
        let conn = setup();
        conn.execute_batch("DELETE FROM search_dirty_scopes")
            .unwrap();
        // Insert 10 tasks, all matching "test".
        for i in 0..10i32 {
            conn.execute(
                &format!(
                    "INSERT INTO tasks VALUES('t{i}','2026-08-03',{},{},\
                     'test task {i}','', 'general','medium','2026-08-03','2026-08-03')",
                    540 + i * 2,
                    542 + i * 2
                ),
                [],
            )
            .unwrap();
        }
        let input = SearchGlobalInput {
            query: "test".to_string(),
            observed_local_date: "2026-08-03".to_string(),
        };
        let proj = refresh_dirty_and_query(&conn, input).unwrap();
        let tasks = proj
            .groups
            .iter()
            .find(|g| g.kind == SearchResultGroupKind::Tasks)
            .unwrap();
        assert!(
            tasks.results.len() <= MAX_RESULTS_PER_GROUP,
            "results must be capped at {MAX_RESULTS_PER_GROUP}"
        );
        assert_eq!(tasks.total_count, 10, "total_count reflects all matches");
    }

    // ── File-backed smoke: schema, Vietnamese, nav targets, dirty, relaunch ──────

    #[test]
    fn search_file_backed_smoke() {
        use crate::infrastructure::sqlite::{
            connection::open_file_connection, migrations::run_migrations,
        };

        let tag = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.subsec_nanos())
            .unwrap_or(42);
        let dir = std::env::temp_dir().join(format!("lw-search-smoke-{tag}"));
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("lifeweave.db");

        // ── Session 1: migrate, insert, rebuild, verify ───────────────────────
        {
            let mut conn = open_file_connection(&db_path).unwrap();
            run_migrations(&mut conn).unwrap();

            // Verify schema version 10.
            let ver: i64 = conn
                .query_row("SELECT MAX(version) FROM schema_migrations", [], |r| {
                    r.get(0)
                })
                .unwrap();
            assert_eq!(ver, 10, "schema must be at version 10");

            // Insert one task with Vietnamese title.
            conn.execute(
                "INSERT INTO tasks VALUES('t-smoke','2026-08-03',480,540,'Đường phố Hà Nội','',
                 'general','medium','2026-08-03','2026-08-03')",
                [],
            )
            .unwrap();

            // First rebuild (dirty scope = 'all' from migration bootstrap + 'tasks' from trigger).
            let proj = refresh_dirty_and_query(
                &conn,
                SearchGlobalInput {
                    query: "duong".to_string(),
                    observed_local_date: "2026-08-03".to_string(),
                },
            )
            .unwrap();

            // Vietnamese normalization: "duong" finds "Đường" (đ→d, remove diacritics).
            let tasks = proj
                .groups
                .iter()
                .find(|g| g.kind == SearchResultGroupKind::Tasks)
                .expect("must have tasks group");
            assert_eq!(tasks.results.len(), 1);
            let result = &tasks.results[0];
            assert_eq!(result.entity_kind, SearchEntityKind::TaskOneOff);

            // Navigation target: task navigates to Today with the task's date.
            match &result.navigation_target {
                SearchNavigationTarget::Today {
                    local_date,
                    task_id,
                    ..
                } => {
                    assert_eq!(local_date, "2026-08-03");
                    assert_eq!(task_id.as_deref(), Some("t-smoke"));
                }
                other => panic!("expected Today nav target, got {other:?}"),
            }

            // Dirty scopes cleared after rebuild.
            let dirty_count: i64 = conn
                .query_row("SELECT COUNT(*) FROM search_dirty_scopes", [], |r| r.get(0))
                .unwrap();
            assert_eq!(dirty_count, 0, "dirty scopes must be empty after rebuild");
        }

        // ── Session 2: relaunch — search_documents persists, search works ─────
        {
            let conn = open_file_connection(&db_path).unwrap();

            // No dirty scopes on relaunch (cleared in session 1).
            let dirty_count: i64 = conn
                .query_row("SELECT COUNT(*) FROM search_dirty_scopes", [], |r| r.get(0))
                .unwrap();
            assert_eq!(dirty_count, 0, "no dirty scopes on relaunch");

            // Search works without rebuild (search_documents persists in the file).
            let proj = refresh_dirty_and_query(
                &conn,
                SearchGlobalInput {
                    query: "ha noi".to_string(),
                    observed_local_date: "2026-08-03".to_string(),
                },
            )
            .unwrap();
            assert!(
                proj.total_visible_results > 0,
                "search must find data after relaunch without rebuild"
            );
        }

        // ── Cleanup ───────────────────────────────────────────────────────────
        let _ = std::fs::remove_dir_all(&dir);
    }

    // ── Performance: realistic fixture ────────────────────────────────────────

    #[test]
    fn search_perf_realistic_fixture() {
        use crate::infrastructure::sqlite::{
            connection::open_file_connection, migrations::run_migrations,
        };
        use std::time::Instant;

        let tag = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.subsec_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!("lw-search-perf-{tag}"));
        std::fs::create_dir_all(&dir).unwrap();
        let db_path = dir.join("lifeweave.db");

        let mut conn = open_file_connection(&db_path).unwrap();
        run_migrations(&mut conn).unwrap();

        // ── Fixture: 10 000 one-off tasks ────────────────────────────────────
        {
            let tx = conn.transaction().unwrap();
            for i in 0..10_000usize {
                let month = (i % 12) + 1;
                let day = (i % 28) + 1;
                let start = (480 + i % 480) as i32;
                tx.execute(
                    "INSERT INTO tasks VALUES(?1,?2,?3,?4,?5,'','general','medium','2026-01-01','2026-01-01')",
                    rusqlite::params![
                        format!("task-{i}"),
                        format!("2026-{month:02}-{day:02}"),
                        start,
                        start + 60,
                        format!("Daily standup meeting {i}")
                    ],
                )
                .unwrap();
            }
            tx.commit().unwrap();
        }

        // ── Fixture: 1 000 recurring series + 1 000 overrides ────────────────
        {
            let tx = conn.transaction().unwrap();
            for i in 0..1_000usize {
                let month = (i % 12) + 1;
                let day = (i % 28) + 1;
                let dtstart = format!("2026-{month:02}-{day:02}");
                tx.execute(
                    "INSERT INTO task_series VALUES(?1,?2,'','general','medium',480,540,?3,'UTC','FREQ=WEEKLY','2026-01-01','2026-01-01',NULL)",
                    rusqlite::params![
                        format!("series-{i}"),
                        format!("Weekly review {i}"),
                        &dtstart
                    ],
                )
                .unwrap();
                tx.execute(
                    "INSERT INTO task_occurrence_overrides VALUES(?1,?2,?3,NULL,?4,NULL,NULL,NULL,NULL,NULL,0,'2026-01-01','2026-01-01')",
                    rusqlite::params![
                        format!("override-{i}"),
                        format!("series-{i}"),
                        &dtstart,
                        format!("Rescheduled review {i}")
                    ],
                )
                .unwrap();
            }
            tx.commit().unwrap();
        }

        // ── Fixture: 5 000 life nodes ─────────────────────────────────────────
        {
            let tx = conn.transaction().unwrap();
            for i in 0..5_000usize {
                tx.execute(
                    "INSERT INTO life_nodes VALUES(?1,'life-root',?2,'','life-branch','neutral',?3,NULL,'2026-01-01','2026-01-01',0)",
                    rusqlite::params![
                        format!("node-{i}"),
                        format!("Life area {i}"),
                        i as i32
                    ],
                )
                .unwrap();
            }
            tx.commit().unwrap();
        }

        // ── Fixture: 5 000 documents (one per node) ───────────────────────────
        {
            let tx = conn.transaction().unwrap();
            for i in 0..5_000usize {
                tx.execute(
                    "INSERT INTO reader_documents VALUES(?1,?2,1,0,'{}',?3,'2026-01-01','2026-01-01',NULL)",
                    rusqlite::params![
                        format!("doc-{i}"),
                        format!("node-{i}"),
                        format!("Document body notes for area {i} with daily meeting content")
                    ],
                )
                .unwrap();
            }
            tx.commit().unwrap();
        }

        // ── EXPLAIN QUERY PLAN ────────────────────────────────────────────────
        let expr = build_fts_expression("standup").unwrap();
        let plan: Vec<String> = conn
            .prepare(
                "EXPLAIN QUERY PLAN
                 SELECT sd.rowid, sd.entity_kind, bm25(search_fts,10,3,1) AS rank
                 FROM search_fts
                 JOIN search_documents sd ON sd.rowid = search_fts.rowid
                 WHERE search_fts MATCH ?1
                 ORDER BY rank LIMIT 100",
            )
            .unwrap()
            .query_map(rusqlite::params![expr], |r| r.get::<_, String>(3))
            .unwrap()
            .filter_map(|r| r.ok())
            .collect();
        eprintln!("[perf] EXPLAIN QUERY PLAN:");
        for line in &plan {
            eprintln!("  {line}");
        }
        assert!(
            plan.iter()
                .any(|l| l.contains("search_fts") || l.contains("SCAN") || l.contains("VIRTUAL")),
            "query plan must reference FTS index; got: {plan:?}"
        );

        // ── Initial full rebuild (all scopes dirty after fixture inserts) ──────
        let t0 = Instant::now();
        let proj = refresh_dirty_and_query(
            &conn,
            SearchGlobalInput {
                query: "standup".to_string(),
                observed_local_date: "2026-08-03".to_string(),
            },
        )
        .unwrap();
        let full_rebuild_ms = t0.elapsed().as_millis();
        eprintln!(
            "[perf] full rebuild + query: {full_rebuild_ms} ms  results={}",
            proj.total_visible_results
        );

        // ── Dirty tasks refresh + query ───────────────────────────────────────
        conn.execute(
            "INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('tasks','2026-08-03T00:00:00Z') \
             ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at",
            [],
        )
        .unwrap();
        let t1 = Instant::now();
        let _ = refresh_dirty_and_query(
            &conn,
            SearchGlobalInput {
                query: "standup".to_string(),
                observed_local_date: "2026-08-03".to_string(),
            },
        )
        .unwrap();
        let dirty_tasks_ms = t1.elapsed().as_millis();
        eprintln!("[perf] dirty tasks refresh + query: {dirty_tasks_ms} ms");

        // ── Dirty life + documents refresh + query ────────────────────────────
        conn.execute(
            "INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('life','2026-08-03T00:00:00Z') \
             ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('documents','2026-08-03T00:00:00Z') \
             ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at",
            [],
        )
        .unwrap();
        let t2 = Instant::now();
        let _ = refresh_dirty_and_query(
            &conn,
            SearchGlobalInput {
                query: "area".to_string(),
                observed_local_date: "2026-08-03".to_string(),
            },
        )
        .unwrap();
        let dirty_life_ms = t2.elapsed().as_millis();
        eprintln!("[perf] dirty life+docs refresh + query: {dirty_life_ms} ms");

        // ── Warm query p50 / p95 / max ────────────────────────────────────────
        let warm_queries = [
            "standup", "meeting", "review", "area", "document", "daily", "notes", "body",
        ];
        let rounds = 4usize;
        let mut warm_ms: Vec<u128> = Vec::with_capacity(warm_queries.len() * rounds);
        for _ in 0..rounds {
            for q in &warm_queries {
                let t = Instant::now();
                let _ = refresh_dirty_and_query(
                    &conn,
                    SearchGlobalInput {
                        query: q.to_string(),
                        observed_local_date: "2026-08-03".to_string(),
                    },
                )
                .unwrap();
                warm_ms.push(t.elapsed().as_millis());
            }
        }
        warm_ms.sort_unstable();
        let n = warm_ms.len();
        let p50 = warm_ms[n / 2];
        let p95 = warm_ms[(n * 95) / 100];
        let max_ms = *warm_ms.last().unwrap();
        eprintln!("[perf] warm query p50={p50}ms p95={p95}ms max={max_ms}ms (n={n})");

        // ── Cleanup ───────────────────────────────────────────────────────────
        drop(conn);
        let _ = std::fs::remove_dir_all(&dir);

        // ── Hard ceiling assertion (release only; debug is unoptimized) ──────────
        // Targets: full rebuild ≤1500ms, dirty refresh ≤750ms, p95 ≤50ms.
        // Hard ceiling (spec §perf): warm query max ≤100ms — measured in release.
        #[cfg(not(debug_assertions))]
        assert!(
            max_ms <= 100,
            "warm query hard ceiling: max must be ≤100ms; got {max_ms}ms (p50={p50}ms p95={p95}ms)"
        );
    }
}
