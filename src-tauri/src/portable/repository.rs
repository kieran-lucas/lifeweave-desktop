use super::{
    archive::ValidatedPortablePackage,
    domain::{PortableDocumentKind, PortableError},
    dto::{ConfirmPortablePackageImportInput, PortablePackageImportResult},
    manifest::PortableNarrativeMetadata,
};
use crate::document::assets::{self, AssetInstallReceipt};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
};

#[derive(Debug, Clone)]
pub struct PortableSourceAsset {
    pub source_asset_id: String,
    pub original_name: String,
    pub mime: String,
    pub relative_path: String,
    pub checksum: String,
    pub width: u32,
    pub height: u32,
    pub reference_count: u32,
}

#[derive(Debug, Clone)]
pub struct PortableExportSource {
    pub kind: PortableDocumentKind,
    pub document_id: String,
    pub schema_version: i32,
    pub title: String,
    pub canonical_json: String,
    pub markdown: String,
    pub narrative: Option<PortableNarrativeMetadata>,
    pub assets: Vec<PortableSourceAsset>,
    pub has_recoverable_draft: bool,
}

fn source_assets(
    conn: &Connection,
    document_id: &str,
    narrative: bool,
) -> Result<Vec<PortableSourceAsset>, PortableError> {
    let join = if narrative {
        "narrative_document_assets"
    } else {
        "document_assets"
    };
    let sql = format!(
        "SELECT a.id,a.original_name,a.sniffed_mime,a.relative_original_path,a.checksum,a.width,a.height,j.reference_count,a.status FROM assets a JOIN {join} j ON j.asset_id=a.id WHERE j.document_id=?1 ORDER BY a.id"
    );
    let mut statement = conn.prepare(&sql)?;
    let values = statement
        .query_map([document_id], |row| {
            Ok((
                PortableSourceAsset {
                    source_asset_id: row.get(0)?,
                    original_name: row.get(1)?,
                    mime: row.get(2)?,
                    relative_path: row.get(3)?,
                    checksum: row.get(4)?,
                    width: row.get(5)?,
                    height: row.get(6)?,
                    reference_count: row.get(7)?,
                },
                row.get::<_, String>(8)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    if values.iter().any(|(_, status)| status != "usable") {
        return Err(PortableError::Validation(
            "Document references an unusable asset.",
        ));
    }
    Ok(values.into_iter().map(|(asset, _)| asset).collect())
}

pub fn export_source(
    conn: &Connection,
    kind: PortableDocumentKind,
    document_id: &str,
) -> Result<PortableExportSource, PortableError> {
    if !crate::document::domain::valid_id(document_id) {
        return Err(PortableError::NotFound);
    }
    match kind {
        PortableDocumentKind::BasicLeaf => {
            let row = conn.query_row("SELECT d.id,d.schema_version,n.title,d.canonical_json,EXISTS(SELECT 1 FROM reader_document_drafts x WHERE x.document_id=d.id) FROM reader_documents d JOIN life_nodes n ON n.id=d.life_node_id WHERE d.id=?1 AND d.archived_at IS NULL AND n.archived_at IS NULL AND NOT EXISTS(SELECT 1 FROM narrative_documents c WHERE c.life_node_id=d.life_node_id)", [document_id], |r| Ok((r.get::<_,String>(0)?,r.get::<_,i32>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,bool>(4)?))).optional()?.ok_or(PortableError::NotFound)?;
            if row.1 != 1 {
                return Err(PortableError::Unsupported);
            }
            let valid = crate::document::schema::validate(&row.3)
                .map_err(|_| PortableError::Validation("Basic Leaf canonical JSON is invalid."))?;
            let assets = source_assets(conn, &row.0, false)?;
            let joins: BTreeMap<String, i32> = assets
                .iter()
                .map(|a| (a.source_asset_id.clone(), a.reference_count as i32))
                .collect();
            if valid.assets != joins {
                return Err(PortableError::Validation(
                    "Basic Leaf asset joins do not match canonical JSON.",
                ));
            }
            let markdown = crate::document::markdown::export(&valid.canonical_json)
                .map_err(|_| PortableError::Validation("Basic Leaf Markdown export failed."))?;
            Ok(PortableExportSource {
                kind,
                document_id: row.0,
                schema_version: row.1,
                title: row.2,
                canonical_json: valid.canonical_json,
                markdown,
                narrative: None,
                assets,
                has_recoverable_draft: row.4,
            })
        }
        PortableDocumentKind::NarrativeCanvas => {
            let row = conn.query_row("SELECT d.id,d.schema_version,d.canonical_json,d.template_id,d.template_version,EXISTS(SELECT 1 FROM narrative_document_drafts x WHERE x.document_id=d.id) FROM narrative_documents d JOIN life_nodes n ON n.id=d.life_node_id WHERE d.id=?1 AND d.archived_at IS NULL AND n.archived_at IS NULL AND NOT EXISTS(SELECT 1 FROM reader_documents b WHERE b.life_node_id=d.life_node_id)", [document_id], |r| Ok((r.get::<_,String>(0)?,r.get::<_,i32>(1)?,r.get::<_,String>(2)?,r.get::<_,String>(3)?,r.get::<_,i32>(4)?,r.get::<_,bool>(5)?))).optional()?.ok_or(PortableError::NotFound)?;
            if row.1 != 1 {
                return Err(PortableError::Unsupported);
            }
            let valid = crate::narrative::schema::validate(&row.2, Some(&row.0))
                .map_err(|_| PortableError::Validation("Narrative canonical JSON is invalid."))?;
            let value: serde_json::Value = serde_json::from_str(&valid.canonical_json)?;
            let canonical_template = value["templateId"]
                .as_str()
                .ok_or(PortableError::Validation("Narrative template is missing."))?;
            let canonical_version =
                value["templateVersion"]
                    .as_i64()
                    .ok_or(PortableError::Validation(
                        "Narrative template version is missing.",
                    ))? as i32;
            if canonical_template != row.3 || canonical_version != row.4 {
                return Err(PortableError::Validation(
                    "Narrative row and canonical template identities differ.",
                ));
            }
            let world = value
                .get("visualWorldId")
                .and_then(|v| v.as_str())
                .unwrap_or("paper");
            if crate::narrative::visual_worlds::NarrativeVisualWorldId::parse(world).is_none() {
                return Err(PortableError::Unsupported);
            }
            let assets = source_assets(conn, &row.0, true)?;
            let joins: BTreeMap<String, i32> = assets
                .iter()
                .map(|a| (a.source_asset_id.clone(), a.reference_count as i32))
                .collect();
            if valid.assets != joins {
                return Err(PortableError::Validation(
                    "Narrative asset joins do not match canonical JSON.",
                ));
            }
            let markdown = crate::narrative::markdown::export(&valid.canonical_json)
                .map_err(|_| PortableError::Validation("Narrative Markdown export failed."))?;
            Ok(PortableExportSource {
                kind,
                document_id: row.0,
                schema_version: row.1,
                title: value["title"].as_str().unwrap_or("").into(),
                canonical_json: valid.canonical_json,
                markdown,
                narrative: Some(PortableNarrativeMetadata {
                    template_id: row.3,
                    template_version: row.4,
                    visual_world_id: world.into(),
                    scene_count: value["scenes"].as_array().unwrap().len() as u32,
                }),
                assets,
                has_recoverable_draft: row.5,
            })
        }
    }
}

pub fn existing_operation_any(
    conn: &Connection,
    input: &ConfirmPortablePackageImportInput,
) -> Result<Option<PortablePackageImportResult>, PortableError> {
    if !crate::document::domain::valid_operation(&input.operation_id) {
        return Err(PortableError::Validation(
            "Portable import operation identity is invalid.",
        ));
    }
    let reader = conn.query_row("SELECT d.id,d.life_node_id FROM reader_save_operations o JOIN reader_documents d ON d.id=o.document_id WHERE o.operation_id=?1", [&input.operation_id], |r| Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?))).optional()?;
    let narrative = conn.query_row("SELECT d.id,d.life_node_id FROM narrative_save_operations o JOIN narrative_documents d ON d.id=o.document_id WHERE o.operation_id=?1", [&input.operation_id], |r| Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?))).optional()?;
    if reader.is_some() && narrative.is_some() {
        return Err(PortableError::Conflict);
    }
    let (found_kind, found) = if let Some(value) = reader {
        (PortableDocumentKind::BasicLeaf, value)
    } else if let Some(value) = narrative {
        (PortableDocumentKind::NarrativeCanvas, value)
    } else {
        return Ok(None);
    };
    if found.1 != input.life_node_id {
        return Err(PortableError::Validation(
            "Portable import operation belongs to another target.",
        ));
    }
    Ok(Some(PortablePackageImportResult {
        document_kind: found_kind,
        life_node_id: found.1,
        document_id: found.0,
    }))
}

