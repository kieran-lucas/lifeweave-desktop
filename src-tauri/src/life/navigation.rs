use super::{domain::ROOT_ID, repository::LifeError};
use rusqlite::{Connection, OptionalExtension, params};

pub fn resolve_node(
    conn: &Connection,
    requested: Option<&str>,
) -> Result<(String, bool), LifeError> {
    let preferred = requested
        .map(str::to_owned)
        .or_else(|| {
            conn.query_row(
                "SELECT last_life_node_id FROM life_navigation_preferences WHERE singleton=1",
                [],
                |r| r.get(0),
            )
            .optional()
            .ok()
            .flatten()
        })
        .unwrap_or_else(|| ROOT_ID.into());
    let active: Option<String> = conn
        .query_row(
            "SELECT id FROM life_nodes WHERE id=?1 AND archived_at IS NULL",
            params![preferred],
            |r| r.get(0),
        )
        .optional()?;
    if let Some(id) = active {
        return Ok((id, false));
    }
    let ancestor:Option<String>=conn.query_row("WITH RECURSIVE ancestors(id,parent_id,archived_at,depth) AS (SELECT id,parent_id,archived_at,0 FROM life_nodes WHERE id=?1 UNION ALL SELECT n.id,n.parent_id,n.archived_at,a.depth+1 FROM life_nodes n JOIN ancestors a ON n.id=a.parent_id WHERE a.depth<128) SELECT id FROM ancestors WHERE archived_at IS NULL ORDER BY depth LIMIT 1",params![preferred],|r|r.get(0)).optional()?;
    Ok((ancestor.unwrap_or_else(|| ROOT_ID.into()), true))
}
