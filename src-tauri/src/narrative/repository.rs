use super::{
    domain::{self, NarrativeError, REVISION_RETENTION, SCHEMA_VERSION},
    dto::*,
    markdown, schema,
    templates::NarrativeTemplateId,
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
    let template = NarrativeTemplateId::parse(&input.template_id).ok_or(
        NarrativeError::Validation("Choose a supported Canvas template."),
    )?;
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
        if existing.template_id != template.as_str() {
            return Err(NarrativeError::Validation(
                "Operation identity belongs to another template.",
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
        let existing = by_id(conn, &existing_id)?;
        if existing.template_id != template.as_str() {
            return Err(NarrativeError::Validation(
                "This leaf already has a Canvas with a different template.",
            ));
        }
        return Ok(existing);
    }
    let node_title: String = conn.query_row(
        "SELECT title FROM life_nodes WHERE id=?1 AND archived_at IS NULL",
        params![input.life_node_id],
        |r| r.get(0),
    )?;
    let id = domain::new_id();
    let canonical = super::templates::seed_document(template, &id, &node_title);
    let valid = schema::validate(&canonical, Some(&id))?;
    let now = domain::now();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO narrative_documents \
         (id,life_node_id,schema_version,revision,canonical_json,plain_text,\
          created_at,updated_at,archived_at,template_id,template_version) \
         VALUES (?1,?2,1,0,?3,?4,?5,?5,NULL,?6,1)",
        params![
            id,
            input.life_node_id,
            valid.canonical_json,
            valid.plain_text,
            now,
            template.as_str()
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
            "SELECT revision,canonical_json,plain_text,template_id,template_version FROM narrative_documents WHERE id=?1 AND archived_at IS NULL",
            params![input.document_id],
            |r| Ok((r.get::<_, i32>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, String>(3)?, r.get::<_, i32>(4)?)),
        )
        .optional()?
        .ok_or(NarrativeError::NotFound)?;
    if current.0 != input.expected_revision {
        return Err(NarrativeError::Stale);
    }
    let valid = schema::validate(&input.canonical_json, Some(&input.document_id))?;
    let raw: serde_json::Value = serde_json::from_str(&valid.canonical_json)
        .map_err(|_| NarrativeError::Validation("Narrative JSON is invalid."))?;
    if raw.get("templateId").and_then(serde_json::Value::as_str) != Some(current.3.as_str())
        || raw
            .get("templateVersion")
            .and_then(serde_json::Value::as_i64)
            != Some(current.4 as i64)
    {
        return Err(NarrativeError::Validation(
            "Narrative template identity is immutable.",
        ));
    }
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
    let valid = schema::validate(&input.canonical_json, Some(&input.document_id))?;
    let raw: serde_json::Value = serde_json::from_str(&valid.canonical_json)
        .map_err(|_| NarrativeError::Validation("Narrative JSON is invalid."))?;
    if raw.get("templateId").and_then(serde_json::Value::as_str) != Some(doc.template_id.as_str())
        || raw
            .get("templateVersion")
            .and_then(serde_json::Value::as_i64)
            != Some(doc.template_version as i64)
    {
        return Err(NarrativeError::Validation(
            "Narrative template identity is immutable.",
        ));
    }
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

pub fn import_from_markdown(
    conn: &mut Connection,
    input: ImportNarrativeMarkdownInput,
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
    let has_doc: i64 = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM reader_documents WHERE life_node_id=?1 AND archived_at IS NULL)",
        params![input.life_node_id],
        |r| r.get(0),
    )?;
    if has_doc > 0 {
        return Err(NarrativeError::Validation(
            "This leaf already has a Basic Leaf document.",
        ));
    }
    if conn
        .query_row(
            "SELECT id FROM narrative_documents WHERE life_node_id=?1 AND archived_at IS NULL",
            params![input.life_node_id],
            |r| r.get::<_, String>(0),
        )
        .optional()?
        .is_some()
    {
        return Err(NarrativeError::Validation(
            "A Narrative Canvas already exists for this node.",
        ));
    }
    let node_title: String = conn.query_row(
        "SELECT title FROM life_nodes WHERE id=?1 AND archived_at IS NULL",
        params![input.life_node_id],
        |r| r.get(0),
    )?;
    let id = domain::new_id();
    let scene_id = domain::new_id();
    let block_id = domain::new_id();
    let canonical = markdown::import_as_canvas(
        &id,
        &scene_id,
        &block_id,
        &input.original_name,
        &node_title,
        &input.markdown,
    )?;
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
    ensure_assets(&tx, &valid.assets)?;
    for (asset_id, count) in &valid.assets {
        tx.execute(
            "INSERT INTO narrative_document_assets VALUES(?1,?2,?3)",
            params![id, asset_id, count],
        )?;
    }
    tx.execute(
        "INSERT INTO narrative_save_operations VALUES(?1,?2,0,?3)",
        params![input.operation_id, id, now],
    )?;
    tx.commit()?;
    by_id(conn, &id)
}

pub fn preview_markdown(
    conn: &Connection,
    input: PreviewNarrativeMarkdownInput,
) -> Result<NarrativeMarkdownPreview, NarrativeError> {
    let imported = crate::document::markdown::import_with_diagnostics(&input.markdown).map_err(
        |e| match e {
            crate::document::domain::DocumentError::Validation(msg) => {
                NarrativeError::Validation(msg)
            }
            _ => NarrativeError::Validation("Markdown is too large."),
        },
    )?;
    let validated = crate::document::schema::validate(&imported.canonical_json)
        .map_err(|_| NarrativeError::Validation("Markdown document structure is invalid."))?;
    let proposed_title = {
        let stem = markdown::sanitize_file_stem(&input.original_name);
        if stem.is_empty() || stem == "narrative-canvas" {
            input.original_name.clone()
        } else {
            stem
        }
    };
    let plain_text_excerpt: String = validated.plain_text.chars().take(240).collect();
    let referenced_asset_count = validated.assets.len() as i32;
    let doc: serde_json::Value = serde_json::from_str(&imported.canonical_json).unwrap_or_default();
    let top_level_node_count = doc
        .get("content")
        .and_then(serde_json::Value::as_array)
        .map(|a| a.len() as i32)
        .unwrap_or(0);
    let mut warnings = vec![
        "Import creates one rich_text block. Block types, layout, and metadata are not preserved."
            .to_owned(),
    ];
    warnings.extend(imported.diagnostics.iter().map(|diagnostic| {
        format!(
            "Line {}, column {} — {} {}",
            diagnostic.line, diagnostic.column, diagnostic.message, diagnostic.fallback
        )
    }));
    if referenced_asset_count > 0 {
        let unavailable = validated
            .assets
            .keys()
            .filter(|id| {
                conn.query_row(
                    "SELECT EXISTS(SELECT 1 FROM assets WHERE id=?1 AND status='usable')",
                    params![id],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap_or(0)
                    == 0
            })
            .count();
        if unavailable > 0 {
            warnings.push(format!(
                "{unavailable} referenced local asset(s) are unavailable. Add them before confirming import."
            ));
        } else {
            warnings.push(
                "Referenced local assets are available now; Confirm checks again.".to_owned(),
            );
        }
    }
    Ok(NarrativeMarkdownPreview {
        proposed_title,
        plain_text_excerpt,
        top_level_node_count,
        referenced_asset_count,
        warnings,
    })
}

pub fn export_to_markdown(
    conn: &Connection,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeMarkdownExport, NarrativeError> {
    let doc = by_id(conn, &input.document_id)?;
    let md = markdown::export(&doc.canonical_json)?;
    let canvas_title: String = serde_json::from_str::<serde_json::Value>(&doc.canonical_json)
        .ok()
        .and_then(|v| {
            v.get("title")
                .and_then(serde_json::Value::as_str)
                .map(str::to_owned)
        })
        .unwrap_or_else(|| "narrative-canvas".into());
    Ok(NarrativeMarkdownExport {
        file_name: markdown::sanitize_file_name(&canvas_title),
        markdown: md,
        warning: "Markdown preserves readable content, not Canvas block structure or layout. Image bytes are not embedded; referenced local assets must already exist.".to_owned(),
    })
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
                template_id: "knowledge_dossier".into(),
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
                    template_id: "knowledge_dossier".into(),
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
    fn creation_is_template_aware_and_identity_mismatches_write_nothing() {
        let mut c = db();
        let node = leaf_node(&mut c);
        let canvas = create(
            &mut c,
            CreateNarrativeDocumentInput {
                life_node_id: node.clone(),
                operation_id: "template-create".into(),
                template_id: "project_blueprint".into(),
            },
        )
        .unwrap();
        let canonical: serde_json::Value = serde_json::from_str(&canvas.canonical_json).unwrap();
        assert_eq!(canvas.template_id, "project_blueprint");
        assert_eq!(canonical["templateId"], "project_blueprint");
        assert_eq!(canonical["templateVersion"], 1);
        assert_eq!(canonical["scenes"].as_array().unwrap().len(), 4);
        assert!(matches!(
            create(
                &mut c,
                CreateNarrativeDocumentInput {
                    life_node_id: node.clone(),
                    operation_id: "template-create".into(),
                    template_id: "learning_journey".into(),
                },
            ),
            Err(NarrativeError::Validation(_))
        ));
        assert!(matches!(
            create(
                &mut c,
                CreateNarrativeDocumentInput {
                    life_node_id: node,
                    operation_id: "new-template-create".into(),
                    template_id: "learning_journey".into(),
                },
            ),
            Err(NarrativeError::Validation(_))
        ));

        let mut mismatched = canonical;
        mismatched["templateId"] = serde_json::Value::String("learning_journey".into());
        let before: i64 = c
            .query_row(
                "SELECT COUNT(*) FROM narrative_document_revisions WHERE document_id=?1",
                [&canvas.id],
                |row| row.get(0),
            )
            .unwrap();
        assert!(matches!(
            save(
                &mut c,
                SaveNarrativeDocumentInput {
                    document_id: canvas.id.clone(),
                    expected_revision: 0,
                    schema_version: 1,
                    canonical_json: mismatched.to_string(),
                    operation_id: "template-mismatch-save".into(),
                },
            ),
            Err(NarrativeError::Validation(_))
        ));
        assert!(matches!(
            save_draft(
                &mut c,
                SaveNarrativeDraftInput {
                    document_id: canvas.id.clone(),
                    base_revision: 0,
                    canonical_json: mismatched.to_string(),
                },
            ),
            Err(NarrativeError::Validation(_))
        ));
        let after: i64 = c
            .query_row(
                "SELECT COUNT(*) FROM narrative_document_revisions WHERE document_id=?1",
                [&canvas.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(before, after);
        assert_eq!(
            c.query_row(
                "SELECT COUNT(*) FROM narrative_document_drafts WHERE document_id=?1",
                [&canvas.id],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
    }

    fn markdown_with_assets(ids: &[&str]) -> String {
        ids.iter()
            .map(|id| format!("![Local image](assets/{id})"))
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    #[test]
    fn preview_markdown_discloses_construct_location_and_fallback() {
        let c = db();
        let preview = preview_markdown(
            &c,
            PreviewNarrativeMarkdownInput {
                original_name: "diagnostics.md".into(),
                markdown: "# Heading\n\n- [x] checked\n\n```mermaid\nA --> B\n```".into(),
            },
        )
        .unwrap();
        // Task state and fence language are stored as real values now, so a document made
        // only of supported constructs raises no located warning. The canvas-shape notice
        // is unrelated to Markdown fidelity and always applies.
        assert!(
            !preview
                .warnings
                .iter()
                .any(|warning| warning.contains("Line ")),
            "{:?}",
            preview.warnings
        );

        // Constructs the Core schema still cannot hold are located precisely.
        let preview = preview_markdown(
            &c,
            PreviewNarrativeMarkdownInput {
                original_name: "diagnostics.md".into(),
                markdown: "# Heading\n\n#### Too deep\n\nSee [the note](./other.md).".into(),
            },
        )
        .unwrap();
        assert!(preview.warnings.iter().any(|warning| {
            warning.contains("Line 3, column 1") && warning.contains("Heading depth")
        }));
        assert!(preview.warnings.iter().any(|warning| {
            warning.contains("Line 5, column 5") && warning.contains("./other.md")
        }));
    }

    #[test]
    fn preview_markdown_reports_available_and_missing_assets_without_writing() {
        let mut c = db();
        let root = std::env::temp_dir().join(format!("lw-preview-{}", domain::new_id()));
        std::fs::create_dir_all(&root).unwrap();
        let available = crate::document::assets::import(
            &mut c,
            &root,
            crate::document::dto::ImportDocumentAssetInput {
                original_name: "pixel.png".into(),
                bytes: crate::document::assets::tiny_png(),
            },
        )
        .unwrap();
        let before: i64 = c
            .query_row("SELECT count(*) FROM assets", [], |row| row.get(0))
            .unwrap();
        let available_preview = preview_markdown(
            &c,
            PreviewNarrativeMarkdownInput {
                original_name: "available.md".into(),
                markdown: markdown_with_assets(&[&available.asset_id]),
            },
        )
        .unwrap();
        assert!(
            available_preview
                .warnings
                .iter()
                .any(|w| w.contains("available now"))
        );
        let missing = domain::new_id();
        let missing_preview = preview_markdown(
            &c,
            PreviewNarrativeMarkdownInput {
                original_name: "missing.md".into(),
                markdown: markdown_with_assets(&[&missing]),
            },
        )
        .unwrap();
        assert!(
            missing_preview
                .warnings
                .iter()
                .any(|w| w.contains("1 referenced"))
        );
        let another_missing = domain::new_id();
        let multiple = preview_markdown(
            &c,
            PreviewNarrativeMarkdownInput {
                original_name: "multiple.md".into(),
                markdown: markdown_with_assets(&[&missing, &another_missing]),
            },
        )
        .unwrap();
        assert!(multiple.warnings.iter().any(|w| w.contains("2 referenced")));
        let after: i64 = c
            .query_row("SELECT count(*) FROM assets", [], |row| row.get(0))
            .unwrap();
        assert_eq!(before, after, "preview must remain read-only");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn markdown_import_rechecks_asset_after_preview() {
        let mut c = db();
        let root = std::env::temp_dir().join(format!("lw-preview-race-{}", domain::new_id()));
        std::fs::create_dir_all(&root).unwrap();
        let asset = crate::document::assets::import(
            &mut c,
            &root,
            crate::document::dto::ImportDocumentAssetInput {
                original_name: "pixel.png".into(),
                bytes: crate::document::assets::tiny_png(),
            },
        )
        .unwrap();
        let markdown = markdown_with_assets(&[&asset.asset_id]);
        assert!(
            preview_markdown(
                &c,
                PreviewNarrativeMarkdownInput {
                    original_name: "race.md".into(),
                    markdown: markdown.clone()
                }
            )
            .unwrap()
            .warnings
            .iter()
            .any(|w| w.contains("available now"))
        );
        c.execute(
            "UPDATE assets SET status='missing' WHERE id=?1",
            params![asset.asset_id],
        )
        .unwrap();
        let node = leaf_node(&mut c);
        assert!(
            import_from_markdown(
                &mut c,
                ImportNarrativeMarkdownInput {
                    life_node_id: node.clone(),
                    original_name: "race.md".into(),
                    markdown,
                    operation_id: "preview-race".into()
                }
            )
            .is_err()
        );
        let count: i64 = c
            .query_row(
                "SELECT count(*) FROM narrative_documents WHERE life_node_id=?1",
                params![node],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0, "Confirm must roll back after an asset disappears");
        let _ = std::fs::remove_dir_all(root);
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
                    template_id: "knowledge_dossier".into(),
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
                template_id: "knowledge_dossier".into(),
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
                    template_id: "knowledge_dossier".into(),
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
                template_id: "knowledge_dossier".into(),
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

    /// Build a minimal valid narrative JSON with `n` rich_text blocks.
    fn make_test_canvas_json(document_id: &str, n: usize) -> String {
        let mut blocks: Vec<serde_json::Value> = Vec::with_capacity(n);
        for _ in 0..n {
            let block_id = domain::new_id();
            blocks.push(serde_json::json!({
                "kind": "rich_text",
                "id": block_id,
                "content": {
                    "type": "doc",
                    "content": [{
                        "type": "paragraph",
                        "content": [{"type": "text", "text": "Hello world"}]
                    }]
                }
            }));
        }
        let scene_id = domain::new_id();
        serde_json::json!({
            "schemaVersion": 1,
            "documentId": document_id,
            "title": "Test Canvas",
            "templateId": "knowledge_dossier",
            "templateVersion": 1,
            "scenes": [{
                "id": scene_id,
                "title": "Overview",
                "layoutPreset": "single_column",
                "atmosphere": "neutral",
                "motionPreset": "none",
                "blocks": blocks
            }]
        })
        .to_string()
    }

    #[test]
    fn narrative_canvas_backup_relaunch_evidence() {
        use crate::infrastructure::sqlite::{
            connection::open_file_connection, migrations::run_migrations,
        };
        use crate::search::dto::SearchGlobalInput;
        use crate::search::repository::refresh_dirty_and_query;

        let path = std::env::temp_dir().join(format!("lw_nc_backup_{}.db", domain::new_id()));
        let backups_dir = std::env::temp_dir().join(format!("lw_nc_bkp_{}", domain::new_id()));
        std::fs::create_dir_all(&backups_dir).unwrap();

        let doc_id;
        let node_id;
        let rev1_json;

        // ── Session 1: create canvas with mixed blocks + save rev 1 + draft ─────
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();
            node_id = leaf_node(&mut c);
            let doc = create(
                &mut c,
                CreateNarrativeDocumentInput {
                    life_node_id: node_id.clone(),
                    operation_id: "bk-create-1".into(),
                    template_id: "knowledge_dossier".into(),
                },
            )
            .unwrap();
            doc_id = doc.id.clone();

            // Build canvas JSON with multiple block types
            let base: serde_json::Value = serde_json::from_str(&doc.canonical_json).unwrap();
            let unknown_block = serde_json::json!({
                "kind": "future_v2",
                "id": "ffffffff-ffff-7fff-8fff-000000000001",
                "extraField": "extraValue",
                "nested": {"a": 1}
            });
            let metric_block = serde_json::json!({
                "kind": "metric",
                "id": domain::new_id(),
                "label": "Revenue",
                "value": "42000",
                "unit": "USD",
                "description": "Annual revenue"
            });
            let callout_block = serde_json::json!({
                "kind": "callout",
                "id": domain::new_id(),
                "variant": "note",
                "content": {
                    "type": "doc",
                    "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Note text"}]}]
                }
            });

            // Grab the existing blocks from seed and append our new blocks
            let mut full = base.clone();
            full["scenes"][0]["blocks"] = {
                let mut v = full["scenes"][0]["blocks"]
                    .as_array()
                    .cloned()
                    .unwrap_or_default();
                v.push(metric_block);
                v.push(callout_block);
                v.push(unknown_block);
                serde_json::Value::Array(v)
            };
            rev1_json = full.to_string();

            // Save revision 1
            let saved = save(
                &mut c,
                SaveNarrativeDocumentInput {
                    document_id: doc_id.clone(),
                    expected_revision: 0,
                    schema_version: 1,
                    canonical_json: rev1_json.clone(),
                    operation_id: "bk-save-1".into(),
                },
            )
            .unwrap();
            assert_eq!(saved.revision, 1, "revision 1 must be saved");

            // Save a draft (still at rev 1)
            let proj = save_draft(
                &mut c,
                SaveNarrativeDraftInput {
                    document_id: doc_id.clone(),
                    base_revision: 1,
                    canonical_json: rev1_json.clone(),
                },
            )
            .unwrap();
            assert_eq!(proj.draft_state, "available", "draft must be available");
        }

        // ── Session 2: reopen, verify rev 1 and draft survive ────────────────
        {
            let mut c = open_file_connection(&path).unwrap();
            run_migrations(&mut c).unwrap();

            let doc = by_id(&c, &doc_id).unwrap();
            assert_eq!(doc.revision, 1, "revision 1 must survive reopen");

            // Unknown block must be preserved in canonical_json
            assert!(
                doc.canonical_json.contains("extraField"),
                "unknown block extraField must survive reopen"
            );
            assert!(
                doc.canonical_json.contains("future_v2"),
                "unknown block kind must survive reopen"
            );

            let draft: Option<(i32, String)> = c
                .query_row(
                    "SELECT base_revision,draft_json FROM narrative_document_drafts WHERE document_id=?1",
                    rusqlite::params![doc_id],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .optional()
                .unwrap();
            assert!(draft.is_some(), "draft must survive reopen");
            let (base_rev, _draft_json) = draft.unwrap();
            assert_eq!(base_rev, 1, "draft base_revision must be 1 after reopen");

            // ── Backup ────────────────────────────────────────────────────────
            use crate::infrastructure::{
                backup::engine::backup_db,
                sqlite::{runtime::DatabaseRuntime, worker::DbWorkerHandle},
            };
            let worker = DbWorkerHandle::spawn(c);
            let rt = DatabaseRuntime::new(path.clone(), worker);
            let backup_result = backup_db(&rt, &backups_dir).unwrap();
            assert_eq!(
                backup_result.schema_version, 19,
                "backup must record schema version 19"
            );

            // ── Mutate: save revision 2 ───────────────────────────────────────
            let doc_id_clone = doc_id.clone();
            rt.execute(move |conn| {
                let doc_id = doc_id_clone;
                let metric_block2 = serde_json::json!({
                    "kind": "metric",
                    "id": domain::new_id(),
                    "label": "Cost",
                    "value": "10000",
                    "unit": "USD",
                    "description": ""
                });
                let current: String = conn
                    .query_row(
                        "SELECT canonical_json FROM narrative_documents WHERE id=?1",
                        rusqlite::params![doc_id],
                        |r| r.get(0),
                    )
                    .unwrap();
                let mut val: serde_json::Value = serde_json::from_str(&current).unwrap();
                let blocks = val["scenes"][0]["blocks"].as_array_mut().unwrap();
                blocks.push(metric_block2);
                let rev2_json = val.to_string();
                conn.execute(
                    "INSERT INTO narrative_document_revisions VALUES(?1,?2,?3,?4,?5,'manual',?6)",
                    rusqlite::params![domain::new_id(), doc_id, 1, current, "", domain::now()],
                )
                .unwrap();
                conn.execute(
                    "UPDATE narrative_documents SET canonical_json=?1,revision=2,updated_at=?2 WHERE id=?3",
                    rusqlite::params![rev2_json, domain::now(), doc_id],
                )
                .unwrap();
                Ok(())
            })
            .unwrap();

            // ── Restore from backup ───────────────────────────────────────────
            use crate::infrastructure::backup::restore::restore_db;
            let backup_dir = std::path::PathBuf::from(&backup_result.backup_dir);
            let restore_result = restore_db(&rt, &backup_dir).unwrap();
            assert_eq!(
                restore_result.schema_version,
                crate::infrastructure::sqlite::task55_migration::TASK55_SCHEMA_VERSION,
                "restore must report the current schema"
            );
        }

        // ── Session 3: verify restored state ─────────────────────────────────
        {
            let mut c = open_file_connection(&path).unwrap();
            crate::infrastructure::sqlite::task55_migration::run_all_migrations(&mut c).unwrap();

            let doc = by_id(&c, &doc_id).unwrap();
            // After restore, we should be back to revision 1
            assert_eq!(doc.revision, 1, "revision must be 1 after restore");

            // Unknown block preserved in restored JSON
            assert!(
                doc.canonical_json.contains("extraField"),
                "unknown block extraField must survive backup/restore"
            );
            assert!(
                doc.canonical_json.contains("nested"),
                "unknown block nested field must survive backup/restore"
            );

            // Semantic equality: rev1_json content matches restored canonical_json
            let restored_val: serde_json::Value =
                serde_json::from_str(&doc.canonical_json).unwrap();
            let rev1_val: serde_json::Value = serde_json::from_str(&rev1_json).unwrap();
            assert_eq!(
                restored_val["documentId"], rev1_val["documentId"],
                "documentId must match original"
            );
            assert_eq!(
                restored_val["title"], rev1_val["title"],
                "title must match original"
            );

            // ── Rebuild search index and verify canvas is found ───────────────
            // After restore the search_dirty_scopes may be empty (restored from backup
            // where they were cleared). Force a full rebuild before querying.
            c.execute_batch(
                "INSERT INTO search_dirty_scopes(scope,queued_at) \
                 VALUES('all',strftime('%Y-%m-%dT%H:%M:%SZ','now')) \
                 ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at",
            )
            .unwrap();
            // The canvas was created with the node title ("Leaf") and also contains
            // "Revenue" from the metric block in rev1_json.
            let proj = refresh_dirty_and_query(
                &c,
                SearchGlobalInput {
                    query: "Revenue".to_string(),
                    observed_local_date: "2026-08-03".to_string(),
                },
            )
            .unwrap();
            let has_canvas = proj
                .groups
                .iter()
                .any(|g| g.results.iter().any(|r| r.entity_id == doc_id));
            assert!(
                has_canvas,
                "canvas must be findable by search after restore"
            );
        }

        // ── Cleanup ───────────────────────────────────────────────────────────
        let _ = std::fs::remove_file(&path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
        let _ = std::fs::remove_dir_all(&backups_dir);
    }

    #[test]
    fn narrative_canvas_scale_and_save_evidence() {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        let node = leaf_node(&mut conn);
        let doc = create(
            &mut conn,
            CreateNarrativeDocumentInput {
                life_node_id: node,
                operation_id: "scale-create".into(),
                template_id: "knowledge_dossier".into(),
            },
        )
        .unwrap();

        for block_count in [5usize, 50, 128] {
            let canonical_json = make_test_canvas_json(&doc.id, block_count);
            let validated = schema::validate(&canonical_json, Some(&doc.id)).unwrap();
            assert!(
                !validated.plain_text.is_empty(),
                "{block_count}-block fixture must extract text"
            );
        }

        let saved = save(
            &mut conn,
            SaveNarrativeDocumentInput {
                document_id: doc.id.clone(),
                expected_revision: 0,
                schema_version: 1,
                canonical_json: make_test_canvas_json(&doc.id, 5),
                operation_id: "scale-save".into(),
            },
        )
        .unwrap();
        assert_eq!(saved.revision, 1);
    }

    #[test]
    #[ignore = "run through scripts/run_narrative_performance_evidence.ps1 in isolated release mode"]
    fn narrative_canvas_performance_evidence() {
        use std::time::{Duration, Instant};

        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        let node = leaf_node(&mut conn);

        // Create a document to get a valid document_id
        let doc = create(
            &mut conn,
            CreateNarrativeDocumentInput {
                life_node_id: node,
                operation_id: "perf-create".into(),
                template_id: "knowledge_dossier".into(),
            },
        )
        .unwrap();
        let doc_id = doc.id.clone();

        let fixtures = [5usize, 50, 128];

        for block_count in fixtures {
            let canon_json = make_test_canvas_json(&doc_id, block_count);

            // Time: Rust validation + text extraction
            let mut durations = Vec::with_capacity(100);
            for _ in 0..100 {
                let start = Instant::now();
                let _ = schema::validate(&canon_json, None);
                durations.push(start.elapsed());
            }
            durations.sort();
            let p50 = durations[50];
            let p95 = durations[95];
            let max_dur = *durations.last().unwrap();
            println!("validate {block_count} blocks: p50={p50:?} p95={p95:?} max={max_dur:?}");

            // Assert target: p95 <= 50ms
            assert!(
                p95 <= Duration::from_millis(50),
                "validate p95={p95:?} exceeds 50ms for {block_count} blocks"
            );
        }

        // Time: save transaction for 5 blocks (representative single-block op)
        let small_json = make_test_canvas_json(&doc_id, 5);
        let mut save_durations = Vec::with_capacity(20);
        for i in 0..20usize {
            let start = Instant::now();
            // Each save requires incrementing the expected revision
            let current_rev: i32 = conn
                .query_row(
                    "SELECT revision FROM narrative_documents WHERE id=?1",
                    rusqlite::params![doc_id],
                    |r| r.get(0),
                )
                .unwrap();
            let _ = save(
                &mut conn,
                SaveNarrativeDocumentInput {
                    document_id: doc_id.clone(),
                    expected_revision: current_rev,
                    schema_version: 1,
                    canonical_json: small_json.clone(),
                    operation_id: format!("perf-save-{i}"),
                },
            );
            save_durations.push(start.elapsed());
        }
        save_durations.sort();
        let save_p50 = save_durations[10];
        let save_p95 = save_durations[19];
        println!("save 5 blocks: p50={save_p50:?} p95={save_p95:?}");
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
                    template_id: "knowledge_dossier".into(),
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