pub fn existing_operation(
    conn: &Connection,
    input: &ConfirmPortablePackageImportInput,
    kind: PortableDocumentKind,
) -> Result<Option<PortablePackageImportResult>, PortableError> {
    let result = existing_operation_any(conn, input)?;
    if result
        .as_ref()
        .is_some_and(|value| value.document_kind != kind)
    {
        return Err(PortableError::Validation(
            "Portable import operation belongs to another document kind.",
        ));
    }
    Ok(result)
}

fn validate_target(tx: &Transaction<'_>, life_node_id: &str) -> Result<(), PortableError> {
    if !crate::life::domain::valid_id(life_node_id) || life_node_id == crate::life::domain::ROOT_ID
    {
        return Err(PortableError::Validation(
            "Choose an empty active Life leaf.",
        ));
    }
    let state = tx.query_row("SELECT archived_at IS NULL,(SELECT COUNT(*) FROM life_nodes c WHERE c.parent_id=n.id AND c.archived_at IS NULL),(SELECT COUNT(*) FROM reader_documents d WHERE d.life_node_id=n.id),(SELECT COUNT(*) FROM narrative_documents d WHERE d.life_node_id=n.id) FROM life_nodes n WHERE n.id=?1", [life_node_id], |r| Ok((r.get::<_,bool>(0)?,r.get::<_,i64>(1)?,r.get::<_,i64>(2)?,r.get::<_,i64>(3)?))).optional()?.ok_or(PortableError::NotFound)?;
    if !state.0 || state.1 != 0 || state.2 != 0 || state.3 != 0 {
        return Err(PortableError::Validation(
            "Portable import requires an empty active Life leaf.",
        ));
    }
    Ok(())
}

