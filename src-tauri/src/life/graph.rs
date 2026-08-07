//! Read-only projection of the active Life hierarchy plus existing explicit directed Life links.
//!
//! This module reads and returns. It writes nothing: no row, no tree revision, no operation ledger
//! entry, no navigation preference. Every relationship it reports already exists — hierarchy edges
//! come from `life_nodes.parent_id` and link edges come from `life_links` rows created through the
//! Task 41 flow. Nothing is inferred, derived, typed, or weighted.

use rusqlite::Connection;
use std::collections::HashMap;

use super::{domain::ROOT_ID, dto::*, repository::LifeError};

/// Bounds are refusals, never truncations. A partial graph that silently omits nodes or
/// relationships is worse than no graph, because the user would draw conclusions from a picture that
/// is not the truth.
pub const MAX_GRAPH_NODES: i64 = 500;
pub const MAX_GRAPH_LINKS: i64 = 2_000;
/// Matches the breadcrumb recursion bound already used by `life_link::repository`.
pub const MAX_GRAPH_DEPTH: i64 = 128;

const TOO_MANY_NODES: &str =
    "This Life tree is too large for the graph explorer (500 node maximum).";
const TOO_MANY_LINKS: &str =
    "This Life tree has too many links for the graph explorer (2,000 link maximum).";
const TOO_DEEP: &str = "This Life tree is too deep for the graph explorer (128 level maximum).";

/// The connected active tree reachable from the Life root through non-archived parent edges, in the
/// same deterministic path order Life Edit already uses.
///
/// The recursion guard is bound one level beyond `MAX_GRAPH_DEPTH` so an over-deep tree produces a
/// detectable row instead of being silently cut, and the row limit is bound one past
/// `MAX_GRAPH_NODES` so an over-large tree is detected without loading it.
const NODES_SQL: &str = r#"
WITH RECURSIVE tree(id,parent_id,title,icon_key,sort_key,depth,path) AS (
    SELECT id,parent_id,title,icon_key,sort_key,0,printf('%010d:%s',sort_key,id)
      FROM life_nodes
      WHERE id=(SELECT root_node_id FROM life_tree_meta WHERE singleton=1)
        AND archived_at IS NULL
    UNION ALL
    SELECT n.id,n.parent_id,n.title,n.icon_key,n.sort_key,t.depth+1,
           t.path||'/'||printf('%010d:%s',n.sort_key,n.id)
      FROM life_nodes n JOIN tree t ON n.parent_id=t.id
      WHERE n.archived_at IS NULL AND t.depth<?1
), counts AS (
    SELECT parent_id,COUNT(*) count FROM life_nodes WHERE archived_at IS NULL GROUP BY parent_id
)
SELECT t.id,t.parent_id,t.title,t.icon_key,t.sort_key,t.depth,COALESCE(c.count,0)
  FROM tree t LEFT JOIN counts c ON c.parent_id=t.id
  ORDER BY t.path
  LIMIT ?2
"#;

/// Existing links whose source *and* target are both members of the same active tree.
///
/// A link with an endpoint outside that set has no node to attach to and is therefore absent. This
/// is the definition of the projection, not truncation: the row itself is never deleted, disabled,
/// or altered, and the Links panel remains the authority for archived and unavailable endpoints.
const LINKS_SQL: &str = r#"
WITH RECURSIVE tree(id,depth) AS (
    SELECT id,0 FROM life_nodes
      WHERE id=(SELECT root_node_id FROM life_tree_meta WHERE singleton=1)
        AND archived_at IS NULL
    UNION ALL
    SELECT n.id,t.depth+1 FROM life_nodes n JOIN tree t ON n.parent_id=t.id
      WHERE n.archived_at IS NULL AND t.depth<?1
)
SELECT l.id,l.source_node_id,l.target_node_id
  FROM life_links l
  JOIN tree source ON source.id=l.source_node_id
  JOIN tree target ON target.id=l.target_node_id
  ORDER BY l.source_node_id,l.target_node_id,l.id
  LIMIT ?2
"#;

