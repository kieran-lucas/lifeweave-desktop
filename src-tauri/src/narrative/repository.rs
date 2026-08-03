use super::{
    domain::{self, NarrativeError, REVISION_RETENTION, SCHEMA_VERSION},
    dto::*,
    schema,
};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use std::collections::BTreeMap;

fn row(r: &rusqlite::Row<'_>) -> rusqlite::Result<NarrativeDocumentView> {
    Ok(NarrativeDocumentView {
        id: r.get(0)?,
        life_node_id: r.get(1)?,
        schema_version: r.get(2)?,
        revision: r.get(3)?,
        canonical_json: r.get(4)?,
        plain_text: r.get(5)?,
        updated_at: r.get(6)?,
        template_id: r.get(7)?,
        template_version: r.get(8)?,
    })
}

fn by_id(conn: &Connection, id: &str) -> Result<NarrativeDocumentView, NarrativeError> {
    conn.query_row(
        "SELECT id,life_node_id,schema_version,revision,canonical_json,plain_text,updated_at,\
         template_id,template_version \
         FROM narrative_documents WHERE id=?1 AND archived_at IS NULL",
        params![id],
        row,
    )
    .optional()?
    .ok_or(NarrativeError::NotFound)
}

fn leaf(conn: &Connection, id: &str) -> Result<(), NarrativeError> {
    if !crate::life::domain::valid_id(id) || id == crate::life::domain::ROOT_ID {
        return Err(NarrativeError::Validation("Choose an active Life leaf."));
    }
    let active: i64 = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL)",
        params![id],
        |r| r.get(0),
    )?;
    let children: i64 = conn.query_row(
        "SELECT COUNT(*) FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL",
        params![id],
        |r| r.get(0),
    )?;
    if active == 0 || children > 0 {
        return Err(NarrativeError::Validation(
            "Narrative Canvas requires an active leaf node.",
        ));
    }
    Ok(())
}

pub fn get(
    conn: &Connection,
    input: NarrativeNodeInput,
) -> Result<NarrativeDocumentProjection, NarrativeError> {
    if !crate::life::domain::valid_id(&input.life_node_id) {
        return Err(NarrativeError::NotFound);
    }
    let document = conn
        .query_row(
            "SELECT d.id,d.life_node_id,d.schema_version,d.revision,d.canonical_json,d.plain_text,\
         d.updated_at,d.template_id,d.template_version \
         FROM narrative_documents d \
         JOIN life_nodes n ON n.id=d.life_node_id \
         WHERE d.life_node_id=?1 AND d.archived_at IS NULL AND n.archived_at IS NULL",
            params![input.life_node_id],
            row,
        )
        .optional()?;
    let (draft_state, draft_json, draft_base_revision) = if let Some(doc) = &document {
        conn.query_row(
            "SELECT CASE WHEN base_revision=?2 THEN 'available' ELSE 'conflict' END,draft_json,base_revision \
             FROM narrative_document_drafts WHERE document_id=?1",
            params![doc.id, doc.revision],
            |r| Ok((r.get(0)?, Some(r.get(1)?), Some(r.get(2)?))),
        )
        .optional()?
        .unwrap_or(("none".into(), None, None))
    } else {
        ("none".into(), None, None)
    };
    Ok(NarrativeDocumentProjection {
        life_node_id: input.life_node_id,
        document,
        draft_state,
        draft_json,
        draft_base_revision,
    })
}

