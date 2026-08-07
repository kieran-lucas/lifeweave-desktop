use std::cmp::Ordering;

use chrono::{SecondsFormat, Utc};
use rusqlite::{Connection, OptionalExtension, params};

use super::domain::{
    EndpointRole, LifeLinkError, MAX_INCOMING_LINKS, MAX_OUTGOING_LINKS, MAX_TARGET_QUERY_CHARS,
    MAX_TARGET_RESULTS, endpoint_error,
};
use super::dto::*;
use crate::life::domain::{ROOT_ID, valid_id};
use crate::search::normalize::{build_fts_expression, normalize};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EndpointDocumentKind {
    BasicLeaf,
    NarrativeCanvas,
}

struct EndpointState {
    archived: bool,
    active_children: i64,
    basic_documents: i64,
    narrative_documents: i64,
}

fn endpoint_state(
    conn: &Connection,
    node_id: &str,
    role: EndpointRole,
) -> Result<EndpointState, LifeLinkError> {
    if !valid_id(node_id) || node_id == ROOT_ID {
        return Err(endpoint_error(role, "invalid"));
    }
    conn.query_row(
        "SELECT archived_at IS NOT NULL,
                (SELECT COUNT(*) FROM life_nodes child WHERE child.parent_id=n.id AND child.archived_at IS NULL),
                (SELECT COUNT(*) FROM reader_documents d WHERE d.life_node_id=n.id AND d.archived_at IS NULL),
                (SELECT COUNT(*) FROM narrative_documents d WHERE d.life_node_id=n.id AND d.archived_at IS NULL)
         FROM life_nodes n WHERE n.id=?1",
        [node_id],
        |row| {
            Ok(EndpointState {
                archived: row.get::<_, i64>(0)? != 0,
                active_children: row.get(1)?,
                basic_documents: row.get(2)?,
                narrative_documents: row.get(3)?,
            })
        },
    )
    .optional()?
    .ok_or_else(|| endpoint_error(role, "invalid"))
}

fn validate_endpoint(
    conn: &Connection,
    node_id: &str,
    role: EndpointRole,
) -> Result<EndpointDocumentKind, LifeLinkError> {
    let state = endpoint_state(conn, node_id, role)?;
    if state.archived {
        return Err(endpoint_error(role, "archived"));
    }
    if state.active_children != 0 {
        return Err(endpoint_error(role, "branch"));
    }
    match (state.basic_documents, state.narrative_documents) {
        (1, 0) => Ok(EndpointDocumentKind::BasicLeaf),
        (0, 1) => Ok(EndpointDocumentKind::NarrativeCanvas),
        _ => Err(endpoint_error(role, "document")),
    }
}

