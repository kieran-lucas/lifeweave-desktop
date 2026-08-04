use super::{
    domain::{self, CHILD_PAGE_SIZE, ROOT_ID},
    dto::*,
    navigation,
};
use crate::tag::repository as tag_repo;
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use uuid::{NoContext, Timestamp, Uuid};

#[derive(Debug)]
pub enum LifeError {
    Db(rusqlite::Error),
    Validation(&'static str),
    NotFound,
    Stale,
}
impl From<rusqlite::Error> for LifeError {
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
fn revision(conn: &Connection) -> Result<i32, LifeError> {
    Ok(conn.query_row(
        "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
        [],
        |r| r.get(0),
    )?)
}
fn bump(tx: &Transaction<'_>) -> Result<i32, LifeError> {
    tx.execute(
        "UPDATE life_tree_meta SET tree_revision=tree_revision+1 WHERE singleton=1",
        [],
    )?;
    Ok(tx.query_row(
        "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
        [],
        |r| r.get(0),
    )?)
}
fn node(conn: &Connection, id: &str, include_archived: bool) -> Result<LifeNodeView, LifeError> {
    let sql = "SELECT n.id,n.title,n.short_description,n.icon_key,n.branch_theme_id,(SELECT COUNT(*) FROM life_nodes c WHERE c.parent_id=n.id AND c.archived_at IS NULL),EXISTS(SELECT 1 FROM life_node_pins p WHERE p.node_id=n.id),n.revision FROM life_nodes n WHERE n.id=?1 AND (?2 OR n.archived_at IS NULL)";
    conn.query_row(sql, params![id, include_archived], |r| {
        let count: i32 = r.get(5)?;
        Ok(LifeNodeView {
            id: r.get(0)?,
            title: r.get(1)?,
            short_description: r.get(2)?,
            icon_key: r.get(3)?,
            branch_theme_id: r.get(4)?,
            child_count: count,
            is_leaf: count == 0,
            is_pinned: r.get(6)?,
            revision: r.get(7)?,
            tags: vec![],
        })
    })
    .optional()?
    .ok_or(LifeError::NotFound)
}
fn active_parent(conn: &Connection, id: &str) -> Result<Option<String>, LifeError> {
    Ok(conn
        .query_row(
            "SELECT parent_id FROM life_nodes WHERE id=?1 AND archived_at IS NULL",
            params![id],
            |r| r.get(0),
        )
        .optional()?
        .flatten())
}
pub fn browse(
    conn: &Connection,
    input: GetLifeBrowseInput,
) -> Result<LifeBrowseProjection, LifeError> {
    if input.child_page < 0 {
        return Err(LifeError::Validation("Choose a valid child page."));
    }
    let (selected_id, fallback) = navigation::resolve_node(conn, input.node_id.as_deref())?;
    let mut selected = node(conn, &selected_id, false)?;
    let mut parent = active_parent(conn, &selected_id)?
        .map(|id| node(conn, &id, false))
        .transpose()?;
    let total = selected.child_count as i64;
    let pages = ((total + CHILD_PAGE_SIZE - 1) / CHILD_PAGE_SIZE).max(1);
    let page = (input.child_page as i64).min(pages - 1);
    let mut st=conn.prepare("SELECT n.id,n.title,n.short_description,n.icon_key,n.branch_theme_id,(SELECT COUNT(*) FROM life_nodes c WHERE c.parent_id=n.id AND c.archived_at IS NULL),EXISTS(SELECT 1 FROM life_node_pins p WHERE p.node_id=n.id),n.revision FROM life_nodes n WHERE n.parent_id=?1 AND n.archived_at IS NULL ORDER BY n.sort_key,n.id LIMIT ?2 OFFSET ?3")?;
    let mut children = st
        .query_map(
            params![selected_id, CHILD_PAGE_SIZE, page * CHILD_PAGE_SIZE],
            |r| {
                let count: i32 = r.get(5)?;
                Ok(LifeNodeView {
                    id: r.get(0)?,
                    title: r.get(1)?,
                    short_description: r.get(2)?,
                    icon_key: r.get(3)?,
                    branch_theme_id: r.get(4)?,
                    child_count: count,
                    is_leaf: count == 0,
                    is_pinned: r.get(6)?,
                    revision: r.get(7)?,
                    tags: vec![],
                })
            },
        )?
        .collect::<Result<Vec<_>, _>>()?;
    let mut bc=conn.prepare("WITH RECURSIVE path(id,parent_id,title,short_description,icon_key,branch_theme_id,revision,depth) AS (SELECT id,parent_id,title,short_description,icon_key,branch_theme_id,revision,0 FROM life_nodes WHERE id=?1 UNION ALL SELECT n.id,n.parent_id,n.title,n.short_description,n.icon_key,n.branch_theme_id,n.revision,p.depth+1 FROM life_nodes n JOIN path p ON n.id=p.parent_id WHERE p.depth<128) SELECT p.id,p.title,p.short_description,p.icon_key,p.branch_theme_id,(SELECT COUNT(*) FROM life_nodes c WHERE c.parent_id=p.id AND c.archived_at IS NULL),EXISTS(SELECT 1 FROM life_node_pins pin WHERE pin.node_id=p.id),p.revision FROM path p ORDER BY p.depth DESC")?;
    let mut breadcrumb = bc
        .query_map(params![selected_id], |r| {
            let count: i32 = r.get(5)?;
            Ok(LifeNodeView {
                id: r.get(0)?,
                title: r.get(1)?,
                short_description: r.get(2)?,
                icon_key: r.get(3)?,
                branch_theme_id: r.get(4)?,
                child_count: count,
                is_leaf: count == 0,
                is_pinned: r.get(6)?,
                revision: r.get(7)?,
                tags: vec![],
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let pref: (String, Option<String>) = conn.query_row(
        "SELECT last_life_mode,viewport_anchor FROM life_navigation_preferences WHERE singleton=1",
        [],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;
    {
        let mut all_ids: Vec<String> = vec![selected_id.clone()];
        if let Some(ref p) = parent {
            all_ids.push(p.id.clone());
        }
        all_ids.extend(children.iter().map(|n| n.id.clone()));
        all_ids.extend(breadcrumb.iter().map(|n| n.id.clone()));
        all_ids.sort_unstable();
        all_ids.dedup();
        let tag_map = tag_repo::batch_load_life_tags(conn, &all_ids).map_err(LifeError::Db)?;
        if let Some(tags) = tag_map.get(&selected.id) {
            selected.tags = tags.clone();
        }
        if let Some(ref mut p) = parent {
            if let Some(tags) = tag_map.get(&p.id) {
                p.tags = tags.clone();
            }
        }
        for n in &mut children {
            if let Some(tags) = tag_map.get(&n.id) {
                n.tags = tags.clone();
            }
        }
        for n in &mut breadcrumb {
            if let Some(tags) = tag_map.get(&n.id) {
                n.tags = tags.clone();
            }
        }
    }
    if fallback {
        tracing::warn!("life navigation target resolved by fallback");
    }
    Ok(LifeBrowseProjection {
        root_id: ROOT_ID.into(),
        selected_is_pinned: selected.is_pinned,
        selected,
        parent,
        children,
        breadcrumb,
        child_page: page as i32,
        child_page_count: pages as i32,
        tree_revision: revision(conn)?,
        resolved_from_fallback: fallback,
        preferred_mode: pref.0,
        viewport_anchor: pref.1,
    })
}
pub fn pinned(conn: &Connection) -> Result<Vec<PinnedLifeNodeView>, LifeError> {
    let mut st=conn.prepare("SELECT n.id,n.title,n.short_description,n.icon_key,n.branch_theme_id,(SELECT COUNT(*) FROM life_nodes c WHERE c.parent_id=n.id AND c.archived_at IS NULL),n.archived_at IS NULL,n.revision FROM life_node_pins p JOIN life_nodes n ON n.id=p.node_id ORDER BY p.sort_key,p.node_id")?;
    let mut out = st
        .query_map([], |r| {
            let count: i32 = r.get(5)?;
            Ok(PinnedLifeNodeView {
                node_id: r.get(0)?,
                title: r.get(1)?,
                short_description: r.get(2)?,
                icon_key: r.get(3)?,
                branch_theme_id: r.get(4)?,
                child_count: count,
                is_leaf: count == 0,
                available: r.get(6)?,
                revision: r.get(7)?,
                tags: vec![],
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    let node_ids: Vec<String> = out.iter().map(|n| n.node_id.clone()).collect();
    if !node_ids.is_empty() {
        let tag_map = tag_repo::batch_load_life_tags(conn, &node_ids).map_err(LifeError::Db)?;
        for n in &mut out {
            if let Some(tags) = tag_map.get(&n.node_id) {
                n.tags = tags.clone();
            }
        }
    }
    Ok(out)
}
pub fn task_targets(conn: &Connection) -> Result<Vec<TaskLifeTargetView>, LifeError> {
    let mut st = conn.prepare("WITH RECURSIVE paths(id,parent_id,title,sort_key,path) AS (
      SELECT id,parent_id,title,sort_key,printf('%08d',sort_key) FROM life_nodes WHERE id='life-root'
      UNION ALL SELECT n.id,n.parent_id,n.title,n.sort_key,p.path || '.' || printf('%08d',n.sort_key)
        FROM life_nodes n JOIN paths p ON n.parent_id=p.id WHERE n.archived_at IS NULL
    ) SELECT p.id,p.title,(WITH RECURSIVE ancestors(id,parent_id,title,depth) AS (
      SELECT id,parent_id,title,0 FROM life_nodes WHERE id=p.id
      UNION ALL SELECT n.id,n.parent_id,n.title,a.depth+1 FROM life_nodes n JOIN ancestors a ON a.parent_id=n.id
    ) SELECT group_concat(title,' › ') FROM (SELECT title FROM ancestors WHERE id!='life-root' ORDER BY depth DESC))
    FROM paths p WHERE p.id!='life-root' ORDER BY p.path,p.id")?;
    Ok(st
        .query_map([], |r| {
            Ok(TaskLifeTargetView {
                id: r.get(0)?,
                title: r.get(1)?,
                breadcrumb: r.get(2)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?)
}
fn validate_common(title: &str, desc: &str, icon: &str, theme: &str) -> Result<(), LifeError> {
    if !domain::valid_title(title) {
        return Err(LifeError::Validation(
            "Title is required and must be 120 characters or fewer.",
        ));
    }
    if !domain::valid_description(desc) {
        return Err(LifeError::Validation(
            "Description must be 320 characters or fewer.",
        ));
    }
    if !domain::valid_icon(icon) || !domain::valid_theme(theme) {
        return Err(LifeError::Validation(
            "Choose valid local appearance values.",
        ));
    }
    Ok(())
}
pub fn create(
    conn: &mut Connection,
    input: CreateLifeNodeInput,
) -> Result<LifeMutationResult, LifeError> {
    validate_common(
        &input.title,
        &input.short_description,
        &input.icon_key,
        &input.branch_theme_id,
    )?;
    if !domain::valid_id(&input.parent_id) {
        return Err(LifeError::Validation("Choose a valid parent."));
    }
    let tx = conn.transaction()?;
    let active: i64 = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL)",
        params![input.parent_id],
        |r| r.get(0),
    )?;
    if active == 0 {
        return Err(LifeError::NotFound);
    }
    let sort: i64 = tx.query_row(
        "SELECT COALESCE(MAX(sort_key),-1)+1 FROM life_nodes WHERE parent_id=?1",
        params![input.parent_id],
        |r| r.get(0),
    )?;
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
            input.branch_theme_id,
            sort,
            time
        ],
    )?;
    let rev = bump(&tx)?;
    tx.commit()?;
    Ok(LifeMutationResult {
        node: node(conn, &id, false)?,
        tree_revision: rev,
        invalidation: vec!["life-browse".into()],
        undo_token: None,
    })
}
fn update_result(
    conn: &mut Connection,
    id: &str,
    expected: i32,
    sql: &str,
    args: &[&dyn rusqlite::ToSql],
) -> Result<LifeMutationResult, LifeError> {
    let tx = conn.transaction()?;
    let current: i32 = tx
        .query_row(
            "SELECT revision FROM life_nodes WHERE id=?1",
            params![id],
            |r| r.get(0),
        )
        .optional()?
        .ok_or(LifeError::NotFound)?;
    if current != expected {
        return Err(LifeError::Stale);
    }
    let changed = tx.execute(sql, args)?;
    if changed != 1 {
        return Err(LifeError::NotFound);
    }
    let rev = bump(&tx)?;
    tx.commit()?;
    Ok(LifeMutationResult {
        node: node(conn, id, true)?,
        tree_revision: rev,
        invalidation: vec!["life-browse".into(), "life-pinned".into()],
        undo_token: None,
    })
}
pub fn rename(
    conn: &mut Connection,
    input: RenameLifeNodeInput,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_title(&input.title) {
        return Err(LifeError::Validation(
            "Title is required and must be 120 characters or fewer.",
        ));
    }
    let time = now();
    update_result(
        conn,
        &input.node_id,
        input.expected_revision,
        "UPDATE life_nodes SET title=?1,updated_at=?2,revision=revision+1 WHERE id=?3",
        &[&input.title.trim(), &time, &input.node_id],
    )
}
pub fn update_summary(
    conn: &mut Connection,
    input: UpdateLifeNodeSummaryInput,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_description(&input.short_description)
        || !domain::valid_icon(&input.icon_key)
        || !domain::valid_theme(&input.branch_theme_id)
    {
        return Err(LifeError::Validation("Choose valid Life node details."));
    }
    let time = now();
    update_result(
        conn,
        &input.node_id,
        input.expected_revision,
        "UPDATE life_nodes SET short_description=?1,icon_key=?2,branch_theme_id=?3,updated_at=?4,revision=revision+1 WHERE id=?5",
        &[
            &input.short_description,
            &input.icon_key,
            &input.branch_theme_id,
            &time,
            &input.node_id,
        ],
    )
}
pub fn archive(
    conn: &mut Connection,
    input: MutateLifeNodeInput,
) -> Result<LifeMutationResult, LifeError> {
    if input.node_id == ROOT_ID {
        return Err(LifeError::Validation("The Life root cannot be archived."));
    }
    let tx = conn.transaction()?;
    let current: i32 = tx
        .query_row(
            "SELECT revision FROM life_nodes WHERE id=?1 AND archived_at IS NULL",
            params![input.node_id],
            |r| r.get(0),
        )
        .optional()?
        .ok_or(LifeError::NotFound)?;
    if current != input.expected_revision {
        return Err(LifeError::Stale);
    }
    let time = now();
    tx.execute("WITH RECURSIVE subtree(id) AS (SELECT id FROM life_nodes WHERE id=?1 UNION ALL SELECT n.id FROM life_nodes n JOIN subtree s ON n.parent_id=s.id) UPDATE life_nodes SET archived_at=?2,updated_at=?2,revision=revision+1 WHERE id IN subtree AND archived_at IS NULL",params![input.node_id,time])?;
    let rev = bump(&tx)?;
    tx.commit()?;
    Ok(LifeMutationResult {
        node: node(conn, &input.node_id, true)?,
        tree_revision: rev,
        invalidation: vec!["life-browse".into(), "life-pinned".into()],
        undo_token: None,
    })
}
pub fn restore(
    conn: &mut Connection,
    input: MutateLifeNodeInput,
) -> Result<LifeMutationResult, LifeError> {
    if input.node_id == ROOT_ID {
        return Err(LifeError::Validation("The Life root is already active."));
    }
    let parent:Option<String>=conn.query_row("SELECT parent_id FROM life_nodes WHERE id=?1 AND archived_at IS NOT NULL AND revision=?2",params![input.node_id,input.expected_revision],|r|r.get(0)).optional()?.flatten();
    let parent = parent.ok_or(LifeError::NotFound)?;
    let active: i64 = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL)",
        params![parent],
        |r| r.get(0),
    )?;
    if active == 0 {
        return Err(LifeError::Validation(
            "Restore the parent before this node.",
        ));
    }
    let time = now();
    update_result(
        conn,
        &input.node_id,
        input.expected_revision,
        "UPDATE life_nodes SET archived_at=NULL,updated_at=?1,revision=revision+1 WHERE id=?2 AND archived_at IS NOT NULL",
        &[&time, &input.node_id],
    )
}
pub fn set_pin(
    conn: &mut Connection,
    id: &str,
    wanted: bool,
) -> Result<LifeMutationResult, LifeError> {
    if !domain::valid_id(id) {
        return Err(LifeError::Validation("Choose a valid Life node."));
    }
    let tx = conn.transaction()?;
    let exists: i64 = tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1)",
        params![id],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Err(LifeError::NotFound);
    }
    let changed = if wanted {
        let sort: i64 = tx.query_row(
            "SELECT COALESCE(MAX(sort_key),-1)+1 FROM life_node_pins",
            [],
            |r| r.get(0),
        )?;
        tx.execute(
            "INSERT OR IGNORE INTO life_node_pins VALUES(?1,?2,?3)",
            params![id, sort, now()],
        )?
    } else {
        tx.execute("DELETE FROM life_node_pins WHERE node_id=?1", params![id])?
    };
    let rev: i32 = if changed > 0 {
        bump(&tx)?
    } else {
        tx.query_row(
            "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
            [],
            |r| r.get(0),
        )?
    };
    tx.commit()?;
    Ok(LifeMutationResult {
        node: node(conn, id, true)?,
        tree_revision: rev,
        invalidation: vec!["life-browse".into(), "life-pinned".into()],
        undo_token: None,
    })
}
pub fn save_preference(
    conn: &mut Connection,
    input: SaveLifeNavigationPreferenceInput,
) -> Result<LifeNavigationPreferenceView, LifeError> {
    if !domain::valid_id(&input.node_id)
        || !matches!(input.mode.as_str(), "browse" | "edit" | "pinned" | "reader")
        || input.path_version != 1
        || input
            .viewport_anchor
            .as_ref()
            .is_some_and(|v| v.len() > 100 || v.chars().any(char::is_control))
    {
        return Err(LifeError::Validation(
            "Choose a valid Life navigation context.",
        ));
    }
    let exists: i64 = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1)",
        params![input.node_id],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Err(LifeError::NotFound);
    }
    conn.execute("UPDATE life_navigation_preferences SET last_life_node_id=?1,last_life_mode=?2,path_version=?3,viewport_anchor=?4,updated_at=?5 WHERE singleton=1",params![input.node_id,input.mode,input.path_version,input.viewport_anchor,now()])?;
    Ok(LifeNavigationPreferenceView {
        node_id: input.node_id,
        mode: input.mode,
        path_version: input.path_version,
        viewport_anchor: input.viewport_anchor,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::{open_file_connection, open_memory_connection},
        migrations::{current_schema_version, run_migrations},
    };
    fn db() -> Connection {
        let mut c = open_memory_connection().unwrap();
        run_migrations(&mut c).unwrap();
        c
    }
    fn input(parent: &str, title: &str) -> CreateLifeNodeInput {
        CreateLifeNodeInput {
            parent_id: parent.into(),
            title: title.into(),
            short_description: format!("About {title}"),
            icon_key: "life-branch".into(),
            branch_theme_id: "neutral".into(),
        }
    }
    #[test]
    fn life_migration_seeds_only_protected_root() {
        let mut c = db();
        assert_eq!(current_schema_version(&c).unwrap(), 18);
        assert_eq!(
            c.query_row("SELECT COUNT(*) FROM life_nodes", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
        assert!(
            archive(
                &mut c,
                MutateLifeNodeInput {
                    node_id: ROOT_ID.into(),
                    expected_revision: 0
                }
            )
            .is_err()
        );
        assert!(c.execute("INSERT INTO life_nodes VALUES('other-root',NULL,'Other','','life-root','neutral',1,NULL,'0','0',0)",[]).is_err());
    }
    #[test]
    fn crud_projection_is_direct_and_ordered() {
        let mut c = db();
        let a = create(&mut c, input(ROOT_ID, "A")).unwrap();
        let b = create(&mut c, input(ROOT_ID, "B")).unwrap();
        let grand = create(&mut c, input(&a.node.id, "Grandchild")).unwrap();
        let p = browse(
            &c,
            GetLifeBrowseInput {
                node_id: Some(ROOT_ID.into()),
                child_page: 0,
            },
        )
        .unwrap();
        assert_eq!(
            p.children
                .iter()
                .map(|n| n.title.as_str())
                .collect::<Vec<_>>(),
            vec!["A", "B"]
        );
        assert!(!p.children.iter().any(|n| n.id == grand.node.id));
        let deep = browse(
            &c,
            GetLifeBrowseInput {
                node_id: Some(grand.node.id),
                child_page: 0,
            },
        )
        .unwrap();
        assert_eq!(deep.breadcrumb.len(), 3);
        assert_eq!(deep.parent.unwrap().id, a.node.id);
        assert_eq!(b.node.revision, 0);
    }
    #[test]
    fn rename_summary_and_revision_are_checked() {
        let mut c = db();
        let made = create(&mut c, input(ROOT_ID, "Draft")).unwrap();
        let renamed = rename(
            &mut c,
            RenameLifeNodeInput {
                node_id: made.node.id.clone(),
                title: "Plan".into(),
                expected_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(renamed.node.title, "Plan");
        assert!(matches!(
            rename(
                &mut c,
                RenameLifeNodeInput {
                    node_id: made.node.id,
                    title: "Old".into(),
                    expected_revision: 0
                }
            ),
            Err(LifeError::Stale)
        ));
    }
    #[test]
    fn subtree_archive_preserves_rows_pins_and_falls_back() {
        let mut c = db();
        let branch = create(&mut c, input(ROOT_ID, "Branch")).unwrap();
        let leaf = create(&mut c, input(&branch.node.id, "Leaf")).unwrap();
        set_pin(&mut c, &leaf.node.id, true).unwrap();
        archive(
            &mut c,
            MutateLifeNodeInput {
                node_id: branch.node.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();
        assert_eq!(
            c.query_row("SELECT COUNT(*) FROM life_nodes", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            3
        );
        assert!(!pinned(&c).unwrap()[0].available);
        let fallback = browse(
            &c,
            GetLifeBrowseInput {
                node_id: Some(leaf.node.id),
                child_page: 0,
            },
        )
        .unwrap();
        assert_eq!(fallback.selected.id, ROOT_ID);
        assert!(fallback.resolved_from_fallback);
        let malformed = browse(
            &c,
            GetLifeBrowseInput {
                node_id: Some("../not-a-node".into()),
                child_page: 0,
            },
        )
        .unwrap();
        assert_eq!(malformed.selected.id, ROOT_ID);
    }
    #[test]
    fn restore_requires_active_parent_and_restores_only_requested() {
        let mut c = db();
        let branch = create(&mut c, input(ROOT_ID, "Branch")).unwrap();
        let leaf = create(&mut c, input(&branch.node.id, "Leaf")).unwrap();
        archive(
            &mut c,
            MutateLifeNodeInput {
                node_id: branch.node.id.clone(),
                expected_revision: 0,
            },
        )
        .unwrap();
        let leaf_revision: i32 = c
            .query_row(
                "SELECT revision FROM life_nodes WHERE id=?1",
                params![leaf.node.id],
                |r| r.get(0),
            )
            .unwrap();
        assert!(
            restore(
                &mut c,
                MutateLifeNodeInput {
                    node_id: leaf.node.id.clone(),
                    expected_revision: leaf_revision
                }
            )
            .is_err()
        );
        let branch_revision: i32 = c
            .query_row(
                "SELECT revision FROM life_nodes WHERE id=?1",
                params![branch.node.id],
                |r| r.get(0),
            )
            .unwrap();
        restore(
            &mut c,
            MutateLifeNodeInput {
                node_id: branch.node.id.clone(),
                expected_revision: branch_revision,
            },
        )
        .unwrap();
        let still_archived: i64 = c
            .query_row(
                "SELECT archived_at IS NOT NULL FROM life_nodes WHERE id=?1",
                params![leaf.node.id],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(still_archived, 1);
    }
    #[test]
    fn pins_are_idempotent_and_navigation_persists() {
        let mut c = db();
        let branch = create(&mut c, input(ROOT_ID, "Branch")).unwrap();
        let before = revision(&c).unwrap();
        set_pin(&mut c, &branch.node.id, true).unwrap();
        let once = revision(&c).unwrap();
        set_pin(&mut c, &branch.node.id, true).unwrap();
        assert_eq!(once, before + 1);
        assert_eq!(revision(&c).unwrap(), once);
        save_preference(
            &mut c,
            SaveLifeNavigationPreferenceInput {
                node_id: branch.node.id.clone(),
                mode: "browse".into(),
                path_version: 1,
                viewport_anchor: Some("node-card".into()),
            },
        )
        .unwrap();
        let p = browse(
            &c,
            GetLifeBrowseInput {
                node_id: None,
                child_page: 0,
            },
        )
        .unwrap();
        assert_eq!(p.selected.id, branch.node.id);
        assert_eq!(p.viewport_anchor.as_deref(), Some("node-card"));
    }
    #[test]
    fn child_paging_is_bounded_to_eight() {
        let mut c = db();
        for n in 0..10 {
            create(&mut c, input(ROOT_ID, &format!("Node {n:02}"))).unwrap();
        }
        let first = browse(
            &c,
            GetLifeBrowseInput {
                node_id: Some(ROOT_ID.into()),
                child_page: 0,
            },
        )
        .unwrap();
        let second = browse(
            &c,
            GetLifeBrowseInput {
                node_id: Some(ROOT_ID.into()),
                child_page: 1,
            },
        )
        .unwrap();
        assert_eq!(first.children.len(), 8);
        assert_eq!(second.children.len(), 2);
        assert_eq!(first.child_page_count, 2);
        assert_ne!(first.children[0].id, second.children[0].id);
    }
    #[test]
    fn failed_subtree_archive_rolls_back_everything() {
        let mut c = db();
        let branch = create(&mut c, input(ROOT_ID, "Branch")).unwrap();
        let leaf = create(&mut c, input(&branch.node.id, "Leaf")).unwrap();
        c.execute_batch(&format!("CREATE TRIGGER fail_life_archive BEFORE UPDATE OF archived_at ON life_nodes WHEN OLD.id='{}' BEGIN SELECT RAISE(ABORT,'injected'); END;",leaf.node.id)).unwrap();
        let before = revision(&c).unwrap();
        assert!(
            archive(
                &mut c,
                MutateLifeNodeInput {
                    node_id: branch.node.id.clone(),
                    expected_revision: 0
                }
            )
            .is_err()
        );
        assert_eq!(revision(&c).unwrap(), before);
        assert_eq!(node(&c, &branch.node.id, false).unwrap().title, "Branch");
    }
    #[test]
    fn critical_child_query_uses_bounded_index() {
        let c = db();
        let plan:String=c.query_row("EXPLAIN QUERY PLAN SELECT id FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL ORDER BY sort_key,id LIMIT 8",params![ROOT_ID],|r|r.get(3)).unwrap();
        assert!(plan.contains("life_nodes_children"), "{plan}");
    }
    #[test]
    fn file_reopen_preserves_tree_and_preference() {
        let path = std::env::temp_dir().join(format!("lifeweave_life_{}.db", new_id()));
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            let branch = create(&mut c, input(ROOT_ID, "Persisted")).unwrap();
            save_preference(
                &mut c,
                SaveLifeNavigationPreferenceInput {
                    node_id: branch.node.id,
                    mode: "browse".into(),
                    path_version: 1,
                    viewport_anchor: None,
                },
            )
            .unwrap();
        }
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            assert_eq!(
                browse(
                    &c,
                    GetLifeBrowseInput {
                        node_id: None,
                        child_page: 0
                    }
                )
                .unwrap()
                .selected
                .title,
                "Persisted"
            );
        }
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }
    #[test]
    fn life_native_smoke_fixture_authority() {
        let Ok(dir) = std::env::var("LIFEWEAVE_NATIVE_SMOKE_FIXTURE_DIR") else {
            return;
        };
        let path = std::path::PathBuf::from(dir).join("lifeweave.db");
        let mut c = open_file_connection(&path).unwrap();
        run_migrations(&mut c).unwrap();
        let branch = create(&mut c, input(ROOT_ID, "Synthetic branch")).unwrap();
        let child = create(&mut c, input(&branch.node.id, "Synthetic child")).unwrap();
        let leaf = create(&mut c, input(&child.node.id, "Synthetic leaf")).unwrap();
        set_pin(&mut c, &leaf.node.id, true).unwrap();
        save_preference(
            &mut c,
            SaveLifeNavigationPreferenceInput {
                node_id: branch.node.id,
                mode: "browse".into(),
                path_version: 1,
                viewport_anchor: Some("synthetic-branch".into()),
            },
        )
        .unwrap();
    }
}
