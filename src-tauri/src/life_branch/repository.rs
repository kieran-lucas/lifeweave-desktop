//! Export source assembly and the authoritative atomic import.
//!
//! Every export query is bounded and batched: the connected active subtree is re-derived by the
//! same recursive CTE in each statement, so the statement count is a constant independent of node
//! count. Nothing here mutates the source.

use super::{
    archive::{BranchDocumentPayload, ValidatedBranchPackage},
    domain::{self, LifeBranchDocumentKind, LifeBranchError},
    dto::{ConfirmLifeBranchImportInput, LifeBranchImportResult},
    manifest::*,
    tree::*,
};
use crate::document::assets::{self, AssetInstallReceipt};
use rusqlite::{Connection, OptionalExtension, Transaction, params};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::Path,
};

/// Derives the connected active subtree. Recursion stops one level beyond the supported maximum so
/// an over-deep branch is detected and rejected rather than silently truncated.
const SUBTREE_CTE: &str = "WITH RECURSIVE subtree(id,depth) AS (
    SELECT id,0 FROM life_nodes WHERE id=?1 AND archived_at IS NULL
    UNION ALL
    SELECT n.id,s.depth+1 FROM life_nodes n JOIN subtree s ON n.parent_id=s.id
      WHERE n.archived_at IS NULL AND s.depth<129
)";

fn invalid(message: &'static str) -> LifeBranchError {
    LifeBranchError::Validation(message)
}

#[derive(Debug, Clone)]
pub struct BranchSourceAsset {
    pub asset_key: String,
    pub original_name: String,
    pub mime: String,
    pub relative_path: String,
    pub checksum: String,
    pub references: BTreeMap<String, u32>,
}

#[derive(Debug)]
pub struct BranchExportSource {
    pub tree: BranchTree,
    pub verified: VerifiedTree,
    pub documents: Vec<BranchDocumentPayload>,
    pub document_descriptors: Vec<BranchDocumentDescriptor>,
    pub assets: Vec<BranchSourceAsset>,
    pub omissions: BranchOmissions,
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

fn count(conn: &Connection, sql: &str, root: &str) -> Result<u32, LifeBranchError> {
    let value: i64 = conn.query_row(sql, [root], |row| row.get(0))?;
    u32::try_from(value.max(0)).map_err(|_| invalid("Branch omission count overflowed."))
}

/// Validates export eligibility and assembles the complete package source in one read snapshot.
pub fn export_source(
    conn: &Connection,
    node_id: &str,
) -> Result<BranchExportSource, LifeBranchError> {
    if !domain::valid_local_node_id(node_id) || node_id == crate::life::domain::ROOT_ID {
        return Err(invalid("Choose an active Life branch below the Life root."));
    }

    // ── Root eligibility.
    let state = conn
        .query_row(
            "SELECT n.archived_at IS NULL,
                    (SELECT COUNT(*) FROM life_nodes c WHERE c.parent_id=n.id AND c.archived_at IS NULL),
                    (SELECT COUNT(*) FROM reader_documents d WHERE d.life_node_id=n.id),
                    (SELECT COUNT(*) FROM narrative_documents d WHERE d.life_node_id=n.id)
               FROM life_nodes n WHERE n.id=?1",
            [node_id],
            |row| {
                Ok((
                    row.get::<_, bool>(0)?,
                    row.get::<_, i64>(1)?,
                    row.get::<_, i64>(2)?,
                    row.get::<_, i64>(3)?,
                ))
            },
        )
        .optional()?
        .ok_or(LifeBranchError::NotFound)?;
    if !state.0 {
        return Err(invalid("An archived Life node cannot be exported."));
    }
    if state.1 == 0 {
        return Err(invalid(
            "Export requires a branch with at least one active child.",
        ));
    }
    if state.2 != 0 || state.3 != 0 {
        return Err(invalid(
            "A Life node holding a document cannot be exported.",
        ));
    }

    // ── Nodes.
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
        return Err(LifeBranchError::NotFound);
    }
    if raw.len() > domain::MAX_NODES {
        return Err(invalid("This branch has more than 500 active nodes."));
    }
    if raw
        .iter()
        .any(|node| node.depth > domain::MAX_RELATIVE_DEPTH)
    {
        return Err(invalid("This branch is deeper than 128 levels."));
    }
    let included: BTreeSet<&str> = raw.iter().map(|node| node.id.as_str()).collect();

    // ── Canonical contiguous sibling indexes derived from source order, never copied raw.
    let mut ordered_children: BTreeMap<&str, Vec<&RawNode>> = BTreeMap::new();
    for node in &raw {
        if node.id == node_id {
            continue;
        }
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

    // ── Documents.
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
        return Err(invalid("This branch has more than 500 documents."));
    }

    for (id, life_node_id, canonical, title, schema_version) in basics {
        if schema_version != 1 {
            return Err(LifeBranchError::Unsupported);
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
        descriptors.push(BranchDocumentDescriptor {
            kind: LifeBranchDocumentKind::BasicLeaf,
            key: id.clone(),
            life_node_key: life_node_id,
            schema_version: 1,
            title,
            canonical_path: domain::document_canonical_path(&id),
            markdown_path: domain::document_markdown_path(&id),
            narrative: None,
        });
        documents.push(BranchDocumentPayload {
            key: id,
            canonical_json: valid.canonical_json,
            markdown,
        });
    }

    for (id, life_node_id, canonical, template_id, template_version, schema_version) in narratives {
        if schema_version != 1 {
            return Err(LifeBranchError::Unsupported);
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
            return Err(LifeBranchError::Unsupported);
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
        descriptors.push(BranchDocumentDescriptor {
            kind: LifeBranchDocumentKind::NarrativeCanvas,
            key: id.clone(),
            life_node_key: life_node_id,
            schema_version: 1,
            title: value["title"].as_str().unwrap_or("").into(),
            canonical_path: domain::document_canonical_path(&id),
            markdown_path: domain::document_markdown_path(&id),
            narrative: Some(BranchNarrativeMetadata {
                template_id,
                template_version,
                visual_world_id: world.into(),
                scene_count: value["scenes"]
                    .as_array()
                    .map(|v| v.len() as u32)
                    .unwrap_or(0),
            }),
        });
        documents.push(BranchDocumentPayload {
            key: id,
            canonical_json: valid.canonical_json,
            markdown,
        });
    }
    descriptors.sort_by(|a, b| a.key.cmp(&b.key));
    documents.sort_by(|a, b| a.key.cmp(&b.key));

    // ── Assets, batched across both join tables.
    let mut assets_by_key: BTreeMap<String, BranchSourceAsset> = BTreeMap::new();
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
                return Err(invalid("This branch references an unusable asset."));
            }
            assets_by_key
                .entry(row.asset_id.clone())
                .or_insert_with(|| BranchSourceAsset {
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
        return Err(invalid("This branch references more than 256 assets."));
    }

    // ── Active canonical tags.
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
            BranchTag {
                key: tag_id.clone(),
                name,
                normalized_name: normalized,
            },
        );
        node_tags.entry(life_node_id).or_default().push(tag_id);
    }
    if tags.len() > domain::MAX_TAGS {
        return Err(invalid("This branch uses more than 256 active tags."));
    }