#[cfg(test)]
mod cap_search_tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task43_migration::run_all_migrations,
    };

    fn setup() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn add_node(conn: &Connection, parent: &str, title: &str) -> String {
        let id = uuid::Uuid::now_v7().to_string();
        conn.execute(
            "INSERT INTO life_nodes VALUES(?1,?2,?3,'Description','life-leaf','neutral',1,NULL,'1','1',0)",
            params![id, parent, title],
        )
        .unwrap();
        id
    }

    fn add_basic(conn: &Connection, parent: &str, title: &str) -> String {
        let id = add_node(conn, parent, title);
        conn.execute(
            "INSERT INTO reader_documents VALUES(?1,?2,1,0,'{}','body','1','1',NULL)",
            params![uuid::Uuid::now_v7().to_string(), id],
        )
        .unwrap();
        id
    }

    fn add_narrative(conn: &Connection, parent: &str, title: &str) -> String {
        let id = add_node(conn, parent, title);
        conn.execute(
            "INSERT INTO narrative_documents(id,life_node_id,schema_version,revision,canonical_json,plain_text,created_at,updated_at,archived_at,template_id,template_version)
             VALUES(?1,?2,1,0,'{}','body','1','1',NULL,'knowledge_dossier',1)",
            params![uuid::Uuid::now_v7().to_string(), id],
        )
        .unwrap();
        id
    }

    #[test]
    fn outgoing_and_incoming_caps_reject_without_partial_insert() {
        let mut conn = setup();
        let outgoing_source = add_basic(&conn, ROOT_ID, "Outgoing source");
        for index in 0..MAX_OUTGOING_LINKS {
            let target = add_basic(&conn, ROOT_ID, &format!("Outgoing target {index}"));
            conn.execute(
                "INSERT INTO life_links VALUES(?1,?2,?3,'1')",
                params![uuid::Uuid::now_v7().to_string(), outgoing_source, target],
            )
            .unwrap();
        }
        let overflow_target = add_basic(&conn, ROOT_ID, "Outgoing overflow");
        assert_eq!(
            create(
                &mut conn,
                CreateLifeLinkInput {
                    source_node_id: outgoing_source.clone(),
                    target_node_id: overflow_target,
                },
            ),
            Err(LifeLinkError::OutgoingCap)
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM life_links WHERE source_node_id=?1",
                [&outgoing_source],
                |row| row.get::<_, i64>(0),
            )
            .unwrap(),
            MAX_OUTGOING_LINKS
        );

        let incoming_target = add_basic(&conn, ROOT_ID, "Incoming target");
        for index in 0..MAX_INCOMING_LINKS {
            let source = add_basic(&conn, ROOT_ID, &format!("Incoming source {index}"));
            conn.execute(
                "INSERT INTO life_links VALUES(?1,?2,?3,'1')",
                params![uuid::Uuid::now_v7().to_string(), source, incoming_target],
            )
            .unwrap();
        }
        let overflow_source = add_basic(&conn, ROOT_ID, "Incoming overflow");
        assert_eq!(
            create(
                &mut conn,
                CreateLifeLinkInput {
                    source_node_id: overflow_source,
                    target_node_id: incoming_target.clone(),
                },
            ),
            Err(LifeLinkError::IncomingCap)
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM life_links WHERE target_node_id=?1",
                [&incoming_target],
                |row| row.get::<_, i64>(0),
            )
            .unwrap(),
            MAX_INCOMING_LINKS
        );
    }

    #[test]
    fn target_search_reuses_fts_normalization_and_filters_ineligible_kinds() {
        let mut conn = setup();
        let source = add_basic(&conn, ROOT_ID, "Nguồn");
        let linked = add_basic(&conn, ROOT_ID, "Đường Linked");
        let eligible_basic = add_basic(&conn, ROOT_ID, "Đường Basic");
        let eligible_narrative = add_narrative(&conn, ROOT_ID, "Đường Narrative");
        let documentless = add_node(&conn, ROOT_ID, "Đường Documentless");
        let branch = add_node(&conn, ROOT_ID, "Đường Branch");
        let _child = add_node(&conn, &branch, "Child");
        let archived = add_basic(&conn, ROOT_ID, "Đường Archived");
        conn.execute(
            "UPDATE life_nodes SET archived_at='1' WHERE id=?1",
            [&archived],
        )
        .unwrap();
        create(
            &mut conn,
            CreateLifeLinkInput {
                source_node_id: source.clone(),
                target_node_id: linked.clone(),
            },
        )
        .unwrap();

        let results = search_targets(
            &conn,
            SearchLifeLinkTargetsInput {
                source_node_id: source.clone(),
                query: "duong".into(),
            },
        )
        .unwrap();
        let ids = results
            .iter()
            .map(|result| result.node_id.as_str())
            .collect::<Vec<_>>();
        assert!(ids.contains(&eligible_basic.as_str()));
        assert!(ids.contains(&eligible_narrative.as_str()));
        assert!(!ids.contains(&source.as_str()));
        assert!(!ids.contains(&linked.as_str()));
        assert!(!ids.contains(&documentless.as_str()));
        assert!(!ids.contains(&branch.as_str()));
        assert!(!ids.contains(&archived.as_str()));
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|result| !result.breadcrumb.is_empty()));

        assert!(matches!(
            search_targets(
                &conn,
                SearchLifeLinkTargetsInput {
                    source_node_id: source.clone(),
                    query: "!".into(),
                },
            ),
            Err(LifeLinkError::InvalidSearchQuery)
        ));
        assert!(matches!(
            search_targets(
                &conn,
                SearchLifeLinkTargetsInput {
                    source_node_id: source,
                    query: "a".repeat(121),
                },
            ),
            Err(LifeLinkError::InvalidSearchQuery)
        ));
    }

    #[test]
    fn target_search_is_capped_at_twenty_with_stable_ids() {
        let conn = setup();
        let source = add_basic(&conn, ROOT_ID, "Source");
        for index in 0..25 {
            add_basic(&conn, ROOT_ID, &format!("Candidate {index:02}"));
        }
        let first = search_targets(
            &conn,
            SearchLifeLinkTargetsInput {
                source_node_id: source.clone(),
                query: "candidate".into(),
            },
        )
        .unwrap();
        let second = search_targets(
            &conn,
            SearchLifeLinkTargetsInput {
                source_node_id: source,
                query: "candidate".into(),
            },
        )
        .unwrap();
        assert_eq!(first.len(), MAX_TARGET_RESULTS as usize);
        assert_eq!(
            first.iter().map(|row| &row.node_id).collect::<Vec<_>>(),
            second.iter().map(|row| &row.node_id).collect::<Vec<_>>()
        );
    }

    #[test]
    fn panel_query_plan_uses_both_directional_indexes_in_one_statement() {
        let conn = setup();
        let source = add_basic(&conn, ROOT_ID, "Source");
        let details = conn
            .prepare(&format!("EXPLAIN QUERY PLAN {PANEL_ROWS_SQL}"))
            .unwrap()
            .query_map([source], |row| row.get::<_, String>(3))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap()
            .join("\n");
        assert!(details.contains("life_links_source_idx"), "{details}");
        assert!(details.contains("life_links_target_idx"), "{details}");
    }
}

fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn create(
    conn: &mut Connection,
    input: CreateLifeLinkInput,
) -> Result<LifeLinkMutationResult, LifeLinkError> {
    if input.source_node_id == input.target_node_id {
        return Err(LifeLinkError::SelfLink);
    }
    let tx = conn.transaction()?;
    validate_endpoint(&tx, &input.source_node_id, EndpointRole::Source)?;
    validate_endpoint(&tx, &input.target_node_id, EndpointRole::Target)?;

    let duplicate: i64 = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_links WHERE source_node_id=?1 AND target_node_id=?2)",
        params![input.source_node_id, input.target_node_id],
        |row| row.get(0),
    )?;
    if duplicate != 0 {
        return Err(LifeLinkError::Duplicate);
    }
    let outgoing: i64 = tx.query_row(
        "SELECT COUNT(*) FROM life_links WHERE source_node_id=?1",
        [&input.source_node_id],
        |row| row.get(0),
    )?;
    if outgoing >= MAX_OUTGOING_LINKS {
        return Err(LifeLinkError::OutgoingCap);
    }
    let incoming: i64 = tx.query_row(
        "SELECT COUNT(*) FROM life_links WHERE target_node_id=?1",
        [&input.target_node_id],
        |row| row.get(0),
    )?;
    if incoming >= MAX_INCOMING_LINKS {
        return Err(LifeLinkError::IncomingCap);
    }

    let result = LifeLinkMutationResult {
        link_id: uuid::Uuid::now_v7().to_string(),
        source_node_id: input.source_node_id,
        target_node_id: input.target_node_id,
    };
    tx.execute(
        "INSERT INTO life_links(id,source_node_id,target_node_id,created_at) VALUES(?1,?2,?3,?4)",
        params![
            result.link_id,
            result.source_node_id,
            result.target_node_id,
            now()
        ],
    )?;
    tx.commit()?;
    Ok(result)
}

pub fn remove(
    conn: &mut Connection,
    input: RemoveLifeLinkInput,
) -> Result<LifeLinkMutationResult, LifeLinkError> {
    let tx = conn.transaction()?;
    let result = tx
        .query_row(
            "SELECT id,source_node_id,target_node_id FROM life_links WHERE id=?1",
            [&input.link_id],
            |row| {
                Ok(LifeLinkMutationResult {
                    link_id: row.get(0)?,
                    source_node_id: row.get(1)?,
                    target_node_id: row.get(2)?,
                })
            },
        )
        .optional()?
        .ok_or(LifeLinkError::MissingLink)?;
    if tx.execute("DELETE FROM life_links WHERE id=?1", [&input.link_id])? != 1 {
        return Err(LifeLinkError::MissingLink);
    }
    tx.commit()?;
    Ok(result)
}

