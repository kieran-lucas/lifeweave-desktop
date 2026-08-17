use super::{
    domain::{self, DocumentError, REVISION_RETENTION, SCHEMA_VERSION},
    dto::*,
    markdown, schema,
};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use std::collections::BTreeMap;

fn row(r: &rusqlite::Row<'_>) -> rusqlite::Result<ReaderDocumentView> {
    Ok(ReaderDocumentView {
        id: r.get(0)?,
        life_node_id: r.get(1)?,
        schema_version: r.get(2)?,
        revision: r.get(3)?,
        canonical_json: r.get(4)?,
        plain_text: r.get(5)?,
        updated_at: r.get(6)?,
    })
}
fn by_id(conn: &Connection, id: &str) -> Result<ReaderDocumentView, DocumentError> {
    conn.query_row("SELECT id,life_node_id,schema_version,revision,canonical_json,plain_text,updated_at FROM reader_documents WHERE id=?1 AND archived_at IS NULL",params![id],row).optional()?.ok_or(DocumentError::NotFound)
}
fn leaf(conn: &Connection, id: &str) -> Result<(), DocumentError> {
    if !crate::life::domain::valid_id(id) || id == crate::life::domain::ROOT_ID {
        return Err(DocumentError::Validation("Choose an active Life leaf."));
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
        return Err(DocumentError::Validation(
            "Basic Leaf documents require an active leaf node.",
        ));
    }
    Ok(())
}
pub fn get(
    conn: &Connection,
    input: ReaderNodeInput,
) -> Result<ReaderDocumentProjection, DocumentError> {
    if !crate::life::domain::valid_id(&input.life_node_id) {
        return Err(DocumentError::NotFound);
    }
    let document=conn.query_row("SELECT d.id,d.life_node_id,d.schema_version,d.revision,d.canonical_json,d.plain_text,d.updated_at FROM reader_documents d JOIN life_nodes n ON n.id=d.life_node_id WHERE d.life_node_id=?1 AND d.archived_at IS NULL AND n.archived_at IS NULL",params![input.life_node_id],row).optional()?;
    let (draft_state, draft_json, draft_base_revision) = if let Some(doc) = &document {
        conn.query_row("SELECT CASE WHEN base_revision=?2 THEN 'available' ELSE 'conflict' END,draft_json,base_revision FROM reader_document_drafts WHERE document_id=?1",params![doc.id,doc.revision],|r|Ok((r.get(0)?,Some(r.get(1)?),Some(r.get(2)?)))).optional()?.unwrap_or(("none".into(),None,None))
    } else {
        ("none".into(), None, None)
    };
    Ok(ReaderDocumentProjection {
        life_node_id: input.life_node_id,
        document,
        draft_state,
        draft_json,
        draft_base_revision,
    })
}
pub fn create(
    conn: &mut Connection,
    input: CreateReaderDocumentInput,
) -> Result<ReaderDocumentView, DocumentError> {
    if !domain::valid_operation(&input.operation_id) {
        return Err(DocumentError::Validation("Operation identity is invalid."));
    }
    if let Some(id) = conn
        .query_row(
            "SELECT document_id FROM reader_save_operations WHERE operation_id=?1",
            params![input.operation_id],
            |r| r.get::<_, String>(0),
        )
        .optional()?
    {
        let existing = by_id(conn, &id)?;
        if existing.life_node_id != input.life_node_id {
            return Err(DocumentError::Validation(
                "Operation identity belongs to another document.",
            ));
        }
        return Ok(existing);
    }
    leaf(conn, &input.life_node_id)?;
    let canonical = domain::empty_document();
    let valid = schema::validate(&canonical)?;
    let id = domain::new_id();
    let now = domain::now();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO reader_documents VALUES(?1,?2,1,0,?3,?4,?5,?5,NULL)",
        params![
            id,
            input.life_node_id,
            valid.canonical_json,
            valid.plain_text,
            now
        ],
    )?;
    tx.execute(
        "INSERT INTO reader_save_operations VALUES(?1,?2,0,?3)",
        params![input.operation_id, id, now],
    )?;
    tx.commit()?;
    by_id(conn, &id)
}
fn ensure_assets(
    tx: &Transaction<'_>,
    assets: &BTreeMap<String, i32>,
) -> Result<(), DocumentError> {
    for id in assets.keys() {
        let usable: i64 = tx.query_row(
            "SELECT EXISTS(SELECT 1 FROM assets WHERE id=?1 AND status='usable')",
            params![id],
            |r| r.get(0),
        )?;
        if usable == 0 {
            return Err(DocumentError::Validation(
                "Document references a missing asset.",
            ));
        }
    }
    Ok(())
}
fn save_tx(
    tx: &Transaction<'_>,
    input: &SaveReaderDocumentInput,
    reason: &str,
) -> Result<i32, DocumentError> {
    if input.schema_version != SCHEMA_VERSION
        || !domain::valid_id(&input.document_id)
        || !domain::valid_operation(&input.operation_id)
    {
        return Err(DocumentError::Validation("Document save input is invalid."));
    }
    if let Some((document_id, rev)) = tx
        .query_row(
            "SELECT document_id,result_revision FROM reader_save_operations WHERE operation_id=?1",
            params![input.operation_id],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, i32>(1)?)),
        )
        .optional()?
    {
        if document_id != input.document_id {
            return Err(DocumentError::Validation(
                "Operation identity belongs to another document.",
            ));
        }
        return Ok(rev);
    }
    let current=tx.query_row("SELECT revision,canonical_json,plain_text FROM reader_documents WHERE id=?1 AND archived_at IS NULL",params![input.document_id],|r|Ok((r.get::<_,i32>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?))).optional()?.ok_or(DocumentError::NotFound)?;
    if current.0 != input.expected_revision {
        return Err(DocumentError::Stale);
    }
    let valid = schema::validate(&input.canonical_json)?;
    ensure_assets(tx, &valid.assets)?;
    let next = current.0 + 1;
    let now = domain::now();
    tx.execute(
        "INSERT INTO reader_document_revisions VALUES(?1,?2,?3,?4,?5,?6,?7)",
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
    tx.execute("UPDATE reader_documents SET canonical_json=?1,plain_text=?2,revision=?3,updated_at=?4 WHERE id=?5",params![valid.canonical_json,valid.plain_text,next,now,input.document_id])?;
    tx.execute(
        "DELETE FROM document_assets WHERE document_id=?1",
        params![input.document_id],
    )?;
    for (id, count) in valid.assets {
        tx.execute(
            "INSERT INTO document_assets VALUES(?1,?2,?3)",
            params![input.document_id, id, count],
        )?;
    }
    tx.execute(
        "DELETE FROM reader_document_drafts WHERE document_id=?1 AND base_revision<=?2",
        params![input.document_id, current.0],
    )?;
    tx.execute(
        "INSERT INTO reader_save_operations VALUES(?1,?2,?3,?4)",
        params![input.operation_id, input.document_id, next, now],
    )?;
    tx.execute("DELETE FROM reader_document_revisions WHERE document_id=?1 AND revision NOT IN (SELECT revision FROM reader_document_revisions WHERE document_id=?1 ORDER BY revision DESC LIMIT ?2)",params![input.document_id,REVISION_RETENTION])?;
    Ok(next)
}
pub fn save(
    conn: &mut Connection,
    input: SaveReaderDocumentInput,
) -> Result<ReaderDocumentView, DocumentError> {
    let id = input.document_id.clone();
    let tx = conn.transaction()?;
    save_tx(&tx, &input, "save")?;
    tx.commit()?;
    by_id(conn, &id)
}
pub fn save_draft(
    conn: &mut Connection,
    input: SaveReaderDraftInput,
) -> Result<ReaderDocumentProjection, DocumentError> {
    let doc = by_id(conn, &input.document_id)?;
    schema::validate(&input.canonical_json)?;
    let state = if input.base_revision == doc.revision {
        "available"
    } else {
        "conflict"
    };
    conn.execute("INSERT INTO reader_document_drafts VALUES(?1,?2,?3,?4,?5) ON CONFLICT(document_id) DO UPDATE SET base_revision=excluded.base_revision,draft_json=excluded.draft_json,updated_at=excluded.updated_at,recovery_state=excluded.recovery_state",params![input.document_id,input.base_revision,input.canonical_json,domain::now(),state])?;
    get(
        conn,
        ReaderNodeInput {
            life_node_id: doc.life_node_id,
        },
    )
}
pub fn discard_draft(
    conn: &mut Connection,
    input: ReaderDocumentIdInput,
) -> Result<ReaderDocumentProjection, DocumentError> {
    let doc = by_id(conn, &input.document_id)?;
    conn.execute(
        "DELETE FROM reader_document_drafts WHERE document_id=?1",
        params![input.document_id],
    )?;
    get(
        conn,
        ReaderNodeInput {
            life_node_id: doc.life_node_id,
        },
    )
}
pub fn recover_draft(
    conn: &mut Connection,
    input: ReaderDocumentIdInput,
) -> Result<ReaderDocumentView, DocumentError> {
    let doc = by_id(conn, &input.document_id)?;
    let (base, json): (i32, String) = conn
        .query_row(
            "SELECT base_revision,draft_json FROM reader_document_drafts WHERE document_id=?1",
            params![input.document_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?
        .ok_or(DocumentError::NotFound)?;
    if base != doc.revision {
        return Err(DocumentError::Conflict);
    }
    save(
        conn,
        SaveReaderDocumentInput {
            document_id: doc.id,
            expected_revision: base,
            schema_version: SCHEMA_VERSION,
            canonical_json: json,
            operation_id: format!("recover-{}", domain::new_id()),
        },
    )
}
pub fn import_markdown(
    conn: &mut Connection,
    input: ImportReaderMarkdownInput,
) -> Result<MarkdownImportView, DocumentError> {
    let imported = markdown::import_with_diagnostics(&input.markdown)?;
    let document = save(
        conn,
        SaveReaderDocumentInput {
            document_id: input.document_id,
            expected_revision: input.expected_revision,
            schema_version: SCHEMA_VERSION,
            canonical_json: imported.canonical_json,
            operation_id: input.operation_id,
        },
    )?;
    Ok(MarkdownImportView {
        document,
        diagnostics: imported.diagnostics,
    })
}
pub fn export_markdown(
    conn: &Connection,
    input: ReaderDocumentIdInput,
) -> Result<MarkdownExportView, DocumentError> {
    let doc = by_id(conn, &input.document_id)?;
    let markdown = markdown::export(&doc.canonical_json)?;
    Ok(MarkdownExportView {
        export_id: domain::new_id(),
        file_name: format!("life-leaf-{}.md", &doc.id[..8]),
        markdown,
    })
}

pub fn export_assets(
    conn: &Connection,
    document_id: &str,
) -> Result<Vec<(String, String, String)>, DocumentError> {
    by_id(conn, document_id)?;
    let mut statement = conn.prepare("SELECT a.id,a.sniffed_mime,a.relative_original_path FROM assets a JOIN document_assets da ON da.asset_id=a.id WHERE da.document_id=?1 AND a.status='usable' ORDER BY a.id")?;
    Ok(statement
        .query_map(params![document_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?
        .collect::<Result<Vec<_>, _>>()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        infrastructure::sqlite::{
            connection::{open_file_connection, open_memory_connection},
            // The current schema: Life node projections read the schema 32 direction-confidence table.
            task56_migration::run_all_migrations as run_migrations,
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
    fn create_save_revision_draft_recovery_and_idempotency() {
        let mut c = db();
        let node = leaf_node(&mut c);
        let a = create(
            &mut c,
            CreateReaderDocumentInput {
                life_node_id: node.clone(),
                operation_id: "create-1".into(),
            },
        )
        .unwrap();
        assert_eq!(
            create(
                &mut c,
                CreateReaderDocumentInput {
                    life_node_id: node.clone(),
                    operation_id: "create-1".into()
                }
            )
            .unwrap()
            .id,
            a.id
        );
        let json=r#"{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Saved"}]}]}"#.into();
        let saved = save(
            &mut c,
            SaveReaderDocumentInput {
                document_id: a.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: json,
                operation_id: "save-1".into(),
            },
        )
        .unwrap();
        assert_eq!(saved.revision, 1);
        assert!(matches!(
            save(
                &mut c,
                SaveReaderDocumentInput {
                    document_id: a.id.clone(),
                    expected_revision: 0,
                    schema_version: 1,
                    canonical_json: domain::empty_document(),
                    operation_id: "save-stale".into()
                }
            ),
            Err(DocumentError::Stale)
        ));
        let p = save_draft(
            &mut c,
            SaveReaderDraftInput {
                document_id: a.id.clone(),
                base_revision: 1,
                canonical_json: domain::empty_document(),
            },
        )
        .unwrap();
        assert_eq!(p.draft_state, "available");
        assert_eq!(
            recover_draft(&mut c, ReaderDocumentIdInput { document_id: a.id })
                .unwrap()
                .revision,
            2
        )
    }

    #[test]
    fn markdown_import_commits_canonical_semantics_and_returns_fallback_diagnostics() {
        let mut c = db();
        let node = leaf_node(&mut c);
        let document = create(
            &mut c,
            CreateReaderDocumentInput {
                life_node_id: node,
                operation_id: "markdown-create".into(),
            },
        )
        .unwrap();
        let imported = import_markdown(
            &mut c,
            ImportReaderMarkdownInput {
                document_id: document.id,
                expected_revision: document.revision,
                markdown:
                    "> **bold**\n\n1. one\n2. two\n\n- [x] checked\n\n---\n\n[note](./other.md)"
                        .into(),
                operation_id: "markdown-import".into(),
            },
        )
        .unwrap();
        assert_eq!(imported.document.revision, 1);
        assert!(
            imported
                .document
                .canonical_json
                .contains("\"type\":\"bold\"")
        );
        assert_eq!(
            imported
                .document
                .canonical_json
                .matches("orderedList")
                .count(),
            1
        );
        // Supported constructs commit as real nodes and report nothing.
        assert!(imported.document.canonical_json.contains("\"taskItem\""));
        assert!(imported.document.canonical_json.contains("horizontalRule"));
        // Only the genuinely unsupported target is reported, and it reaches the caller.
        assert_eq!(imported.diagnostics.len(), 1);
        assert_eq!(imported.diagnostics[0].kind, "link_target");
    }
    #[test]
    fn branch_rejected_and_stale_draft_preserved() {
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
                CreateReaderDocumentInput {
                    life_node_id: branch,
                    operation_id: "bad".into()
                }
            )
            .is_err()
        );
    }
    #[test]
    fn document_leaf_cannot_gain_a_child_and_archived_leaf_is_hidden() {
        let mut c = db();
        let node = leaf_node(&mut c);
        create(
            &mut c,
            CreateReaderDocumentInput {
                life_node_id: node.clone(),
                operation_id: "create-protected-leaf".into(),
            },
        )
        .unwrap();
        assert!(
            life::repository::create(
                &mut c,
                life::dto::CreateLifeNodeInput {
                    parent_id: node.clone(),
                    title: "Blocked".into(),
                    short_description: String::new(),
                    icon_key: "life-leaf".into(),
                    branch_theme_id: "neutral".into()
                }
            )
            .is_err()
        );
        c.execute(
            "UPDATE life_nodes SET archived_at='now' WHERE id=?1",
            [&node],
        )
        .unwrap();
        assert!(
            get(&c, ReaderNodeInput { life_node_id: node })
                .unwrap()
                .document
                .is_none()
        );
    }

    #[test]
    fn operation_identity_cannot_cross_documents() {
        let mut c = db();
        let first = leaf_node(&mut c);
        let second = life::repository::create(
            &mut c,
            life::dto::CreateLifeNodeInput {
                parent_id: "life-root".into(),
                title: "Second".into(),
                short_description: String::new(),
                icon_key: "life-leaf".into(),
                branch_theme_id: "neutral".into(),
            },
        )
        .unwrap()
        .node
        .id;
        create(
            &mut c,
            CreateReaderDocumentInput {
                life_node_id: first,
                operation_id: "shared-operation".into(),
            },
        )
        .unwrap();
        assert!(
            create(
                &mut c,
                CreateReaderDocumentInput {
                    life_node_id: second,
                    operation_id: "shared-operation".into()
                }
            )
            .is_err()
        );
    }
    #[test]
    fn reopen_and_revision_retention() {
        let path = std::env::temp_dir().join(format!("lw_doc_{}.db", domain::new_id()));
        let id;
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            let node = leaf_node(&mut c);
            let d = create(
                &mut c,
                CreateReaderDocumentInput {
                    life_node_id: node,
                    operation_id: "c".into(),
                },
            )
            .unwrap();
            id = d.id;
            for r in 0..55 {
                save(
                    &mut c,
                    SaveReaderDocumentInput {
                        document_id: id.clone(),
                        expected_revision: r,
                        schema_version: 1,
                        canonical_json: domain::empty_document(),
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
            assert_eq!(
                c.query_row("SELECT COUNT(*) FROM reader_document_revisions", [], |r| {
                    r.get::<_, i64>(0)
                })
                .unwrap(),
                50
            );
        }
        let _ = std::fs::remove_file(path);
    }
}