    // ── Internal links.
    let mut link_statement = conn.prepare(&format!(
        "{SUBTREE_CTE}
         SELECT l.source_node_id,l.target_node_id FROM life_links l
          WHERE l.source_node_id IN (SELECT id FROM subtree)
            AND l.target_node_id IN (SELECT id FROM subtree)
          ORDER BY l.source_node_id,l.target_node_id"
    ))?;
    let links: Vec<BranchLink> = link_statement
        .query_map([node_id], |row| {
            Ok(BranchLink {
                source_key: row.get(0)?,
                target_key: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    drop(link_statement);
    if links.len() > domain::MAX_INTERNAL_LINKS {
        return Err(invalid("This branch has more than 5,000 internal links."));
    }

    // ── Safe omission counts. No title, content, path, or identifier is ever recorded.
    let omissions = BranchOmissions {
        archived_nodes: count(
            conn,
            "WITH RECURSIVE reachable(id) AS (
                 SELECT id FROM life_nodes WHERE id=?1
                 UNION ALL
                 SELECT n.id FROM life_nodes n JOIN reachable r ON n.parent_id=r.id)
             SELECT COUNT(*) FROM life_nodes n JOIN reachable r ON r.id=n.id
              WHERE n.archived_at IS NOT NULL",
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

    // ── Assemble and verify our own output before it can ever leave the process.
    let mut nodes: Vec<BranchNode> = raw
        .iter()
        .map(|node| {
            let document = node_document.get(&node.id).map(|key| BranchNodeDocument {
                kind: descriptors
                    .iter()
                    .find(|d| &d.key == key)
                    .map(|d| d.kind)
                    .unwrap_or(LifeBranchDocumentKind::BasicLeaf),
                key: key.clone(),
            });
            let mut tag_keys = node_tags.get(&node.id).cloned().unwrap_or_default();
            tag_keys.sort();
            tag_keys.dedup();
            BranchNode {
                key: node.id.clone(),
                parent_key: if node.id == node_id {
                    None
                } else {
                    node.parent_id
                        .clone()
                        .filter(|id| included.contains(id.as_str()))
                },
                sibling_index: if node.id == node_id {
                    0
                } else {
                    sibling_index.get(&node.id).copied().unwrap_or(0)
                },
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

    let tree = BranchTree {
        format_version: domain::BRANCH_FORMAT_VERSION,
        root_key: node_id.to_owned(),
        nodes,
        tags: tags.into_values().collect(),
        links,
    };
    let verified = tree.clone().verify()?;

    Ok(BranchExportSource {
        tree,
        verified,
        documents,
        document_descriptors: descriptors,
        assets: assets_by_key.into_values().collect(),
        omissions,
        source_schema_version:
            crate::infrastructure::sqlite::task53_migration::max_supported_schema_version(),
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Import
// ─────────────────────────────────────────────────────────────────────────────

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
fn fingerprint(input: &ConfirmLifeBranchImportInput) -> String {
    domain::sha256(
        format!(
            "life_branch_import\u{1f}{}\u{1f}{}\u{1f}{}\u{1f}{}",
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
    node_id: String,
    /// Recorded so the ledger row is self-describing beyond its `operation_kind`.
    operation: String,
    node_count: u32,
    document_count: u32,
    asset_count: u32,
    internal_link_count: u32,
}

/// Returns the original result when this exact operation already succeeded. Idempotent retries stay
/// correct after staging cleanup because the answer is reconstructed from the ledger, not the file.
pub fn existing_operation(
    conn: &Connection,
    input: &ConfirmLifeBranchImportInput,
) -> Result<Option<LifeBranchImportResult>, LifeBranchError> {
    if !valid_operation(&input.operation_id) {
        return Err(invalid("Branch import operation identity is invalid."));
    }
    let row: Option<(String, String, i32)> = conn
        .query_row(
            "SELECT operation_kind,after_payload,tree_revision_after FROM life_operations WHERE operation_id=?1",
            [&input.operation_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;
    let Some((kind, payload, revision)) = row else {
        return Ok(None);
    };
    if kind != "import_branch" {
        return Err(invalid("Operation ID was already used."));
    }
    let after: ImportAfter = serde_json::from_str(&payload)
        .map_err(|_| invalid("Stored branch import operation is invalid."))?;
    if after.fingerprint != fingerprint(input) {
        return Err(invalid("Operation ID was already used."));
    }
    let parent: Option<String> = conn
        .query_row(
            "SELECT parent_id FROM life_nodes WHERE id=?1",
            [&after.node_id],
            |row| row.get(0),
        )
        .optional()?
        .flatten();
    Ok(Some(LifeBranchImportResult {
        life_node_id: after.node_id,
        parent_node_id: parent.unwrap_or_else(|| input.parent_node_id.clone()),
        tree_revision: revision,
        node_count: after.node_count,
        document_count: after.document_count,
        asset_count: after.asset_count,
        created_tag_count: 0,
        reused_tag_count: 0,
        internal_link_count: after.internal_link_count,
        undo_token: None,
        warnings: vec!["This branch was already imported by the same operation.".into()],
    }))
}

fn validate_destination(tx: &Transaction<'_>, parent_id: &str) -> Result<(), LifeBranchError> {
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
        .ok_or(LifeBranchError::NotFound)?;
    if !state.0 {
        return Err(invalid("An archived Life node cannot receive a branch."));
    }
    if state.1 != 0 || state.2 != 0 {
        return Err(invalid(
            "A Life node holding a document cannot receive a branch.",
        ));
    }
    Ok(())
}

/// Resolves every packaged tag against current local authority without mutating anything.
fn resolve_tag_plan(
    tx: &Transaction<'_>,
    tags: &[BranchTag],
) -> Result<BTreeMap<String, TagPlan>, LifeBranchError> {
    let mut plan = BTreeMap::new();
    let mut created = 0i64;
    for tag in tags {
        let normalized = crate::tag::normalize::normalize_tag(&tag.name)
            .map_err(|_| invalid("Branch tag name is invalid."))?;
        if normalized.normalized_name != tag.normalized_name {
            return Err(invalid(
                "Branch tag normalization disagrees with its record.",
            ));
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
                "Importing this branch would exceed the 500 active tag maximum.",
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
) -> Result<(), LifeBranchError> {
    if let Some(object) = value.as_object_mut() {
        if object.get("type").and_then(|v| v.as_str()) == Some("image") {
            let id = object
                .get_mut("attrs")
                .and_then(|v| v.as_object_mut())
                .and_then(|v| v.get_mut("assetId"))
                .and_then(|v| v.as_str().map(str::to_owned))
                .ok_or_else(|| invalid("Branch image asset identity is missing."))?;
            *object.get_mut("attrs").unwrap().get_mut("assetId").unwrap() =
                serde_json::Value::String(
                    map.get(&id)
                        .ok_or_else(|| invalid("Branch image asset cannot be remapped."))?
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
) -> Result<(), LifeBranchError> {
    value["documentId"] = serde_json::Value::String(new_id.into());
    for scene in value["scenes"]
        .as_array_mut()
        .ok_or_else(|| invalid("Branch Narrative scenes are invalid."))?
    {
        for block in scene["blocks"]
            .as_array_mut()
            .ok_or_else(|| invalid("Branch Narrative blocks are invalid."))?
        {
            match block["kind"].as_str() {
                Some("image") => {
                    let source = block["assetId"]
                        .as_str()
                        .ok_or_else(|| invalid("Branch Narrative image asset is missing."))?;
                    block["assetId"] = serde_json::Value::String(
                        map.get(source)
                            .ok_or_else(|| invalid("Branch Narrative image cannot be remapped."))?
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
fn check_link_caps(
    tx: &Transaction<'_>,
    links: &[(String, String)],
) -> Result<(), LifeBranchError> {
    let mut outgoing: BTreeMap<&str, i64> = BTreeMap::new();
    let mut incoming: BTreeMap<&str, i64> = BTreeMap::new();
    let mut seen = BTreeSet::new();
    for (source, target) in links {
        if source == target {
            return Err(invalid("A branch internal link is self-referential."));
        }
        if !seen.insert((source.as_str(), target.as_str())) {
            return Err(invalid("A branch internal link is duplicated."));
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
                "Importing this branch would exceed the 100 outgoing link maximum.",
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
                "Importing this branch would exceed the 500 incoming link maximum.",
            ));
        }
    }
    Ok(())
}

pub fn confirm_import(
    conn: &mut Connection,
    root: &Path,
    input: ConfirmLifeBranchImportInput,
    package: ValidatedBranchPackage,
) -> Result<LifeBranchImportResult, LifeBranchError> {
    if let Some(result) = existing_operation(conn, &input)? {
        return Ok(result);
    }
    if input.expected_tree_revision < 0 {
        return Err(invalid("Choose a valid Life operation."));
    }

    let tx = conn.transaction()?;

    // ── Pre-mutation proof. Nothing is written until every one of these resolves.
    let current: i32 = tx.query_row(
        "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
        [],
        |row| row.get(0),
    )?;
    if current != input.expected_tree_revision {
        return Err(LifeBranchError::Stale);
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
                    .ok_or_else(|| invalid("A branch link source cannot be remapped."))?
                    .clone(),
                node_map
                    .get(&link.target_key)
                    .ok_or_else(|| invalid("A branch link target cannot be remapped."))?
                    .clone(),
            ))
        })
        .collect::<Result<Vec<_>, LifeBranchError>>()?;
    check_link_caps(&tx, &remapped_links)?;

    let next_sort: i32 = tx.query_row(
        "SELECT COALESCE(MAX(sort_key),-1)+1 FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL",
        [&input.parent_node_id],
        |row| row.get(0),
    )?;
    let timestamp = now();

    // ── Mutation. Every fallible step past the first asset install unwinds created files.
    let mut receipts = Vec::new();
    let outcome = (|| -> Result<LifeBranchImportResult, LifeBranchError> {
        let mut asset_map = BTreeMap::new();
        for (key, prepared) in &package.assets {
            let receipt = assets::install_prepared_asset_in_tx(&tx, root, prepared)
                .map_err(|_| invalid("Branch asset installation failed."))?;
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
                .ok_or_else(|| invalid("A verified branch node disappeared."))?;
            let local = &node_map[key];
            let (parent, sort_key) = match &node.parent_key {
                None => (input.parent_node_id.clone(), next_sort),
                Some(parent_key) => (
                    node_map
                        .get(parent_key)
                        .ok_or_else(|| invalid("A branch parent cannot be remapped."))?
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
                    .ok_or_else(|| invalid("A branch asset cannot be remapped."))?;
                let count = i32::try_from(reference.reference_count)
                    .map_err(|_| invalid("Branch asset reference count is invalid."))?;
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
                .ok_or_else(|| invalid("A branch document owner cannot be remapped."))?;
            let canonical = package
                .documents
                .get(&descriptor.key)
                .ok_or_else(|| invalid("A validated branch document disappeared."))?;
            let expected = document_assets
                .get(&descriptor.key)
                .cloned()
                .unwrap_or_default();
            let mut value: serde_json::Value = serde_json::from_str(canonical)?;
            match descriptor.kind {
                LifeBranchDocumentKind::BasicLeaf => {
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
                LifeBranchDocumentKind::NarrativeCanvas => {
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
                        .ok_or_else(|| invalid("Branch Narrative metadata is missing."))?;
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
            // local tag — for example when both were merged into the same survivor here — so the
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
                    None => return Err(invalid("A branch tag has no resolved plan.")),
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

        // Exactly one revision increment and one non-undoable ledger row.
        tx.execute(
            "UPDATE life_tree_meta SET tree_revision=tree_revision+1 WHERE singleton=1",
            [],
        )?;
        let imported_root = node_map[&tree.tree.root_key].clone();
        let after = ImportAfter {
            fingerprint: fingerprint(&input),
            node_id: imported_root.clone(),
            operation: "import_branch".into(),
            node_count: tree.node_count(),
            document_count: tree.document_count(),
            asset_count: package.assets.len() as u32,
            internal_link_count: remapped_links.len() as u32,
        };
        tx.execute(
            "INSERT INTO life_operations VALUES(?1,'import_branch',?2,'{\"kind\":\"expired\"}',?3,?4,?5,?6,NULL)",
            params![
                input.operation_id,
                imported_root,
                serde_json::to_string(&after)
                    .map_err(|_| invalid("Branch import operation payload is invalid."))?,
                input.expected_tree_revision,
                input.expected_tree_revision + 1,
                timestamp
            ],
        )?;

        let omitted_tags = tag_plan
            .values()
            .filter(|plan| **plan == TagPlan::OmitArchived)
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

        Ok(LifeBranchImportResult {
            life_node_id: imported_root,
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
pub(crate) mod harness {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, task51_migration::run_all_migrations,
    };

    pub fn db() -> Connection {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn
    }

    pub fn temp_root(label: &str) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!("lw_branch_{label}_{}", uuid::Uuid::now_v7()));
        std::fs::create_dir_all(&path).unwrap();
        path
    }

    pub fn add_node(conn: &Connection, parent: &str, title: &str, sort: i32) -> String {
        let id = new_id();
        conn.execute(
            "INSERT INTO life_nodes VALUES(?1,?2,?3,'','life-branch','neutral',?4,NULL,'1','1',0)",
            params![id, parent, title, sort],
        )
        .unwrap();
        id
    }

    pub fn archive_node(conn: &Connection, id: &str) {
        conn.execute(
            "UPDATE life_nodes SET archived_at='archived' WHERE id=?1",
            [id],
        )
        .unwrap();
    }

    pub fn basic_json(text: &str) -> String {
        serde_json::json!({"type":"doc","content":[
            {"type":"paragraph","content":[{"type":"text","text":text}]}
        ]})
        .to_string()
    }

    pub fn add_basic(conn: &Connection, node_id: &str, text: &str) -> String {
        let id = new_id();
        let valid = crate::document::schema::validate(&basic_json(text)).unwrap();
        conn.execute(
            "INSERT INTO reader_documents VALUES(?1,?2,1,0,?3,?4,'1','1',NULL)",
            params![id, node_id, valid.canonical_json, valid.plain_text],
        )
        .unwrap();
        id
    }

    pub fn add_narrative(conn: &Connection, node_id: &str, title: &str) -> String {
        let id = new_id();
        let seed = crate::narrative::templates::seed_document(
            crate::narrative::templates::NarrativeTemplateId::KnowledgeDossier,
            &id,
            title,
        );
        let valid = crate::narrative::schema::validate(&seed, Some(&id)).unwrap();
        conn.execute(
            "INSERT INTO narrative_documents (id,life_node_id,schema_version,revision,canonical_json,plain_text,created_at,updated_at,archived_at,template_id,template_version)
             VALUES(?1,?2,1,0,?3,?4,'1','1',NULL,'knowledge_dossier',1)",
            params![id, node_id, valid.canonical_json, valid.plain_text],
        )
        .unwrap();
        id
    }

    pub fn add_link(conn: &Connection, source: &str, target: &str) {
        conn.execute(
            "INSERT INTO life_links(id,source_node_id,target_node_id,created_at) VALUES(?1,?2,?3,'1')",
            params![new_id(), source, target],
        )
        .unwrap();
    }

    pub fn add_tag(conn: &Connection, name: &str) -> String {
        let normalized = crate::tag::normalize::normalize_tag(name).unwrap();
        let id = new_id();
        conn.execute(
            "INSERT INTO tags(id,name,normalized_name,revision,archived_at,merged_into_tag_id,created_at,updated_at)
             VALUES(?1,?2,?3,0,NULL,NULL,'1','1')",
            params![id, normalized.canonical, normalized.normalized_name],
        )
        .unwrap();
        id
    }

    pub fn assign_tag(conn: &Connection, node_id: &str, tag_id: &str) {
        conn.execute(
            "INSERT INTO life_node_tags(life_node_id,tag_id,created_at) VALUES(?1,?2,'1')",
            params![node_id, tag_id],
        )
        .unwrap();
    }

    pub fn install_asset(conn: &mut Connection, root: &Path) -> String {
        let prepared =
            assets::prepare_imported_asset("pixel.png", crate::document::assets::tiny_png())
                .unwrap();
        let tx = conn.transaction().unwrap();
        let receipt = assets::install_prepared_asset_in_tx(&tx, root, &prepared).unwrap();
        tx.commit().unwrap();
        receipt.asset_id
    }

    /// Replaces a Basic Leaf's content with two references to `asset_id` and records the join.
    pub fn attach_asset(conn: &Connection, document_id: &str, asset_id: &str) {
        let json = serde_json::json!({"type":"doc","content":[
            {"type":"image","attrs":{"assetId":asset_id}},
            {"type":"image","attrs":{"assetId":asset_id}}
        ]})
        .to_string();
        let valid = crate::document::schema::validate(&json).unwrap();
        conn.execute(
            "UPDATE reader_documents SET canonical_json=?1,plain_text=?2 WHERE id=?3",
            params![valid.canonical_json, valid.plain_text, document_id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO document_assets VALUES(?1,?2,2)",
            params![document_id, asset_id],
        )
        .unwrap();
    }

    pub fn tree_revision(conn: &Connection) -> i32 {
        conn.query_row(
            "SELECT tree_revision FROM life_tree_meta WHERE singleton=1",
            [],
            |row| row.get(0),
        )
        .unwrap()
    }

    pub fn count_of(conn: &Connection, sql: &str) -> i64 {
        conn.query_row(sql, [], |row| row.get(0)).unwrap()
    }

    pub struct Source {
        pub root: String,
        pub inner: String,
        pub basic_leaf: String,
        pub narrative_leaf: String,
        pub empty_leaf: String,
        pub outside: String,
    }

    /// The canonical scenario: a nested branch holding a Basic Leaf, a Narrative Canvas, an empty
    /// leaf, an internal link, and one link that leaves the branch.
    ///
    /// ```text
    /// life-root ─ Research (root)      ─ Sources (inner) ─ Notes  (basic)
    ///           │                                        ─ Story  (narrative)
    ///           │                      ─ Ideas (empty leaf)
    ///           └ Outside (basic)
    /// ```
    pub fn scenario(conn: &Connection) -> Source {
        let root = add_node(conn, crate::life::domain::ROOT_ID, "Research", 0);
        let inner = add_node(conn, &root, "Sources", 0);
        let basic_leaf = add_node(conn, &inner, "Notes", 0);
        let narrative_leaf = add_node(conn, &inner, "Story", 1);
        let empty_leaf = add_node(conn, &root, "Ideas", 1);
        let outside = add_node(conn, crate::life::domain::ROOT_ID, "Outside", 1);
        add_basic(conn, &basic_leaf, "Xin chào");
        add_narrative(conn, &narrative_leaf, "Story");
        add_basic(conn, &outside, "Elsewhere");
        add_link(conn, &basic_leaf, &narrative_leaf);
        add_link(conn, &basic_leaf, &outside);
        add_link(conn, &outside, &narrative_leaf);
        Source {
            root,
            inner,
            basic_leaf,
            narrative_leaf,
            empty_leaf,
            outside,
        }
    }
}

#[cfg(test)]
mod export_tests {
    use super::harness::*;
    use super::*;

    #[test]
    fn eligible_nested_branch_exports_its_complete_connected_active_subtree() {
        let conn = db();
        let source = scenario(&conn);
        let exported = export_source(&conn, &source.root).unwrap();

        let keys: Vec<&str> = exported
            .verified
            .preorder
            .iter()
            .map(String::as_str)
            .collect();
        assert_eq!(keys.len(), 5, "root, inner branch, and three leaves");
        assert_eq!(keys[0], source.root);
        assert!(
            !keys.contains(&source.outside.as_str()),
            "the branch stops at its own edge"
        );

        assert_eq!(exported.verified.branch_count, 2);
        assert_eq!(exported.verified.basic_leaf_count, 1);
        assert_eq!(exported.verified.narrative_count, 1);
        assert_eq!(exported.verified.empty_leaf_count, 1);
        assert_eq!(exported.verified.maximum_depth, 2);
        assert_eq!(exported.documents.len(), 2);

        // Only the fully-internal link travels; both cross-boundary directions are counted.
        assert_eq!(exported.tree.links.len(), 1);
        assert_eq!(exported.tree.links[0].source_key, source.basic_leaf);
        assert_eq!(exported.tree.links[0].target_key, source.narrative_leaf);
        assert_eq!(exported.omissions.outgoing_cross_boundary_links, 1);
        assert_eq!(exported.omissions.incoming_cross_boundary_links, 1);
    }

    #[test]
    fn hierarchy_and_sibling_order_are_preserved_as_canonical_contiguous_indexes() {
        let conn = db();
        let root = add_node(&conn, crate::life::domain::ROOT_ID, "Root", 0);
        // Deliberately sparse, non-zero-based source sort keys.
        let first = add_node(&conn, &root, "First", 7);
        let second = add_node(&conn, &root, "Second", 19);
        let third = add_node(&conn, &root, "Third", 400);

        let exported = export_source(&conn, &root).unwrap();
        let index = |id: &str| {
            exported
                .tree
                .nodes
                .iter()
                .find(|node| node.key == id)
                .unwrap()
                .sibling_index
        };
        assert_eq!((index(&first), index(&second), index(&third)), (0, 1, 2));
        assert_eq!(index(&root), 0);
        assert!(
            exported
                .tree
                .nodes
                .iter()
                .find(|node| node.key == root)
                .unwrap()
                .parent_key
                .is_none(),
            "the exported root is detached from its local parent"
        );
    }

    #[test]
    fn root_archived_leaf_and_document_bearing_roots_are_all_rejected() {
        let conn = db();
        let source = scenario(&conn);

        assert!(matches!(
            export_source(&conn, crate::life::domain::ROOT_ID),
            Err(LifeBranchError::Validation(_))
        ));
        assert!(matches!(
            export_source(&conn, "00000000-0000-7000-8000-000000000777"),
            Err(LifeBranchError::NotFound)
        ));
        assert!(matches!(
            export_source(&conn, "not-a-node"),
            Err(LifeBranchError::Validation(_))
        ));
        assert!(
            export_source(&conn, &source.empty_leaf).is_err(),
            "a leaf is not a branch"
        );
        assert!(
            export_source(&conn, &source.basic_leaf).is_err(),
            "a document leaf is not a branch"
        );

        let archived = add_node(&conn, crate::life::domain::ROOT_ID, "Archived", 5);
        add_node(&conn, &archived, "Child", 0);
        archive_node(&conn, &archived);
        assert!(export_source(&conn, &archived).is_err());

        // A branch that also carries a document row is rejected even when that row is archived.
        let hybrid = add_node(&conn, crate::life::domain::ROOT_ID, "Hybrid", 6);
        let document = add_basic(&conn, &hybrid, "Body");
        conn.execute(
            "UPDATE reader_documents SET archived_at='gone' WHERE id=?1",
            [&document],
        )
        .unwrap();
        add_node(&conn, &hybrid, "Child", 0);
        assert!(export_source(&conn, &hybrid).is_err());
    }

    #[test]
    fn archived_nodes_and_everything_below_an_archived_edge_are_excluded_and_counted() {
        let conn = db();
        let root = add_node(&conn, crate::life::domain::ROOT_ID, "Root", 0);
        let kept = add_node(&conn, &root, "Kept", 0);
        let cut = add_node(&conn, &root, "Cut", 1);
        let below_cut = add_node(&conn, &cut, "BelowCut", 0);
        let deeper = add_node(&conn, &below_cut, "Deeper", 0);
        archive_node(&conn, &cut);

        let exported = export_source(&conn, &root).unwrap();
        let keys: Vec<&String> = exported.verified.preorder.iter().collect();
        assert_eq!(keys.len(), 2, "only the root and its active child survive");
        assert!(keys.contains(&&kept));
        for excluded in [&cut, &below_cut, &deeper] {
            assert!(
                !keys.contains(&excluded),
                "an active descendant below an archived edge must not travel"
            );
        }
        assert_eq!(
            exported.omissions.archived_nodes, 1,
            "only the archived row itself is archived; its descendants are merely unreachable"
        );
    }

    #[test]
    fn tags_travel_as_active_canonical_records_and_archived_ones_cannot_be_assigned() {
        let conn = db();
        let source = scenario(&conn);
        let reading = add_tag(&conn, "Doc sach");
        let archived = add_tag(&conn, "Cu");
        assign_tag(&conn, &source.basic_leaf, &reading);
        assign_tag(&conn, &source.empty_leaf, &reading);
        conn.execute(
            "UPDATE tags SET archived_at='gone' WHERE id=?1",
            [&archived],
        )
        .unwrap();
        assert!(
            conn.execute(
                "INSERT INTO life_node_tags(life_node_id,tag_id,created_at) VALUES(?1,?2,'1')",
                params![source.narrative_leaf, archived],
            )
            .is_err(),
            "the database already refuses to assign an archived tag"
        );

        let exported = export_source(&conn, &source.root).unwrap();
        assert_eq!(exported.tree.tags.len(), 1);
        assert_eq!(exported.tree.tags[0].name, "Doc sach");
        assert_eq!(exported.tree.tags[0].normalized_name, "doc sach");
        let tagged: Vec<&str> = exported
            .tree
            .nodes
            .iter()
            .filter(|node| !node.tag_keys.is_empty())
            .map(|node| node.key.as_str())
            .collect();
        assert_eq!(tagged.len(), 2);
    }

    #[test]
    fn vietnamese_tag_identity_survives_export_unchanged() {
        let conn = db();
        let source = scenario(&conn);
        let accented = add_tag(&conn, "H\u{1ecd}c t\u{1ead}p");
        let plain = add_tag(&conn, "Hoc tap");
        assign_tag(&conn, &source.empty_leaf, &accented);
        assign_tag(&conn, &source.empty_leaf, &plain);

        let exported = export_source(&conn, &source.root).unwrap();
        let record = exported
            .tree
            .tags
            .iter()
            .find(|value| value.key == accented)
            .expect("the accented tag must travel");
        assert_eq!(record.name, "H\u{1ecd}c t\u{1ead}p");
        assert_eq!(record.normalized_name, "h\u{1ecd}c t\u{1ead}p");
        assert_eq!(
            exported.tree.tags.len(),
            2,
            "accented and unaccented names are distinct tag identities"
        );
    }

    #[test]
    fn omissions_count_drafts_pins_and_tasks_without_revealing_anything() {
        let conn = db();
        let source = scenario(&conn);
        let document: String = conn
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&source.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        conn.execute(
            "INSERT INTO reader_document_drafts VALUES(?1,0,'{\"type\":\"doc\"}','1','available')",
            [&document],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO life_node_pins VALUES(?1,0,'1')",
            [&source.empty_leaf],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tasks (id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at,life_node_id)
             VALUES('task','2026-08-07',60,120,'Secret task','','general','low','1','1',?1)",
            [&source.basic_leaf],
        )
        .unwrap();

        let exported = export_source(&conn, &source.root).unwrap();
        assert_eq!(exported.omissions.drafts, 1);
        assert_eq!(exported.omissions.pins, 1);
        assert_eq!(exported.omissions.task_references, 1);
        assert_eq!(exported.omissions.focus_plan_references, 0);

        let rendered = crate::life_branch::service::testing::omissions(&exported.omissions);
        let joined = rendered.join(" ");
        assert!(joined.contains("1 unsaved draft(s) are not included."));
        assert!(joined.contains("1 pinned Life node(s) are not included."));
        for secret in [
            source.basic_leaf.as_str(),
            source.empty_leaf.as_str(),
            "Xin ch\u{e0}o",
            "Secret task",
            "Notes",
        ] {
            assert!(
                !joined.contains(secret),
                "an omission warning leaked {secret:?}"
            );
        }
    }

    /// Captures every row that a read-only operation must leave untouched.
    fn fingerprint(conn: &Connection) -> Vec<String> {
        let mut out = Vec::new();
        for sql in [
            "SELECT id||'|'||title||'|'||sort_key||'|'||revision||'|'||COALESCE(archived_at,'') FROM life_nodes ORDER BY id",
            "SELECT id||'|'||canonical_json||'|'||revision FROM reader_documents ORDER BY id",
            "SELECT id||'|'||canonical_json||'|'||revision FROM narrative_documents ORDER BY id",
            "SELECT id||'|'||source_node_id||'|'||target_node_id||'|'||created_at FROM life_links ORDER BY id",
            "SELECT id||'|'||name||'|'||COALESCE(archived_at,'') FROM tags ORDER BY id",
            "SELECT life_node_id||'|'||tag_id FROM life_node_tags ORDER BY life_node_id,tag_id",
            "SELECT document_id||'|'||asset_id||'|'||reference_count FROM document_assets ORDER BY document_id,asset_id",
            "SELECT id||'|'||checksum||'|'||status FROM assets ORDER BY id",
            "SELECT CAST(tree_revision AS TEXT) FROM life_tree_meta",
            "SELECT CAST(COUNT(*) AS TEXT) FROM life_operations",
        ] {
            let mut statement = conn.prepare(sql).unwrap();
            let rows: Vec<String> = statement
                .query_map([], |row| row.get::<_, String>(0))
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap();
            out.push(format!("{sql}=>{}", rows.join(",")));
        }
        out
    }

    pub(super) fn source_fingerprint(conn: &Connection) -> Vec<String> {
        fingerprint(conn)
    }

    #[test]
    fn export_never_mutates_the_source() {
        let mut conn = db();
        let root_dir = temp_root("export-immutable");
        let source = scenario(&conn);
        let asset = install_asset(&mut conn, &root_dir);
        let document: String = conn
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&source.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        attach_asset(&conn, &document, &asset);

        let before = fingerprint(&conn);
        let exported = export_source(&conn, &source.root).unwrap();
        assert_eq!(exported.assets.len(), 1);
        assert_eq!(exported.assets[0].references[&document], 2);
        assert_eq!(fingerprint(&conn), before, "export must be read-only");
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn unusable_assets_and_over_limit_branches_are_rejected() {
        let mut conn = db();
        let root_dir = temp_root("export-limits");
        let source = scenario(&conn);
        let asset = install_asset(&mut conn, &root_dir);
        let document: String = conn
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&source.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        attach_asset(&conn, &document, &asset);
        conn.execute("UPDATE assets SET status='missing' WHERE id=?1", [&asset])
            .unwrap();
        assert!(export_source(&conn, &source.root).is_err());
        conn.execute("UPDATE assets SET status='usable' WHERE id=?1", [&asset])
            .unwrap();
        export_source(&conn, &source.root).unwrap();

        // 501 active nodes: one root plus 500 children.
        let big = add_node(&conn, crate::life::domain::ROOT_ID, "Big", 9);
        for index in 0..domain::MAX_NODES {
            add_node(&conn, &big, &format!("Child {index}"), index as i32);
        }
        assert!(
            export_source(&conn, &big).is_err(),
            "501 nodes must exceed the 500 node maximum"
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn a_branch_deeper_than_the_supported_maximum_is_rejected_not_truncated() {
        let conn = db();
        let root = add_node(&conn, crate::life::domain::ROOT_ID, "Root", 0);
        let mut parent = root.clone();
        for index in 0..=(domain::MAX_RELATIVE_DEPTH as usize) {
            parent = add_node(&conn, &parent, &format!("Level {index}"), 0);
        }
        assert!(export_source(&conn, &root).is_err());
    }

    #[test]
    fn the_recursive_subtree_walk_searches_rather_than_scans() {
        let conn = db();
        let source = scenario(&conn);
        let plan: Vec<String> = conn
            .prepare(&format!(
                "EXPLAIN QUERY PLAN {SUBTREE_CTE} SELECT n.id FROM life_nodes n JOIN subtree s ON s.id=n.id"
            ))
            .unwrap()
            .query_map([&source.root], |row| row.get::<_, String>(3))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        let joined = plan.join("\n");
        assert!(
            joined.contains("SEARCH"),
            "subtree recursion must use an index search, not a full scan: {joined}"
        );
        assert!(
            !joined.contains("SCAN life_nodes"),
            "subtree recursion must not scan life_nodes: {joined}"
        );
    }

    #[test]
    fn export_at_the_maximum_supported_node_bound_succeeds() {
        let conn = db();
        let root = add_node(&conn, crate::life::domain::ROOT_ID, "Root", 0);
        // Exactly 500 nodes: the root plus 499 documented leaves.
        for index in 0..(domain::MAX_NODES - 1) {
            let leaf = add_node(&conn, &root, &format!("Leaf {index}"), index as i32);
            add_basic(&conn, &leaf, "Body");
        }
        let exported = export_source(&conn, &root).unwrap();
        assert_eq!(exported.verified.node_count(), domain::MAX_NODES as u32);
        assert_eq!(
            exported.verified.document_count(),
            domain::MAX_NODES as u32 - 1
        );
    }
}

#[cfg(test)]
mod import_tests {
    use super::export_tests::source_fingerprint;
    use super::harness::*;
    use super::*;
    use crate::life_branch::{archive, service::testing};

    fn package_of(conn: &Connection, root_dir: &Path, node_id: &str) -> Vec<u8> {
        let source = export_source(conn, node_id).unwrap();
        let ticket = testing::export(root_dir, source).unwrap();
        let bytes = std::fs::read(testing::exported_package(root_dir, &ticket.export_id)).unwrap();
        assert_eq!(bytes.len() as u64, ticket.byte_size);
        assert_eq!(domain::sha256(&bytes), ticket.sha256);
        bytes
    }

    fn confirm(
        conn: &mut Connection,
        root_dir: &Path,
        bytes: &[u8],
        parent: &str,
        operation: &str,
    ) -> Result<LifeBranchImportResult, LifeBranchError> {
        let revision = tree_revision(conn);
        let input = ConfirmLifeBranchImportInput {
            import_id: domain::new_opaque_id(),
            package_sha256: domain::sha256(bytes),
            parent_node_id: parent.into(),
            expected_tree_revision: revision,
            operation_id: operation.into(),
        };
        let package = archive::validate_package_bytes(bytes).unwrap();
        confirm_import(conn, root_dir, input, package)
    }

    fn titles_under(conn: &Connection, parent: &str) -> Vec<String> {
        let mut statement = conn
            .prepare(
                "SELECT title FROM life_nodes WHERE parent_id=?1 AND archived_at IS NULL ORDER BY sort_key,id",
            )
            .unwrap();
        statement
            .query_map([parent], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap()
    }

    #[test]
    fn import_creates_a_fresh_subtree_that_coexists_with_its_source() {
        let mut conn = db();
        let root_dir = temp_root("import-basic");
        let source = scenario(&conn);
        let bytes = package_of(&conn, &root_dir, &source.root);

        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 4);
        let before_revision = tree_revision(&conn);
        let result = confirm(&mut conn, &root_dir, &bytes, &destination, "op-1").unwrap();

        assert_eq!(result.parent_node_id, destination);
        assert_eq!(result.node_count, 5);
        assert_eq!(result.document_count, 2);
        assert_eq!(result.internal_link_count, 1);
        assert_eq!(result.tree_revision, before_revision + 1);
        assert!(
            result.undo_token.is_none(),
            "a branch import is never undoable"
        );

        // Fresh identity everywhere: not one source ID is reused.
        assert_ne!(result.life_node_id, source.root);
        assert_eq!(
            count_of(
                &conn,
                "SELECT COUNT(*) FROM life_nodes WHERE archived_at IS NULL"
            ),
            1 + 6 + 1 + 5,
            "life-root, six scenario nodes, the destination, and five imported nodes"
        );
        assert_eq!(count_of(&conn, "SELECT COUNT(*) FROM reader_documents"), 3);
        assert_eq!(
            count_of(&conn, "SELECT COUNT(*) FROM narrative_documents"),
            2
        );
        assert_eq!(count_of(&conn, "SELECT COUNT(*) FROM life_links"), 4);

        // The source branch is completely intact.
        assert_eq!(titles_under(&conn, &source.root), vec!["Sources", "Ideas"]);
        assert_eq!(
            titles_under(&conn, &result.life_node_id),
            vec!["Sources", "Ideas"]
        );

        let imported_inner: String = conn
            .query_row(
                "SELECT id FROM life_nodes WHERE parent_id=?1 AND title='Sources'",
                [&result.life_node_id],
                |row| row.get(0),
            )
            .unwrap();
        assert_ne!(imported_inner, source.inner);
        assert_eq!(titles_under(&conn, &imported_inner), vec!["Notes", "Story"]);
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn the_imported_root_is_appended_as_the_last_active_child() {
        let mut conn = db();
        let root_dir = temp_root("import-append");
        let source = scenario(&conn);
        let bytes = package_of(&conn, &root_dir, &source.root);

        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 4);
        add_node(&conn, &destination, "Existing first", 0);
        add_node(&conn, &destination, "Existing second", 1);
        confirm(&mut conn, &root_dir, &bytes, &destination, "op-append").unwrap();

        assert_eq!(
            titles_under(&conn, &destination),
            vec!["Existing first", "Existing second", "Research"],
            "the imported root goes last and existing order is untouched"
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn documents_assets_and_reference_counts_round_trip_under_remap() {
        let mut conn = db();
        let root_dir = temp_root("import-assets");
        let source = scenario(&conn);
        let asset = install_asset(&mut conn, &root_dir);
        let document: String = conn
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&source.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        attach_asset(&conn, &document, &asset);
        let bytes = package_of(&conn, &root_dir, &source.root);

        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 4);
        let result = confirm(&mut conn, &root_dir, &bytes, &destination, "op-assets").unwrap();
        assert_eq!(result.asset_count, 1);

        // The identical payload is reused rather than duplicated on disk.
        assert_eq!(
            count_of(&conn, "SELECT COUNT(*) FROM assets"),
            1,
            "an exact checksum/MIME/dimension match must reuse the local asset"
        );
        assert_eq!(
            count_of(&conn, "SELECT COUNT(*) FROM document_assets"),
            2,
            "both the source and the imported document reference it"
        );
        let counts: Vec<i64> = conn
            .prepare("SELECT reference_count FROM document_assets ORDER BY document_id")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(counts, vec![2, 2]);

        // The imported Basic Leaf points at the local asset ID, not the packaged key.
        let imported_json: String = conn
            .query_row(
                "SELECT d.canonical_json FROM reader_documents d
                 JOIN life_nodes n ON n.id=d.life_node_id
                 WHERE d.id<>?1 AND n.title='Notes'",
                [&document],
                |row| row.get(0),
            )
            .unwrap();
        assert!(imported_json.contains(&asset));
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn a_new_asset_payload_is_installed_and_narrative_document_ids_are_remapped() {
        let mut conn = db();
        let source_dir = temp_root("import-newasset-source");
        let target_dir = temp_root("import-newasset-target");
        let source = scenario(&conn);
        let asset = install_asset(&mut conn, &source_dir);
        let document: String = conn
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&source.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        attach_asset(&conn, &document, &asset);
        let bytes = package_of(&conn, &source_dir, &source.root);

        // A pristine database standing in for another Lifeweave install.
        let mut fresh = db();
        let destination = add_node(&fresh, crate::life::domain::ROOT_ID, "Destination", 0);
        let result = confirm(&mut fresh, &target_dir, &bytes, &destination, "op-new").unwrap();

        assert_eq!(count_of(&fresh, "SELECT COUNT(*) FROM assets"), 1);
        assert!(
            target_dir
                .join("assets/original")
                .read_dir()
                .unwrap()
                .count()
                == 1,
            "a payload with no local match must be installed"
        );

        // Narrative canonical JSON must carry the new local document ID.
        let (id, canonical): (String, String) = fresh
            .query_row(
                "SELECT id,canonical_json FROM narrative_documents",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        let value: serde_json::Value = serde_json::from_str(&canonical).unwrap();
        assert_eq!(value["documentId"].as_str(), Some(id.as_str()));
        crate::narrative::schema::validate(&canonical, Some(&id)).unwrap();
        assert_eq!(result.node_count, 5);

        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }

    #[test]
    fn internal_links_keep_direction_and_reverse_pairs_and_never_point_at_the_source() {
        let mut conn = db();
        let root_dir = temp_root("import-links");
        let source = scenario(&conn);
        add_link(&conn, &source.narrative_leaf, &source.basic_leaf);
        let bytes = package_of(&conn, &root_dir, &source.root);

        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 4);
        let result = confirm(&mut conn, &root_dir, &bytes, &destination, "op-links").unwrap();
        assert_eq!(result.internal_link_count, 2, "both directions travel");

        let imported: BTreeSet<String> = conn
            .prepare(
                "WITH RECURSIVE sub(id) AS (SELECT ?1 UNION ALL SELECT n.id FROM life_nodes n JOIN sub s ON n.parent_id=s.id)
                 SELECT id FROM sub",
            )
            .unwrap()
            .query_map([&result.life_node_id], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();

        let new_links: Vec<(String, String)> = conn
            .prepare("SELECT source_node_id,target_node_id FROM life_links WHERE created_at<>'1'")
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(new_links.len(), 2);
        for (from, to) in &new_links {
            assert!(
                imported.contains(from) && imported.contains(to),
                "an imported link must stay inside the imported subtree"
            );
        }
        let mut directions: Vec<(String, String)> = new_links
            .iter()
            .map(|(from, to)| {
                let title = |id: &str| -> String {
                    conn.query_row("SELECT title FROM life_nodes WHERE id=?1", [id], |row| {
                        row.get(0)
                    })
                    .unwrap()
                };
                (title(from), title(to))
            })
            .collect();
        directions.sort();
        assert_eq!(
            directions,
            vec![
                ("Notes".to_string(), "Story".to_string()),
                ("Story".to_string(), "Notes".to_string())
            ]
        );

        // The link that left the branch was never packaged.
        assert!(
            !new_links
                .iter()
                .any(|(from, to)| from == &source.outside || to == &source.outside),
            "no imported link may reference a node outside the package"
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn tags_reuse_the_active_canonical_tag_follow_a_merge_alias_and_create_when_absent() {
        let conn = db();
        let source_dir = temp_root("import-tags-source");
        let target_dir = temp_root("import-tags-target");
        let source = scenario(&conn);
        let reuse = add_tag(&conn, "Reused");
        let merged = add_tag(&conn, "Alias");
        let brand_new = add_tag(&conn, "Brand new");
        assign_tag(&conn, &source.basic_leaf, &reuse);
        assign_tag(&conn, &source.basic_leaf, &merged);
        assign_tag(&conn, &source.empty_leaf, &brand_new);
        let bytes = package_of(&conn, &source_dir, &source.root);

        // Target install: "Reused" exists, "Alias" is merged into "Survivor", "Brand new" is absent.
        let mut target = db();
        let local_reuse = add_tag(&target, "Reused");
        let survivor = add_tag(&target, "Survivor");
        let local_alias = add_tag(&target, "Alias");
        target
            .execute(
                "UPDATE tags SET archived_at='merged',merged_into_tag_id=?1 WHERE id=?2",
                params![survivor, local_alias],
            )
            .unwrap();

        let destination = add_node(&target, crate::life::domain::ROOT_ID, "Destination", 0);
        let result = confirm(&mut target, &target_dir, &bytes, &destination, "op-tags").unwrap();
        assert_eq!(result.created_tag_count, 1, "only \"Brand new\" is created");
        assert_eq!(
            result.reused_tag_count, 2,
            "\"Reused\" and the alias survivor"
        );

        // No tag was revived, renamed, or unmerged.
        assert_eq!(
            target
                .query_row(
                    "SELECT archived_at FROM tags WHERE id=?1",
                    [&local_alias],
                    |r| r.get::<_, Option<String>>(0)
                )
                .unwrap(),
            Some("merged".into())
        );
        assert_eq!(
            target
                .query_row(
                    "SELECT merged_into_tag_id FROM tags WHERE id=?1",
                    [&local_alias],
                    |r| r.get::<_, Option<String>>(0)
                )
                .unwrap(),
            Some(survivor.clone())
        );

        let assigned: Vec<String> = target
            .prepare("SELECT DISTINCT tag_id FROM life_node_tags ORDER BY tag_id")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert!(
            assigned.contains(&local_reuse),
            "the local canonical tag is reused"
        );
        assert!(
            assigned.contains(&survivor),
            "the alias resolves to its survivor"
        );
        assert!(
            !assigned.contains(&local_alias),
            "the merged tag itself is never assigned"
        );
        assert_eq!(assigned.len(), 3);

        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }

    #[test]
    fn two_packaged_tags_collapsing_onto_one_local_survivor_import_cleanly() {
        let source_dir = temp_root("import-tag-collapse-source");
        let target_dir = temp_root("import-tag-collapse-target");

        // The source assigns two distinct tags to one node.
        let conn = db();
        let source = scenario(&conn);
        let first = add_tag(&conn, "Alpha");
        let second = add_tag(&conn, "Beta");
        assign_tag(&conn, &source.basic_leaf, &first);
        assign_tag(&conn, &source.basic_leaf, &second);
        let bytes = package_of(&conn, &source_dir, &source.root);

        // The target has merged both of those names into one surviving tag.
        let mut target = db();
        let survivor = add_tag(&target, "Survivor");
        for name in ["Alpha", "Beta"] {
            let alias = add_tag(&target, name);
            target
                .execute(
                    "UPDATE tags SET archived_at='merged',merged_into_tag_id=?1 WHERE id=?2",
                    params![survivor, alias],
                )
                .unwrap();
        }
        let destination = add_node(&target, crate::life::domain::ROOT_ID, "Destination", 0);

        let result = confirm(
            &mut target,
            &target_dir,
            &bytes,
            &destination,
            "op-collapse",
        )
        .unwrap();
        assert_eq!(result.node_count, 5);
        assert_eq!(result.created_tag_count, 0);
        assert_eq!(
            result.reused_tag_count, 1,
            "both aliases resolve to one survivor"
        );
        assert_eq!(
            count_of(&target, "SELECT COUNT(*) FROM life_node_tags"),
            1,
            "the collapsed assignment must be written exactly once"
        );
        assert_eq!(
            count_of(
                &target,
                &format!("SELECT COUNT(*) FROM life_node_tags WHERE tag_id='{survivor}'")
            ),
            1
        );

        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }

    #[test]
    fn an_archived_tag_name_omits_only_that_assignment_and_warns() {
        let conn = db();
        let source_dir = temp_root("import-archived-tag-source");
        let target_dir = temp_root("import-archived-tag-target");
        let source = scenario(&conn);
        let blocked = add_tag(&conn, "Reading");
        let fine = add_tag(&conn, "Keep");
        assign_tag(&conn, &source.basic_leaf, &blocked);
        assign_tag(&conn, &source.basic_leaf, &fine);
        let bytes = package_of(&conn, &source_dir, &source.root);

        let mut target = db();
        let archived = add_tag(&target, "Reading");
        target
            .execute(
                "UPDATE tags SET archived_at='gone' WHERE id=?1",
                [&archived],
            )
            .unwrap();
        let destination = add_node(&target, crate::life::domain::ROOT_ID, "Destination", 0);

        let result = confirm(&mut target, &target_dir, &bytes, &destination, "op-arch").unwrap();
        assert_eq!(result.created_tag_count, 1, "only \"Keep\" is created");
        assert!(
            result
                .warnings
                .iter()
                .any(|warning| warning.contains("archived local tag")),
            "the omission must be reported: {:?}",
            result.warnings
        );

        // The archived tag is untouched and was never assigned.
        assert_eq!(
            target
                .query_row(
                    "SELECT archived_at FROM tags WHERE id=?1",
                    [&archived],
                    |r| r.get::<_, Option<String>>(0)
                )
                .unwrap(),
            Some("gone".into()),
            "an archived tag must never be revived"
        );
        assert_eq!(
            count_of(
                &target,
                &format!("SELECT COUNT(*) FROM life_node_tags WHERE tag_id='{archived}'")
            ),
            0
        );
        // Everything else still imported.
        assert_eq!(result.node_count, 5);
        assert_eq!(
            count_of(&target, "SELECT COUNT(*) FROM life_node_tags"),
            1,
            "only the importable assignment landed"
        );

        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }

    #[test]
    fn destination_and_tree_revision_are_both_enforced() {
        let mut conn = db();
        let root_dir = temp_root("import-destination");
        let source = scenario(&conn);
        let bytes = package_of(&conn, &root_dir, &source.root);
        let package = || archive::validate_package_bytes(&bytes).unwrap();

        let base = |parent: &str, revision: i32, operation: &str| ConfirmLifeBranchImportInput {
            import_id: domain::new_opaque_id(),
            package_sha256: domain::sha256(&bytes),
            parent_node_id: parent.into(),
            expected_tree_revision: revision,
            operation_id: operation.into(),
        };
        let revision = tree_revision(&conn);

        // Missing, archived, and document-bearing destinations.
        let archived = add_node(&conn, crate::life::domain::ROOT_ID, "Archived", 7);
        archive_node(&conn, &archived);
        for (label, parent) in [
            (
                "missing",
                "00000000-0000-7000-8000-000000000888".to_string(),
            ),
            ("invalid", "not-a-node".to_string()),
            ("archived", archived.clone()),
            ("basic document", source.basic_leaf.clone()),
            ("narrative document", source.narrative_leaf.clone()),
        ] {
            assert!(
                confirm_import(
                    &mut conn,
                    &root_dir,
                    base(&parent, revision, "op-x"),
                    package()
                )
                .is_err(),
                "{label} destination must be rejected"
            );
        }

        // A stale expected revision.
        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 8);
        assert!(matches!(
            confirm_import(
                &mut conn,
                &root_dir,
                base(&destination, revision + 5, "op-stale"),
                package()
            ),
            Err(LifeBranchError::Stale)
        ));

        // Nothing above wrote anything.
        assert_eq!(count_of(&conn, "SELECT COUNT(*) FROM life_operations"), 0);
        assert_eq!(tree_revision(&conn), revision);

        // The Life root is a valid destination.
        confirm_import(
            &mut conn,
            &root_dir,
            base(crate::life::domain::ROOT_ID, revision, "op-root"),
            package(),
        )
        .unwrap();
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn an_active_documentless_leaf_may_become_a_branch() {
        let mut conn = db();
        let root_dir = temp_root("import-leaf-parent");
        let source = scenario(&conn);
        let bytes = package_of(&conn, &root_dir, &source.root);

        let result = confirm(&mut conn, &root_dir, &bytes, &source.empty_leaf, "op-leaf").unwrap();
        assert_eq!(
            conn.query_row(
                "SELECT parent_id FROM life_nodes WHERE id=?1",
                [&result.life_node_id],
                |row| row.get::<_, Option<String>>(0)
            )
            .unwrap(),
            Some(source.empty_leaf.clone())
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn the_operation_is_idempotent_one_revision_and_never_undoable() {
        let mut conn = db();
        let root_dir = temp_root("import-replay");
        let source = scenario(&conn);
        let bytes = package_of(&conn, &root_dir, &source.root);
        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 4);
        let revision = tree_revision(&conn);
        let input = ConfirmLifeBranchImportInput {
            import_id: domain::new_opaque_id(),
            package_sha256: domain::sha256(&bytes),
            parent_node_id: destination.clone(),
            expected_tree_revision: revision,
            operation_id: "op-replay".into(),
        };

        let first = confirm_import(
            &mut conn,
            &root_dir,
            input.clone(),
            archive::validate_package_bytes(&bytes).unwrap(),
        )
        .unwrap();
        assert_eq!(tree_revision(&conn), revision + 1);

        // An identical retry returns the original answer and writes nothing more.
        let nodes_after_first = count_of(&conn, "SELECT COUNT(*) FROM life_nodes");
        let second = confirm_import(
            &mut conn,
            &root_dir,
            input.clone(),
            archive::validate_package_bytes(&bytes).unwrap(),
        )
        .unwrap();
        assert_eq!(second.life_node_id, first.life_node_id);
        assert_eq!(second.tree_revision, first.tree_revision);
        assert_eq!(second.node_count, first.node_count);
        assert_eq!(second.undo_token, None);
        assert_eq!(tree_revision(&conn), revision + 1, "exactly one increment");
        assert_eq!(
            count_of(&conn, "SELECT COUNT(*) FROM life_nodes"),
            nodes_after_first
        );

        // The same operation ID with different semantics is refused.
        let mut different = input.clone();
        different.parent_node_id = crate::life::domain::ROOT_ID.into();
        assert!(
            confirm_import(
                &mut conn,
                &root_dir,
                different,
                archive::validate_package_bytes(&bytes).unwrap()
            )
            .is_err(),
            "reusing an operation ID for different work must fail"
        );

        // The ledger row is a real, non-undoable import_branch record.
        let (kind, before, undone): (String, String, Option<String>) = conn
            .query_row(
                "SELECT operation_kind,before_payload,undone_at FROM life_operations WHERE operation_id='op-replay'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .unwrap();
        assert_eq!(kind, "import_branch");
        assert_eq!(before, "{\"kind\":\"expired\"}");
        assert!(undone.is_none());

        // Life Edit offers no undo at the new revision, and undo refuses the token outright.
        let projection = crate::life::edit::projection(&conn).unwrap();
        assert_eq!(projection.tree_revision, revision + 1);
        assert_eq!(
            projection.latest_undo, None,
            "an import must not surface as the latest undoable operation"
        );
        assert!(
            crate::life::edit::undo(
                &mut conn,
                crate::life::dto::UndoLifeOperationInput {
                    undo_token: "op-replay".into(),
                    expected_tree_revision: revision + 1,
                },
            )
            .is_err(),
            "a branch import must not be undoable"
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn an_operation_id_already_used_by_a_tree_edit_is_refused() {
        let mut conn = db();
        let root_dir = temp_root("import-op-clash");
        let source = scenario(&conn);
        let bytes = package_of(&conn, &root_dir, &source.root);

        let context = crate::life::dto::LifeOperationContext {
            operation_id: "shared-op".into(),
            expected_tree_revision: tree_revision(&conn),
        };
        crate::life::edit::create(
            &mut conn,
            crate::life::dto::CreateLifeNodeOperationInput {
                context,
                parent_id: crate::life::domain::ROOT_ID.into(),
                title: "Destination".into(),
                short_description: String::new(),
                icon_key: "life-branch".into(),
                theme_variant: "neutral".into(),
            },
        )
        .unwrap();

        assert!(
            confirm(
                &mut conn,
                &root_dir,
                &bytes,
                crate::life::domain::ROOT_ID,
                "shared-op"
            )
            .is_err(),
            "an operation ID owned by a create must not be reused for an import"
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn link_caps_are_enforced_against_final_local_state_and_fail_the_whole_import() {
        let conn = db();
        let source_dir = temp_root("import-caps-source");
        let target_dir = temp_root("import-caps-target");

        // A source branch whose single leaf receives links from 60 siblings.
        let root = add_node(&conn, crate::life::domain::ROOT_ID, "Root", 0);
        let hub = add_node(&conn, &root, "Hub", 0);
        add_basic(&conn, &hub, "Hub");
        for index in 0..60 {
            let leaf = add_node(&conn, &root, &format!("Leaf {index}"), index + 1);
            add_basic(&conn, &leaf, "Body");
            add_link(&conn, &leaf, &hub);
        }
        let bytes = package_of(&conn, &source_dir, &root);
        assert_eq!(
            archive::validate_package_bytes(&bytes)
                .unwrap()
                .tree
                .tree
                .links
                .len(),
            60
        );

        // Importing twice under one parent is fine; the caps are per node and IDs are fresh.
        let mut target = db();
        let destination = add_node(&target, crate::life::domain::ROOT_ID, "Destination", 0);
        confirm(&mut target, &target_dir, &bytes, &destination, "op-cap-1").unwrap();
        confirm(&mut target, &target_dir, &bytes, &destination, "op-cap-2").unwrap();
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM life_links"), 120);

        // A package whose own internal fan-out exceeds the 100 outgoing cap fails entirely.
        //
        // Note that the *incoming* cap cannot be breached this way: 501 distinct sources would
        // need 503 nodes, and the 500-node package ceiling binds first. The outgoing cap is the
        // reachable one, so it is the one exercised here.
        let wide = db();
        let wide_root = add_node(&wide, crate::life::domain::ROOT_ID, "Wide", 0);
        let wide_hub = add_node(&wide, &wide_root, "Hub", 0);
        add_basic(&wide, &wide_hub, "Hub");
        for index in 0..(crate::life_link::domain::MAX_OUTGOING_LINKS + 1) {
            let leaf = add_node(
                &wide,
                &wide_root,
                &format!("Leaf {index}"),
                index as i32 + 1,
            );
            add_basic(&wide, &leaf, "Body");
            add_link(&wide, &wide_hub, &leaf);
        }
        let wide_dir = temp_root("import-caps-wide");
        let wide_bytes = package_of(&wide, &wide_dir, &wide_root);
        let mut receiver = db();
        let receiver_destination = add_node(&receiver, crate::life::domain::ROOT_ID, "Dest", 0);
        let before_nodes = count_of(&receiver, "SELECT COUNT(*) FROM life_nodes");
        assert!(
            confirm(
                &mut receiver,
                &wide_dir,
                &wide_bytes,
                &receiver_destination,
                "op-cap-fail"
            )
            .is_err(),
            "exceeding the outgoing cap must fail the whole import"
        );
        assert_eq!(
            count_of(&receiver, "SELECT COUNT(*) FROM life_nodes"),
            before_nodes,
            "a cap breach must leave zero imported rows"
        );
        assert_eq!(count_of(&receiver, "SELECT COUNT(*) FROM life_links"), 0);

        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
        std::fs::remove_dir_all(wide_dir).unwrap();
    }

    /// A source branch whose only new tag is `Needs a new tag`, plus the shared image asset.
    fn residue_source(source_dir: &Path) -> (Connection, Vec<u8>) {
        let mut conn = db();
        let source = scenario(&conn);
        let asset = install_asset(&mut conn, source_dir);
        let document: String = conn
            .query_row(
                "SELECT id FROM reader_documents WHERE life_node_id=?1",
                [&source.basic_leaf],
                |row| row.get(0),
            )
            .unwrap();
        attach_asset(&conn, &document, &asset);
        let tag = add_tag(&conn, "Needs a new tag");
        assign_tag(&conn, &source.empty_leaf, &tag);
        let bytes = package_of(&conn, source_dir, &source.root);
        (conn, bytes)
    }

    #[test]
    fn a_failed_import_leaves_zero_database_rows_and_zero_new_files() {
        let source_dir = temp_root("import-residue-source");
        let target_dir = temp_root("import-residue-target");
        let (_source_conn, bytes) = residue_source(&source_dir);

        // A fresh target whose active tag budget is already exhausted, so the package's one new
        // tag cannot be created and the whole transaction must unwind.
        let mut target = db();
        let destination = add_node(&target, crate::life::domain::ROOT_ID, "Destination", 0);
        for index in 0..500 {
            add_tag(&target, &format!("Filler {index}"));
        }
        let before = source_fingerprint(&target);
        let revision = tree_revision(&target);

        assert!(
            confirm(&mut target, &target_dir, &bytes, &destination, "op-fail").is_err(),
            "exceeding the active tag maximum must fail the import"
        );

        assert_eq!(
            source_fingerprint(&target),
            before,
            "a failed import must leave the database byte-identical"
        );
        assert_eq!(tree_revision(&target), revision);
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM life_operations"), 0);
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM assets"), 0);
        assert!(
            !target_dir.join("assets/original").exists()
                || target_dir
                    .join("assets/original")
                    .read_dir()
                    .unwrap()
                    .count()
                    == 0,
            "a failed import must not leave a newly created asset file"
        );

        // Once the obstruction clears the very same package imports cleanly, proving the failure
        // left nothing behind that could poison a retry.
        target
            .execute("DELETE FROM tags WHERE name LIKE 'Filler %'", [])
            .unwrap();
        let ok = confirm(&mut target, &target_dir, &bytes, &destination, "op-retry").unwrap();
        assert_eq!(ok.node_count, 5);
        assert_eq!(ok.created_tag_count, 1);
        assert_eq!(ok.asset_count, 1);
        assert_eq!(count_of(&target, "SELECT COUNT(*) FROM assets"), 1);

        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }

    #[test]
    fn a_reused_asset_file_is_never_removed_when_a_later_step_fails() {
        let source_dir = temp_root("import-reuse-source");
        let target_dir = temp_root("import-reuse-target");
        let (_source_conn, bytes) = residue_source(&source_dir);

        // The target already holds the identical payload, so the receipt resolves to a reuse.
        let mut target = db();
        let existing = install_asset(&mut target, &target_dir);
        let relative: String = target
            .query_row(
                "SELECT relative_original_path FROM assets WHERE id=?1",
                [&existing],
                |row| row.get(0),
            )
            .unwrap();
        let file = target_dir.join(&relative);
        assert!(file.is_file());

        // Exhaust the tag budget so the transaction fails *after* the reuse has been resolved.
        for index in 0..500 {
            add_tag(&target, &format!("Filler {index}"));
        }
        let destination = add_node(&target, crate::life::domain::ROOT_ID, "Destination", 0);
        assert!(confirm(&mut target, &target_dir, &bytes, &destination, "op-reuse").is_err());

        assert!(
            file.is_file(),
            "a reused asset file must survive a rolled-back import"
        );
        assert_eq!(
            count_of(&target, "SELECT COUNT(*) FROM assets"),
            1,
            "the pre-existing asset row is untouched"
        );
        assert_eq!(
            target_dir
                .join("assets/original")
                .read_dir()
                .unwrap()
                .count(),
            1,
            "rollback removes only files this attempt created"
        );

        std::fs::remove_dir_all(source_dir).unwrap();
        std::fs::remove_dir_all(target_dir).unwrap();
    }

    #[test]
    fn imported_rows_use_fresh_identity_revision_zero_and_local_timestamps() {
        let mut conn = db();
        let root_dir = temp_root("import-identity");
        let source = scenario(&conn);
        let bytes = package_of(&conn, &root_dir, &source.root);
        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 4);
        let result = confirm(&mut conn, &root_dir, &bytes, &destination, "op-identity").unwrap();

        let imported: Vec<(String, i32, String)> = conn
            .prepare(
                "WITH RECURSIVE sub(id) AS (SELECT ?1 UNION ALL SELECT n.id FROM life_nodes n JOIN sub s ON n.parent_id=s.id)
                 SELECT n.id,n.revision,n.created_at FROM life_nodes n JOIN sub ON sub.id=n.id",
            )
            .unwrap()
            .query_map([&result.life_node_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(imported.len(), 5);
        for (id, revision, created_at) in &imported {
            assert_eq!(*revision, 0, "imported nodes start at revision zero");
            assert_ne!(
                created_at, "1",
                "imported nodes carry a local import timestamp"
            );
            assert!(
                uuid::Uuid::parse_str(id).unwrap().get_version() == Some(uuid::Version::SortRand),
                "imported IDs are fresh UUIDv7"
            );
        }
        for document in ["reader_documents", "narrative_documents"] {
            assert_eq!(
                count_of(
                    &conn,
                    &format!("SELECT COUNT(*) FROM {document} WHERE revision<>0")
                ),
                0
            );
        }
        std::fs::remove_dir_all(root_dir).unwrap();
    }

    #[test]
    fn import_queues_search_dirty_scopes_instead_of_writing_search_rows() {
        let mut conn = db();
        let root_dir = temp_root("import-search");
        let source = scenario(&conn);
        let tag = add_tag(&conn, "Indexed");
        assign_tag(&conn, &source.basic_leaf, &tag);
        let bytes = package_of(&conn, &root_dir, &source.root);
        let destination = add_node(&conn, crate::life::domain::ROOT_ID, "Destination", 4);

        conn.execute("DELETE FROM search_dirty_scopes", []).unwrap();
        let before_rows = count_of(&conn, "SELECT COUNT(*) FROM search_documents");
        confirm(&mut conn, &root_dir, &bytes, &destination, "op-search").unwrap();

        let scopes: Vec<String> = conn
            .prepare("SELECT scope FROM search_dirty_scopes ORDER BY scope")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert!(scopes.contains(&"life".to_string()));
        assert!(scopes.contains(&"documents".to_string()));
        assert_eq!(
            count_of(&conn, "SELECT COUNT(*) FROM search_documents"),
            before_rows,
            "the import must not write Search rows directly"
        );
        std::fs::remove_dir_all(root_dir).unwrap();
    }
}