fn source_projection(
    conn: &Connection,
    source_node_id: &str,
) -> Result<LifeLinkSourceView, LifeLinkError> {
    if !valid_id(source_node_id) || source_node_id == ROOT_ID {
        return Err(LifeLinkError::InvalidSource);
    }
    conn.query_row(
        "SELECT n.title,n.archived_at IS NOT NULL,
                (SELECT COUNT(*) FROM life_nodes child WHERE child.parent_id=n.id AND child.archived_at IS NULL),
                (SELECT COUNT(*) FROM reader_documents d WHERE d.life_node_id=n.id AND d.archived_at IS NULL),
                (SELECT COUNT(*) FROM narrative_documents d WHERE d.life_node_id=n.id AND d.archived_at IS NULL)
         FROM life_nodes n WHERE n.id=?1",
        [source_node_id],
        |row| {
            let title: String = row.get(0)?;
            let archived = row.get::<_, i64>(1)? != 0;
            let children: i64 = row.get(2)?;
            let basic: i64 = row.get(3)?;
            let narrative: i64 = row.get(4)?;
            let reason = if archived {
                Some("This Life leaf is archived.".to_string())
            } else if children != 0 {
                Some("Links are available only for Life leaves.".to_string())
            } else if !matches!((basic, narrative), (1, 0) | (0, 1)) {
                Some("Links require one committed Basic Leaf or Narrative Canvas document.".to_string())
            } else {
                None
            };
            Ok(LifeLinkSourceView {
                node_id: source_node_id.to_string(),
                title,
                eligible: reason.is_none(),
                ineligible_reason: reason,
            })
        },
    )
    .optional()?
    .ok_or(LifeLinkError::InvalidSource)
}

const PANEL_ROWS_SQL: &str = r#"
WITH RECURSIVE paths(id,breadcrumb,depth) AS (
    SELECT id,title,0 FROM life_nodes WHERE parent_id IS NULL
    UNION ALL
    SELECT n.id,paths.breadcrumb || ' / ' || n.title,paths.depth+1
      FROM life_nodes n JOIN paths ON n.parent_id=paths.id WHERE paths.depth<128
), edges(direction,link_id,endpoint_node_id,created_at) AS (
    SELECT 0,id,target_node_id,created_at FROM life_links INDEXED BY life_links_source_idx
      WHERE source_node_id=?1
    UNION ALL
    SELECT 1,id,source_node_id,created_at FROM life_links INDEXED BY life_links_target_idx
      WHERE target_node_id=?1
)
SELECT edges.direction,edges.link_id,edges.endpoint_node_id,
       n.title,n.short_description,n.icon_key,paths.breadcrumb,n.archived_at,
       EXISTS(SELECT 1 FROM life_nodes child WHERE child.parent_id=n.id AND child.archived_at IS NULL),
       rd.id,nd.id,edges.created_at
  FROM edges
  LEFT JOIN life_nodes n ON n.id=edges.endpoint_node_id
  LEFT JOIN paths ON paths.id=n.id
  LEFT JOIN reader_documents rd ON rd.life_node_id=n.id AND rd.archived_at IS NULL
  LEFT JOIN narrative_documents nd ON nd.life_node_id=n.id AND nd.archived_at IS NULL
"#;

fn row_document_kind(basic: bool, narrative: bool) -> Option<LifeLinkDocumentKind> {
    match (basic, narrative) {
        (true, false) => Some(LifeLinkDocumentKind::BasicLeaf),
        (false, true) => Some(LifeLinkDocumentKind::NarrativeCanvas),
        _ => None,
    }
}

fn availability_order(value: &LifeLinkAvailability) -> u8 {
    match value {
        LifeLinkAvailability::Active => 0,
        LifeLinkAvailability::Archived | LifeLinkAvailability::Unavailable => 1,
    }
}

fn compare_rows(left: &LifeLinkRowView, right: &LifeLinkRowView) -> Ordering {
    availability_order(&left.availability)
        .cmp(&availability_order(&right.availability))
        .then_with(|| normalize(&left.title).cmp(&normalize(&right.title)))
        .then_with(|| left.endpoint_node_id.cmp(&right.endpoint_node_id))
        .then_with(|| left.link_id.cmp(&right.link_id))
}