/// Project the active Life hierarchy and the explicit links drawn between its members.
///
/// Two bounded projection statements plus one constant-time singleton revision read. There is no
/// per-node query and no N+1.
pub fn projection(conn: &Connection) -> Result<LifeGraphProjection, LifeError> {
    let depth_probe = MAX_GRAPH_DEPTH + 1;

    let mut statement = conn.prepare(NODES_SQL)?;
    let mut nodes = statement
        .query_map([depth_probe, MAX_GRAPH_NODES + 1], |row| {
            let child_count: i32 = row.get(6)?;
            Ok(LifeGraphNodeView {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                title: row.get(2)?,
                icon_key: row.get(3)?,
                sort_key: row.get(4)?,
                depth: row.get(5)?,
                is_leaf: child_count == 0,
                outgoing_link_count: 0,
                incoming_link_count: 0,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    // Bound order is fixed so a tree breaching more than one bound always reports the same reason.
    if nodes.len() as i64 > MAX_GRAPH_NODES {
        return Err(LifeError::Validation(TOO_MANY_NODES));
    }
    if nodes
        .iter()
        .any(|node| i64::from(node.depth) > MAX_GRAPH_DEPTH)
    {
        return Err(LifeError::Validation(TOO_DEEP));
    }

    let mut link_statement = conn.prepare(LINKS_SQL)?;
    let links = link_statement
        .query_map([depth_probe, MAX_GRAPH_LINKS + 1], |row| {
            Ok(LifeGraphLinkView {
                link_id: row.get(0)?,
                source_node_id: row.get(1)?,
                target_node_id: row.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    if links.len() as i64 > MAX_GRAPH_LINKS {
        return Err(LifeError::Validation(TOO_MANY_LINKS));
    }

    // Counts are derived from the already-bounded link list rather than queried per node.
    let mut outgoing: HashMap<&str, i32> = HashMap::new();
    let mut incoming: HashMap<&str, i32> = HashMap::new();
    for link in &links {
        *outgoing.entry(link.source_node_id.as_str()).or_default() += 1;
        *incoming.entry(link.target_node_id.as_str()).or_default() += 1;
    }
    for node in &mut nodes {
        node.outgoing_link_count = outgoing.get(node.id.as_str()).copied().unwrap_or(0);
        node.incoming_link_count = incoming.get(node.id.as_str()).copied().unwrap_or(0);
    }

    Ok(LifeGraphProjection {
        root_id: ROOT_ID.into(),
        tree_revision: super::edit::tree_revision(conn)?,
        nodes,
        links,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task43_migration::run_all_migrations,
    };
    use rusqlite::params;

    fn setup() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    fn add_node(conn: &Connection, parent: &str, title: &str, sort_key: i32) -> String {
        let id = uuid::Uuid::now_v7().to_string();
        conn.execute(
            "INSERT INTO life_nodes VALUES(?1,?2,?3,'Description','life-leaf','neutral',?4,NULL,'1','1',0)",
            params![id, parent, title, sort_key],
        )
        .unwrap();
        id
    }

    fn archive(conn: &Connection, id: &str) {
        conn.execute(
            "UPDATE life_nodes SET archived_at='1' WHERE id=?1",
            params![id],
        )
        .unwrap();
    }

    fn add_link(conn: &Connection, source: &str, target: &str) -> String {
        let id = uuid::Uuid::now_v7().to_string();
        conn.execute(
            "INSERT INTO life_links VALUES(?1,?2,?3,'1')",
            params![id, source, target],
        )
        .unwrap();
        id
    }

    fn message(error: LifeError) -> &'static str {
        match error {
            LifeError::Validation(value) => value,
            other => panic!("expected validation, got {other:?}"),
        }
    }

    #[test]
    fn projects_the_active_hierarchy_in_deterministic_path_order() {
        let conn = setup();
        let alpha = add_node(&conn, ROOT_ID, "Alpha", 1);
        let beta = add_node(&conn, ROOT_ID, "Beta", 2);
        let alpha_child = add_node(&conn, &alpha, "Alpha child", 1);

        let value = projection(&conn).unwrap();

        assert_eq!(value.root_id, ROOT_ID);
        let ids: Vec<&str> = value.nodes.iter().map(|node| node.id.as_str()).collect();
        assert_eq!(
            ids,
            vec![ROOT_ID, alpha.as_str(), alpha_child.as_str(), beta.as_str()]
        );
        let depths: Vec<i32> = value.nodes.iter().map(|node| node.depth).collect();
        assert_eq!(depths, vec![0, 1, 2, 1]);
        let leaves: Vec<bool> = value.nodes.iter().map(|node| node.is_leaf).collect();
        assert_eq!(leaves, vec![false, false, true, true]);
        assert_eq!(value.nodes[1].parent_id.as_deref(), Some(ROOT_ID));
        assert!(value.links.is_empty());
    }

    #[test]
    fn ordering_is_stable_across_repeated_calls() {
        let conn = setup();
        let alpha = add_node(&conn, ROOT_ID, "Alpha", 1);
        let beta = add_node(&conn, ROOT_ID, "Beta", 1);
        add_link(&conn, &alpha, &beta);
        add_link(&conn, &beta, &alpha);

        let first = projection(&conn).unwrap();
        let second = projection(&conn).unwrap();
        assert_eq!(first, second);
    }

    #[test]
    fn projects_existing_explicit_links_with_direction_and_counts() {
        let conn = setup();
        let alpha = add_node(&conn, ROOT_ID, "Alpha", 1);
        let beta = add_node(&conn, ROOT_ID, "Beta", 2);
        let gamma = add_node(&conn, ROOT_ID, "Gamma", 3);
        let first = add_link(&conn, &alpha, &beta);
        let second = add_link(&conn, &alpha, &gamma);

        let value = projection(&conn).unwrap();

        let mut expected = vec![
            (first.clone(), alpha.clone(), beta.clone()),
            (second.clone(), alpha.clone(), gamma.clone()),
        ];
        expected.sort_by(|left, right| {
            left.1
                .cmp(&right.1)
                .then_with(|| left.2.cmp(&right.2))
                .then_with(|| left.0.cmp(&right.0))
        });
        let actual: Vec<(String, String, String)> = value
            .links
            .iter()
            .map(|link| {
                (
                    link.link_id.clone(),
                    link.source_node_id.clone(),
                    link.target_node_id.clone(),
                )
            })
            .collect();
        assert_eq!(actual, expected);

        let node = |id: &str| {
            value
                .nodes
                .iter()
                .find(|node| node.id == id)
                .expect("node present")
        };
        assert_eq!(node(&alpha).outgoing_link_count, 2);
        assert_eq!(node(&alpha).incoming_link_count, 0);
        assert_eq!(node(&beta).outgoing_link_count, 0);
        assert_eq!(node(&beta).incoming_link_count, 1);
        assert_eq!(node(&gamma).incoming_link_count, 1);
    }

    #[test]
    fn excludes_archived_nodes_and_everything_below_an_archived_edge() {
        let conn = setup();
        let active = add_node(&conn, ROOT_ID, "Active", 1);
        let branch = add_node(&conn, ROOT_ID, "Branch", 2);
        let buried = add_node(&conn, &branch, "Buried", 1);
        let deeper = add_node(&conn, &buried, "Deeper", 1);
        let archived_leaf = add_node(&conn, ROOT_ID, "Archived leaf", 3);
        archive(&conn, &branch);
        archive(&conn, &archived_leaf);

        let value = projection(&conn).unwrap();

        let ids: Vec<&str> = value.nodes.iter().map(|node| node.id.as_str()).collect();
        assert_eq!(ids, vec![ROOT_ID, active.as_str()]);
        assert!(!ids.contains(&buried.as_str()));
        assert!(!ids.contains(&deeper.as_str()));
    }

    #[test]
    fn a_link_with_an_excluded_endpoint_is_absent_and_its_row_is_untouched() {
        let conn = setup();
        let active = add_node(&conn, ROOT_ID, "Active", 1);
        let archived = add_node(&conn, ROOT_ID, "Archived", 2);
        let outgoing = add_link(&conn, &active, &archived);
        let incoming = add_link(&conn, &archived, &active);
        archive(&conn, &archived);

        let value = projection(&conn).unwrap();

        assert!(value.links.is_empty(), "excluded endpoints project no edge");
        let node = value
            .nodes
            .iter()
            .find(|node| node.id == active)
            .expect("active node present");
        assert_eq!(node.outgoing_link_count, 0);
        assert_eq!(node.incoming_link_count, 0);

        // The rows themselves are never deleted, disabled, or altered: Task 41 owns them.
        for link_id in [&outgoing, &incoming] {
            let stored: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM life_links WHERE id=?1",
                    params![link_id],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(stored, 1, "link row {link_id} must survive untouched");
        }
    }

    #[test]
    fn projects_a_root_only_tree_which_is_the_smallest_reachable_graph() {
        let conn = setup();
        let single = projection(&conn).unwrap();
        assert_eq!(single.nodes.len(), 1);
        assert_eq!(single.nodes[0].id, ROOT_ID);
        assert_eq!(single.nodes[0].parent_id, None);
        assert_eq!(single.nodes[0].depth, 0);
        assert!(single.nodes[0].is_leaf);
        assert!(single.links.is_empty());
        assert_eq!(single.root_id, ROOT_ID);

        // A truly empty projection is unreachable: the Life root is protected against archiving, so
        // the graph always has at least one node to draw.
        let refused = conn
            .execute(
                "UPDATE life_nodes SET archived_at='1' WHERE id=?1",
                params![ROOT_ID],
            )
            .unwrap_err();
        assert!(
            refused.to_string().contains("protected life root"),
            "unexpected error: {refused}"
        );
    }

    #[test]
    fn accepts_the_node_bound_and_rejects_one_past_it_without_a_partial_payload() {
        let conn = setup();
        // The root already occupies one slot of the bound.
        for index in 0..(MAX_GRAPH_NODES - 1) {
            add_node(&conn, ROOT_ID, &format!("Node {index}"), index as i32);
        }
        let accepted = projection(&conn).unwrap();
        assert_eq!(accepted.nodes.len() as i64, MAX_GRAPH_NODES);

        add_node(&conn, ROOT_ID, "Node overflow", 9_999);
        let rejected = projection(&conn).unwrap_err();
        assert_eq!(message(rejected), TOO_MANY_NODES);
    }

    #[test]
    fn accepts_the_link_bound_and_rejects_one_past_it_without_a_partial_payload() {
        let conn = setup();
        // Two hubs plus enough leaves to draw the bound, all well inside the node bound.
        let source = add_node(&conn, ROOT_ID, "Source", 1);
        let mut targets = Vec::new();
        // 46 targets give 46*45 = 2,070 ordered pairs, enough to draw the bound exactly.
        for index in 0..46 {
            targets.push(add_node(
                &conn,
                ROOT_ID,
                &format!("Target {index}"),
                index + 2,
            ));
        }
        let mut drawn = 0;
        'outer: for left in &targets {
            for right in &targets {
                if left == right {
                    continue;
                }
                add_link(&conn, left, right);
                drawn += 1;
                if drawn == MAX_GRAPH_LINKS {
                    break 'outer;
                }
            }
        }
        let accepted = projection(&conn).unwrap();
        assert_eq!(accepted.links.len() as i64, MAX_GRAPH_LINKS);

        add_link(&conn, &source, &targets[0]);
        let rejected = projection(&conn).unwrap_err();
        assert_eq!(message(rejected), TOO_MANY_LINKS);
    }

    #[test]
    fn accepts_the_depth_bound_and_rejects_one_past_it_without_a_partial_payload() {
        let conn = setup();
        let mut parent = ROOT_ID.to_string();
        // The root sits at depth 0, so MAX_GRAPH_DEPTH further generations reach the bound exactly.
        for index in 0..MAX_GRAPH_DEPTH {
            parent = add_node(&conn, &parent, &format!("Level {index}"), 1);
        }
        let accepted = projection(&conn).unwrap();
        assert_eq!(
            accepted.nodes.iter().map(|node| node.depth).max(),
            Some(MAX_GRAPH_DEPTH as i32)
        );

        add_node(&conn, &parent, "Too deep", 1);
        let rejected = projection(&conn).unwrap_err();
        assert_eq!(message(rejected), TOO_DEEP);
    }

    #[test]
    fn bound_refusals_report_a_fixed_reason_when_more_than_one_bound_breaks() {
        let conn = setup();
        let mut parent = ROOT_ID.to_string();
        for index in 0..(MAX_GRAPH_DEPTH + 1) {
            parent = add_node(&conn, &parent, &format!("Level {index}"), 1);
        }
        assert_eq!(message(projection(&conn).unwrap_err()), TOO_DEEP);
        for index in 0..MAX_GRAPH_NODES {
            add_node(&conn, ROOT_ID, &format!("Wide {index}"), index as i32);
        }
        // Node count is checked before depth, so the reason stays deterministic.
        assert_eq!(message(projection(&conn).unwrap_err()), TOO_MANY_NODES);
    }

    #[test]
    fn the_projection_writes_nothing() {
        let conn = setup();
        let alpha = add_node(&conn, ROOT_ID, "Alpha", 1);
        let beta = add_node(&conn, ROOT_ID, "Beta", 2);
        add_link(&conn, &alpha, &beta);

        let fingerprint = |conn: &Connection| -> Vec<(String, i64)> {
            let mut names: Vec<String> = conn
                .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                .unwrap()
                .query_map([], |row| row.get(0))
                .unwrap()
                .collect::<Result<_, _>>()
                .unwrap();
            names.retain(|name: &String| !name.starts_with("sqlite_"));
            names
                .into_iter()
                .map(|name| {
                    let count: i64 = conn
                        .query_row(&format!("SELECT COUNT(*) FROM \"{name}\""), [], |row| {
                            row.get(0)
                        })
                        .unwrap();
                    (name, count)
                })
                .collect()
        };

        let before = fingerprint(&conn);
        let before_revision: i32 = conn
            .query_row(
                "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let before_change = conn.total_changes();

        let value = projection(&conn).unwrap();
        assert_eq!(value.tree_revision, before_revision);

        assert_eq!(fingerprint(&conn), before, "no row count may change");
        assert_eq!(
            conn.total_changes(),
            before_change,
            "the projection must issue no INSERT, UPDATE, or DELETE"
        );
        let after_revision: i32 = conn
            .query_row(
                "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(after_revision, before_revision);
    }

    /// `rusqlite`'s `trace` and `hooks` features are both disabled, so runtime statement counting
    /// is unavailable without a dependency change for test-only instrumentation. This asserts the
    /// same invariant on the module's own production source instead: a per-node query added to
    /// either loop would introduce a third prepared statement and fail here.
    #[test]
    fn the_projection_prepares_exactly_two_statements_and_none_per_node() {
        let source = include_str!("graph.rs");
        let production = source
            .split("#[cfg(test)]")
            .next()
            .expect("production half of the module");

        assert_eq!(
            production.matches("conn.prepare(").count(),
            2,
            "exactly two bounded projection statements are allowed"
        );
        assert_eq!(
            production.matches("query_row(").count(),
            0,
            "the revision read is delegated, and no ad-hoc row query may be added"
        );

        // Both statements are bound only by the depth probe and the row limit. Neither takes a node
        // identifier, so neither can be re-executed per node.
        for sql in [NODES_SQL, LINKS_SQL] {
            assert_eq!(sql.matches('?').count(), 2, "{sql}");
            assert!(sql.contains("?1") && sql.contains("?2"));
        }
    }

    #[test]
    fn counts_stay_correct_on_a_wide_tree_without_growing_the_query_plan() {
        let conn = setup();
        let hub = add_node(&conn, ROOT_ID, "Hub", 0);
        let mut leaves = Vec::new();
        for index in 0..200 {
            leaves.push(add_node(
                &conn,
                ROOT_ID,
                &format!("Leaf {index}"),
                index + 1,
            ));
        }
        for leaf in &leaves {
            add_link(&conn, &hub, leaf);
        }

        let value = projection(&conn).unwrap();

        assert_eq!(value.nodes.len(), 202);
        assert_eq!(value.links.len(), 200);
        let hub_view = value
            .nodes
            .iter()
            .find(|node| node.id == hub)
            .expect("hub present");
        assert_eq!(hub_view.outgoing_link_count, 200);
        assert_eq!(hub_view.incoming_link_count, 0);
        assert!(
            value
                .nodes
                .iter()
                .filter(|node| leaves.contains(&node.id))
                .all(|node| node.incoming_link_count == 1 && node.outgoing_link_count == 0)
        );
    }
}