fn remap_basic(
    value: &mut serde_json::Value,
    map: &BTreeMap<String, String>,
) -> Result<(), PortableError> {
    if let Some(object) = value.as_object_mut() {
        if object.get("type").and_then(|v| v.as_str()) == Some("image") {
            let id = object
                .get_mut("attrs")
                .and_then(|v| v.as_object_mut())
                .and_then(|v| v.get_mut("assetId"))
                .and_then(|v| v.as_str().map(str::to_owned))
                .ok_or(PortableError::Validation(
                    "Portable image asset identity is missing.",
                ))?;
            *object.get_mut("attrs").unwrap().get_mut("assetId").unwrap() =
                serde_json::Value::String(
                    map.get(&id)
                        .ok_or(PortableError::Validation(
                            "Portable image asset cannot be remapped.",
                        ))?
                        .clone(),
                );
        }
        if let Some(children) = object.get_mut("content").and_then(|v| v.as_array_mut()) {
            for child in children {
                remap_basic(child, map)?;
            }
        }
    }
    Ok(())
}

fn remap_narrative(
    value: &mut serde_json::Value,
    new_id: &str,
    map: &BTreeMap<String, String>,
) -> Result<(), PortableError> {
    value["documentId"] = serde_json::Value::String(new_id.into());
    for scene in value["scenes"]
        .as_array_mut()
        .ok_or(PortableError::Validation(
            "Portable Narrative scenes are invalid.",
        ))?
    {
        for block in scene["blocks"]
            .as_array_mut()
            .ok_or(PortableError::Validation(
                "Portable Narrative blocks are invalid.",
            ))?
        {
            match block["kind"].as_str() {
                Some("image") => {
                    let source = block["assetId"].as_str().ok_or(PortableError::Validation(
                        "Portable Narrative image asset is missing.",
                    ))?;
                    block["assetId"] = serde_json::Value::String(
                        map.get(source)
                            .ok_or(PortableError::Validation(
                                "Portable Narrative image cannot be remapped.",
                            ))?
                            .clone(),
                    );
                }
                Some("rich_text" | "callout") => remap_basic(&mut block["content"], map)?,
                _ => {}
            }
        }
    }
    Ok(())
}

fn cleanup_receipts(receipts: &[AssetInstallReceipt]) {
    for receipt in receipts {
        if let Some(path) = &receipt.created_file {
            let _ = crate::infrastructure::durability::durable_remove_file(path);
        }
    }
}