pub fn panel(
    conn: &Connection,
    input: GetLifeLinkPanelInput,
) -> Result<LifeLinkPanel, LifeLinkError> {
    let source = source_projection(conn, &input.source_node_id)?;
    let mut statement = conn.prepare(PANEL_ROWS_SQL)?;
    let rows = statement.query_map([&input.source_node_id], |row| {
        let endpoint_id: String = row.get(2)?;
        let maybe_title = row.get::<_, Option<String>>(3)?;
        let basic = row.get::<_, Option<String>>(9)?.is_some();
        let narrative = row.get::<_, Option<String>>(10)?.is_some();
        let document_kind = row_document_kind(basic, narrative);
        let archived_at = row.get::<_, Option<String>>(7)?;
        let has_children = row.get::<_, Option<i64>>(8)?.unwrap_or(1) != 0;
        let availability = if archived_at.is_some() {
            LifeLinkAvailability::Archived
        } else if maybe_title.is_some() && !has_children && document_kind.is_some() {
            LifeLinkAvailability::Active
        } else {
            LifeLinkAvailability::Unavailable
        };
        Ok((
            row.get::<_, i64>(0)?,
            LifeLinkRowView {
                link_id: row.get(1)?,
                endpoint_node_id: endpoint_id,
                title: maybe_title.unwrap_or_else(|| "Unavailable Life node".into()),
                short_description: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                icon_key: row
                    .get::<_, Option<String>>(5)?
                    .unwrap_or_else(|| "life-note".into()),
                document_kind,
                breadcrumb: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
                availability,
                created_at: row.get(11)?,
            },
        ))
    })?;
    let mut outgoing = Vec::new();
    let mut backlinks = Vec::new();
    for row in rows {
        let (direction, view) = row?;
        if direction == 0 {
            outgoing.push(view);
        } else {
            backlinks.push(view);
        }
    }
    outgoing.sort_by(compare_rows);
    backlinks.sort_by(compare_rows);
    Ok(LifeLinkPanel {
        source,
        outgoing,
        backlinks,
    })
}

const TARGET_SEARCH_SQL: &str = r#"
WITH RECURSIVE paths(id,breadcrumb,depth) AS (
    SELECT id,title,0 FROM life_nodes WHERE parent_id IS NULL
    UNION ALL
    SELECT n.id,paths.breadcrumb || ' / ' || n.title,paths.depth+1
      FROM life_nodes n JOIN paths ON n.parent_id=paths.id WHERE paths.depth<128
)
SELECT n.id,n.title,n.short_description,n.icon_key,paths.breadcrumb,
       CASE WHEN rd.id IS NOT NULL THEN 'basic_leaf' ELSE 'narrative_canvas' END,
       bm25(search_fts,10,3,1) AS rank,sd.normalized_title
  FROM search_fts
  JOIN search_documents sd ON sd.rowid=search_fts.rowid
  JOIN life_nodes n ON n.id=sd.entity_id
  JOIN paths ON paths.id=n.id
  LEFT JOIN reader_documents rd ON rd.life_node_id=n.id AND rd.archived_at IS NULL
  LEFT JOIN narrative_documents nd ON nd.life_node_id=n.id AND nd.archived_at IS NULL
 WHERE search_fts MATCH ?2
   AND sd.entity_kind='life_node'
   AND n.id<>?1
   AND n.id<>'life-root'
   AND n.archived_at IS NULL
   AND NOT EXISTS(SELECT 1 FROM life_nodes child WHERE child.parent_id=n.id AND child.archived_at IS NULL)
   AND ((rd.id IS NOT NULL AND nd.id IS NULL) OR (rd.id IS NULL AND nd.id IS NOT NULL))
   AND NOT EXISTS(SELECT 1 FROM life_links link WHERE link.source_node_id=?1 AND link.target_node_id=n.id)
 ORDER BY rank,sd.normalized_title,n.id
 LIMIT ?3
"#;

