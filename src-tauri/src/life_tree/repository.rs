//! Export source assembly and the authoritative atomic import.
//!
//! Every export query is bounded and batched: the complete active forest is re-derived by the
//! same recursive CTE in each statement, so the statement count is a constant independent of node
//! count. Nothing here mutates the source.

use super::{
    archive::{TreeDocumentPayload, ValidatedTreePackage},
    domain::{self, LifeTreeDocumentKind, LifeTreeError},
    dto::{ConfirmLifeTreeImportInput, LifeTreeImportResult},
    manifest::*,
    tree::*,
};
use crate::document::assets::{self, AssetInstallReceipt};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
};

/// Derives every active non-root node reachable without crossing an archived edge. Recursion stops
/// one level beyond the supported maximum so an over-deep tree is rejected, never truncated.
const SUBTREE_CTE: &str = "WITH RECURSIVE subtree(id,depth) AS (
    SELECT id,1 FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL
    UNION ALL
    SELECT n.id,s.depth+1 FROM life_nodes n JOIN subtree s ON n.parent_id=s.id
      WHERE n.archived_at IS NULL AND s.depth<129
)";

fn invalid(message: &'static str) -> LifeTreeError {
    LifeTreeError::Validation(message)
}

#[derive(Debug, Clone)]
pub struct TreeSourceAsset {
    pub asset_key: String,
    pub original_name: String,
    pub mime: String,
    pub relative_path: String,
    pub checksum: String,
    pub references: BTreeMap<String, u32>,
}

#[derive(Debug)]
pub struct TreeExportSource {
    pub tree: TreePackageTree,
    pub verified: VerifiedTree,
    pub documents: Vec<TreeDocumentPayload>,
    pub document_descriptors: Vec<TreeDocumentDescriptor>,
    pub assets: Vec<TreeSourceAsset>,
    pub omissions: TreeOmissions,
    pub source_schema_version: u32,
}

/// One `assets` row joined to one document-asset join row.
struct AssetJoinRow {
    asset_id: String,
    original_name: String,
    mime: String,
    relative_path: String,
    checksum: String,
    reference_count: u32,
    document_id: String,
    status: String,
}

struct RawNode {
    id: String,
    parent_id: Option<String>,
    title: String,
    short_description: String,
    icon_key: String,
    theme_variant: String,
    sort_key: i32,
    depth: u32,
}

fn count(conn: &Connection, sql: &str, root: &str) -> Result<u32, LifeTreeError> {
    let value: i64 = conn.query_row(sql, [root], |row| row.get(0))?;
    u32::try_from(value.max(0)).map_err(|_| invalid("Tree omission count overflowed."))
}

