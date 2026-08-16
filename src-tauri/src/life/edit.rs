use super::{
    domain::{self, ROOT_ID},
    dto::*,
    repository::LifeError,
};
use crate::tag::repository as tag_repo;
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::{NoContext, Timestamp, Uuid};

const UNDO_RETAINED: i64 = 100;
const MAX_ARCHIVE_NODES: usize = 4_000;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum Before {
    Empty,
    Text {
        value: String,
    },
    Metadata {
        description: String,
        icon: String,
        theme: String,
        #[serde(default = "default_direction_confidence")]
        direction_confidence: String,
    },
    Appearance {
        value: String,
    },
    Archive {
        active_ids: Vec<String>,
    },
    Restore,
    Move {
        parent_id: String,
        index: i32,
    },
    Expired,
}

fn default_direction_confidence() -> String {
    "exploring".into()
}

#[derive(Debug, Serialize, Deserialize)]
struct After {
    fingerprint: String,
    node_id: String,
}

fn now() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
        .to_string()
}

fn new_id() -> String {
    Uuid::new_v7(Timestamp::now(NoContext)).to_string()
}

fn fingerprint<T: Serialize>(value: &T) -> Result<String, LifeError> {
    let bytes =
        serde_json::to_vec(value).map_err(|_| LifeError::Validation("Invalid operation."))?;
    Ok(format!("{:x}", Sha256::digest(bytes)))
}

fn valid_operation(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}

pub(super) fn tree_revision(conn: &Connection) -> Result<i32, LifeError> {
    Ok(conn.query_row(
        "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
        [],
        |row| row.get(0),
    )?)
}

fn check_context(conn: &Connection, context: &LifeOperationContext) -> Result<(), LifeError> {
    if !valid_operation(&context.operation_id) || context.expected_tree_revision < 0 {
        return Err(LifeError::Validation("Choose a valid Life operation."));
    }
    if tree_revision(conn)? != context.expected_tree_revision {
        return Err(LifeError::Stale);
    }
    Ok(())
}