pub fn create(
    conn: &mut Connection,
    input: CreateNarrativeDocumentInput,
) -> Result<NarrativeDocumentView, NarrativeError> {
    if !domain::valid_operation(&input.operation_id) {
        return Err(NarrativeError::Validation("Operation identity is invalid."));
    }
    if let Some(id) = conn
        .query_row(
            "SELECT document_id FROM narrative_save_operations WHERE operation_id=?1",
            params![input.operation_id],
            |r| r.get::<_, String>(0),
        )
        .optional()?
    {
        let existing = by_id(conn, &id)?;
        if existing.life_node_id != input.life_node_id {
            return Err(NarrativeError::Validation(
                "Operation identity belongs to another document.",
            ));
        }
        return Ok(existing);
    }
    leaf(conn, &input.life_node_id)?;
    // Return existing active canvas rather than creating a duplicate.
    if let Some(existing_id) = conn
        .query_row(
            "SELECT id FROM narrative_documents WHERE life_node_id=?1 AND archived_at IS NULL",
            params![input.life_node_id],
            |r| r.get::<_, String>(0),
        )
        .optional()?
    {
        return by_id(conn, &existing_id);
    }
    let node_title: String = conn.query_row(
        "SELECT title FROM life_nodes WHERE id=?1 AND archived_at IS NULL",
        params![input.life_node_id],
        |r| r.get(0),
    )?;
    let id = domain::new_id();
    let scene_id = domain::new_id();
    let block_id = domain::new_id();
    let canonical = domain::seed_document(&id, &node_title, &scene_id, &block_id);
    let valid = schema::validate(&canonical, Some(&id))?;
    let now = domain::now();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO narrative_documents \
         (id,life_node_id,schema_version,revision,canonical_json,plain_text,\
          created_at,updated_at,archived_at,template_id,template_version) \
         VALUES (?1,?2,1,0,?3,?4,?5,?5,NULL,'knowledge_dossier',1)",
        params![
            id,
            input.life_node_id,
            valid.canonical_json,
            valid.plain_text,
            now
        ],
    )?;
    tx.execute(
        "INSERT INTO narrative_save_operations VALUES(?1,?2,0,?3)",
        params![input.operation_id, id, now],
    )?;
    tx.commit()?;
    by_id(conn, &id)
}

fn ensure_assets(
    tx: &Transaction<'_>,
    assets: &BTreeMap<String, i32>,
) -> Result<(), NarrativeError> {
    for id in assets.keys() {
        let usable: i64 = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM assets WHERE id=?1 AND status='usable')",
            params![id],
            |r| r.get(0),
        )?;
        if usable == 0 {
            return Err(NarrativeError::Validation(
                "Document references a missing asset.",
            ));
        }
    }
    Ok(())
}

fn save_tx(
    tx: &Transaction<'_>,
    input: &SaveNarrativeDocumentInput,
    reason: &str,
) -> Result<i32, NarrativeError> {
    if input.schema_version != SCHEMA_VERSION
        || !domain::valid_id(&input.document_id)
        || !domain::valid_operation(&input.operation_id)
    {
        return Err(NarrativeError::Validation(
            "Document save input is invalid.",
        ));
    }
    if let Some((document_id, rev)) = tx
        .query_row(
            "SELECT document_id,result_revision FROM narrative_save_operations WHERE operation_id=?1",
            params![input.operation_id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i32>(1)?)),
        )
        .optional()?
    {
        if document_id != input.document_id {
            return Err(NarrativeError::Validation(
                "Operation identity belongs to another document.",
            ));
        }
        return Ok(rev);
    }
    let current = tx
        .query_row(
            "SELECT revision,canonical_json,plain_text FROM narrative_documents WHERE id=?1 AND archived_at IS NULL",
            params![input.document_id],
            |r| Ok((r.get::<_, i32>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?)),
        )
        .optional()?
        .ok_or(NarrativeError::NotFound)?;
    if current.0 != input.expected_revision {
        return Err(NarrativeError::Stale);
    }
    let valid = schema::validate(&input.canonical_json, Some(&input.document_id))?;
    ensure_assets(tx, &valid.assets)?;
    let next = current.0 + 1;
    let now = domain::now();
    tx.execute(
        "INSERT INTO narrative_document_revisions VALUES(?1,?2,?3,?4,?5,?6,?7)",
        params![
            domain::new_id(),
            input.document_id,
            current.0,
            current.1,
            current.2,
            reason,
            now
        ],
    )?;
    tx.execute(
        "UPDATE narrative_documents SET canonical_json=?1,plain_text=?2,revision=?3,updated_at=?4 WHERE id=?5",
        params![valid.canonical_json, valid.plain_text, next, now, input.document_id],
    )?;
    tx.execute(
        "DELETE FROM narrative_document_assets WHERE document_id=?1",
        params![input.document_id],
    )?;
    for (asset_id, count) in &valid.assets {
        tx.execute(
            "INSERT INTO narrative_document_assets VALUES(?1,?2,?3)",
            params![input.document_id, asset_id, count],
        )?;
    }
    tx.execute(
        "DELETE FROM narrative_document_drafts WHERE document_id=?1 AND base_revision<=?2",
        params![input.document_id, current.0],
    )?;
    tx.execute(
        "INSERT INTO narrative_save_operations VALUES(?1,?2,?3,?4)",
        params![input.operation_id, input.document_id, next, now],
    )?;
    tx.execute(
        "DELETE FROM narrative_document_revisions WHERE document_id=?1 \
         AND revision NOT IN (SELECT revision FROM narrative_document_revisions \
             WHERE document_id=?1 ORDER BY revision DESC LIMIT ?2)",
        params![input.document_id, REVISION_RETENTION],
    )?;
    Ok(next)
}

