//! `content/tree.json` — the strict structural authority of a Life Tree Package.

use super::domain::{self, LifeTreeDocumentKind, LifeTreeError};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeNodeDocument {
    pub kind: LifeTreeDocumentKind,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeNode {
    pub key: String,
    pub parent_key: Option<String>,
    pub sibling_index: u32,
    pub title: String,
    pub short_description: String,
    pub icon_key: String,
    pub theme_variant: String,
    pub document: Option<TreeNodeDocument>,
    pub tag_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeTag {
    pub key: String,
    pub name: String,
    pub normalized_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreeLink {
    pub source_key: String,
    pub target_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct TreePackageTree {
    pub format_version: u32,
    pub root_keys: Vec<String>,
    pub nodes: Vec<TreeNode>,
    pub tags: Vec<TreeTag>,
    pub links: Vec<TreeLink>,
}

#[derive(Debug, Clone)]
pub struct VerifiedTree {
    pub tree: TreePackageTree,
    /// Parent-before-child order, with root groups in `root_keys` order.
    pub preorder: Vec<String>,
    /// One-based depth relative to the virtual, unpackageable `life-root`.
    pub depth_by_key: BTreeMap<String, u32>,
    pub maximum_depth: u32,
    pub branch_count: u32,
    pub basic_leaf_count: u32,
    pub narrative_count: u32,
    pub empty_leaf_count: u32,
}

impl VerifiedTree {
    pub fn node(&self, key: &str) -> Option<&TreeNode> {
        self.tree.nodes.iter().find(|node| node.key == key)
    }
    pub fn node_count(&self) -> u32 {
        self.tree.nodes.len() as u32
    }
    pub fn document_count(&self) -> u32 {
        self.basic_leaf_count + self.narrative_count
    }
    pub fn top_level_count(&self) -> u32 {
        self.tree.root_keys.len() as u32
    }
}

fn invalid(message: &'static str) -> LifeTreeError {
    LifeTreeError::Validation(message)
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

impl TreePackageTree {
    pub fn bytes(&self) -> Result<Vec<u8>, LifeTreeError> {
        let mut bytes = serde_json::to_vec_pretty(self)?;
        bytes.push(b'\n');
        Ok(bytes)
    }

    pub fn parse(bytes: &[u8]) -> Result<Self, LifeTreeError> {
        if bytes.len() > domain::MAX_TREE_BYTES {
            return Err(invalid("Tree structure exceeds 4 MiB."));
        }
        Ok(serde_json::from_slice(bytes)?)
    }

    pub fn verify(self) -> Result<VerifiedTree, LifeTreeError> {
        if self.format_version != domain::TREE_FORMAT_VERSION {
            return Err(LifeTreeError::Unsupported);
        }
        if self.root_keys.is_empty()
            || self.nodes.is_empty()
            || self.nodes.len() > domain::MAX_NODES
        {
            return Err(invalid("Tree root or node count is invalid."));
        }
        if self.tags.len() > domain::MAX_TAGS || self.links.len() > domain::MAX_INTERNAL_LINKS {
            return Err(invalid("Tree content count is invalid."));
        }
        if !strictly_ascending(self.nodes.iter().map(|node| node.key.as_str()))
            || !strictly_ascending(self.tags.iter().map(|tag| tag.key.as_str()))
            || !strictly_ascending(
                self.links
                    .iter()
                    .map(|link| format!("{}\u{1f}{}", link.source_key, link.target_key))
                    .collect::<Vec<_>>()
                    .iter()
                    .map(String::as_str),
            )
        {
            return Err(invalid("Tree arrays are unordered or duplicated."));
        }

        let mut normalized = BTreeSet::new();
        for tag in &self.tags {
            let Ok(canonical) = crate::tag::normalize::normalize_tag(&tag.name) else {
                return Err(invalid("Tree tag name is invalid."));
            };
            if !domain::valid_package_key(&tag.key)
                || canonical.canonical != tag.name
                || canonical.normalized_name != tag.normalized_name
                || !normalized.insert(tag.normalized_name.clone())
            {
                return Err(invalid("Tree tag record is invalid."));
            }
        }
        let tag_keys: BTreeSet<&str> = self.tags.iter().map(|tag| tag.key.as_str()).collect();

        let mut document_keys = BTreeSet::new();
        for node in &self.nodes {
            if !domain::valid_package_key(&node.key)
                || !crate::life::domain::valid_title(&node.title)
                || node.title.trim() != node.title
                || !crate::life::domain::valid_description(&node.short_description)
                || !crate::life::domain::valid_icon(&node.icon_key)
                || !crate::life::domain::valid_theme(&node.theme_variant)
                || node
                    .parent_key
                    .as_ref()
                    .is_some_and(|parent| !domain::valid_package_key(parent) || parent == &node.key)
                || !strictly_ascending(node.tag_keys.iter().map(String::as_str))
                || node
                    .tag_keys
                    .iter()
                    .any(|key| !tag_keys.contains(key.as_str()))
            {
                return Err(invalid("Tree node record is invalid."));
            }
            if let Some(document) = &node.document
                && (!domain::valid_package_key(&document.key)
                    || !document_keys.insert(document.key.clone()))
            {
                return Err(invalid("Tree document identity is invalid."));
            }
        }
        if document_keys.len() > domain::MAX_DOCUMENTS {
            return Err(invalid("Tree document count is invalid."));
        }

        let by_key: BTreeMap<&str, &TreeNode> = self
            .nodes
            .iter()
            .map(|node| (node.key.as_str(), node))
            .collect();
        let root_set: BTreeSet<&str> = self.root_keys.iter().map(String::as_str).collect();
        if root_set.len() != self.root_keys.len()
            || self
                .root_keys
                .iter()
                .any(|key| !domain::valid_package_key(key) || !by_key.contains_key(key.as_str()))
        {
            return Err(invalid("Tree root keys are invalid or duplicated."));
        }

        let mut children: BTreeMap<&str, Vec<&TreeNode>> = BTreeMap::new();
        let mut actual_roots = Vec::new();
        for node in &self.nodes {
            match &node.parent_key {
                None => actual_roots.push(node),
                Some(parent) => {
                    if !by_key.contains_key(parent.as_str()) {
                        return Err(invalid("Tree node has a parent outside the package."));
                    }
                    children.entry(parent.as_str()).or_default().push(node);
                }
            }
        }
        actual_roots.sort_by_key(|node| (node.sibling_index, node.key.as_str()));
        let actual_root_keys: Vec<&str> =
            actual_roots.iter().map(|node| node.key.as_str()).collect();
        if actual_root_keys
            != self
                .root_keys
                .iter()
                .map(String::as_str)
                .collect::<Vec<_>>()
            || actual_roots
                .iter()
                .enumerate()
                .any(|(index, node)| node.sibling_index != index as u32)
        {
            return Err(invalid("Tree root order is not canonical."));
        }
        for group in children.values_mut() {
            group.sort_by_key(|node| (node.sibling_index, node.key.as_str()));
            if group
                .iter()
                .enumerate()
                .any(|(index, node)| node.sibling_index != index as u32)
            {
                return Err(invalid(
                    "Tree sibling indexes are not canonical and contiguous.",
                ));
            }
        }

        let mut branch_count = 0;
        let mut basic_leaf_count = 0;
        let mut narrative_count = 0;
        let mut empty_leaf_count = 0;
        for node in &self.nodes {
            let has_children = children.contains_key(node.key.as_str());
            match (has_children, &node.document) {
                (true, Some(_)) => return Err(invalid("A branch node cannot carry a document.")),
                (true, None) => branch_count += 1,
                (false, None) => empty_leaf_count += 1,
                (false, Some(document)) => match document.kind {
                    LifeTreeDocumentKind::BasicLeaf => basic_leaf_count += 1,
                    LifeTreeDocumentKind::NarrativeCanvas => narrative_count += 1,
                },
            }
        }

        let mut preorder = Vec::with_capacity(self.nodes.len());
        let mut depth_by_key = BTreeMap::new();
        let mut maximum_depth = 0;
        for root in self.root_keys.iter().rev() {
            // Build each root independently below; reverse insertion keeps the outer stack ordered.
            let mut stack = vec![(root.clone(), 1u32)];
            while let Some((key, depth)) = stack.pop() {
                if depth > domain::MAX_RELATIVE_DEPTH {
                    return Err(invalid("Tree depth exceeds the supported maximum."));
                }
                if depth_by_key.insert(key.clone(), depth).is_some() {
                    return Err(invalid("Tree graph revisits a node."));
                }
                maximum_depth = maximum_depth.max(depth);
                preorder.push(key.clone());
                if let Some(group) = children.get(key.as_str()) {
                    for child in group.iter().rev() {
                        stack.push((child.key.clone(), depth + 1));
                    }
                }
            }
        }
        // The roots were intentionally iterated in reverse but each completed traversal appended;
        // restore canonical root-group order without trusting serialized node order.
        let mut canonical_preorder = Vec::with_capacity(preorder.len());
        for root in &self.root_keys {
            let mut stack = vec![root.clone()];
            while let Some(key) = stack.pop() {
                canonical_preorder.push(key.clone());
                if let Some(group) = children.get(key.as_str()) {
                    for child in group.iter().rev() {
                        stack.push(child.key.clone());
                    }
                }
            }
        }
        preorder = canonical_preorder;
        if preorder.len() != self.nodes.len() || depth_by_key.len() != self.nodes.len() {
            return Err(invalid("Tree contains an unreachable node or cycle."));
        }

        let mut seen_links = BTreeSet::new();
        for link in &self.links {
            if link.source_key == link.target_key
                || !seen_links.insert((link.source_key.clone(), link.target_key.clone()))
            {
                return Err(invalid(
                    "Tree internal link is self-referential or duplicated.",
                ));
            }
            for endpoint in [&link.source_key, &link.target_key] {
                let node = by_key
                    .get(endpoint.as_str())
                    .ok_or_else(|| invalid("Tree link endpoint is outside the package."))?;
                if node.document.is_none() || children.contains_key(endpoint.as_str()) {
                    return Err(invalid("Tree link endpoint is not a committed leaf."));
                }
            }
        }

        // Explicitly use the set after validation so an extra null-parent node cannot hide behind
        // a duplicated root key.
        if actual_roots.len() != root_set.len() {
            return Err(invalid("Tree contains an extra package root."));
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
    fn node(n: u8, parent: Option<u8>, index: u32) -> TreeNode {
        TreeNode {
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
    fn fixture() -> TreePackageTree {
        TreePackageTree {
            format_version: 1,
            root_keys: vec![key(1), key(4)],
            nodes: vec![
                node(1, None, 0),
                node(2, Some(1), 0),
                node(3, Some(1), 1),
                node(4, None, 1),
            ],
            tags: vec![],
            links: vec![],
        }
    }

    #[test]
    fn valid_multi_root_forest_derives_one_based_depth_and_order() {
        let verified = fixture().verify().unwrap();
        assert_eq!(verified.preorder, [key(1), key(2), key(3), key(4)]);
        assert_eq!(verified.depth_by_key[&key(1)], 1);
        assert_eq!(verified.depth_by_key[&key(2)], 2);
        assert_eq!(verified.maximum_depth, 2);
        assert_eq!(verified.top_level_count(), 2);
    }

    #[test]
    fn rejects_empty_duplicate_missing_extra_and_badly_ordered_roots() {
        let mut empty = fixture();
        empty.root_keys.clear();
        assert!(empty.verify().is_err());
        let mut duplicate = fixture();
        duplicate.root_keys.push(key(4));
        assert!(duplicate.verify().is_err());
        let mut missing = fixture();
        missing.root_keys[1] = key(9);
        assert!(missing.verify().is_err());
        let mut extra = fixture();
        extra.root_keys.pop();
        assert!(extra.verify().is_err());
        let mut order = fixture();
        order.root_keys.swap(0, 1);
        assert!(order.verify().is_err());
        let mut index = fixture();
        index.nodes[3].sibling_index = 2;
        assert!(index.verify().is_err());
    }

    #[test]
    fn rejects_orphan_cycle_and_non_contiguous_internal_order() {
        let mut orphan = fixture();
        orphan.nodes[2].parent_key = Some(key(9));
        assert!(orphan.verify().is_err());
        let mut cycle = fixture();
        cycle.nodes[1].parent_key = Some(key(3));
        cycle.nodes[2].parent_key = Some(key(2));
        cycle.nodes[1].sibling_index = 0;
        cycle.nodes[2].sibling_index = 0;
        assert!(cycle.verify().is_err());
        let mut order = fixture();
        order.nodes[2].sibling_index = 3;
        assert!(order.verify().is_err());
    }
}