fn replay(
    conn: &Connection,
    context: &LifeOperationContext,
    expected_kind: &str,
    expected_fingerprint: &str,
) -> Result<Option<LifeMutationResult>, LifeError> {
    let row: Option<(String, String, i32, Option<String>)> = conn
        .query_row(
            "SELECT operation_kind,after_payload,tree_revision_after,undone_at FROM life_operations WHERE operation_id=?1",
            params![context.operation_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .optional()?;
    let Some((kind, payload, revision, undone)) = row else {
        return Ok(None);
    };
    let after: After = serde_json::from_str(&payload)
        .map_err(|_| LifeError::Validation("Stored Life operation is invalid."))?;
    if kind != expected_kind || after.fingerprint != expected_fingerprint || undone.is_some() {
        return Err(LifeError::Validation("Operation ID was already used."));
    }
    Ok(Some(result(
        conn,
        &after.node_id,
        revision,
        Some(context.operation_id.clone()),
    )?))
}

fn edit_node(
    conn: &Connection,
    id: &str,
    include_archived: bool,
) -> Result<LifeEditNodeView, LifeError> {
    conn.query_row(
        "SELECT n.id,n.parent_id,n.title,n.short_description,n.icon_key,n.branch_theme_id,n.sort_key,0,
                (SELECT COUNT(*) FROM life_nodes c WHERE c.parent_id=n.id AND c.archived_at IS NULL),
                EXISTS(SELECT 1 FROM reader_documents d WHERE d.life_node_id=n.id)
                  OR EXISTS(SELECT 1 FROM narrative_documents d WHERE d.life_node_id=n.id),
                EXISTS(SELECT 1 FROM life_node_pins p WHERE p.node_id=n.id),n.revision,
                COALESCE((SELECT level FROM life_node_direction_confidence d WHERE d.node_id=n.id),'exploring')
         FROM life_nodes n WHERE n.id=?1 AND (?2 OR n.archived_at IS NULL)",
        params![id, include_archived],
        |r| {
            let count: i32 = r.get(8)?;
            Ok(LifeEditNodeView {
                id: r.get(0)?, parent_id: r.get(1)?, title: r.get(2)?,
                short_description: r.get(3)?, icon_key: r.get(4)?, theme_variant: r.get(5)?,
                sort_key: r.get(6)?, depth: r.get(7)?, child_count: count,
                is_leaf: count == 0, has_document: r.get(9)?, is_pinned: r.get(10)?,
                revision: r.get(11)?,
                direction_confidence: r.get(12)?,
                tags: vec![],
            })
        },
    )
    .optional()?
    .ok_or(LifeError::NotFound)
}

fn as_browse(value: LifeEditNodeView) -> LifeNodeView {
    LifeNodeView {
        id: value.id,
        title: value.title,
        short_description: value.short_description,
        icon_key: value.icon_key,
        branch_theme_id: value.theme_variant,
        child_count: value.child_count,
        is_leaf: value.is_leaf,
        is_pinned: value.is_pinned,
        revision: value.revision,
        tags: value.tags,
    }
}

fn result(
    conn: &Connection,
    id: &str,
    revision: i32,
    token: Option<String>,
) -> Result<LifeMutationResult, LifeError> {
    Ok(LifeMutationResult {
        node: as_browse(edit_node(conn, id, true)?),
        tree_revision: revision,
        invalidation: vec![
            "life-edit".into(),
            "life-browse".into(),
            "life-pinned".into(),
            "life-reader".into(),
        ],
        undo_token: token,
    })
}

fn finish(
    tx: &Transaction<'_>,
    context: &LifeOperationContext,
    kind: &str,
    node_id: &str,
    before: &Before,
    fingerprint: &str,
) -> Result<i32, LifeError> {
    let before_json = serde_json::to_string(before)
        .map_err(|_| LifeError::Validation("Life operation is too large."))?;
    if before_json.len() > 262_144 {
        return Err(LifeError::Validation(
            "Life operation is too large to undo safely.",
        ));
    }
    let before_revision = context.expected_tree_revision;
    tx.execute(
        "UPDATE life_tree_meta SET tree_revision=tree_revision+1 WHERE singleton=1",
        [],
    )?;
    let after_revision = before_revision + 1;
    let after_json = serde_json::to_string(&After {
        fingerprint: fingerprint.to_owned(),
        node_id: node_id.to_owned(),
    })
    .map_err(|_| LifeError::Validation("Invalid operation."))?;
    tx.execute(
        "INSERT INTO life_operations VALUES(?1,?2,?3,?4,?5,?6,?7,?8,NULL)",
        params![
            context.operation_id,
            kind,
            node_id,
            before_json,
            after_json,
            before_revision,
            after_revision,
            now()
        ],
    )?;
    tx.execute(
        "UPDATE life_operations SET before_payload='{\"kind\":\"expired\"}' WHERE operation_id IN (
           SELECT operation_id FROM life_operations WHERE undone_at IS NULL ORDER BY tree_revision_after DESC LIMIT -1 OFFSET ?1
         )",
        params![UNDO_RETAINED],
    )?;
    Ok(after_revision)
}

fn check_node(
    tx: &Transaction<'_>,
    id: &str,
    expected: i32,
    active: bool,
) -> Result<(), LifeError> {
    let revision: Option<i32> = tx
        .query_row(
            "SELECT revision FROM life_nodes WHERE id=?1 AND (?2 OR archived_at IS NULL)",
            params![id, !active],
            |r| r.get(0),
        )
        .optional()?;
    match revision {
        None => Err(LifeError::NotFound),
        Some(value) if value != expected => Err(LifeError::Stale),
        Some(_) => Ok(()),
    }
}

pub fn projection(conn: &Connection) -> Result<LifeEditProjection, LifeError> {
    let sql = "WITH RECURSIVE tree(id,parent_id,title,short_description,icon_key,theme,sort_key,revision,depth,path) AS (
      SELECT id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,revision,0,printf('%010d:%s',sort_key,id)
        FROM life_nodes WHERE id=(SELECT root_node_id FROM life_tree_meta WHERE singleton=1) AND archived_at IS NULL
      UNION ALL
      SELECT n.id,n.parent_id,n.title,n.short_description,n.icon_key,n.branch_theme_id,n.sort_key,n.revision,t.depth+1,t.path||'/'||printf('%010d:%s',n.sort_key,n.id)
        FROM life_nodes n JOIN tree t ON n.parent_id=t.id WHERE n.archived_at IS NULL AND t.depth<4096
    ), counts AS (SELECT parent_id,COUNT(*) count FROM life_nodes WHERE archived_at IS NULL GROUP BY parent_id)
    SELECT t.id,t.parent_id,t.title,t.short_description,t.icon_key,t.theme,t.sort_key,t.depth,COALESCE(c.count,0),
           EXISTS(SELECT 1 FROM reader_documents d WHERE d.life_node_id=t.id)
             OR EXISTS(SELECT 1 FROM narrative_documents d WHERE d.life_node_id=t.id),
           EXISTS(SELECT 1 FROM life_node_pins p WHERE p.node_id=t.id),t.revision,
           COALESCE((SELECT level FROM life_node_direction_confidence d WHERE d.node_id=t.id),'exploring')
      FROM tree t LEFT JOIN counts c ON c.parent_id=t.id ORDER BY t.path";
    let mut statement = conn.prepare(sql)?;
    let mut nodes = statement
        .query_map([], |r| {
            let count: i32 = r.get(8)?;
            Ok(LifeEditNodeView {
                id: r.get(0)?,
                parent_id: r.get(1)?,
                title: r.get(2)?,
                short_description: r.get(3)?,
                icon_key: r.get(4)?,
                theme_variant: r.get(5)?,
                sort_key: r.get(6)?,
                depth: r.get(7)?,
                child_count: count,
                is_leaf: count == 0,
                has_document: r.get(9)?,
                is_pinned: r.get(10)?,
                revision: r.get(11)?,
                direction_confidence: r.get(12)?,
                tags: vec![],
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let mut archived_statement = conn.prepare(
        "WITH RECURSIVE all_nodes(id,parent_id,depth) AS (SELECT id,parent_id,0 FROM life_nodes WHERE parent_id IS NULL UNION ALL SELECT n.id,n.parent_id,a.depth+1 FROM life_nodes n JOIN all_nodes a ON n.parent_id=a.id WHERE a.depth<4096), counts AS (SELECT parent_id,COUNT(*) count FROM life_nodes WHERE archived_at IS NULL GROUP BY parent_id) SELECT n.id,n.parent_id,n.title,n.short_description,n.icon_key,n.branch_theme_id,n.sort_key,a.depth,COALESCE(c.count,0),EXISTS(SELECT 1 FROM reader_documents d WHERE d.life_node_id=n.id) OR EXISTS(SELECT 1 FROM narrative_documents d WHERE d.life_node_id=n.id),EXISTS(SELECT 1 FROM life_node_pins p WHERE p.node_id=n.id),n.revision,COALESCE((SELECT level FROM life_node_direction_confidence d WHERE d.node_id=n.id),'exploring') FROM life_nodes n JOIN all_nodes a ON a.id=n.id LEFT JOIN counts c ON c.parent_id=n.id WHERE n.archived_at IS NOT NULL ORDER BY a.depth,n.sort_key,n.id",
    )?;
    let mut archived_nodes = archived_statement
        .query_map([], |r| {
            let count: i32 = r.get(8)?;
            Ok(LifeEditNodeView {
                id: r.get(0)?,
                parent_id: r.get(1)?,
                title: r.get(2)?,
                short_description: r.get(3)?,
                icon_key: r.get(4)?,
                theme_variant: r.get(5)?,
                sort_key: r.get(6)?,
                depth: r.get(7)?,
                child_count: count,
                is_leaf: count == 0,
                has_document: r.get(9)?,
                is_pinned: r.get(10)?,
                revision: r.get(11)?,
                direction_confidence: r.get(12)?,
                tags: vec![],
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    {
        let mut all_ids: Vec<String> = nodes.iter().map(|n| n.id.clone()).collect();
        all_ids.extend(archived_nodes.iter().map(|n| n.id.clone()));
        if !all_ids.is_empty() {
            let tag_map = tag_repo::batch_load_life_tags(conn, &all_ids).map_err(LifeError::Db)?;
            for n in &mut nodes {
                if let Some(tags) = tag_map.get(&n.id) {
                    n.tags = tags.clone();
                }
            }
            for n in &mut archived_nodes {
                if let Some(tags) = tag_map.get(&n.id) {
                    n.tags = tags.clone();
                }
            }
        }
    }
    let current = tree_revision(conn)?;
    let latest_undo = conn
        .query_row(
            "SELECT operation_id FROM life_operations WHERE undone_at IS NULL AND tree_revision_after=?1 AND before_payload!='{\"kind\":\"expired\"}' ORDER BY created_at DESC LIMIT 1",
            params![current], |r| r.get(0),
        )
        .optional()?;
    Ok(LifeEditProjection {
        root_id: ROOT_ID.into(),
        tree_revision: current,
        nodes,
        archived_nodes,
        latest_undo,
    })
}

pub fn create(
    conn: &mut Connection,
    input: CreateLifeNodeOperationInput,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_id(&input.parent_id)
        || !domain::valid_title(&input.title)
        || !domain::valid_description(&input.short_description)
        || !domain::valid_icon(&input.icon_key)
        || !domain::valid_theme(&input.theme_variant)
    {
        return Err(LifeError::Validation("Choose valid Life node details."));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, "create", &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    let active: i64 = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL)",
        params![input.parent_id],
        |r| r.get(0),
    )?;
    if active == 0 {
        return Err(LifeError::NotFound);
    }
    let sort: i32 = tx.query_row("SELECT COALESCE(MAX(sort_key),-1)+1 FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL", params![input.parent_id], |r|r.get(0))?;
    let id = new_id();
    let time = now();
    tx.execute(
        "INSERT INTO life_nodes VALUES(?1,?2,?3,?4,?5,?6,?7,NULL,?8,?8,0)",
        params![
            id,
            input.parent_id,
            input.title.trim(),
            input.short_description,
            input.icon_key,
            input.theme_variant,
            sort,
            time
        ],
    )?;
    let revision = finish(&tx, &input.context, "create", &id, &Before::Empty, &hash)?;
    tx.commit()?;
    result(conn, &id, revision, Some(input.context.operation_id))
}

fn text_update(
    conn: &mut Connection,
    input: EditLifeNodeTextInput,
    kind: &str,
    column: &str,
    validator: fn(&str) -> bool,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_id(&input.node_id) || !validator(&input.value) {
        return Err(LifeError::Validation("Choose a valid Life node value."));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, kind, &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    check_node(&tx, &input.node_id, input.expected_node_revision, true)?;
    let old: String = tx.query_row(
        &format!("SELECT {column} FROM life_nodes WHERE id=?1"),
        params![input.node_id],
        |r| r.get(0),
    )?;
    let value = if kind == "rename" {
        input.value.trim()
    } else {
        input.value.as_str()
    };
    tx.execute(
        &format!("UPDATE life_nodes SET {column}=?1,updated_at=?2,revision=revision+1 WHERE id=?3"),
        params![value, now(), input.node_id],
    )?;
    let revision = finish(
        &tx,
        &input.context,
        kind,
        &input.node_id,
        &Before::Text { value: old },
        &hash,
    )?;
    tx.commit()?;
    result(
        conn,
        &input.node_id,
        revision,
        Some(input.context.operation_id),
    )
}

pub fn rename(
    conn: &mut Connection,
    input: EditLifeNodeTextInput,
) -> Result<LifeMutationResult, LifeError> {
    text_update(conn, input, "rename", "title", domain::valid_title)
}

pub fn metadata(
    conn: &mut Connection,
    input: EditLifeNodeMetadataInput,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_id(&input.node_id)
        || !domain::valid_description(&input.short_description)
        || !domain::valid_icon(&input.icon_key)
        || !domain::valid_theme(&input.theme_variant)
        || !domain::valid_direction_confidence(&input.direction_confidence)
    {
        return Err(LifeError::Validation("Choose valid Life node details."));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, "summary", &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    check_node(&tx, &input.node_id, input.expected_node_revision, true)?;
    let old = tx.query_row(
        "SELECT short_description,icon_key,branch_theme_id,COALESCE((SELECT level FROM life_node_direction_confidence d WHERE d.node_id=life_nodes.id),'exploring') FROM life_nodes WHERE id=?1",
        params![input.node_id],
        |r| {
            Ok(Before::Metadata {
                description: r.get(0)?,
                icon: r.get(1)?,
                theme: r.get(2)?,
                direction_confidence: r.get(3)?,
            })
        },
    )?;
    tx.execute("UPDATE life_nodes SET short_description=?1,icon_key=?2,branch_theme_id=?3,updated_at=?4,revision=revision+1 WHERE id=?5",params![input.short_description,input.icon_key,input.theme_variant,now(),input.node_id])?;
    tx.execute(
        "INSERT INTO life_node_direction_confidence(node_id,level,updated_at) VALUES(?1,?2,?3) ON CONFLICT(node_id) DO UPDATE SET level=excluded.level,updated_at=excluded.updated_at",
        params![input.node_id, input.direction_confidence, now()],
    )?;
    let revision = finish(&tx, &input.context, "summary", &input.node_id, &old, &hash)?;
    tx.commit()?;
    result(
        conn,
        &input.node_id,
        revision,
        Some(input.context.operation_id),
    )
}

fn appearance(
    conn: &mut Connection,
    input: EditLifeNodeAppearanceInput,
    kind: &str,
    column: &str,
    valid: fn(&str) -> bool,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_id(&input.node_id) || !valid(&input.value) {
        return Err(LifeError::Validation(
            "Choose a valid local appearance value.",
        ));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, kind, &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    check_node(&tx, &input.node_id, input.expected_node_revision, true)?;
    let old: String = tx.query_row(
        &format!("SELECT {column} FROM life_nodes WHERE id=?1"),
        params![input.node_id],
        |r| r.get(0),
    )?;
    tx.execute(
        &format!("UPDATE life_nodes SET {column}=?1,updated_at=?2,revision=revision+1 WHERE id=?3"),
        params![input.value, now(), input.node_id],
    )?;
    let revision = finish(
        &tx,
        &input.context,
        kind,
        &input.node_id,
        &Before::Appearance { value: old },
        &hash,
    )?;
    tx.commit()?;
    result(
        conn,
        &input.node_id,
        revision,
        Some(input.context.operation_id),
    )
}
pub fn set_icon(
    conn: &mut Connection,
    input: EditLifeNodeAppearanceInput,
) -> Result<LifeMutationResult, LifeError> {
    appearance(conn, input, "icon", "icon_key", domain::valid_icon)
}
pub fn set_theme(
    conn: &mut Connection,
    input: EditLifeNodeAppearanceInput,
) -> Result<LifeMutationResult, LifeError> {
    appearance(conn, input, "theme", "branch_theme_id", domain::valid_theme)
}

pub fn archive(
    conn: &mut Connection,
    input: EditLifeNodeStateInput,
) -> Result<LifeMutationResult, LifeError> {
    if input.node_id == ROOT_ID || !domain::valid_id(&input.node_id) {
        return Err(LifeError::Validation("The Life root cannot be archived."));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, "archive", &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    check_node(&tx, &input.node_id, input.expected_node_revision, true)?;
    let mut st=tx.prepare("WITH RECURSIVE subtree(id) AS (SELECT id FROM life_nodes WHERE id=?1 UNION ALL SELECT n.id FROM life_nodes n JOIN subtree s ON n.parent_id=s.id) SELECT id FROM life_nodes WHERE id IN subtree AND archived_at IS NULL ORDER BY id")?;
    let ids = st
        .query_map(params![input.node_id], |r| r.get(0))?
        .collect::<Result<Vec<String>, _>>()?;
    drop(st);
    if ids.len() > MAX_ARCHIVE_NODES {
        return Err(LifeError::Validation(
            "This subtree is too large for bounded undo.",
        ));
    }
    tx.execute("WITH RECURSIVE subtree(id) AS (SELECT id FROM life_nodes WHERE id=?1 UNION ALL SELECT n.id FROM life_nodes n JOIN subtree s ON n.parent_id=s.id) UPDATE life_nodes SET archived_at=?2,updated_at=?2,revision=revision+1 WHERE id IN subtree AND archived_at IS NULL",params![input.node_id,now()])?;
    let revision = finish(
        &tx,
        &input.context,
        "archive",
        &input.node_id,
        &Before::Archive { active_ids: ids },
        &hash,
    )?;
    tx.commit()?;
    result(
        conn,
        &input.node_id,
        revision,
        Some(input.context.operation_id),
    )
}

pub fn restore(
    conn: &mut Connection,
    input: EditLifeNodeStateInput,
) -> Result<LifeMutationResult, LifeError> {
    if input.node_id == ROOT_ID || !domain::valid_id(&input.node_id) {
        return Err(LifeError::Validation("Choose an archived Life node."));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, "restore", &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    check_node(&tx, &input.node_id, input.expected_node_revision, false)?;
    let parent: Option<String> = tx
        .query_row(
            "SELECT parent_id FROM life_nodes WHERE id=?1 AND archived_at IS NOT NULL",
            params![input.node_id],
            |r| r.get(0),
        )
        .optional()?
        .flatten();
    let parent = parent.ok_or(LifeError::NotFound)?;
    let active: i64 = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL)",
        params![parent],
        |r| r.get(0),
    )?;
    if active == 0 {
        return Err(LifeError::Validation(
            "Restore the parent before this node.",
        ));
    }
    tx.execute(
        "UPDATE life_nodes SET archived_at=NULL,updated_at=?1,revision=revision+1 WHERE id=?2",
        params![now(), input.node_id],
    )?;
    let revision = finish(
        &tx,
        &input.context,
        "restore",
        &input.node_id,
        &Before::Restore,
        &hash,
    )?;
    tx.commit()?;
    result(
        conn,
        &input.node_id,
        revision,
        Some(input.context.operation_id),
    )
}

fn siblings(
    tx: &Transaction<'_>,
    parent: &str,
    excluding: Option<&str>,
) -> Result<Vec<String>, LifeError> {
    let mut st=tx.prepare("SELECT id FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL AND (?2 IS NULL OR id<>?2) ORDER BY sort_key,id")?;
    Ok(st
        .query_map(params![parent, excluding], |r| r.get(0))?
        .collect::<Result<Vec<_>, _>>()?)
}
fn normalize(
    tx: &Transaction<'_>,
    parent: &str,
    ordered: &[String],
    time: &str,
    target: &str,
) -> Result<(), LifeError> {
    for (index, id) in ordered.iter().enumerate() {
        tx.execute("UPDATE life_nodes SET sort_key=?1,updated_at=?2,revision=revision+CASE WHEN id=?3 THEN 1 ELSE 0 END WHERE id=?4 AND parent_id=?5",params![index as i32,time,target,id,parent])?;
    }
    Ok(())
}

pub fn reorder(
    conn: &mut Connection,
    input: ReorderLifeSiblingInput,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_id(&input.node_id) || input.node_id == ROOT_ID || input.new_index < 0 {
        return Err(LifeError::Validation("Choose a valid sibling position."));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, "reorder", &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    check_node(&tx, &input.node_id, input.expected_node_revision, true)?;
    let parent: String = tx
        .query_row(
            "SELECT parent_id FROM life_nodes WHERE id=?1",
            params![input.node_id],
            |r| r.get::<_, Option<String>>(0),
        )?
        .ok_or(LifeError::Validation("The Life root cannot be moved."))?;
    let current = siblings(&tx, &parent, None)?;
    let old = current
        .iter()
        .position(|id| id == &input.node_id)
        .ok_or(LifeError::NotFound)? as i32;
    if input.new_index >= current.len() as i32 {
        return Err(LifeError::Validation("Choose a valid sibling position."));
    }
    if old == input.new_index {
        return result(
            &tx,
            &input.node_id,
            input.context.expected_tree_revision,
            None,
        );
    }
    let mut ordered = current;
    let id = ordered.remove(old as usize);
    ordered.insert(input.new_index as usize, id);
    normalize(&tx, &parent, &ordered, &now(), &input.node_id)?;
    let revision = finish(
        &tx,
        &input.context,
        "reorder",
        &input.node_id,
        &Before::Move {
            parent_id: parent,
            index: old,
        },
        &hash,
    )?;
    tx.commit()?;
    result(
        conn,
        &input.node_id,
        revision,
        Some(input.context.operation_id),
    )
}

fn is_descendant(tx: &Transaction<'_>, node: &str, candidate: &str) -> Result<bool, LifeError> {
    Ok(tx.query_row("WITH RECURSIVE descendants(id) AS (SELECT id FROM life_nodes WHERE parent_id=?1 UNION ALL SELECT n.id FROM life_nodes n JOIN descendants d ON n.parent_id=d.id) SELECT EXISTS(SELECT 1 FROM descendants WHERE id=?2)",params![node,candidate],|r|r.get::<_,i64>(0))?!=0)
}

fn move_to(
    tx: &Transaction<'_>,
    node_id: &str,
    new_parent: &str,
    new_index: i32,
    time: &str,
) -> Result<(), LifeError> {
    let old_parent: String = tx
        .query_row(
            "SELECT parent_id FROM life_nodes WHERE id=?1",
            params![node_id],
            |r| r.get::<_, Option<String>>(0),
        )?
        .ok_or(LifeError::Validation("The Life root cannot be moved."))?;
    let mut old = siblings(tx, &old_parent, Some(node_id))?;
    normalize(tx, &old_parent, &old, time, node_id)?;
    let mut target = if old_parent == new_parent {
        old.clone()
    } else {
        siblings(tx, new_parent, Some(node_id))?
    };
    if new_index < 0 || new_index > target.len() as i32 {
        return Err(LifeError::Validation("Choose a valid insertion position."));
    }
    target.insert(new_index as usize, node_id.to_owned());
    tx.execute(
        "UPDATE life_nodes SET parent_id=?1,updated_at=?2 WHERE id=?3",
        params![new_parent, time, node_id],
    )?;
    normalize(tx, new_parent, &target, time, node_id)?;
    old.clear();
    Ok(())
}

pub fn reparent(
    conn: &mut Connection,
    input: ReparentLifeNodeInput,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_id(&input.node_id)
        || !domain::valid_id(&input.new_parent_id)
        || input.node_id == ROOT_ID
        || input.node_id == input.new_parent_id
        || input.new_index < 0
    {
        return Err(LifeError::Validation("Choose a valid parent and position."));
    }
    let hash = fingerprint(&input)?;
    if let Some(value) = replay(conn, &input.context, "reparent", &hash)? {
        return Ok(value);
    }
    check_context(conn, &input.context)?;
    let tx = conn.transaction()?;
    check_node(&tx, &input.node_id, input.expected_node_revision, true)?;
    let active: i64 = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL)",
        params![input.new_parent_id],
        |r| r.get(0),
    )?;
    if active == 0 {
        return Err(LifeError::Validation("Choose an active parent."));
    }
    if is_descendant(&tx, &input.node_id, &input.new_parent_id)? {
        return Err(LifeError::Validation(
            "A Life node cannot move into its descendant.",
        ));
    }
    let old_parent: String = tx
        .query_row(
            "SELECT parent_id FROM life_nodes WHERE id=?1",
            params![input.node_id],
            |r| r.get::<_, Option<String>>(0),
        )?
        .ok_or(LifeError::Validation("The Life root cannot be moved."))?;
    let old_index = siblings(&tx, &old_parent, None)?
        .iter()
        .position(|id| id == &input.node_id)
        .ok_or(LifeError::NotFound)? as i32;
    if old_parent == input.new_parent_id && old_index == input.new_index {
        return result(
            &tx,
            &input.node_id,
            input.context.expected_tree_revision,
            None,
        );
    }
    move_to(
        &tx,
        &input.node_id,
        &input.new_parent_id,
        input.new_index,
        &now(),
    )?;
    let revision = finish(
        &tx,
        &input.context,
        "reparent",
        &input.node_id,
        &Before::Move {
            parent_id: old_parent,
            index: old_index,
        },
        &hash,
    )?;
    tx.commit()?;
    result(
        conn,
        &input.node_id,
        revision,
        Some(input.context.operation_id),
    )
}

pub fn undo(
    conn: &mut Connection,
    input: UndoLifeOperationInput,
) -> Result<LifeMutationResult, LifeError> {
    if !valid_operation(&input.undo_token) || input.expected_tree_revision < 0 {
        return Err(LifeError::Validation("Choose a valid undo operation."));
    }
    let tx = conn.transaction()?;
    if tree_revision(&tx)? != input.expected_tree_revision {
        return Err(LifeError::Stale);
    }
    let row:Option<(String,String,String,i32,Option<String>)>=tx.query_row("SELECT operation_kind,target_node_id,before_payload,tree_revision_after,undone_at FROM life_operations WHERE operation_id=?1",params![input.undo_token],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?))).optional()?;
    let (kind, target, payload, after, undone) = row.ok_or(LifeError::NotFound)?;
    if undone.is_some() {
        return Err(LifeError::Validation(
            "This Life operation was already undone.",
        ));
    }
    if after != input.expected_tree_revision {
        return Err(LifeError::Validation(
            "Only the latest Life operation can be undone safely.",
        ));
    }
    let before: Before = serde_json::from_str(&payload)
        .map_err(|_| LifeError::Validation("This Life operation is outside the undo window."))?;
    let time = now();
    match (kind.as_str(), before) {
        ("create", Before::Empty) => {
            tx.execute("WITH RECURSIVE subtree(id) AS (SELECT id FROM life_nodes WHERE id=?1 UNION ALL SELECT n.id FROM life_nodes n JOIN subtree s ON n.parent_id=s.id) UPDATE life_nodes SET archived_at=?2,updated_at=?2,revision=revision+1 WHERE id IN subtree AND archived_at IS NULL",params![target,time])?;
        }
        ("rename", Before::Text { value }) => {
            tx.execute(
                "UPDATE life_nodes SET title=?1,updated_at=?2,revision=revision+1 WHERE id=?3",
                params![value, time, target],
            )?;
        }
        (
            "summary",
            Before::Metadata {
                description,
                icon,
                theme,
                direction_confidence,
            },
        ) => {
            tx.execute("UPDATE life_nodes SET short_description=?1,icon_key=?2,branch_theme_id=?3,updated_at=?4,revision=revision+1 WHERE id=?5",params![description,icon,theme,time,target])?;
            tx.execute(
                "INSERT INTO life_node_direction_confidence(node_id,level,updated_at) VALUES(?1,?2,?3) ON CONFLICT(node_id) DO UPDATE SET level=excluded.level,updated_at=excluded.updated_at",
                params![target, direction_confidence, time],
            )?;
        }
        ("icon", Before::Appearance { value }) => {
            tx.execute(
                "UPDATE life_nodes SET icon_key=?1,updated_at=?2,revision=revision+1 WHERE id=?3",
                params![value, time, target],
            )?;
        }
        ("theme", Before::Appearance { value }) => {
            tx.execute("UPDATE life_nodes SET branch_theme_id=?1,updated_at=?2,revision=revision+1 WHERE id=?3",params![value,time,target])?;
        }
        ("archive", Before::Archive { active_ids }) => {
            if active_ids.len() > MAX_ARCHIVE_NODES {
                return Err(LifeError::Validation("This undo payload is invalid."));
            }
            for id in active_ids {
                tx.execute("UPDATE life_nodes SET archived_at=NULL,updated_at=?1,revision=revision+1 WHERE id=?2",params![time,id])?;
            }
        }
        ("restore", Before::Restore) => {
            tx.execute("UPDATE life_nodes SET archived_at=?1,updated_at=?1,revision=revision+1 WHERE id=?2",params![time,target])?;
        }
        ("reorder" | "reparent", Before::Move { parent_id, index }) => {
            if is_descendant(&tx, &target, &parent_id)? {
                return Err(LifeError::Validation("Undo would create a cycle."));
            }
            move_to(&tx, &target, &parent_id, index, &time)?;
        }
        (_, Before::Expired) => {
            return Err(LifeError::Validation(
                "This Life operation is outside the undo window.",
            ));
        }
        _ => {
            return Err(LifeError::Validation(
                "Stored Life undo authority is invalid.",
            ));
        }
    }
    tx.execute(
        "UPDATE life_operations SET undone_at=?1 WHERE operation_id=?2",
        params![time, input.undo_token],
    )?;
    tx.execute(
        "UPDATE life_tree_meta SET tree_revision=tree_revision+1 WHERE singleton=1",
        [],
    )?;
    let revision = input.expected_tree_revision + 1;
    tx.commit()?;
    result(conn, &target, revision, None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::{open_file_connection, open_memory_connection},
        migrations::{current_schema_version, run_migrations as run_base_migrations},
    };

    fn run_migrations(conn: &mut Connection) -> Result<(), crate::infrastructure::sqlite::DbError> {
        run_base_migrations(conn)?;
        conn.execute_batch("CREATE TABLE IF NOT EXISTS life_node_direction_confidence(node_id TEXT PRIMARY KEY NOT NULL REFERENCES life_nodes(id) ON DELETE CASCADE,level TEXT NOT NULL CHECK(level IN ('exploring','leaning','committed','core')),updated_at TEXT NOT NULL);")?;
        Ok(())
    }

    fn db() -> Connection {
        let mut c = open_memory_connection().unwrap();
        run_migrations(&mut c).unwrap();
        c
    }
    fn ctx(c: &Connection, id: &str) -> LifeOperationContext {
        LifeOperationContext {
            operation_id: id.into(),
            expected_tree_revision: tree_revision(c).unwrap(),
        }
    }
    fn make(c: &mut Connection, parent: &str, title: &str, op: &str) -> LifeMutationResult {
        let context = ctx(c, op);
        create(
            c,
            CreateLifeNodeOperationInput {
                context,
                parent_id: parent.into(),
                title: title.into(),
                short_description: format!("About {title}"),
                icon_key: "life-branch".into(),
                theme_variant: "neutral".into(),
            },
        )
        .unwrap()
    }

    #[test]
    fn migration_eight_adds_ledger_and_edit_preference() {
        let c = db();
        assert_eq!(current_schema_version(&c).unwrap(), 19);
        assert_eq!(
            c.query_row("SELECT COUNT(*) FROM life_operations", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            0
        );
    }

    #[test]
    fn projection_is_full_preorder_with_depth_and_counts() {
        let mut c = db();
        let a = make(&mut c, ROOT_ID, "A", "create-a");
        let b = make(&mut c, ROOT_ID, "B", "create-b");
        let g = make(&mut c, &a.node.id, "Grand", "create-g");
        let p = projection(&c).unwrap();
        assert_eq!(
            p.nodes.iter().map(|n| n.title.as_str()).collect::<Vec<_>>(),
            vec!["Life", "A", "Grand", "B"]
        );
        assert_eq!(
            p.nodes
                .iter()
                .find(|n| n.id == a.node.id)
                .unwrap()
                .child_count,
            1
        );
        assert_eq!(p.nodes.iter().find(|n| n.id == g.node.id).unwrap().depth, 2);
        assert_eq!(p.nodes.iter().find(|n| n.id == b.node.id).unwrap().depth, 1);
    }

    #[test]
    fn create_is_idempotent_and_revision_bumps_once() {
        let mut c = db();
        let context = ctx(&c, "same-create");
        let input = CreateLifeNodeOperationInput {
            context,
            parent_id: ROOT_ID.into(),
            title: "A".into(),
            short_description: "".into(),
            icon_key: "life-branch".into(),
            theme_variant: "neutral".into(),
        };
        let first = create(&mut c, input.clone()).unwrap();
        let replayed = create(&mut c, input).unwrap();
        assert_eq!(first.node.id, replayed.node.id);
        assert_eq!(tree_revision(&c).unwrap(), 1);
        assert_eq!(
            c.query_row("SELECT COUNT(*) FROM life_nodes", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            2
        );
    }

    #[test]
    fn metadata_commands_and_undo_restore_prior_values() {
        let mut c = db();
        let node = make(&mut c, ROOT_ID, "Draft", "mk");
        let rename_context = ctx(&c, "rename");
        let renamed = rename(
            &mut c,
            EditLifeNodeTextInput {
                context: rename_context,
                node_id: node.node.id.clone(),
                value: "Final".into(),
                expected_node_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(renamed.node.title, "Final");
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: renamed.undo_token.unwrap(),
                expected_tree_revision: renamed.tree_revision,
            },
        )
        .unwrap();
        assert_eq!(edit_node(&c, &node.node.id, false).unwrap().title, "Draft");
        let current = edit_node(&c, &node.node.id, false).unwrap();
        let details_context = ctx(&c, "details");
        let changed = metadata(
            &mut c,
            EditLifeNodeMetadataInput {
                context: details_context,
                node_id: current.id.clone(),
                short_description: "Changed".into(),
                icon_key: "life-focus".into(),
                theme_variant: "violet".into(),
                direction_confidence: "committed".into(),
                expected_node_revision: current.revision,
            },
        )
        .unwrap();
        assert_eq!(changed.node.icon_key, "life-focus");
        assert_eq!(
            edit_node(&c, &current.id, false)
                .unwrap()
                .direction_confidence,
            "committed"
        );
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: changed.undo_token.unwrap(),
                expected_tree_revision: changed.tree_revision,
            },
        )
        .unwrap();
        let restored = edit_node(&c, &current.id, false).unwrap();
        assert_eq!(restored.short_description, "About Draft");
        assert_eq!(restored.icon_key, "life-branch");
        assert_eq!(restored.direction_confidence, "exploring");
    }

    #[test]
    fn dedicated_icon_and_theme_commands_validate_and_undo() {
        let mut c = db();
        let made = make(&mut c, ROOT_ID, "Appearance", "appearance-create");
        let icon_context = ctx(&c, "appearance-icon");
        let icon = set_icon(
            &mut c,
            EditLifeNodeAppearanceInput {
                context: icon_context,
                node_id: made.node.id.clone(),
                value: "life-focus".into(),
                expected_node_revision: made.node.revision,
            },
        )
        .unwrap();
        assert_eq!(icon.node.icon_key, "life-focus");
        let theme_context = ctx(&c, "appearance-theme");
        let themed = set_theme(
            &mut c,
            EditLifeNodeAppearanceInput {
                context: theme_context,
                node_id: made.node.id.clone(),
                value: "violet".into(),
                expected_node_revision: icon.node.revision,
            },
        )
        .unwrap();
        assert_eq!(themed.node.branch_theme_id, "violet");
        let invalid_context = ctx(&c, "appearance-invalid");
        assert!(
            set_icon(
                &mut c,
                EditLifeNodeAppearanceInput {
                    context: invalid_context,
                    node_id: made.node.id.clone(),
                    value: "https://example.invalid/icon.svg".into(),
                    expected_node_revision: themed.node.revision,
                },
            )
            .is_err()
        );
        assert_eq!(tree_revision(&c).unwrap(), themed.tree_revision);
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: themed.undo_token.unwrap(),
                expected_tree_revision: themed.tree_revision,
            },
        )
        .unwrap();
        assert_eq!(
            edit_node(&c, &made.node.id, false).unwrap().theme_variant,
            "neutral"
        );
    }

    #[test]
    fn protected_root_cannot_be_reordered_or_reparented() {
        let mut c = db();
        let parent = make(&mut c, ROOT_ID, "Parent", "root-parent");
        let before = tree_revision(&c).unwrap();
        let reorder_context = ctx(&c, "root-reorder");
        assert!(
            reorder(
                &mut c,
                ReorderLifeSiblingInput {
                    context: reorder_context,
                    node_id: ROOT_ID.into(),
                    new_index: 0,
                    expected_node_revision: 0,
                },
            )
            .is_err()
        );
        let reparent_context = ctx(&c, "root-reparent");
        assert!(
            reparent(
                &mut c,
                ReparentLifeNodeInput {
                    context: reparent_context,
                    node_id: ROOT_ID.into(),
                    new_parent_id: parent.node.id,
                    new_index: 0,
                    expected_node_revision: 0,
                },
            )
            .is_err()
        );
        assert_eq!(tree_revision(&c).unwrap(), before);
    }

    #[test]
    fn sibling_reorder_first_middle_last_and_noop() {
        let mut c = db();
        let a = make(&mut c, ROOT_ID, "A", "a");
        let b = make(&mut c, ROOT_ID, "B", "b");
        let d = make(&mut c, ROOT_ID, "C", "c");
        let before = tree_revision(&c).unwrap();
        let noop_context = ctx(&c, "noop");
        let noop = reorder(
            &mut c,
            ReorderLifeSiblingInput {
                context: noop_context,
                node_id: b.node.id.clone(),
                new_index: 1,
                expected_node_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(noop.tree_revision, before);
        let first_context = ctx(&c, "move-first");
        let moved = reorder(
            &mut c,
            ReorderLifeSiblingInput {
                context: first_context,
                node_id: d.node.id.clone(),
                new_index: 0,
                expected_node_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(
            projection(&c)
                .unwrap()
                .nodes
                .iter()
                .skip(1)
                .map(|n| n.title.as_str())
                .collect::<Vec<_>>(),
            vec!["C", "A", "B"]
        );
        let current = edit_node(&c, &d.node.id, false).unwrap();
        let last_context = ctx(&c, "move-last");
        let last = reorder(
            &mut c,
            ReorderLifeSiblingInput {
                context: last_context,
                node_id: d.node.id.clone(),
                new_index: 2,
                expected_node_revision: current.revision,
            },
        )
        .unwrap();
        assert_eq!(
            projection(&c)
                .unwrap()
                .nodes
                .iter()
                .skip(1)
                .map(|n| n.title.as_str())
                .collect::<Vec<_>>(),
            vec!["A", "B", "C"]
        );
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: last.undo_token.unwrap(),
                expected_tree_revision: last.tree_revision,
            },
        )
        .unwrap();
        assert_eq!(projection(&c).unwrap().nodes.get(1).unwrap().id, d.node.id);
        assert_ne!(a.node.id, b.node.id);
        assert_eq!(moved.tree_revision, before + 1);
    }

    #[test]
    fn reparent_is_atomic_preserves_subtree_and_rejects_cycles() {
        let mut c = db();
        let a = make(&mut c, ROOT_ID, "A", "a");
        let b = make(&mut c, ROOT_ID, "B", "b");
        let child = make(&mut c, &a.node.id, "Child", "child");
        let grand = make(&mut c, &child.node.id, "Grand", "grand");
        let move_context = ctx(&c, "reparent");
        let moved = reparent(
            &mut c,
            ReparentLifeNodeInput {
                context: move_context,
                node_id: child.node.id.clone(),
                new_parent_id: b.node.id.clone(),
                new_index: 0,
                expected_node_revision: 0,
            },
        )
        .unwrap();
        let p = projection(&c).unwrap();
        assert_eq!(
            p.nodes
                .iter()
                .find(|n| n.id == child.node.id)
                .unwrap()
                .parent_id
                .as_deref(),
            Some(b.node.id.as_str())
        );
        assert_eq!(
            p.nodes
                .iter()
                .find(|n| n.id == grand.node.id)
                .unwrap()
                .parent_id
                .as_deref(),
            Some(child.node.id.as_str())
        );
        let current = edit_node(&c, &b.node.id, false).unwrap();
        let cycle_context = ctx(&c, "cycle");
        assert!(matches!(
            reparent(
                &mut c,
                ReparentLifeNodeInput {
                    context: cycle_context,
                    node_id: b.node.id.clone(),
                    new_parent_id: grand.node.id.clone(),
                    new_index: 0,
                    expected_node_revision: current.revision
                }
            ),
            Err(LifeError::Validation(_))
        ));
        assert_eq!(tree_revision(&c).unwrap(), moved.tree_revision);
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: moved.undo_token.unwrap(),
                expected_tree_revision: moved.tree_revision,
            },
        )
        .unwrap();
        assert_eq!(
            edit_node(&c, &child.node.id, false)
                .unwrap()
                .parent_id
                .as_deref(),
            Some(a.node.id.as_str())
        );
    }

    #[test]
    fn archive_restore_and_undo_preserve_exact_subtree() {
        let mut c = db();
        let a = make(&mut c, ROOT_ID, "A", "a");
        let child = make(&mut c, &a.node.id, "Child", "child");
        let archive_context = ctx(&c, "archive");
        let archived = archive(
            &mut c,
            EditLifeNodeStateInput {
                context: archive_context,
                node_id: a.node.id.clone(),
                expected_node_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(projection(&c).unwrap().archived_nodes.len(), 2);
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: archived.undo_token.unwrap(),
                expected_tree_revision: archived.tree_revision,
            },
        )
        .unwrap();
        assert!(edit_node(&c, &child.node.id, false).is_ok());
        let current = edit_node(&c, &a.node.id, false).unwrap();
        let archive_two_context = ctx(&c, "archive-two");
        let archived_again = archive(
            &mut c,
            EditLifeNodeStateInput {
                context: archive_two_context,
                node_id: a.node.id.clone(),
                expected_node_revision: current.revision,
            },
        )
        .unwrap();
        let archived_node = edit_node(&c, &a.node.id, true).unwrap();
        let restore_context = ctx(&c, "restore");
        let restored = restore(
            &mut c,
            EditLifeNodeStateInput {
                context: restore_context,
                node_id: a.node.id.clone(),
                expected_node_revision: archived_node.revision,
            },
        )
        .unwrap();
        assert!(edit_node(&c, &a.node.id, false).is_ok());
        assert!(edit_node(&c, &child.node.id, false).is_err());
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: restored.undo_token.unwrap(),
                expected_tree_revision: restored.tree_revision,
            },
        )
        .unwrap();
        assert!(edit_node(&c, &a.node.id, false).is_err());
        assert!(archived_again.tree_revision > 0);
    }

    #[test]
    fn stale_foreign_and_double_undo_are_rejected() {
        let mut c = db();
        let made = make(&mut c, ROOT_ID, "A", "make");
        assert!(matches!(
            rename(
                &mut c,
                EditLifeNodeTextInput {
                    context: LifeOperationContext {
                        operation_id: "stale".into(),
                        expected_tree_revision: 0
                    },
                    node_id: made.node.id.clone(),
                    value: "B".into(),
                    expected_node_revision: 0
                }
            ),
            Err(LifeError::Stale)
        ));
        let undone = undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: made.undo_token.clone().unwrap(),
                expected_tree_revision: made.tree_revision,
            },
        )
        .unwrap();
        assert!(
            undo(
                &mut c,
                UndoLifeOperationInput {
                    undo_token: made.undo_token.unwrap(),
                    expected_tree_revision: undone.tree_revision
                }
            )
            .is_err()
        );
        assert!(
            undo(
                &mut c,
                UndoLifeOperationInput {
                    undo_token: "foreign".into(),
                    expected_tree_revision: undone.tree_revision
                }
            )
            .is_err()
        );
    }

    #[test]
    fn injected_failure_rolls_back_structure_ledger_and_revision() {
        let mut c = db();
        let a = make(&mut c, ROOT_ID, "A", "a");
        let b = make(&mut c, ROOT_ID, "B", "b");
        c.execute_batch(&format!("CREATE TRIGGER fail_reparent BEFORE UPDATE OF parent_id ON life_nodes WHEN OLD.id='{}' BEGIN SELECT RAISE(ABORT,'injected'); END;",a.node.id)).unwrap();
        let before = tree_revision(&c).unwrap();
        let fail_context = ctx(&c, "fail");
        assert!(
            reparent(
                &mut c,
                ReparentLifeNodeInput {
                    context: fail_context,
                    node_id: a.node.id.clone(),
                    new_parent_id: b.node.id,
                    new_index: 0,
                    expected_node_revision: 0
                }
            )
            .is_err()
        );
        assert_eq!(tree_revision(&c).unwrap(), before);
        assert_eq!(
            c.query_row(
                "SELECT COUNT(*) FROM life_operations WHERE operation_id='fail'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
    }

    #[test]
    fn scale_fixtures_project_linearly_at_100_500_and_2000() {
        for size in [100, 500, 2000] {
            let mut c = db();
            let tx = c.transaction().unwrap();
            for index in 0..size {
                let id = format!("00000000-0000-7000-8000-{index:012}");
                let parent = if index == 0 {
                    ROOT_ID.to_string()
                } else {
                    format!("00000000-0000-7000-8000-{:012}", (index - 1) / 3)
                };
                tx.execute("INSERT INTO life_nodes VALUES(?1,?2,?3,'','life-branch','neutral',?4,NULL,'0','0',0)",params![id,parent,format!("Node {index}"),index as i64]).unwrap();
            }
            tx.commit().unwrap();
            let started = std::time::Instant::now();
            let p = projection(&c).unwrap();
            assert_eq!(p.nodes.len(), size + 1);
            assert!(
                started.elapsed() < std::time::Duration::from_secs(3),
                "{size} nodes took {:?}",
                started.elapsed()
            );
        }
    }

    #[test]
    fn query_plan_uses_children_and_operation_indexes() {
        let c = db();
        let plan:String=c.query_row("EXPLAIN QUERY PLAN SELECT id FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL ORDER BY sort_key,id",params![ROOT_ID],|r|r.get(3)).unwrap();
        assert!(plan.contains("life_nodes_children"), "{plan}");
        let ops:String=c.query_row("EXPLAIN QUERY PLAN SELECT operation_id FROM life_operations WHERE target_node_id=?1 ORDER BY tree_revision_after DESC",params![ROOT_ID],|r|r.get(3)).unwrap();
        assert!(ops.contains("life_operations_target"), "{ops}");
    }

    #[test]
    fn file_reopen_preserves_structure_and_undo_authority() {
        let path = std::env::temp_dir().join(format!("life-edit-{}.db", new_id()));
        let token;
        let revision;
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            let made = make(&mut c, ROOT_ID, "Persisted", "persist-create");
            token = made.undo_token.unwrap();
            revision = made.tree_revision;
        }
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            assert_eq!(projection(&c).unwrap().nodes.len(), 2);
            undo(
                &mut c,
                UndoLifeOperationInput {
                    undo_token: token,
                    expected_tree_revision: revision,
                },
            )
            .unwrap();
            assert_eq!(projection(&c).unwrap().nodes.len(), 1);
        }
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn life_edit_native_smoke_fixture_authority() {
        let Ok(dir) = std::env::var("LIFEWEAVE_LIFE_EDIT_SMOKE_DIR") else {
            return;
        };
        let path = std::path::PathBuf::from(dir).join("lifeweave.db");
        let mut c = open_file_connection(&path).unwrap();
        run_migrations(&mut c).unwrap();
        if projection(&c).unwrap().nodes.len() > 1 {
            let p = projection(&c).unwrap();
            assert!(p.nodes.iter().any(|node| node.title == "Smoke A"));
            assert!(p.nodes.iter().any(|node| node.title == "Smoke child"));
            assert_eq!(
                c.query_row(
                    "SELECT last_life_mode FROM life_navigation_preferences WHERE singleton=1",
                    [],
                    |r| r.get::<_, String>(0)
                )
                .unwrap(),
                "edit"
            );
            return;
        }
        let a = make(&mut c, ROOT_ID, "Smoke A", "smoke-a");
        let b = make(&mut c, ROOT_ID, "Smoke B", "smoke-b");
        let child = make(&mut c, &a.node.id, "Smoke child", "smoke-child");
        let reorder_context = ctx(&c, "smoke-reorder");
        reorder(
            &mut c,
            ReorderLifeSiblingInput {
                context: reorder_context,
                node_id: b.node.id.clone(),
                new_index: 0,
                expected_node_revision: 0,
            },
        )
        .unwrap();
        let reparent_context = ctx(&c, "smoke-reparent");
        let moved = reparent(
            &mut c,
            ReparentLifeNodeInput {
                context: reparent_context,
                node_id: child.node.id.clone(),
                new_parent_id: b.node.id.clone(),
                new_index: 0,
                expected_node_revision: 0,
            },
        )
        .unwrap();
        let b_current = edit_node(&c, &b.node.id, false).unwrap();
        let cycle_context = ctx(&c, "smoke-cycle");
        assert!(
            reparent(
                &mut c,
                ReparentLifeNodeInput {
                    context: cycle_context,
                    node_id: b.node.id.clone(),
                    new_parent_id: child.node.id.clone(),
                    new_index: 0,
                    expected_node_revision: b_current.revision,
                },
            )
            .is_err()
        );
        undo(
            &mut c,
            UndoLifeOperationInput {
                undo_token: moved.undo_token.unwrap(),
                expected_tree_revision: moved.tree_revision,
            },
        )
        .unwrap();
        super::super::repository::set_pin(&mut c, &child.node.id, true).unwrap();
        super::super::repository::save_preference(
            &mut c,
            SaveLifeNavigationPreferenceInput {
                node_id: a.node.id,
                mode: "edit".into(),
                path_version: 1,
                viewport_anchor: Some(child.node.id),
            },
        )
        .unwrap();
    }
}