pub fn save(
    conn: &mut Connection,
    input: SaveNarrativeDocumentInput,
) -> Result<NarrativeDocumentView, NarrativeError> {
    let id = input.document_id.clone();
    let tx = conn.transaction()?;
    save_tx(&tx, &input, "save")?;
    tx.commit()?;
    by_id(conn, &id)
}

pub fn save_draft(
    conn: &mut Connection,
    input: SaveNarrativeDraftInput,
) -> Result<NarrativeDocumentProjection, NarrativeError> {
    let doc = by_id(conn, &input.document_id)?;
    schema::validate(&input.canonical_json, Some(&input.document_id))?;
    let state = if input.base_revision == doc.revision {
        "available"
    } else {
        "conflict"
    };
    conn.execute(
        "INSERT INTO narrative_document_drafts VALUES(?1,?2,?3,?4,?5) \
         ON CONFLICT(document_id) DO UPDATE SET \
         base_revision=excluded.base_revision,draft_json=excluded.draft_json,\
         updated_at=excluded.updated_at,recovery_state=excluded.recovery_state",
        params![
            input.document_id,
            input.base_revision,
            input.canonical_json,
            domain::now(),
            state
        ],
    )?;
    get(
        conn,
        NarrativeNodeInput {
            life_node_id: doc.life_node_id,
        },
    )
}