/// Validates export eligibility and assembles the complete package source in one read snapshot.
pub fn export_source(conn: &Connection, node_id: &str) -> Result<TreeExportSource, LifeTreeError> {
    if node_id != crate::life::domain::ROOT_ID {
        return Err(invalid("Export the Life tree from the Life root."));
    }

    let root_exists: bool = conn
        .query_row(
            "SELECT archived_at IS NULL FROM life_nodes WHERE id=?1",
            [node_id],
            |row| row.get(0),
        )
        .optional()?
        .ok_or(LifeTreeError::NotFound)?;
    if !root_exists {
        return Err(invalid("The Life root is unavailable."));
    }

    // â”€â”€ Nodes.
    let mut statement = conn.prepare(&format!(
        "{SUBTREE_CTE}
         SELECT n.id,n.parent_id,n.title,n.short_description,n.icon_key,n.branch_theme_id,n.sort_key,s.depth
           FROM life_nodes n JOIN subtree s ON s.id=n.id ORDER BY s.depth,n.parent_id,n.sort_key,n.id"
    ))?;
    let raw: Vec<RawNode> = statement
        .query_map([node_id], |row| {
            Ok(RawNode {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                title: row.get(2)?,
                short_description: row.get(3)?,
                icon_key: row.get(4)?,
                theme_variant: row.get(5)?,
                sort_key: row.get(6)?,
                depth: row.get::<_, i64>(7)? as u32,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(statement);
    if raw.is_empty() {
        return Err(invalid("The Life tree has no active non-root content."));
    }
    if raw.len() > domain::MAX_NODES {
        return Err(invalid("This tree has more than 500 active nodes."));
    }
    if raw
        .iter()
        .any(|node| node.depth > domain::MAX_RELATIVE_DEPTH)
    {
        return Err(invalid("This tree is deeper than 128 levels."));
    }
    let included: BTreeSet<&str> = raw.iter().map(|node| node.id.as_str()).collect();

    // â”€â”€ Canonical contiguous sibling indexes derived from source order, never copied raw.
    let mut ordered_children: BTreeMap<&str, Vec<&RawNode>> = BTreeMap::new();
    for node in &raw {
        let parent = node
            .parent_id
            .as_deref()
            .ok_or_else(|| invalid("An included node has no parent."))?;
        ordered_children.entry(parent).or_default().push(node);
    }
    let mut sibling_index = BTreeMap::new();
    for group in ordered_children.values_mut() {
        group.sort_by(|a, b| a.sort_key.cmp(&b.sort_key).then_with(|| a.id.cmp(&b.id)));
        for (index, node) in group.iter().enumerate() {
            sibling_index.insert(node.id.clone(), index as u32);
        }
    }

    // â”€â”€ Documents.
    let mut documents = Vec::new();
    let mut descriptors = Vec::new();
    let mut node_document = BTreeMap::new();
    let mut document_node = BTreeMap::new();

    let mut basic_statement = conn.prepare(&format!(
        "{SUBTREE_CTE}
         SELECT d.id,d.life_node_id,d.canonical_json,n.title,d.schema_version
           FROM reader_documents d JOIN subtree s ON s.id=d.life_node_id
           JOIN life_nodes n ON n.id=d.life_node_id
          WHERE d.archived_at IS NULL ORDER BY d.id"
    ))?;
    let basics: Vec<(String, String, String, String, i32)> = basic_statement
        .query_map([node_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(basic_statement);

    let mut narrative_statement = conn.prepare(&format!(
        "{SUBTREE_CTE}
         SELECT d.id,d.life_node_id,d.canonical_json,d.template_id,d.template_version,d.schema_version
           FROM narrative_documents d JOIN subtree s ON s.id=d.life_node_id
          WHERE d.archived_at IS NULL ORDER BY d.id"
    ))?;
    let narratives: Vec<(String, String, String, String, i32, i32)> = narrative_statement
        .query_map([node_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(narrative_statement);

    if basics.len() + narratives.len() > domain::MAX_DOCUMENTS {
        return Err(invalid("This tree has more than 500 documents."));
    }

    for (id, life_node_id, canonical, title, schema_version) in basics {
        if schema_version != 1 {
            return Err(LifeTreeError::Unsupported);
        }
        if node_document
            .insert(life_node_id.clone(), id.clone())
            .is_some()
        {
            return Err(invalid("A Life leaf holds more than one document."));
        }
        document_node.insert(id.clone(), life_node_id.clone());
        let valid = crate::document::schema::validate(&canonical)
            .map_err(|_| invalid("Basic Leaf canonical JSON is invalid."))?;
        let markdown = crate::document::markdown::export(&valid.canonical_json)
            .map_err(|_| invalid("Basic Leaf Markdown export failed."))?;
        descriptors.push(TreeDocumentDescriptor {
            kind: LifeTreeDocumentKind::BasicLeaf,
            key: id.clone(),
            life_node_key: life_node_id,
            schema_version: 1,
            title,
            canonical_path: domain::document_canonical_path(&id),
            markdown_path: domain::document_markdown_path(&id),
            narrative: None,
        });
        documents.push(TreeDocumentPayload {
            key: id,
            canonical_json: valid.canonical_json,
            markdown,
        });
    }

    for (id, life_node_id, canonical, template_id, template_version, schema_version) in narratives {
        if schema_version != 1 {
            return Err(LifeTreeError::Unsupported);
        }
        if node_document
            .insert(life_node_id.clone(), id.clone())
            .is_some()
        {
            return Err(invalid("A Life leaf holds more than one document."));
        }
        document_node.insert(id.clone(), life_node_id.clone());
        let valid = crate::narrative::schema::validate(&canonical, Some(&id))
            .map_err(|_| invalid("Narrative canonical JSON is invalid."))?;
        let value: serde_json::Value = serde_json::from_str(&valid.canonical_json)?;
        let world = value
            .get("visualWorldId")
            .and_then(|v| v.as_str())
            .unwrap_or("paper");
        if crate::narrative::visual_worlds::NarrativeVisualWorldId::parse(world).is_none() {
            return Err(LifeTreeError::Unsupported);
        }
        if value["templateId"].as_str() != Some(template_id.as_str())
            || value["templateVersion"].as_i64() != Some(template_version as i64)
        {
            return Err(invalid(
                "Narrative row and canonical template identities differ.",
            ));
        }
        let markdown = crate::narrative::markdown::export(&valid.canonical_json)
            .map_err(|_| invalid("Narrative Markdown export failed."))?;
        descriptors.push(TreeDocumentDescriptor {
            kind: LifeTreeDocumentKind::NarrativeCanvas,
            key: id.clone(),
            life_node_key: life_node_id,
            schema_version: 1,
            title: value["title"].as_str().unwrap_or("").into(),
            canonical_path: domain::document_canonical_path(&id),
            markdown_path: domain::document_markdown_path(&id),
            narrative: Some(TreeNarrativeMetadata {
                template_id,
                template_version,
                visual_world_id: world.into(),
                scene_count: value["scenes"]
                    .as_array()
                    .map(|v| v.len() as u32)
                    .unwrap_or(0),
            }),
        });
        documents.push(TreeDocumentPayload {
            key: id,
            canonical_json: valid.canonical_json,
            markdown,
        });
    }
    descriptors.sort_by(|a, b| a.key.cmp(&b.key));
    documents.sort_by(|a, b| a.key.cmp(&b.key));

    // â”€â”€ Assets, batched across both join tables.
    let mut assets_by_key: BTreeMap<String, TreeSourceAsset> = BTreeMap::new();
    for (join, narrative) in [
        ("document_assets", false),
        ("narrative_document_assets", true),
    ] {
        let table = if narrative {
            "narrative_documents"
        } else {
            "reader_documents"
        };
        let mut statement = conn.prepare(&format!(
            "{SUBTREE_CTE}
             SELECT a.id,a.original_name,a.sniffed_mime,a.relative_original_path,a.checksum,j.reference_count,j.document_id,a.status
               FROM assets a
               JOIN {join} j ON j.asset_id=a.id
               JOIN {table} d ON d.id=j.document_id
               JOIN subtree s ON s.id=d.life_node_id
              WHERE d.archived_at IS NULL ORDER BY a.id,j.document_id"
        ))?;
        let rows: Vec<AssetJoinRow> = statement
            .query_map([node_id], |row| {
                Ok(AssetJoinRow {
                    asset_id: row.get(0)?,
                    original_name: row.get(1)?,
                    mime: row.get(2)?,
                    relative_path: row.get(3)?,
                    checksum: row.get(4)?,
                    reference_count: row.get(5)?,
                    document_id: row.get(6)?,
                    status: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        drop(statement);
        for row in rows {
            if row.status != "usable" {
                return Err(invalid("This tree references an unusable asset."));
            }
            assets_by_key
                .entry(row.asset_id.clone())
                .or_insert_with(|| TreeSourceAsset {
                    asset_key: row.asset_id,
                    original_name: row.original_name,
                    mime: row.mime,
                    relative_path: row.relative_path,
                    checksum: row.checksum,
                    references: BTreeMap::new(),
                })
                .references
                .insert(row.document_id, row.reference_count);
        }
    }
    if assets_by_key.len() > domain::MAX_ASSETS {
        return Err(invalid("This tree references more than 256 assets."));
    }

    // â”€â”€ Active canonical tags.
    let mut tag_statement = conn.prepare(&format!(
        "{SUBTREE_CTE}
         SELECT j.life_node_id,g.id,g.name,g.normalized_name
           FROM life_node_tags j JOIN subtree s ON s.id=j.life_node_id
           JOIN tags g ON g.id=j.tag_id
          WHERE g.archived_at IS NULL AND g.merged_into_tag_id IS NULL
          ORDER BY g.id,j.life_node_id"
    ))?;
    let tag_rows: Vec<(String, String, String, String)> = tag_statement
        .query_map([node_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(tag_statement);
    let mut tags = BTreeMap::new();
    let mut node_tags: BTreeMap<String, Vec<String>> = BTreeMap::new();
    for (life_node_id, tag_id, name, normalized) in tag_rows {
        tags.insert(
            tag_id.clone(),
            TreeTag {
                key: tag_id.clone(),
                name,
                normalized_name: normalized,
            },
        );
        node_tags.entry(life_node_id).or_default().push(tag_id);
    }
    if tags.len() > domain::MAX_TAGS {
        return Err(invalid("This tree uses more than 256 active tags."));
    }

    // â”€â”€ Internal links.
    let mut link_statement = conn.prepare(&format!(
        "{SUBTREE_CTE}
         SELECT l.source_node_id,l.target_node_id FROM life_links l
          WHERE l.source_node_id IN (SELECT id FROM subtree)
            AND l.target_node_id IN (SELECT id FROM subtree)
          ORDER BY l.source_node_id,l.target_node_id"
    ))?;
    let links: Vec<TreeLink> = link_statement
        .query_map([node_id], |row| {
            Ok(TreeLink {
                source_key: row.get(0)?,
                target_key: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(link_statement);
    if links.len() > domain::MAX_INTERNAL_LINKS {
        return Err(invalid("This tree has more than 5,000 internal links."));
    }

    // â”€â”€ Safe omission counts. No title, content, path, or identifier is ever recorded.
    let omissions = TreeOmissions {
        archived_nodes: count(
            conn,
            "WITH RECURSIVE reachable(id,excluded) AS (
                 SELECT id,archived_at IS NOT NULL FROM life_nodes WHERE parent_id=?1
                 UNION ALL
                 SELECT n.id,r.excluded OR n.archived_at IS NOT NULL
                   FROM life_nodes n JOIN reachable r ON n.parent_id=r.id)
             SELECT COUNT(*) FROM reachable WHERE excluded",
            node_id,
        )?,
        drafts: count(
            conn,
            &format!(
                "{SUBTREE_CTE}
                 SELECT (SELECT COUNT(*) FROM reader_document_drafts x JOIN reader_documents d ON d.id=x.document_id
                          JOIN subtree s ON s.id=d.life_node_id)
                      + (SELECT COUNT(*) FROM narrative_document_drafts x JOIN narrative_documents d ON d.id=x.document_id
                          JOIN subtree s ON s.id=d.life_node_id)"
            ),
            node_id,
        )?,
        pins: count(
            conn,
            &format!(
                "{SUBTREE_CTE} SELECT COUNT(*) FROM life_node_pins p JOIN subtree s ON s.id=p.node_id"
            ),
            node_id,
        )?,
        task_references: count(
            conn,
            &format!(
                "{SUBTREE_CTE}
                 SELECT (SELECT COUNT(*) FROM tasks t JOIN subtree s ON s.id=t.life_node_id)
                      + (SELECT COUNT(*) FROM task_series t JOIN subtree s ON s.id=t.life_node_id)"
            ),
            node_id,
        )?,
        focus_plan_references: count(
            conn,
            &format!(
                "{SUBTREE_CTE} SELECT COUNT(*) FROM focus_plans f JOIN subtree s ON s.id=f.life_node_id"
            ),
            node_id,
        )?,
        outgoing_cross_boundary_links: count(
            conn,
            &format!(
                "{SUBTREE_CTE} SELECT COUNT(*) FROM life_links l
                  WHERE l.source_node_id IN (SELECT id FROM subtree)
                    AND l.target_node_id NOT IN (SELECT id FROM subtree)"
            ),
            node_id,
        )?,
        incoming_cross_boundary_links: count(
            conn,
            &format!(
                "{SUBTREE_CTE} SELECT COUNT(*) FROM life_links l
                  WHERE l.target_node_id IN (SELECT id FROM subtree)
                    AND l.source_node_id NOT IN (SELECT id FROM subtree)"
            ),
            node_id,
        )?,
        archived_tag_assignments: count(
            conn,
            &format!(
                "{SUBTREE_CTE} SELECT COUNT(*) FROM life_node_tags j JOIN subtree s ON s.id=j.life_node_id
                   JOIN tags g ON g.id=j.tag_id
                  WHERE g.archived_at IS NOT NULL OR g.merged_into_tag_id IS NOT NULL"
            ),
            node_id,
        )?,
    };

    // â”€â”€ Assemble and verify our own output before it can ever leave the process.
    let mut nodes: Vec<TreeNode> = raw
        .iter()
        .map(|node| {
            let document = node_document.get(&node.id).map(|key| TreeNodeDocument {
                kind: descriptors
                    .iter()
                    .find(|d| &d.key == key)
                    .map(|d| d.kind)
                    .unwrap_or(LifeTreeDocumentKind::BasicLeaf),
                key: key.clone(),
            });
            let mut tag_keys = node_tags.get(&node.id).cloned().unwrap_or_default();
            tag_keys.sort();
            tag_keys.dedup();
            TreeNode {
                key: node.id.clone(),
                parent_key: node
                    .parent_id
                    .clone()
                    .filter(|id| included.contains(id.as_str())),
                sibling_index: sibling_index.get(&node.id).copied().unwrap_or(0),
                title: node.title.trim().to_owned(),
                short_description: node.short_description.clone(),
                icon_key: node.icon_key.clone(),
                theme_variant: node.theme_variant.clone(),
                document,
                tag_keys,
            }
        })
        .collect();
    nodes.sort_by(|a, b| a.key.cmp(&b.key));

    let mut roots: Vec<&RawNode> = raw
        .iter()
        .filter(|node| node.parent_id.as_deref() == Some(node_id))
        .collect();
    roots.sort_by(|a, b| a.sort_key.cmp(&b.sort_key).then_with(|| a.id.cmp(&b.id)));
    let tree = TreePackageTree {
        format_version: domain::TREE_FORMAT_VERSION,
        root_keys: roots.into_iter().map(|node| node.id.clone()).collect(),
        nodes,
        tags: tags.into_values().collect(),
        links,
    };
    let verified = tree.clone().verify()?;

    Ok(TreeExportSource {
        tree,
        verified,
        documents,
        document_descriptors: descriptors,
        assets: assets_by_key.into_values().collect(),
        omissions,
        source_schema_version:
            crate::infrastructure::sqlite::task52_migration::max_supported_schema_version(),
    })
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Import
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/// The resolved plan for one packaged tag.
#[derive(Debug, Clone, PartialEq, Eq)]
enum TagPlan {
    Reuse(String),
    Create {
        id: String,
        name: String,
        normalized: String,
    },
    /// The normalized name belongs to an archived tag that is not merged into an active survivor.
    /// Reviving it is forbidden and a duplicate cannot exist, so the assignment is omitted.
    OmitArchived,
}

fn now() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

fn new_id() -> String {
    uuid::Uuid::now_v7().to_string()
}

fn valid_operation(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_'))
}

/// Binds the operation identity to the exact bytes, destination, and semantics being confirmed.
fn fingerprint(input: &ConfirmLifeTreeImportInput) -> String {
    domain::sha256(
        format!(
            "life_tree_import\u{1f}{}\u{1f}{}\u{1f}{}\u{1f}{}",
            input.operation_id,
            input.package_sha256,
            input.parent_node_id,
            input.expected_tree_revision
        )
        .as_bytes(),
    )
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct ImportAfter {
    fingerprint: String,
    first_node_id: String,
    root_node_ids: Vec<String>,
    destination_node_id: String,
    /// Recorded so the ledger row is self-describing beyond its `operation_kind`.
    operation: String,
    node_count: u32,
    document_count: u32,
    asset_count: u32,
    created_tag_count: u32,
    reused_tag_count: u32,
    internal_link_count: u32,
    warnings: Vec<String>,
}

/// Returns the original result when this exact operation already succeeded. Idempotent retries stay
/// correct after staging cleanup because the answer is reconstructed from the ledger, not the file.
pub fn existing_operation(
    conn: &Connection,
    input: &ConfirmLifeTreeImportInput,
) -> Result<Option<LifeTreeImportResult>, LifeTreeError> {
    if !valid_operation(&input.operation_id) {
        return Err(invalid("Tree import operation identity is invalid."));
    }
    let row: Option<(String, String, i32, Option<String>)> = conn
        .query_row(
            "SELECT operation_kind,after_payload,tree_revision_after,undone_at FROM life_operations WHERE operation_id=?1",
            [&input.operation_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .optional()?;
    let Some((kind, payload, revision, undone_at)) = row else {
        return Ok(None);
    };
    if kind != "import_tree" || undone_at.is_some() {
        return Err(invalid("Operation ID was already used."));
    }
    let after: ImportAfter = serde_json::from_str(&payload)
        .map_err(|_| invalid("Stored tree import operation is invalid."))?;
    if after.fingerprint != fingerprint(input)
        || after.operation != "import_tree"
        || after.root_node_ids.is_empty()
        || after.root_node_ids.first() != Some(&after.first_node_id)
    {
        return Err(invalid("Operation ID was already used."));
    }
    for root in &after.root_node_ids {
        let parent: Option<String> = conn
            .query_row(
                "SELECT parent_id FROM life_nodes WHERE id=?1",
                [root],
                |row| row.get(0),
            )
            .optional()?
            .flatten();
        if parent.as_deref() != Some(after.destination_node_id.as_str()) {
            return Err(invalid("Stored tree import result is no longer intact."));
        }
    }
    Ok(Some(LifeTreeImportResult {
        first_imported_node_id: after.first_node_id,
        parent_node_id: after.destination_node_id,
        tree_revision: revision,
        node_count: after.node_count,
        document_count: after.document_count,
        asset_count: after.asset_count,
        created_tag_count: after.created_tag_count,
        reused_tag_count: after.reused_tag_count,
        internal_link_count: after.internal_link_count,
        undo_token: None,
        warnings: after.warnings,
    }))
}

fn validate_destination(tx: &Transaction<'_>, parent_id: &str) -> Result<(), LifeTreeError> {
    if !domain::valid_local_node_id(parent_id) {
        return Err(invalid("Choose an active Life node without a document."));
    }
    let state = tx
        .query_row(
            "SELECT n.archived_at IS NULL,
                    (SELECT COUNT(*) FROM reader_documents d WHERE d.life_node_id=n.id),
                    (SELECT COUNT(*) FROM narrative_documents d WHERE d.life_node_id=n.id)
               FROM life_nodes n WHERE n.id=?1",
            [parent_id],
            |row| {
                Ok((
                    row.get::<_, bool>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            },
        )
        .optional()?
        .ok_or(LifeTreeError::NotFound)?;
    if !state.0 {
        return Err(invalid("An archived Life node cannot receive a tree."));
    }
    if state.1 != 0 || state.2 != 0 {
        return Err(invalid(
            "A Life node holding a document cannot receive a tree.",
        ));
    }
    Ok(())
}

/// Resolves every packaged tag against current local authority without mutating anything.
fn resolve_tag_plan(
    tx: &Transaction<'_>,
    tags: &[TreeTag],
) -> Result<BTreeMap<String, TagPlan>, LifeTreeError> {
    let mut plan = BTreeMap::new();
    let mut created = 0i64;
    for tag in tags {
        let normalized = crate::tag::normalize::normalize_tag(&tag.name)
            .map_err(|_| invalid("Tree tag name is invalid."))?;
        if normalized.normalized_name != tag.normalized_name {
            return Err(invalid("Tree tag normalization disagrees with its record."));
        }
        let existing: Option<(String, Option<String>, Option<String>)> = tx
            .query_row(
                "SELECT id,archived_at,merged_into_tag_id FROM tags WHERE normalized_name=?1",
                [&normalized.normalized_name],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .optional()?;
        let resolved = match existing {
            None => {
                created += 1;
                TagPlan::Create {
                    id: new_id(),
                    name: normalized.canonical.clone(),
                    normalized: normalized.normalized_name.clone(),
                }
            }
            Some((id, None, None)) => TagPlan::Reuse(id),
            Some((_, _, Some(survivor))) => {
                // Follow the merge alias to an active canonical survivor when one exists.
                let active: Option<String> = tx
                    .query_row(
                        "SELECT id FROM tags WHERE id=?1 AND archived_at IS NULL AND merged_into_tag_id IS NULL",
                        [&survivor],
                        |row| row.get(0),
                    )
                    .optional()?;
                match active {
                    Some(id) => TagPlan::Reuse(id),
                    None => TagPlan::OmitArchived,
                }
            }
            Some((_, Some(_), None)) => TagPlan::OmitArchived,
        };
        plan.insert(tag.key.clone(), resolved);
    }
    if created > 0 {
        let active: i64 = tx.query_row(
            "SELECT COUNT(*) FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL",
            [],
            |row| row.get(0),
        )?;
        if active + created > 500 {
            return Err(invalid(
                "Importing this tree would exceed the 500 active tag maximum.",
            ));
        }
    }
    Ok(plan)
}

fn cleanup_receipts(receipts: &[AssetInstallReceipt]) {
    for receipt in receipts {
        if let Some(path) = &receipt.created_file {
            let _ = crate::infrastructure::durability::durable_remove_file(path);
        }
    }
}

fn remap_basic(
    value: &mut serde_json::Value,
    map: &BTreeMap<String, String>,
) -> Result<(), LifeTreeError> {
    if let Some(object) = value.as_object_mut() {
        if object.get("type").and_then(|v| v.as_str()) == Some("image") {
            let id = object
                .get_mut("attrs")
                .and_then(|v| v.as_object_mut())
                .and_then(|v| v.get_mut("assetId"))
                .and_then(|v| v.as_str().map(str::to_owned))
                .ok_or_else(|| invalid("Tree image asset identity is missing."))?;
            *object.get_mut("attrs").unwrap().get_mut("assetId").unwrap() =
                serde_json::Value::String(
                    map.get(&id)
                        .ok_or_else(|| invalid("Tree image asset cannot be remapped."))?
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
) -> Result<(), LifeTreeError> {
    value["documentId"] = serde_json::Value::String(new_id.into());
    for scene in value["scenes"]
        .as_array_mut()
        .ok_or_else(|| invalid("Tree Narrative scenes are invalid."))?
    {
        for block in scene["blocks"]
            .as_array_mut()
            .ok_or_else(|| invalid("Tree Narrative blocks are invalid."))?
        {
            match block["kind"].as_str() {
                Some("image") => {
                    let source = block["assetId"]
                        .as_str()
                        .ok_or_else(|| invalid("Tree Narrative image asset is missing."))?;
                    block["assetId"] = serde_json::Value::String(
                        map.get(source)
                            .ok_or_else(|| invalid("Tree Narrative image cannot be remapped."))?
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

/// Enforces the Task 41 caps against the *final* local state the import would produce.
fn check_link_caps(tx: &Transaction<'_>, links: &[(String, String)]) -> Result<(), LifeTreeError> {
    let mut outgoing: BTreeMap<&str, i64> = BTreeMap::new();
    let mut incoming: BTreeMap<&str, i64> = BTreeMap::new();
    let mut seen = BTreeSet::new();
    for (source, target) in links {
        if source == target {
            return Err(invalid("A tree internal link is self-referential."));
        }
        if !seen.insert((source.as_str(), target.as_str())) {
            return Err(invalid("A tree internal link is duplicated."));
        }
        *outgoing.entry(source.as_str()).or_default() += 1;
        *incoming.entry(target.as_str()).or_default() += 1;
    }
    for (node, added) in outgoing {
        let existing: i64 = tx.query_row(
            "SELECT COUNT(*) FROM life_links WHERE source_node_id=?1",
            [node],
            |row| row.get(0),
        )?;
        if existing + added > crate::life_link::domain::MAX_OUTGOING_LINKS {
            return Err(invalid(
                "Importing this tree would exceed the 100 outgoing link maximum.",
            ));
        }
    }
    for (node, added) in incoming {
        let existing: i64 = tx.query_row(
            "SELECT COUNT(*) FROM life_links WHERE target_node_id=?1",
            [node],
            |row| row.get(0),
        )?;
        if existing + added > crate::life_link::domain::MAX_INCOMING_LINKS {
            return Err(invalid(
                "Importing this tree would exceed the 500 incoming link maximum.",
            ));
        }
    }
    Ok(())
}

pub fn confirm_import(
    conn: &mut Connection,
    root: &Path,
    input: ConfirmLifeTreeImportInput,
    package: ValidatedTreePackage,
) -> Result<LifeTreeImportResult, LifeTreeError> {
    if let Some(result) = existing_operation(conn, &input)? {
        return Ok(result);
    }
    if input.expected_tree_revision < 0 {
        return Err(invalid("Choose a valid Life operation."));
    }

    let tx = conn.transaction()?;

    // â”€â”€ Pre-mutation proof. Nothing is written until every one of these resolves.
    let current: i32 = tx.query_row(
        "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
        [],
        |row| row.get(0),
    )?;
    if current != input.expected_tree_revision {
        return Err(LifeTreeError::Stale);
    }
    validate_destination(&tx, &input.parent_node_id)?;

    let tree = &package.tree;
    let mut node_map = BTreeMap::new();
    for key in &tree.preorder {
        node_map.insert(key.clone(), new_id());
    }
    let mut document_map = BTreeMap::new();
    for descriptor in &package.manifest.documents {
        document_map.insert(descriptor.key.clone(), new_id());
    }
    let tag_plan = resolve_tag_plan(&tx, &tree.tree.tags)?;

    let remapped_links: Vec<(String, String)> = tree
        .tree
        .links
        .iter()
        .map(|link| {
            Ok((
                node_map
                    .get(&link.source_key)
                    .ok_or_else(|| invalid("A tree link source cannot be remapped."))?
                    .clone(),
                node_map
                    .get(&link.target_key)
                    .ok_or_else(|| invalid("A tree link target cannot be remapped."))?
                    .clone(),
            ))
        })
        .collect::<Result<Vec<_>, LifeTreeError>>()?;
    check_link_caps(&tx, &remapped_links)?;

    let next_sort: i32 = tx.query_row(
        "SELECT COALESCE(MAX(sort_key),-1)+1 FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL",
        [&input.parent_node_id],
        |row| row.get(0),
    )?;
    let timestamp = now();

    // â”€â”€ Mutation. Every fallible step past the first asset install unwinds created files.
    let mut receipts = Vec::new();
    let outcome = (|| -> Result<LifeTreeImportResult, LifeTreeError> {
        let mut asset_map = BTreeMap::new();
        for (key, prepared) in &package.assets {
            let receipt = assets::install_prepared_asset_in_tx(&tx, root, prepared)
                .map_err(|_| invalid("Tree asset installation failed."))?;
            asset_map.insert(key.clone(), receipt.asset_id.clone());
            receipts.push(receipt);
        }

        let mut created_tags = BTreeMap::new();
        for plan in tag_plan.values() {
            if let TagPlan::Create {
                id,
                name,
                normalized,
            } = plan
                && created_tags
                    .insert(normalized.clone(), id.clone())
                    .is_none()
            {
                tx.execute(
                    "INSERT INTO tags(id,name,normalized_name,revision,archived_at,merged_into_tag_id,created_at,updated_at)
                     VALUES(?1,?2,?3,0,NULL,NULL,?4,?4)",
                    params![id, name, normalized, timestamp],
                )?;
            }
        }

        // Nodes in preorder so a parent always exists before its children.
        for key in &tree.preorder {
            let node = tree
                .node(key)
                .ok_or_else(|| invalid("A verified tree node disappeared."))?;
            let local = &node_map[key];
            let (parent, sort_key) = match &node.parent_key {
                None => (
                    input.parent_node_id.clone(),
                    next_sort
                        .checked_add(node.sibling_index as i32)
                        .ok_or_else(|| invalid("Tree root order overflowed."))?,
                ),
                Some(parent_key) => (
                    node_map
                        .get(parent_key)
                        .ok_or_else(|| invalid("A tree parent cannot be remapped."))?
                        .clone(),
                    node.sibling_index as i32,
                ),
            };
            tx.execute(
                "INSERT INTO life_nodes VALUES(?1,?2,?3,?4,?5,?6,?7,NULL,?8,?8,0)",
                params![
                    local,
                    parent,
                    node.title,
                    node.short_description,
                    node.icon_key,
                    node.theme_variant,
                    sort_key,
                    timestamp
                ],
            )?;
        }

        // Documents after the whole subtree exists: the leaf-and-child guards are order sensitive.
        let mut document_assets: BTreeMap<String, BTreeMap<String, i32>> = BTreeMap::new();
        for asset in &package.manifest.assets {
            for reference in &asset.references {
                let local = asset_map
                    .get(&asset.key)
                    .ok_or_else(|| invalid("A tree asset cannot be remapped."))?;
                let count = i32::try_from(reference.reference_count)
                    .map_err(|_| invalid("Tree asset reference count is invalid."))?;
                *document_assets
                    .entry(reference.document_key.clone())
                    .or_default()
                    .entry(local.clone())
                    .or_insert(0) += count;
            }
        }
        for descriptor in &package.manifest.documents {
            let local_document = &document_map[&descriptor.key];
            let local_node = node_map
                .get(&descriptor.life_node_key)
                .ok_or_else(|| invalid("A tree document owner cannot be remapped."))?;
            let canonical = package
                .documents
                .get(&descriptor.key)
                .ok_or_else(|| invalid("A validated tree document disappeared."))?;
            let expected = document_assets
                .get(&descriptor.key)
                .cloned()
                .unwrap_or_default();
            let mut value: serde_json::Value = serde_json::from_str(canonical)?;
            match descriptor.kind {
                LifeTreeDocumentKind::BasicLeaf => {
                    remap_basic(&mut value, &asset_map)?;
                    let valid = crate::document::schema::validate(&serde_json::to_string(&value)?)
                        .map_err(|_| invalid("Remapped Basic Leaf is invalid."))?;
                    if valid.assets != expected {
                        return Err(invalid("Remapped Basic Leaf asset counts differ."));
                    }
                    tx.execute(
                        "INSERT INTO reader_documents VALUES(?1,?2,1,0,?3,?4,?5,?5,NULL)",
                        params![
                            local_document,
                            local_node,
                            valid.canonical_json,
                            valid.plain_text,
                            timestamp
                        ],
                    )?;
                    for (id, count) in valid.assets {
                        tx.execute(
                            "INSERT INTO document_assets VALUES(?1,?2,?3)",
                            params![local_document, id, count],
                        )?;
                    }
                }
                LifeTreeDocumentKind::NarrativeCanvas => {
                    remap_narrative(&mut value, local_document, &asset_map)?;
                    let valid = crate::narrative::schema::validate(
                        &serde_json::to_string(&value)?,
                        Some(local_document),
                    )
                    .map_err(|_| invalid("Remapped Narrative Canvas is invalid."))?;
                    if valid.assets != expected {
                        return Err(invalid("Remapped Narrative asset counts differ."));
                    }
                    let narrative = descriptor
                        .narrative
                        .as_ref()
                        .ok_or_else(|| invalid("Tree Narrative metadata is missing."))?;
                    tx.execute(
                        "INSERT INTO narrative_documents (id,life_node_id,schema_version,revision,canonical_json,plain_text,created_at,updated_at,archived_at,template_id,template_version)
                         VALUES(?1,?2,1,0,?3,?4,?5,?5,NULL,?6,?7)",
                        params![
                            local_document,
                            local_node,
                            valid.canonical_json,
                            valid.plain_text,
                            timestamp,
                            narrative.template_id,
                            narrative.template_version
                        ],
                    )?;
                    for (id, count) in valid.assets {
                        tx.execute(
                            "INSERT INTO narrative_document_assets VALUES(?1,?2,?3)",
                            params![local_document, id, count],
                        )?;
                    }
                }
            }
        }

        // Tag assignments.
        let mut reused = BTreeSet::new();
        for node in &tree.tree.nodes {
            let local = &node_map[&node.key];
            // Two packaged tags with distinct normalized names can legitimately resolve to one
            // local tag â€” for example when both were merged into the same survivor here â€” so the
            // resolved set is deduplicated before it reaches the (node, tag) primary key.
            let mut resolved = BTreeSet::new();
            for tag_key in &node.tag_keys {
                match tag_plan.get(tag_key) {
                    Some(TagPlan::Reuse(id)) => {
                        reused.insert(id.clone());
                        resolved.insert(id.clone());
                    }
                    Some(TagPlan::Create { id, .. }) => {
                        resolved.insert(id.clone());
                    }
                    Some(TagPlan::OmitArchived) => continue,
                    None => return Err(invalid("A tree tag has no resolved plan.")),
                }
            }
            for local_tag in resolved {
                tx.execute(
                    "INSERT INTO life_node_tags(life_node_id,tag_id,created_at) VALUES(?1,?2,?3)",
                    params![local, local_tag, timestamp],
                )?;
            }
        }

        for (source, target) in &remapped_links {
            tx.execute(
                "INSERT INTO life_links(id,source_node_id,target_node_id,created_at) VALUES(?1,?2,?3,?4)",
                params![new_id(), source, target, timestamp],
            )?;
        }

        let omitted_tags = tree
            .tree
            .nodes
            .iter()
            .flat_map(|node| node.tag_keys.iter())
            .filter(|key| tag_plan.get(*key) == Some(&TagPlan::OmitArchived))
            .count();
        let mut warnings = vec![
            "Imported nodes, documents, links, and assets received new local identities.".into(),
            "Nothing existing was merged, renamed, or overwritten.".into(),
            "This import cannot be undone.".into(),
        ];
        if omitted_tags > 0 {
            warnings.push(format!(
                "{omitted_tags} tag assignment(s) were omitted because the tag name belongs to an archived local tag."
            ));
        }

        // Exactly one revision increment and one non-undoable ledger row.
        tx.execute(
            "UPDATE life_tree_meta SET tree_revision=tree_revision+1 WHERE singleton=1",
            [],
        )?;
        let first_root_key = tree
            .tree
            .root_keys
            .first()
            .ok_or_else(|| invalid("A verified tree has no top-level node."))?;
        let imported_root = node_map[first_root_key].clone();
        let imported_roots: Vec<String> = tree
            .tree
            .root_keys
            .iter()
            .map(|key| node_map[key].clone())
            .collect();
        let after = ImportAfter {
            fingerprint: fingerprint(&input),
            first_node_id: imported_root.clone(),
            root_node_ids: imported_roots,
            destination_node_id: input.parent_node_id.clone(),
            operation: "import_tree".into(),
            node_count: tree.node_count(),
            document_count: tree.document_count(),
            asset_count: package.assets.len() as u32,
            created_tag_count: created_tags.len() as u32,
            reused_tag_count: reused.len() as u32,
            internal_link_count: remapped_links.len() as u32,
            warnings: warnings.clone(),
        };
        tx.execute(
            "INSERT INTO life_operations VALUES(?1,'import_tree',?2,'{\"kind\":\"expired\"}',?3,?4,?5,?6,NULL)",
            params![
                input.operation_id,
                input.parent_node_id,
                serde_json::to_string(&after)
                    .map_err(|_| invalid("Tree import operation payload is invalid."))?,
                input.expected_tree_revision,
                input.expected_tree_revision + 1,
                timestamp
            ],
        )?;

        Ok(LifeTreeImportResult {
            first_imported_node_id: imported_root,
            parent_node_id: input.parent_node_id.clone(),
            tree_revision: input.expected_tree_revision + 1,
            node_count: tree.node_count(),
            document_count: tree.document_count(),
            asset_count: package.assets.len() as u32,
            created_tag_count: created_tags.len() as u32,
            reused_tag_count: reused.len() as u32,
            internal_link_count: remapped_links.len() as u32,
            undo_token: None,
            warnings,
        })
    })();

    let result = match outcome {
        Ok(value) => value,
        Err(error) => {
            cleanup_receipts(&receipts);
            return Err(error);
        }
    };
    if let Err(error) = tx.commit() {
        cleanup_receipts(&receipts);
        return Err(error.into());
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::life_branch::repository::harness::{
        add_basic, add_link, add_node, add_tag, archive_node, assign_tag, attach_asset, count_of,
        db, install_asset, scenario, temp_root, tree_revision,
    };

    fn package(conn: &Connection) -> (Vec<u8>, TreeExportSource) {
        let source = export_source(conn, crate::life::domain::ROOT_ID).unwrap();
        let manifest = TreeManifest {
            format: domain::TREE_FORMAT.into(),
            format_version: domain::TREE_FORMAT_VERSION,
            producer: TreeProducer {
                application: "lifeweave-desktop".into(),
                app_version: "0.0.0".into(),
            },
            exported_at: "2026-08-08T00:00:00Z".into(),
            source_schema_version: 27,
            tree_path: domain::TREE_PATH.into(),
            asset_policy: domain::ASSET_POLICY.into(),
            counts: TreeCounts {
                top_level_nodes: source.verified.top_level_count(),
                nodes: source.verified.node_count(),
                branches: source.verified.branch_count,
                basic_leaf_documents: source.verified.basic_leaf_count,
                narrative_documents: source.verified.narrative_count,
                empty_leaves: source.verified.empty_leaf_count,
                documents: source.verified.document_count(),
                assets: 0,
                tags: source.tree.tags.len() as u32,
                internal_links: source.tree.links.len() as u32,
            },
            maximum_depth: source.verified.maximum_depth,
            omissions: source.omissions,
            documents: source.document_descriptors.clone(),
            assets: vec![],
        };
        let bytes = crate::life_tree::archive::build_package(
            &manifest,
            &source.tree,
            &source.documents,
            vec![],
        )
        .unwrap();
        (bytes, source)
    }

    fn child_rows(conn: &Connection, parent: &str) -> Vec<(String, String, i32)> {
        conn.prepare(
            "SELECT id,title,sort_key FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL ORDER BY sort_key,id",
        )
        .unwrap()
        .query_map([parent], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
    }

    fn package_with_assets(conn: &Connection, root: &Path) -> Vec<u8> {
        let source = export_source(conn, crate::life::domain::ROOT_ID).unwrap();
        let ticket = crate::life_tree::service::testing::export(root, source).unwrap();
        std::fs::read(crate::life_tree::service::testing::exported_package(
            root,
            &ticket.export_id,
        ))
        .unwrap()
    }

    #[test]
    fn export_contains_every_active_top_level_root_and_descendant_in_order() {
        let conn = db();
        let source = scenario(&conn);
        let exported = export_source(&conn, crate::life::domain::ROOT_ID).unwrap();
        assert_eq!(
            exported.tree.root_keys,
            [source.root.clone(), source.outside.clone()]
        );
        assert_eq!(exported.verified.top_level_count(), 2);
        assert_eq!(exported.verified.node_count(), 6);
        assert_eq!(exported.verified.maximum_depth, 3);
        assert!(
            !exported
                .tree
                .root_keys
                .iter()
                .any(|key| key == crate::life::domain::ROOT_ID)
        );
        assert_eq!(
            exported.tree.links.len(),
            3,
            "all links are internal to the complete active forest"
        );
        assert_eq!(exported.omissions.outgoing_cross_boundary_links, 0);
        assert_eq!(exported.omissions.incoming_cross_boundary_links, 0);
    }

    #[test]
    fn empty_tree_rejects_and_archived_edge_omits_every_descendant_with_a_count_only_warning() {
        let conn = db();
        assert!(export_source(&conn, crate::life::domain::ROOT_ID).is_err());
        let kept = add_node(&conn, crate::life::domain::ROOT_ID, "Kept", 0);
        let cut = add_node(&conn, crate::life::domain::ROOT_ID, "Cut", 1);
        let below = add_node(&conn, &cut, "Below", 0);
        archive_node(&conn, &cut);
        let exported = export_source(&conn, crate::life::domain::ROOT_ID).unwrap();
        assert_eq!(exported.tree.root_keys, [kept]);
        assert!(
            !exported
                .tree
                .nodes
                .iter()
                .any(|node| node.key == cut || node.key == below)
        );
        assert_eq!(
            exported.omissions.archived_nodes, 2,
            "the archived edge and everything below it are counted"
        );
    }

    #[test]
    fn import_appends_all_roots_after_existing_children_with_fresh_ids_and_one_revision() {
        let mut conn = db();
        let source = scenario(&conn);
        let (bytes, exported) = package(&conn);
        let validated = crate::life_tree::archive::validate_package_bytes(&bytes).unwrap();
        // Created after export, so this destination and child cannot appear in the package.
        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 9);
        let existing = add_node(&conn, &destination, "Existing", 7);
        let input = ConfirmLifeTreeImportInput {
            import_id: domain::new_opaque_id(),
            package_sha256: domain::sha256(&bytes),
            parent_node_id: destination.clone(),
            expected_tree_revision: tree_revision(&conn),
            operation_id: "tree-import-order".into(),
        };
        let root_dir = temp_root("tree-import-order");
        let result = confirm_import(&mut conn, &root_dir, input.clone(), validated).unwrap();
        let children = child_rows(&conn, &destination);
        assert_eq!(
            children
                .iter()
                .map(|row| row.1.as_str())
                .collect::<Vec<_>>(),
            ["Existing", "Research", "Outside"]
        );
        assert_eq!(
            children.iter().map(|row| row.2).collect::<Vec<_>>(),
            [7, 8, 9]
        );
        assert_eq!(result.first_imported_node_id, children[1].0);
        assert_ne!(result.first_imported_node_id, source.root);
        assert_eq!(tree_revision(&conn), input.expected_tree_revision + 1);
        assert_eq!(
            child_rows(&conn, crate::life::domain::ROOT_ID)
                .iter()
                .filter(|row| row.1 == "Research")
                .count(),
            1
        );
        assert_eq!(exported.verified.node_count(), result.node_count);
        assert_eq!(conn.query_row("SELECT operation_kind||'|'||target_node_id FROM life_operations WHERE operation_id='tree-import-order'", [], |row| row.get::<_, String>(0)).unwrap(), format!("import_tree|{destination}"));

        let replay = existing_operation(&conn, &input).unwrap().unwrap();
        assert_eq!(replay, result, "an exact retry returns the original result");
        assert_eq!(tree_revision(&conn), input.expected_tree_revision + 1);
        let mut mismatch = input;
        mismatch.parent_node_id = crate::life::domain::ROOT_ID.into();
        assert!(existing_operation(&conn, &mismatch).is_err());
        std::fs::remove_dir_all(root_dir).unwrap();
        assert_eq!(existing, children[0].0);
    }

    #[test]
    fn tree_branch_and_portable_package_validators_are_mutually_exclusive() {
        let conn = db();
        scenario(&conn);
        let (tree_bytes, _) = package(&conn);
        assert!(crate::life_branch::archive::validate_package_bytes(&tree_bytes).is_err());
        assert!(crate::portable::archive::validate_package_bytes(&tree_bytes).is_err());

        let branch_bytes = crate::life_branch::archive::fixtures::valid_bytes();
        assert!(crate::life_tree::archive::validate_package_bytes(&branch_bytes).is_err());
    }

    #[test]
    fn invalid_destination_and_stale_revision_leave_the_tree_unchanged() {
        let mut conn = db();
        scenario(&conn);
        let (bytes, _) = package(&conn);
        let root_dir = temp_root("tree-import-reject");
        let before_nodes: i64 = conn
            .query_row("SELECT COUNT(*) FROM life_nodes", [], |row| row.get(0))
            .unwrap();
        let base = ConfirmLifeTreeImportInput {
            import_id: domain::new_opaque_id(),
            package_sha256: domain::sha256(&bytes),
            parent_node_id: "missing".into(),
            expected_tree_revision: tree_revision(&conn),
            operation_id: "tree-invalid-destination".into(),
        };
        assert!(
            confirm_import(
                &mut conn,
                &root_dir,
                base.clone(),
                crate::life_tree::archive::validate_package_bytes(&bytes).unwrap()
            )
            .is_err()
        );
        let mut stale = base;
        stale.parent_node_id = crate::life::domain::ROOT_ID.into();
        stale.expected_tree_revision += 1;
        stale.operation_id = "tree-stale".into();
        assert!(
            confirm_import(
                &mut conn,
                &root_dir,
                stale,
                crate::life_tree::archive::validate_package_bytes(&bytes).unwrap()
            )
            .is_err()
        );
        assert_eq!(
            conn.query_row("SELECT COUNT(*) FROM life_nodes", [], |row| row
                .get::<_, i64>(0))
                .unwrap(),
            before_nodes
        );
        assert_eq!(tree_revision(&conn), 0);
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn root_and_empty_leaf_destinations_are_valid_but_archived_or_document_bearing_ones_are_atomic_rejections()
     {
        let mut conn = db();
        let source = scenario(&conn);
        let (bytes, _) = package(&conn);
        let root_dir = temp_root("tree-destinations");
        let revision = tree_revision(&conn);
        for (label, parent) in [
            ("missing", "00000000-0000-7000-8000-000000000888".to_owned()),
            ("basic", source.basic_leaf.clone()),
            ("narrative", source.narrative_leaf.clone()),
        ] {
            let result = confirm_import(
                &mut conn,
                &root_dir,
                ConfirmLifeTreeImportInput {
                    import_id: domain::new_opaque_id(),
                    package_sha256: domain::sha256(&bytes),
                    parent_node_id: parent,
                    expected_tree_revision: revision,
                    operation_id: format!("tree-destination-{label}"),
                },
                crate::life_tree::archive::validate_package_bytes(&bytes).unwrap(),
            );
            assert!(result.is_err(), "{label}");
        }
        let archived = add_node(
            &conn,
            crate::life::domain::ROOT_ID,
            "Archived destination",
            9,
        );
        archive_node(&conn, &archived);
        assert!(
            confirm_import(
                &mut conn,
                &root_dir,
                ConfirmLifeTreeImportInput {
                    import_id: domain::new_opaque_id(),
                    package_sha256: domain::sha256(&bytes),
                    parent_node_id: archived,
                    expected_tree_revision: revision,
                    operation_id: "tree-destination-archived".into()
                },
                crate::life_tree::archive::validate_package_bytes(&bytes).unwrap()
            )
            .is_err()
        );
        assert_eq!(tree_revision(&conn), revision);
        assert_eq!(count_of(&conn, "SELECT COUNT(*) FROM life_operations"), 0);

        let first = confirm_import(
            &mut conn,
            &root_dir,
            ConfirmLifeTreeImportInput {
                import_id: domain::new_opaque_id(),
                package_sha256: domain::sha256(&bytes),
                parent_node_id: source.empty_leaf.clone(),
                expected_tree_revision: revision,
                operation_id: "tree-destination-empty-leaf".into(),
            },
            crate::life_tree::archive::validate_package_bytes(&bytes).unwrap(),
        )
        .unwrap();
        assert_eq!(
            conn.query_row(
                "SELECT parent_id FROM life_nodes WHERE id=?1",
                [&first.first_imported_node_id],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
            source.empty_leaf
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn imported_documents_nodes_and_links_are_fresh_and_links_stay_inside_the_imported_forest() {
        let mut conn = db();
        scenario(&conn);
        let source_nodes: BTreeSet<String> = conn
            .prepare("SELECT id FROM life_nodes")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        let source_documents: BTreeSet<String> = conn
            .prepare("SELECT id FROM reader_documents UNION SELECT id FROM narrative_documents")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        let (bytes, _) = package(&conn);
        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Fresh destination", 9);
        let root_dir = temp_root("tree-fresh-identities");
        let revision = tree_revision(&conn);
        let result = confirm_import(
            &mut conn,
            &root_dir,
            ConfirmLifeTreeImportInput {
                import_id: domain::new_opaque_id(),
                package_sha256: domain::sha256(&bytes),
                parent_node_id: destination,
                expected_tree_revision: revision,
                operation_id: "tree-fresh-identities".into(),
            },
            crate::life_tree::archive::validate_package_bytes(&bytes).unwrap(),
        )
        .unwrap();
        let imported_nodes: BTreeSet<String> = conn.prepare("WITH RECURSIVE sub(id) AS (SELECT id FROM life_nodes WHERE parent_id=?1 UNION ALL SELECT n.id FROM life_nodes n JOIN sub s ON n.parent_id=s.id) SELECT id FROM sub").unwrap().query_map([&result.parent_node_id], |row| row.get(0)).unwrap().collect::<Result<_, _>>().unwrap();
        assert!(source_nodes.is_disjoint(&imported_nodes));
        let imported_documents: BTreeSet<String> = conn.prepare("SELECT d.id FROM reader_documents d WHERE d.life_node_id IN (SELECT id FROM life_nodes WHERE created_at<>'1') UNION SELECT d.id FROM narrative_documents d WHERE d.life_node_id IN (SELECT id FROM life_nodes WHERE created_at<>'1')").unwrap().query_map([], |row| row.get(0)).unwrap().collect::<Result<_, _>>().unwrap();
        assert!(source_documents.is_disjoint(&imported_documents));
        let new_links: Vec<(String, String)> = conn
            .prepare("SELECT source_node_id,target_node_id FROM life_links WHERE created_at<>'1'")
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert_eq!(new_links.len(), 3);
        assert!(
            new_links
                .iter()
                .all(|(source, target)| imported_nodes.contains(source)
                    && imported_nodes.contains(target))
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn tag_resolution_reuses_canonical_and_merged_survivors_creates_new_and_never_revives_archived()
    {
        let source = db();
        let scenario = scenario(&source);
        for (node, name) in [
            (&scenario.basic_leaf, "Reused"),
            (&scenario.narrative_leaf, "Alias"),
            (&scenario.empty_leaf, "Brand new"),
            (&scenario.outside, "Archived collision"),
        ] {
            let tag = add_tag(&source, name);
            assign_tag(&source, node, &tag);
        }
        let (bytes, _) = package(&source);
        let mut target = db();
        let destination = add_node(&target, crate::life::domain::ROOT_ID, "Destination", 0);
        let reused = add_tag(&target, "Reused");
        let survivor = add_tag(&target, "Survivor");
        let alias = add_tag(&target, "Alias");
        target
            .execute(
                "UPDATE tags SET archived_at='merged',merged_into_tag_id=?1 WHERE id=?2",
                params![survivor, alias],
            )
            .unwrap();
        let archived = add_tag(&target, "Archived collision");
        target
            .execute(
                "UPDATE tags SET archived_at='gone' WHERE id=?1",
                [&archived],
            )
            .unwrap();
        let root_dir = temp_root("tree-tags");
        let revision = tree_revision(&target);
        let result = confirm_import(
            &mut target,
            &root_dir,
            ConfirmLifeTreeImportInput {
                import_id: domain::new_opaque_id(),
                package_sha256: domain::sha256(&bytes),
                parent_node_id: destination,
                expected_tree_revision: revision,
                operation_id: "tree-tags".into(),
            },
            crate::life_tree::archive::validate_package_bytes(&bytes).unwrap(),
        )
        .unwrap();
        assert_eq!((result.created_tag_count, result.reused_tag_count), (1, 2));
        assert!(
            result
                .warnings
                .iter()
                .any(|value| value.contains("archived local tag"))
        );
        assert!(
            count_of(
                &target,
                &format!("SELECT COUNT(*) FROM life_node_tags WHERE tag_id='{reused}'")
            ) > 0
        );
        assert!(
            count_of(
                &target,
                &format!("SELECT COUNT(*) FROM life_node_tags WHERE tag_id='{survivor}'")
            ) > 0
        );
        assert_eq!(
            count_of(
                &target,
                &format!(
                    "SELECT COUNT(*) FROM life_node_tags WHERE tag_id='{alias}' OR tag_id='{archived}'"
                )
            ),
            0
        );
        assert_eq!(
            target
                .query_row(
                    "SELECT archived_at FROM tags WHERE id=?1",
                    [&archived],
                    |row| row.get::<_, String>(0)
                )
                .unwrap(),
            "gone"
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn outgoing_link_cap_breach_rolls_back_the_complete_forest() {
        let source = db();
        let hub = add_node(&source, crate::life::domain::ROOT_ID, "Hub", 0);
        add_basic(&source, &hub, "Hub");
        for index in 0..=crate::life_link::domain::MAX_OUTGOING_LINKS {
            let leaf = add_node(
                &source,
                crate::life::domain::ROOT_ID,
                &format!("Leaf {index}"),
                index as i32 + 1,
            );
            add_basic(&source, &leaf, "Body");
            add_link(&source, &hub, &leaf);
        }
        let (bytes, _) = package(&source);
        let mut target = db();
        let before_nodes = count_of(&target, "SELECT COUNT(*) FROM life_nodes");
        let revision = tree_revision(&target);
        let root_dir = temp_root("tree-link-cap");
        assert!(
            confirm_import(
                &mut target,
                &root_dir,
                ConfirmLifeTreeImportInput {
                    import_id: domain::new_opaque_id(),
                    package_sha256: domain::sha256(&bytes),
                    parent_node_id: crate::life::domain::ROOT_ID.into(),
                    expected_tree_revision: revision,
                    operation_id: "tree-link-cap".into()
                },
                crate::life_tree::archive::validate_package_bytes(&bytes).unwrap()
            )
            .is_err()
        );
        assert_eq!(
            count_of(&target, "SELECT COUNT(*) FROM life_nodes"),
            before_nodes
        );
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM life_links"), 0);
        assert_eq!(tree_revision(&target), revision);
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn late_database_failure_removes_only_attempt_created_asset_files_and_retry_is_clean() {
        let source_dir = temp_root("tree-asset-source");
        let mut source = db();
        let scenario = scenario(&source);
        let asset = install_asset(&mut source, &source_dir);
        let document: String = source
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&scenario.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        attach_asset(&source, &document, &asset);
        let tag = add_tag(&source, "Needs a new tag");
        assign_tag(&source, &scenario.empty_leaf, &tag);
        let bytes = package_with_assets(&source, &source_dir);

        let target_dir = temp_root("tree-asset-target");
        let mut target = db();
        for index in 0..500 {
            add_tag(&target, &format!("Filler {index}"));
        }
        let revision = tree_revision(&target);
        assert!(
            confirm_import(
                &mut target,
                &target_dir,
                ConfirmLifeTreeImportInput {
                    import_id: domain::new_opaque_id(),
                    package_sha256: domain::sha256(&bytes),
                    parent_node_id: crate::life::domain::ROOT_ID.into(),
                    expected_tree_revision: revision,
                    operation_id: "tree-asset-fail".into()
                },
                crate::life_tree::archive::validate_package_bytes(&bytes).unwrap()
            )
            .is_err()
        );
        assert_eq!(tree_revision(&target), revision);
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM assets"), 0);
        assert!(
            !target_dir.join("assets/original").exists()
                || target_dir
                    .join("assets/original")
                    .read_dir()
                    .unwrap()
                    .next()
                    .is_none()
        );
        target
            .execute("DELETE FROM tags WHERE name LIKE 'Filler %'", [])
            .unwrap();
        let ok = confirm_import(
            &mut target,
            &target_dir,
            ConfirmLifeTreeImportInput {
                import_id: domain::new_opaque_id(),
                package_sha256: domain::sha256(&bytes),
                parent_node_id: crate::life::domain::ROOT_ID.into(),
                expected_tree_revision: revision,
                operation_id: "tree-asset-retry".into(),
            },
            crate::life_tree::archive::validate_package_bytes(&bytes).unwrap(),
        )
        .unwrap();
        assert_eq!((ok.asset_count, ok.created_tag_count), (1, 1));
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM assets"), 1);
        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }

    #[test]
    fn asset_publication_failure_commits_no_database_authority_and_the_same_package_can_retry() {
        let source_dir = temp_root("tree-file-failure-source");
        let mut source = db();
        let scenario = scenario(&source);
        let asset = install_asset(&mut source, &source_dir);
        let document: String = source
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&scenario.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        attach_asset(&source, &document, &asset);
        let bytes = package_with_assets(&source, &source_dir);

        let target_dir = temp_root("tree-file-failure-target");
        std::fs::write(target_dir.join("assets"), b"intentional obstruction").unwrap();
        let mut target = db();
        let before_nodes = count_of(&target, "SELECT COUNT(*) FROM life_nodes");
        let revision = tree_revision(&target);
        let input = |operation: &str| ConfirmLifeTreeImportInput {
            import_id: domain::new_opaque_id(),
            package_sha256: domain::sha256(&bytes),
            parent_node_id: crate::life::domain::ROOT_ID.into(),
            expected_tree_revision: revision,
            operation_id: operation.into(),
        };
        assert!(
            confirm_import(
                &mut target,
                &target_dir,
                input("tree-file-failure"),
                crate::life_tree::archive::validate_package_bytes(&bytes).unwrap()
            )
            .is_err()
        );
        assert_eq!(
            count_of(&target, "SELECT COUNT(*) FROM life_nodes"),
            before_nodes
        );
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM assets"), 0);
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM life_operations"), 0);
        assert_eq!(tree_revision(&target), revision);

        std::fs::remove_file(target_dir.join("assets")).unwrap();
        let retry = confirm_import(
            &mut target,
            &target_dir,
            input("tree-file-retry"),
            crate::life_tree::archive::validate_package_bytes(&bytes).unwrap(),
        )
        .unwrap();
        assert_eq!(retry.asset_count, 1);
        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }
}