pub fn search_targets(
    conn: &Connection,
    input: SearchLifeLinkTargetsInput,
) -> Result<Vec<LifeLinkTargetView>, LifeLinkError> {
    validate_endpoint(conn, &input.source_node_id, EndpointRole::Source)?;
    let normalized = normalize(&input.query);
    if normalized.is_empty() || normalized.chars().count() > MAX_TARGET_QUERY_CHARS {
        return Err(LifeLinkError::InvalidSearchQuery);
    }
    let expression = build_fts_expression(&input.query).ok_or(LifeLinkError::InvalidSearchQuery)?;
    crate::search::repository::refresh_dirty_indexes(conn).map_err(|_| LifeLinkError::Storage)?;
    let mut statement = conn.prepare(TARGET_SEARCH_SQL)?;
    let results = statement
        .query_map(
            params![input.source_node_id, expression, MAX_TARGET_RESULTS],
            |row| {
                Ok(LifeLinkTargetView {
                    node_id: row.get(0)?,
                    title: row.get(1)?,
                    short_description: row.get(2)?,
                    icon_key: row.get(3)?,
                    breadcrumb: row.get(4)?,
                    document_kind: if row.get::<_, String>(5)? == "basic_leaf" {
                        LifeLinkDocumentKind::BasicLeaf
                    } else {
                        LifeLinkDocumentKind::NarrativeCanvas
                    },
                })
            },
        )?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task43_migration::run_all_migrations,
    };

    fn setup() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn add_node(conn: &Connection, parent: &str, title: &str) -> String {
        let id = uuid::Uuid::now_v7().to_string();
        conn.execute(
            "INSERT INTO life_nodes VALUES(?1,?2,?3,'Description','life-leaf','neutral',1,NULL,'1','1',0)",
            params![id, parent, title],
        )
        .unwrap();
        id
    }

    fn add_basic(conn: &Connection, parent: &str, title: &str) -> String {
        let id = add_node(conn, parent, title);
        conn.execute(
            "INSERT INTO reader_documents VALUES(?1,?2,1,0,'{}','body','1','1',NULL)",
            params![uuid::Uuid::now_v7().to_string(), id],
        )
        .unwrap();
        id
    }

    fn add_narrative(conn: &Connection, parent: &str, title: &str) -> String {
        let id = add_node(conn, parent, title);
        conn.execute(
            "INSERT INTO narrative_documents(id,life_node_id,schema_version,revision,canonical_json,plain_text,created_at,updated_at,archived_at,template_id,template_version)
             VALUES(?1,?2,1,0,'{}','body','1','1',NULL,'knowledge_dossier',1)",
            params![uuid::Uuid::now_v7().to_string(), id],
        )
        .unwrap();
        id
    }

    #[test]
    fn basic_and_narrative_directions_reverse_edges_and_stable_removal_work() {
        let mut conn = setup();
        let basic = add_basic(&conn, ROOT_ID, "Basic");
        let narrative = add_narrative(&conn, ROOT_ID, "Narrative");
        let forward = create(
            &mut conn,
            CreateLifeLinkInput {
                source_node_id: basic.clone(),
                target_node_id: narrative.clone(),
            },
        )
        .unwrap();
        create(
            &mut conn,
            CreateLifeLinkInput {
                source_node_id: narrative.clone(),
                target_node_id: basic.clone(),
            },
        )
        .unwrap();
        let basic_panel = panel(
            &conn,
            GetLifeLinkPanelInput {
                source_node_id: basic.clone(),
            },
        )
        .unwrap();
        assert_eq!(basic_panel.outgoing.len(), 1);
        assert_eq!(basic_panel.backlinks.len(), 1);
        assert_eq!(basic_panel.outgoing[0].endpoint_node_id, narrative);
        remove(
            &mut conn,
            RemoveLifeLinkInput {
                link_id: forward.link_id,
            },
        )
        .unwrap();
        let after = panel(
            &conn,
            GetLifeLinkPanelInput {
                source_node_id: basic,
            },
        )
        .unwrap();
        assert!(after.outgoing.is_empty());
        assert_eq!(after.backlinks.len(), 1);
    }

    #[test]
    fn invalid_endpoint_and_duplicate_errors_are_typed_and_atomic() {
        let mut conn = setup();
        let source = add_basic(&conn, ROOT_ID, "Source");
        let target = add_basic(&conn, ROOT_ID, "Target");
        let branch = add_node(&conn, ROOT_ID, "Branch");
        let _child = add_node(&conn, &branch, "Child");
        let documentless = add_node(&conn, ROOT_ID, "Documentless");
        let archived = add_basic(&conn, ROOT_ID, "Archived");
        conn.execute(
            "UPDATE life_nodes SET archived_at='1' WHERE id=?1",
            [&archived],
        )
        .unwrap();

        let attempt = |conn: &mut Connection, source_id: &str, target_id: &str| {
            create(
                conn,
                CreateLifeLinkInput {
                    source_node_id: source_id.into(),
                    target_node_id: target_id.into(),
                },
            )
        };
        assert_eq!(
            attempt(&mut conn, &source, &source),
            Err(LifeLinkError::SelfLink)
        );
        assert_eq!(
            attempt(&mut conn, ROOT_ID, &target),
            Err(LifeLinkError::InvalidSource)
        );
        assert_eq!(
            attempt(&mut conn, &source, &branch),
            Err(LifeLinkError::TargetNotLeaf)
        );
        assert_eq!(
            attempt(&mut conn, &source, &documentless),
            Err(LifeLinkError::TargetMissingDocument)
        );
        assert_eq!(
            attempt(&mut conn, &source, &archived),
            Err(LifeLinkError::ArchivedTarget)
        );
        attempt(&mut conn, &source, &target).unwrap();
        assert_eq!(
            attempt(&mut conn, &source, &target),
            Err(LifeLinkError::Duplicate)
        );
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM life_links", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
    }

    #[test]
    fn projection_is_live_and_preserves_archived_edges() {
        let mut conn = setup();
        let parent = add_node(&conn, ROOT_ID, "Parent");
        let source = add_basic(&conn, ROOT_ID, "Zulu");
        let target = add_narrative(&conn, &parent, "Đường");
        let created = create(
            &mut conn,
            CreateLifeLinkInput {
                source_node_id: source.clone(),
                target_node_id: target.clone(),
            },
        )
        .unwrap();
        let edge_before: (String, String, String) = conn
            .query_row(
                "SELECT source_node_id,target_node_id,created_at FROM life_links WHERE id=?1",
                [&created.link_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        conn.execute(
            "UPDATE life_nodes SET title='Renamed' WHERE id=?1",
            [&target],
        )
        .unwrap();
        conn.execute(
            "UPDATE life_nodes SET parent_id='life-root' WHERE id=?1",
            [&target],
        )
        .unwrap();
        let renamed = panel(
            &conn,
            GetLifeLinkPanelInput {
                source_node_id: source.clone(),
            },
        )
        .unwrap();
        assert_eq!(renamed.outgoing[0].title, "Renamed");
        assert_eq!(renamed.outgoing[0].breadcrumb, "Life / Renamed");
        conn.execute(
            "UPDATE life_nodes SET archived_at='1' WHERE id=?1",
            [&target],
        )
        .unwrap();
        let archived = panel(
            &conn,
            GetLifeLinkPanelInput {
                source_node_id: source.clone(),
            },
        )
        .unwrap();
        assert_eq!(
            archived.outgoing[0].availability,
            LifeLinkAvailability::Archived
        );
        conn.execute(
            "UPDATE life_nodes SET archived_at=NULL WHERE id=?1",
            [&target],
        )
        .unwrap();
        assert_eq!(
            panel(
                &conn,
                GetLifeLinkPanelInput {
                    source_node_id: source,
                },
            )
            .unwrap()
            .outgoing[0]
                .availability,
            LifeLinkAvailability::Active
        );
        let edge_after: (String, String, String) = conn
            .query_row(
                "SELECT source_node_id,target_node_id,created_at FROM life_links WHERE id=?1",
                [&created.link_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        assert_eq!(edge_before, edge_after);
    }

    #[test]
    fn missing_document_preserves_edge_and_disables_projection() {
        let mut conn = setup();
        let source = add_basic(&conn, ROOT_ID, "Source");
        let target = add_basic(&conn, ROOT_ID, "Target");
        create(
            &mut conn,
            CreateLifeLinkInput {
                source_node_id: source.clone(),
                target_node_id: target.clone(),
            },
        )
        .unwrap();
        conn.execute(
            "UPDATE reader_documents SET archived_at='1' WHERE life_node_id=?1",
            [&target],
        )
        .unwrap();
        let view = panel(
            &conn,
            GetLifeLinkPanelInput {
                source_node_id: source,
            },
        )
        .unwrap();
        assert_eq!(
            view.outgoing[0].availability,
            LifeLinkAvailability::Unavailable
        );
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM life_links", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
    }

    #[test]
    fn missing_and_double_remove_are_safe_and_unrelated_edges_remain() {
        let mut conn = setup();
        let a = add_basic(&conn, ROOT_ID, "A");
        let b = add_basic(&conn, ROOT_ID, "B");
        let c = add_basic(&conn, ROOT_ID, "C");
        let ab = create(
            &mut conn,
            CreateLifeLinkInput {
                source_node_id: a.clone(),
                target_node_id: b,
            },
        )
        .unwrap();
        create(
            &mut conn,
            CreateLifeLinkInput {
                source_node_id: a,
                target_node_id: c,
            },
        )
        .unwrap();
        remove(
            &mut conn,
            RemoveLifeLinkInput {
                link_id: ab.link_id.clone(),
            },
        )
        .unwrap();
        assert_eq!(
            remove(
                &mut conn,
                RemoveLifeLinkInput {
                    link_id: ab.link_id
                }
            ),
            Err(LifeLinkError::MissingLink)
        );
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM life_links", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
    }
}
