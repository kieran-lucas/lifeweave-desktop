//! `content/tree.json` — the structural authority of a Life Branch Package.
//!
//! Everything here is derived and verified rather than trusted. Depth, child state, and preorder
//! are recomputed from the parent edges; a package that *claims* a shape it does not have is
//! rejected, not corrected.

use super::domain::{self, LifeBranchDocumentKind, LifeBranchError};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchNodeDocument {
    pub kind: LifeBranchDocumentKind,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchNode {
    pub key: String,
    pub parent_key: Option<String>,
    pub sibling_index: u32,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub theme_variant: String,
    pub document: Option<BranchNodeDocument>,
    pub tag_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchTag {
    pub key: String,
    pub name: String,
    pub normalized_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchLink {
    pub source_key: String,
    pub target_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct BranchTree {
    pub format_version: u32,
    pub root_key: String,
    pub nodes: Vec<BranchNode>,
    pub tags: Vec<BranchTag>,
    pub links: Vec<BranchLink>,
}

/// The verified shape of a tree, derived during validation. Callers use this instead of re-walking
/// the raw arrays, so no consumer can accidentally trust an unverified field.
#[derive(Debug, Clone)]
pub struct VerifiedTree {
    pub tree: BranchTree,
    /// Parent-before-child insertion order.
    pub preorder: Vec<String>,
    pub depth_by_key: BTreeMap<String, u32>,
    pub maximum_depth: u32,
    pub branch_count: u32,
    pub basic_leaf_count: u32,
    pub narrative_count: u32,
    pub empty_leaf_count: u32,
}

impl VerifiedTree {
    pub fn node(&self, key: &str) -> Option<&BranchNode> {
        self.tree.nodes.iter().find(|node| node.key == key)
    }
    pub fn node_count(&self) -> u32 {
        self.tree.nodes.len() as u32
    }
    pub fn document_count(&self) -> u32 {
        self.basic_leaf_count + self.narrative_count
    }
}

fn invalid(message: &'static str) -> LifeBranchError {
    LifeBranchError::Validation(message)
}

fn strictly_ascending<'a>(values: impl Iterator<Item = &'a str>) -> bool {
    let mut previous: Option<&str> = None;
    for value in values {
        if previous.is_some_and(|prior| prior >= value) {
            return false;
        }
        previous = Some(value);
    }
    true
}

impl BranchTree {
    pub fn bytes(&self) -> Result<Vec<u8>, LifeBranchError> {
        let mut bytes = serde_json::to_vec_pretty(self)?;
        bytes.push(b'\n');
        Ok(bytes)
    }

    pub fn parse(bytes: &[u8]) -> Result<Self, LifeBranchError> {
        if bytes.len() > domain::MAX_TREE_BYTES {
            return Err(invalid("Branch tree exceeds 4 MiB."));
        }
        Ok(serde_json::from_slice(bytes)?)
    }

    /// Full structural validation. Returns the derived shape on success.
    pub fn verify(self) -> Result<VerifiedTree, LifeBranchError> {
        if self.format_version != domain::BRANCH_FORMAT_VERSION {
            return Err(LifeBranchError::Unsupported);
        }
        if self.nodes.is_empty() || self.nodes.len() > domain::MAX_NODES {
            return Err(invalid("Branch node count is invalid."));
        }
        if self.tags.len() > domain::MAX_TAGS {
            return Err(invalid("Branch tag count is invalid."));
        }
        if self.links.len() > domain::MAX_INTERNAL_LINKS {
            return Err(invalid("Branch internal link count is invalid."));
        }
        if !domain::valid_package_key(&self.root_key) {
            return Err(invalid("Branch root key is invalid."));
        }

        // ── Canonical ordering: strictly ascending keys prove uniqueness and determinism at once.
        if !strictly_ascending(self.nodes.iter().map(|node| node.key.as_str())) {
            return Err(invalid("Branch nodes are unordered or duplicated."));
        }
        if !strictly_ascending(self.tags.iter().map(|tag| tag.key.as_str())) {
            return Err(invalid("Branch tags are unordered or duplicated."));
        }
        if !strictly_ascending(
            self.links
                .iter()
                .map(|link| format!("{}\u{1f}{}", link.source_key, link.target_key))
                .collect::<Vec<_>>()
                .iter()
                .map(String::as_str),
        ) {
            return Err(invalid("Branch links are unordered or duplicated."));
        }

        // ── Tags.
        let mut normalized = BTreeSet::new();
        for tag in &self.tags {
            let Ok(canonical) = crate::tag::normalize::normalize_tag(&tag.name) else {
                return Err(invalid("Branch tag name is invalid."));
            };
            if !domain::valid_package_key(&tag.key)
                || canonical.canonical != tag.name
                || canonical.normalized_name != tag.normalized_name
                || !normalized.insert(tag.normalized_name.clone())
            {
                return Err(invalid("Branch tag record is invalid."));
            }
        }
        let tag_keys: BTreeSet<&str> = self.tags.iter().map(|tag| tag.key.as_str()).collect();

        // ── Node records, document identity, and tag references.
        let mut document_keys = BTreeSet::new();
        let mut roots = 0usize;
        for node in &self.nodes {
            if !domain::valid_package_key(&node.key)
                || !crate::life::domain::valid_title(&node.title)
                || node.title.trim() != node.title
                || !crate::life::domain::valid_description(&node.short_description)
                || !crate::life::domain::valid_icon(&node.icon_key)
                || !crate::life::domain::valid_theme(&node.theme_variant)
            {
                return Err(invalid("Branch node record is invalid."));
            }
            match &node.parent_key {
                None => roots += 1,
                Some(parent) => {
                    if !domain::valid_package_key(parent) || parent == &node.key {
                        return Err(invalid("Branch parent key is invalid."));
                    }
                }
            }
            if !strictly_ascending(node.tag_keys.iter().map(String::as_str))
                || node
                    .tag_keys
                    .iter()
                    .any(|key| !tag_keys.contains(key.as_str()))
            {
                return Err(invalid("Branch node tag assignments are invalid."));
            }
            if let Some(document) = &node.document
                && (!domain::valid_package_key(&document.key)
                    || !document_keys.insert(document.key.clone()))
            {
                return Err(invalid("Branch document identity is invalid."));
            }
        }
        if roots != 1 {
            return Err(invalid("Branch must contain exactly one package root."));
        }
        if document_keys.len() > domain::MAX_DOCUMENTS {
            return Err(invalid("Branch document count is invalid."));
        }

        let by_key: BTreeMap<&str, &BranchNode> = self
            .nodes
            .iter()
            .map(|node| (node.key.as_str(), node))
            .collect();
        let root = by_key
            .get(self.root_key.as_str())
            .ok_or_else(|| invalid("Branch root key does not resolve."))?;
        if root.parent_key.is_some() || root.sibling_index != 0 {
            return Err(invalid("Branch root must have no parent and index zero."));
        }

        // ── Child sets, contiguous canonical sibling ordering, and branch/leaf invariants.
        let mut children: BTreeMap<&str, Vec<&BranchNode>> = BTreeMap::new();
        for node in &self.nodes {
            if let Some(parent) = &node.parent_key {
                if !by_key.contains_key(parent.as_str()) {
                    return Err(invalid(
                        "Branch node references a parent outside the package.",
                    ));
                }
                children.entry(parent.as_str()).or_default().push(node);
            }
        }
        for group in children.values_mut() {
            group.sort_by_key(|node| (node.sibling_index, node.key.clone()));
            let expected: Vec<u32> = (0..group.len() as u32).collect();
            let actual: Vec<u32> = group.iter().map(|node| node.sibling_index).collect();
            if actual != expected {
                return Err(invalid(
                    "Branch sibling indexes are not canonical and contiguous.",
                ));
            }
        }
        let mut branch_count = 0u32;
        let mut basic_leaf_count = 0u32;
        let mut narrative_count = 0u32;
        let mut empty_leaf_count = 0u32;
        for node in &self.nodes {
            let has_children = children.contains_key(node.key.as_str());
            match (has_children, &node.document) {
                (true, Some(_)) => {
                    return Err(invalid("A branch node cannot carry a document."));
                }
                (true, None) => branch_count += 1,
                (false, None) => empty_leaf_count += 1,
                (false, Some(document)) => match document.kind {
                    LifeBranchDocumentKind::BasicLeaf => basic_leaf_count += 1,
                    LifeBranchDocumentKind::NarrativeCanvas => narrative_count += 1,
                },
            }
        }

        // ── Reachability: derives preorder and depth, and proves no cycle and no orphan.
        let mut preorder = Vec::with_capacity(self.nodes.len());
        let mut depth_by_key = BTreeMap::new();
        let mut maximum_depth = 0u32;
        let mut stack = vec![(self.root_key.clone(), 0u32)];
        while let Some((key, depth)) = stack.pop() {
            if depth > domain::MAX_RELATIVE_DEPTH {
                return Err(invalid("Branch depth exceeds the supported maximum."));
            }
            maximum_depth = maximum_depth.max(depth);
            if depth_by_key.insert(key.clone(), depth).is_some() {
                return Err(invalid("Branch graph revisits a node."));
            }
            preorder.push(key.clone());
            if let Some(group) = children.get(key.as_str()) {
                // Pushed in reverse so the stack yields ascending sibling order.
                for child in group.iter().rev() {
                    stack.push((child.key.clone(), depth + 1));
                }
            }
        }
        if preorder.len() != self.nodes.len() {
            return Err(invalid("Branch contains an unreachable node or a cycle."));
        }

        // ── Internal links: both endpoints must be included committed leaves.
        let mut seen = BTreeSet::new();
        for link in &self.links {
            if link.source_key == link.target_key
                || !seen.insert((link.source_key.clone(), link.target_key.clone()))
            {
                return Err(invalid(
                    "Branch internal link is self-referential or duplicated.",
                ));
            }
            for endpoint in [&link.source_key, &link.target_key] {
                let node = by_key
                    .get(endpoint.as_str())
                    .ok_or_else(|| invalid("Branch link endpoint is outside the package."))?;
                if node.document.is_none() || children.contains_key(endpoint.as_str()) {
                    return Err(invalid("Branch link endpoint is not a committed leaf."));
                }
            }
        }

        Ok(VerifiedTree {
            preorder,
            depth_by_key,
            maximum_depth,
            branch_count,
            basic_leaf_count,
            narrative_count,
            empty_leaf_count,
            tree: self,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(n: u8) -> String {
        format!("00000000-0000-7000-8000-0000000000{n:02}")
    }

    fn node(n: u8, parent: Option<u8>, index: u32) -> BranchNode {
        BranchNode {
            key: key(n),
            parent_key: parent.map(key),
            sibling_index: index,
            title: format!("Node {n}"),
            short_description: String::new(),
            icon_key: "life-branch".into(),
            theme_variant: "neutral".into(),
            document: None,
            tag_keys: vec![],
        }
    }

    fn with_document(mut value: BranchNode, kind: LifeBranchDocumentKind, n: u8) -> BranchNode {
        value.icon_key = "life-leaf".into();
        value.document = Some(BranchNodeDocument { kind, key: key(n) });
        value
    }

    /// root(1) ─ leaf(2, basic) ─ leaf(3, narrative) ─ empty leaf(4)
    fn fixture() -> BranchTree {
        BranchTree {
            format_version: 1,
            root_key: key(1),
            nodes: vec![
                node(1, None, 0),
                with_document(node(2, Some(1), 0), LifeBranchDocumentKind::BasicLeaf, 20),
                with_document(
                    node(3, Some(1), 1),
                    LifeBranchDocumentKind::NarrativeCanvas,
                    30,
                ),
                node(4, Some(1), 2),
            ],
            tags: vec![],
            links: vec![BranchLink {
                source_key: key(2),
                target_key: key(3),
            }],
        }
    }

    #[test]
    fn valid_tree_derives_preorder_depth_and_counts() {
        let verified = fixture().verify().unwrap();
        assert_eq!(
            verified.preorder,
            vec![key(1), key(2), key(3), key(4)],
            "preorder must place parents before children in sibling order"
        );
        assert_eq!(verified.maximum_depth, 1);
        assert_eq!(verified.depth_by_key[&key(1)], 0);
        assert_eq!(verified.depth_by_key[&key(4)], 1);
        assert_eq!(verified.branch_count, 1);
        assert_eq!(verified.basic_leaf_count, 1);
        assert_eq!(verified.narrative_count, 1);
        assert_eq!(verified.empty_leaf_count, 1);
        assert_eq!(verified.node_count(), 4);
        assert_eq!(verified.document_count(), 2);
    }

    #[test]
    fn round_trips_through_canonical_bytes_and_rejects_unknown_fields() {
        let value = fixture();
        let bytes = value.bytes().unwrap();
        assert_eq!(*bytes.last().unwrap(), b'\n');
        assert_eq!(BranchTree::parse(&bytes).unwrap(), value);
        let mut json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        json["surprise"] = serde_json::json!(true);
        assert!(BranchTree::parse(&serde_json::to_vec(&json).unwrap()).is_err());
        let mut nested: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        nested["nodes"][0]["surprise"] = serde_json::json!(1);
        assert!(BranchTree::parse(&serde_json::to_vec(&nested).unwrap()).is_err());
    }

    #[test]
    fn rejects_missing_multiple_and_unresolvable_roots() {
        let mut none = fixture();
        none.nodes[0].parent_key = Some(key(2));
        assert!(none.verify().is_err(), "a rootless graph must fail");

        let mut two = fixture();
        two.nodes[3].parent_key = None;
        assert!(two.verify().is_err(), "two package roots must fail");

        let mut unresolved = fixture();
        unresolved.root_key = key(9);
        assert!(unresolved.verify().is_err());

        let mut indexed = fixture();
        indexed.nodes[0].sibling_index = 3;
        assert!(indexed.verify().is_err(), "the root must have index zero");
    }

    #[test]
    fn rejects_cycles_orphans_and_excess_depth() {
        // A detached two-node cycle leaves the root reachable but the cycle unreachable.
        let mut cycle = fixture();
        cycle.nodes[2].parent_key = Some(key(4));
        cycle.nodes[3].parent_key = Some(key(3));
        cycle.nodes[2].sibling_index = 0;
        cycle.nodes[3].sibling_index = 0;
        assert!(cycle.verify().is_err(), "an unreachable cycle must fail");

        let mut orphan = fixture();
        orphan.nodes[3].parent_key = Some(key(99));
        assert!(
            orphan.verify().is_err(),
            "a parent outside the package must fail"
        );

        let mut duplicate = fixture();
        duplicate.nodes[3].key = key(2);
        assert!(duplicate.verify().is_err(), "duplicate keys must fail");

        let mut deep = BranchTree {
            format_version: 1,
            root_key: key(1),
            nodes: vec![node(1, None, 0)],
            tags: vec![],
            links: vec![],
        };
        for index in 1..=(domain::MAX_RELATIVE_DEPTH as usize + 1) {
            let mut child = node(0, None, 0);
            child.key = format!("00000000-0000-7000-8000-{index:012}");
            child.parent_key = Some(if index == 1 {
                key(1)
            } else {
                format!("00000000-0000-7000-8000-{:012}", index - 1)
            });
            deep.nodes.push(child);
        }
        deep.nodes.sort_by(|a, b| a.key.cmp(&b.key));
        assert!(deep.verify().is_err(), "depth beyond 128 must fail");
    }

    #[test]
    fn rejects_unordered_nodes_tags_and_links() {
        let mut nodes = fixture();
        nodes.nodes.swap(1, 2);
        assert!(nodes.verify().is_err());

        let mut links = fixture();
        links.links = vec![
            BranchLink {
                source_key: key(3),
                target_key: key(2),
            },
            BranchLink {
                source_key: key(2),
                target_key: key(3),
            },
        ];
        assert!(links.verify().is_err(), "links must be canonically ordered");

        let mut ordered = fixture();
        ordered.links = vec![
            BranchLink {
                source_key: key(2),
                target_key: key(3),
            },
            BranchLink {
                source_key: key(3),
                target_key: key(2),
            },
        ];
        ordered.verify().expect("a valid reverse pair is allowed");
    }

    #[test]
    fn rejects_non_contiguous_sibling_indexes() {
        for indexes in [(0u32, 2u32, 3u32), (1, 2, 3), (0, 0, 1), (0, 1, 1)] {
            let mut value = fixture();
            value.nodes[1].sibling_index = indexes.0;
            value.nodes[2].sibling_index = indexes.1;
            value.nodes[3].sibling_index = indexes.2;
            assert!(value.verify().is_err(), "{indexes:?} must fail");
        }
        let mut valid = fixture();
        valid.nodes[1].sibling_index = 2;
        valid.nodes[2].sibling_index = 0;
        valid.nodes[3].sibling_index = 1;
        valid
            .verify()
            .expect("any permutation of 0..n is canonical");
    }

    #[test]
    fn enforces_branch_and_leaf_document_invariants() {
        let mut branch_with_document = fixture();
        branch_with_document.nodes[0].document = Some(BranchNodeDocument {
            kind: LifeBranchDocumentKind::BasicLeaf,
            key: key(40),
        });
        assert!(branch_with_document.verify().is_err());

        let mut shared = fixture();
        shared.nodes[3].document = Some(BranchNodeDocument {
            kind: LifeBranchDocumentKind::BasicLeaf,
            key: key(20),
        });
        assert!(
            shared.verify().is_err(),
            "two nodes cannot share a document key"
        );
    }

    #[test]
    fn rejects_links_that_leave_the_package_or_touch_a_branch() {
        let mut outside = fixture();
        outside.links = vec![BranchLink {
            source_key: key(2),
            target_key: key(77),
        }];
        assert!(outside.verify().is_err());

        let mut branch = fixture();
        branch.links = vec![BranchLink {
            source_key: key(1),
            target_key: key(2),
        }];
        assert!(branch.verify().is_err(), "a branch is not a link endpoint");

        let mut empty = fixture();
        empty.links = vec![BranchLink {
            source_key: key(2),
            target_key: key(4),
        }];
        assert!(
            empty.verify().is_err(),
            "a documentless leaf is not a link endpoint"
        );

        let mut own = fixture();
        own.links = vec![BranchLink {
            source_key: key(2),
            target_key: key(2),
        }];
        assert!(own.verify().is_err(), "self-links are rejected");
    }

    #[test]
    fn rejects_invalid_node_metadata_and_tag_records() {
        for mutate in [
            (|n: &mut BranchNode| n.title = String::new()) as fn(&mut BranchNode),
            |n| n.title = " padded".into(),
            |n| n.title = "line\nbreak".into(),
            |n| n.icon_key = "life-unknown".into(),
            |n| n.theme_variant = "chartreuse".into(),
            |n| n.short_description = "x".repeat(321),
            |n| n.key = "not-a-uuid".into(),
        ] {
            let mut value = fixture();
            mutate(&mut value.nodes[3]);
            assert!(value.verify().is_err());
        }

        let mut unresolved_tag = fixture();
        unresolved_tag.nodes[3].tag_keys = vec![key(50)];
        assert!(unresolved_tag.verify().is_err());

        let mut bad_normalized = fixture();
        bad_normalized.tags = vec![BranchTag {
            key: key(50),
            name: "Reading".into(),
            normalized_name: "READING".into(),
        }];
        assert!(
            bad_normalized.verify().is_err(),
            "normalized name must be canonical"
        );

        let mut duplicate_normalized = fixture();
        duplicate_normalized.tags = vec![
            BranchTag {
                key: key(50),
                name: "Reading".into(),
                normalized_name: "reading".into(),
            },
            BranchTag {
                key: key(51),
                name: "reading".into(),
                normalized_name: "reading".into(),
            },
        ];
        assert!(duplicate_normalized.verify().is_err());

        let mut valid = fixture();
        valid.tags = vec![BranchTag {
            key: key(50),
            name: "Đọc sách".into(),
            normalized_name: "đọc sách".into(),
        }];
        valid.nodes[3].tag_keys = vec![key(50)];
        valid
            .verify()
            .expect("Vietnamese tag identity is preserved");
    }

    #[test]
    fn rejects_unsupported_format_version_and_oversized_payload() {
        let mut version = fixture();
        version.format_version = 2;
        assert!(matches!(
            version.verify(),
            Err(LifeBranchError::Unsupported)
        ));
        assert!(BranchTree::parse(&vec![b'x'; domain::MAX_TREE_BYTES + 1]).is_err());
    }
}