pub fn discard_draft(
    conn: &mut Connection,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeDocumentProjection, NarrativeError> {
    let doc = by_id(conn, &input.document_id)?;
    conn.execute(
        "DELETE FROM narrative_document_drafts WHERE document_id=?1",
        params![input.document_id],
    )?;
    get(
        conn,
        NarrativeNodeInput {
            life_node_id: doc.life_node_id,
        },
    )
}

pub fn recover_draft(
    conn: &mut Connection,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeDocumentView, NarrativeError> {
    let doc = by_id(conn, &input.document_id)?;
    let (base, json): (i32, String) = conn
        .query_row(
            "SELECT base_revision,draft_json FROM narrative_document_drafts WHERE document_id=?1",
            params![input.document_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?
        .ok_or(NarrativeError::NotFound)?;
    if base != doc.revision {
        return Err(NarrativeError::Conflict);
    }
    save(
        conn,
        SaveNarrativeDocumentInput {
            document_id: doc.id,
            expected_revision: base,
            schema_version: SCHEMA_VERSION,
            canonical_json: json,
            operation_id: format!("recover-{}", domain::new_id()),
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        infrastructure::sqlite::{
            connection::{open_file_connection, open_memory_connection},
            migrations::run_migrations,
        },
        life,
    };

    fn db() -> Connection {
        let mut c = open_memory_connection().unwrap();
        run_migrations(&mut c).unwrap();
        c
    }

    fn leaf_node(c: &mut Connection) -> String {
        life::repository::create(
            c,
            life::dto::CreateLifeNodeInput {
                parent_id: "life-root".into(),
                title: "Leaf".into(),
                short_description: "".into(),
                icon_key: "life-leaf".into(),
                branch_theme_id: "neutral".into(),
            },
        )
        .unwrap()
        .node
        .id
    }

    #[test]
    fn create_save_draft_recovery_and_idempotency() {
        let mut c = db();
        let node = leaf_node(&mut c);
        let a = create(
            &mut c,
            CreateNarrativeDocumentInput {
                life_node_id: node.clone(),
                operation_id: "create-nc-1".into(),
            },
        )
        .unwrap();
        assert_eq!(a.revision, 0);
        // Idempotency
        assert_eq!(
            create(
                &mut c,
                CreateNarrativeDocumentInput {
                    life_node_id: node.clone(),
                    operation_id: "create-nc-1".into(),
                }
            )
            .unwrap()
            .id,
            a.id
        );
        // Build a valid save JSON with the same documentId
        let canonical: serde_json::Value = serde_json::from_str(&a.canonical_json).unwrap();
        let json = canonical.to_string();
        let saved = save(
            &mut c,
            SaveNarrativeDocumentInput {
                document_id: a.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: json.clone(),
                operation_id: "save-nc-1".into(),
            },
        )
        .unwrap();
        assert_eq!(saved.revision, 1);
        // Stale
        assert!(matches!(
            save(
                &mut c,
                SaveNarrativeDocumentInput {
                    document_id: a.id.clone(),
                    expected_revision: 0,
                    schema_version: 1,
                    canonical_json: json.clone(),
                    operation_id: "save-stale".into(),
                }
            ),
            Err(NarrativeError::Stale)
        ));
        // Draft round-trip
        let p = save_draft(
            &mut c,
            SaveNarrativeDraftInput {
                document_id: a.id.clone(),
                base_revision: 1,
                canonical_json: json.clone(),
            },
        )
        .unwrap();
        assert_eq!(p.draft_state, "available");
        let recovered =
            recover_draft(&mut c, NarrativeDocumentIdInput { document_id: a.id }).unwrap();
        assert_eq!(recovered.revision, 2);
    }

    #[test]
    fn mutual_exclusion_canvas_blocks_basic_leaf() {
        let mut c = db();
        let node = leaf_node(&mut c);
        // Create a basic leaf document first
        crate::document::repository::create(
            &mut c,
            crate::document::dto::CreateReaderDocumentInput {
                life_node_id: node.clone(),
                operation_id: "create-rd".into(),
            },
        )
        .unwrap();
        // Canvas creation on same node must fail
        assert!(
            create(
                &mut c,
                CreateNarrativeDocumentInput {
                    life_node_id: node,
                    operation_id: "create-nc".into(),
                }
            )
            .is_err()
        );
    }

    #[test]
    fn mutual_exclusion_basic_leaf_blocks_canvas() {
        let mut c = db();
        let node = leaf_node(&mut c);
        create(
            &mut c,
            CreateNarrativeDocumentInput {
                life_node_id: node.clone(),
                operation_id: "create-nc".into(),
            },
        )
        .unwrap();
        // Basic leaf on same node must fail
        assert!(
            crate::document::repository::create(
                &mut c,
                crate::document::dto::CreateReaderDocumentInput {
                    life_node_id: node,
                    operation_id: "create-rd".into(),
                }
            )
            .is_err()
        );
    }

    #[test]
    fn branch_rejected() {
        let mut c = db();
        let branch = leaf_node(&mut c);
        let _ = life::repository::create(
            &mut c,
            life::dto::CreateLifeNodeInput {
                parent_id: branch.clone(),
                title: "Child".into(),
                short_description: "".into(),
                icon_key: "life-leaf".into(),
                branch_theme_id: "neutral".into(),
            },
        )
        .unwrap();
        assert!(
            create(
                &mut c,
                CreateNarrativeDocumentInput {
                    life_node_id: branch,
                    operation_id: "bad".into(),
                }
            )
            .is_err()
        );
    }

    #[test]
    fn canvas_node_cannot_gain_a_child() {
        let mut c = db();
        let node = leaf_node(&mut c);
        create(
            &mut c,
            CreateNarrativeDocumentInput {
                life_node_id: node.clone(),
                operation_id: "create-nc-protected".into(),
            },
        )
        .unwrap();
        assert!(
            life::repository::create(
                &mut c,
                life::dto::CreateLifeNodeInput {
                    parent_id: node,
                    title: "Blocked".into(),
                    short_description: String::new(),
                    icon_key: "life-leaf".into(),
                    branch_theme_id: "neutral".into(),
                }
            )
            .is_err()
        );
    }

    #[test]
    fn revision_retention() {
        let path = std::env::temp_dir().join(format!("lw_nc_{}.db", domain::new_id()));
        let id;
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            let node = leaf_node(&mut c);
            let d = create(
                &mut c,
                CreateNarrativeDocumentInput {
                    life_node_id: node,
                    operation_id: "c".into(),
                },
            )
            .unwrap();
            id = d.id.clone();
            let base_json: serde_json::Value = serde_json::from_str(&d.canonical_json).unwrap();
            let json = base_json.to_string();
            for r in 0..55 {
                save(
                    &mut c,
                    SaveNarrativeDocumentInput {
                        document_id: id.clone(),
                        expected_revision: r,
                        schema_version: 1,
                        canonical_json: json.clone(),
                        operation_id: format!("s-{r}"),
                    },
                )
                .unwrap();
            }
        }
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            assert_eq!(by_id(&c, &id).unwrap().revision, 55);
            let count: i64 = c
                .query_row(
                    "SELECT COUNT(*) FROM narrative_document_revisions",
                    [],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(count, 50);
        }
        let _ = std::fs::remove_file(path);
    }
}