fn remapped_asset_counts(
    package: &ValidatedPortablePackage,
    asset_map: &BTreeMap<String, String>,
) -> Result<BTreeMap<String, i32>, PortableError> {
    let mut counts = BTreeMap::new();
    for asset in &package.manifest.assets {
        let target = asset_map
            .get(&asset.source_asset_id)
            .ok_or(PortableError::Validation(
                "Portable asset identity cannot be remapped.",
            ))?;
        let count = i32::try_from(asset.reference_count)
            .map_err(|_| PortableError::Validation("Portable asset reference count is invalid."))?;
        let total = counts.entry(target.clone()).or_insert(0i32);
        *total = total.checked_add(count).ok_or(PortableError::Validation(
            "Portable asset reference count overflowed.",
        ))?;
    }
    Ok(counts)
}

pub fn confirm_import(
    conn: &mut Connection,
    root: &Path,
    input: ConfirmPortablePackageImportInput,
    package: ValidatedPortablePackage,
) -> Result<PortablePackageImportResult, PortableError> {
    if let Some(result) = existing_operation(conn, &input, package.manifest.document.kind)? {
        return Ok(result);
    }
    let tx = conn.transaction()?;
    validate_target(&tx, &input.life_node_id)?;
    let mut receipts = Vec::new();
    let install_result = (|| -> Result<(BTreeMap<String, String>, Vec<PathBuf>), PortableError> {
        let mut map = BTreeMap::new();
        let mut paths = Vec::new();
        for (source_id, prepared) in &package.assets {
            let receipt = assets::install_prepared_asset_in_tx(&tx, root, prepared)
                .map_err(|_| PortableError::Validation("Portable asset installation failed."))?;
            map.insert(source_id.clone(), receipt.asset_id.clone());
            if let Some(path) = &receipt.created_file {
                paths.push(path.clone());
            }
            receipts.push(receipt);
        }
        Ok((map, paths))
    })();
    let (asset_map, _) = match install_result {
        Ok(value) => value,
        Err(error) => {
            cleanup_receipts(&receipts);
            return Err(error);
        }
    };
    let document_id = crate::document::domain::new_id();
    let now = crate::document::domain::now();
    let write = (|| -> Result<(), PortableError> {
        match package.manifest.document.kind {
            PortableDocumentKind::BasicLeaf => {
                let mut value: serde_json::Value = serde_json::from_str(&package.canonical_json)?;
                remap_basic(&mut value, &asset_map)?;
                let valid = crate::document::schema::validate(&serde_json::to_string(&value)?)
                    .map_err(|_| PortableError::Validation("Remapped Basic Leaf is invalid."))?;
                let expected = remapped_asset_counts(&package, &asset_map)?;
                if valid.assets != expected {
                    return Err(PortableError::Validation(
                        "Remapped Basic Leaf asset counts differ.",
                    ));
                }
                tx.execute(
                    "INSERT INTO reader_documents VALUES(?1,?2,1,0,?3,?4,?5,?5,NULL)",
                    params![
                        document_id,
                        input.life_node_id,
                        valid.canonical_json,
                        valid.plain_text,
                        now
                    ],
                )?;
                for (id, count) in valid.assets {
                    tx.execute(
                        "INSERT INTO document_assets VALUES(?1,?2,?3)",
                        params![document_id, id, count],
                    )?;
                }
                tx.execute(
                    "INSERT INTO reader_save_operations VALUES(?1,?2,0,?3)",
                    params![input.operation_id, document_id, now],
                )?;
            }
            PortableDocumentKind::NarrativeCanvas => {
                let mut value: serde_json::Value = serde_json::from_str(&package.canonical_json)?;
                remap_narrative(&mut value, &document_id, &asset_map)?;
                let valid = crate::narrative::schema::validate(
                    &serde_json::to_string(&value)?,
                    Some(&document_id),
                )
                .map_err(|_| PortableError::Validation("Remapped Narrative Canvas is invalid."))?;
                let expected = remapped_asset_counts(&package, &asset_map)?;
                if valid.assets != expected {
                    return Err(PortableError::Validation(
                        "Remapped Narrative asset counts differ.",
                    ));
                }
                let narrative = package.manifest.narrative.as_ref().unwrap();
                tx.execute("INSERT INTO narrative_documents (id,life_node_id,schema_version,revision,canonical_json,plain_text,created_at,updated_at,archived_at,template_id,template_version) VALUES(?1,?2,1,0,?3,?4,?5,?5,NULL,?6,?7)", params![document_id,input.life_node_id,valid.canonical_json,valid.plain_text,now,narrative.template_id,narrative.template_version])?;
                for (id, count) in valid.assets {
                    tx.execute(
                        "INSERT INTO narrative_document_assets VALUES(?1,?2,?3)",
                        params![document_id, id, count],
                    )?;
                }
                tx.execute(
                    "INSERT INTO narrative_save_operations VALUES(?1,?2,0,?3)",
                    params![input.operation_id, document_id, now],
                )?;
            }
        }
        Ok(())
    })();
    if let Err(error) = write {
        cleanup_receipts(&receipts);
        return Err(error);
    }
    if let Err(error) = tx.commit() {
        cleanup_receipts(&receipts);
        return Err(error.into());
    }
    Ok(PortablePackageImportResult {
        document_kind: package.manifest.document.kind,
        life_node_id: input.life_node_id,
        document_id,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task56_migration::run_all_migrations as run_migrations,
    };
    fn leaf(conn: &mut Connection, title: &str) -> String {
        crate::life::repository::create(
            conn,
            crate::life::dto::CreateLifeNodeInput {
                parent_id: crate::life::domain::ROOT_ID.into(),
                title: title.into(),
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
    fn target_matrix_rejects_root_missing_archived_branch_and_any_document_row() {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        {
            let tx = conn.transaction().unwrap();
            assert!(validate_target(&tx, "life-root").is_err());
            assert!(validate_target(&tx, "00000000-0000-7000-8000-000000000777").is_err());
            tx.rollback().unwrap();
        }
        let archived = leaf(&mut conn, "Archived");
        conn.execute(
            "UPDATE life_nodes SET archived_at='now' WHERE id=?1",
            [&archived],
        )
        .unwrap();
        let branch = leaf(&mut conn, "Branch");
        crate::life::repository::create(
            &mut conn,
            crate::life::dto::CreateLifeNodeInput {
                parent_id: branch.clone(),
                title: "Child".into(),
                short_description: "".into(),
                icon_key: "life-leaf".into(),
                branch_theme_id: "neutral".into(),
            },
        )
        .unwrap();
        let reader = leaf(&mut conn, "Reader");
        crate::document::repository::create(
            &mut conn,
            crate::document::dto::CreateReaderDocumentInput {
                life_node_id: reader.clone(),
                operation_id: "reader-create".into(),
            },
        )
        .unwrap();
        let archived_reader = leaf(&mut conn, "Archived reader");
        let archived_reader_doc = crate::document::repository::create(
            &mut conn,
            crate::document::dto::CreateReaderDocumentInput {
                life_node_id: archived_reader.clone(),
                operation_id: "archived-reader-create".into(),
            },
        )
        .unwrap();
        conn.execute(
            "UPDATE reader_documents SET archived_at='now' WHERE id=?1",
            [&archived_reader_doc.id],
        )
        .unwrap();
        let narrative = leaf(&mut conn, "Narrative");
        crate::narrative::repository::create(
            &mut conn,
            crate::narrative::dto::CreateNarrativeDocumentInput {
                life_node_id: narrative.clone(),
                operation_id: "narrative-create-target".into(),
                template_id: "knowledge_dossier".into(),
            },
        )
        .unwrap();
        let archived_narrative = leaf(&mut conn, "Archived narrative");
        let archived_narrative_doc = crate::narrative::repository::create(
            &mut conn,
            crate::narrative::dto::CreateNarrativeDocumentInput {
                life_node_id: archived_narrative.clone(),
                operation_id: "archived-narrative-create".into(),
                template_id: "knowledge_dossier".into(),
            },
        )
        .unwrap();
        conn.execute(
            "UPDATE narrative_documents SET archived_at='now' WHERE id=?1",
            [&archived_narrative_doc.id],
        )
        .unwrap();
        for target in [
            &archived,
            &branch,
            &reader,
            &archived_reader,
            &narrative,
            &archived_narrative,
        ] {
            let tx = conn.transaction().unwrap();
            assert!(validate_target(&tx, target).is_err(), "{target}");
            tx.rollback().unwrap();
        }
        let empty = leaf(&mut conn, "Empty");
        let tx = conn.transaction().unwrap();
        validate_target(&tx, &empty).unwrap();
        tx.rollback().unwrap();
    }
}
