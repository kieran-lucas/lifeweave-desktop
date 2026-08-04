use unicode_normalization::UnicodeNormalization;

pub struct NormalizedTag {
    pub canonical: String,
    pub normalized_name: String,
}

/// Normalizes a raw tag name input into a canonical display form and a search identity.
///
/// Algorithm (applied in order):
/// 1. Trim Unicode whitespace.
/// 2. Strip one optional leading `#`.
/// 3. Trim Unicode whitespace again.
/// 4. Collapse internal whitespace sequences to a single ASCII space.
/// 5. Apply NFKC normalization (preserves Vietnamese accents and tone marks).
/// 6. Reject control characters.
/// 7. Enforce 1–64 Unicode scalar values.
/// 8. Derive `normalized_name` as Unicode lowercase of the canonical form.
///
/// Vietnamese accents are preserved in identity: "Học" and "Hoc" are distinct tags.
/// Global Search normalization (NFKD-based) remains accent-insensitive for retrieval,
/// so both forms are found by an accentless query even though they have different identities.
pub fn normalize_tag(raw: &str) -> Result<NormalizedTag, &'static str> {
    // 1. Trim Unicode whitespace.
    let s = raw.trim_matches(|c: char| c.is_whitespace());

    // 2. Strip one optional leading '#'.
    let s = s.strip_prefix('#').unwrap_or(s);

    // 3. Trim again.
    let s = s.trim_matches(|c: char| c.is_whitespace());

    // 4. Collapse internal whitespace.
    let collapsed: String = s.split_whitespace().collect::<Vec<_>>().join(" ");

    // 5. NFKC normalization.
    let canonical: String = collapsed.nfkc().collect();

    // 6. Reject control characters (split_whitespace strips ASCII whitespace-control but
    //    not all control characters such as U+0001–U+0008).
    if canonical.chars().any(|c| c.is_control()) {
        return Err("Tag name must not contain control characters.");
    }

    // 7. Scalar value count bounds.
    let count = canonical.chars().count();
    if count == 0 {
        return Err("Tag name is required.");
    }
    if count > 64 {
        return Err("Tag name must be 64 characters or fewer.");
    }

    // 8. Lowercase for identity.
    let normalized_name: String = canonical.chars().flat_map(|c| c.to_lowercase()).collect();

    Ok(NormalizedTag {
        canonical,
        normalized_name,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn canonical(raw: &str) -> String {
        normalize_tag(raw).unwrap().canonical
    }
    fn identity(raw: &str) -> String {
        normalize_tag(raw).unwrap().normalized_name
    }

    #[test]
    fn trim_whitespace() {
        assert_eq!(canonical("  AI  "), "AI");
    }

    #[test]
    fn strip_leading_hash() {
        assert_eq!(canonical("#AI"), "AI");
        assert_eq!(canonical("# AI"), "AI");
    }

    #[test]
    fn hash_and_spaces_same_identity() {
        assert_eq!(identity(" AI "), identity("#AI"));
        assert_eq!(identity("#AI"), identity("ai"));
    }

    #[test]
    fn whitespace_collapse() {
        assert_eq!(canonical("Deep   Work"), "Deep Work");
        assert_eq!(identity("Deep   Work"), "deep work");
    }

    #[test]
    fn nfkc_canonical_form() {
        // Composed and decomposed NFKC forms normalize identically.
        let composed = "\u{1EA1}"; // ạ (precomposed)
        let decomposed = "a\u{0323}"; // a + combining below
        // NFKC collapses decomposed to composed.
        assert_eq!(identity(composed), identity(decomposed));
    }

    #[test]
    fn vietnamese_accents_preserved_in_identity() {
        // "Học" != "Hoc" as tag identities.
        assert_ne!(identity("Học"), identity("Hoc"));
        assert_ne!(identity("Học"), "hoc");
        assert_eq!(identity("Học"), "học");
    }

    #[test]
    fn d_stroke_preserved_in_identity() {
        // đ/Đ remain as đ in identity (NFKC does not strip them).
        assert_eq!(identity("đường"), "đường");
    }

    #[test]
    fn case_identity() {
        assert_eq!(identity("AI"), identity("ai"));
        assert_eq!(identity("DEEP WORK"), identity("deep work"));
    }

    #[test]
    fn empty_input_rejected() {
        assert!(normalize_tag("").is_err());
        assert!(normalize_tag("   ").is_err());
        assert!(normalize_tag("#").is_err());
        assert!(normalize_tag("# ").is_err());
    }

    #[test]
    fn exactly_64_scalars_accepted() {
        let s: String = "a".repeat(64);
        assert!(normalize_tag(&s).is_ok());
    }

    #[test]
    fn sixty_five_scalars_rejected() {
        let s: String = "a".repeat(65);
        assert!(normalize_tag(&s).is_err());
    }

    #[test]
    fn control_character_rejected() {
        assert!(normalize_tag("tag\x01name").is_err());
        assert!(normalize_tag("tag\x1fname").is_err());
    }

    #[test]
    fn only_hash_rejected() {
        assert!(normalize_tag("#").is_err());
    }

    #[test]
    fn single_character_accepted() {
        assert!(normalize_tag("A").is_ok());
        assert_eq!(canonical("A"), "A");
    }
}
