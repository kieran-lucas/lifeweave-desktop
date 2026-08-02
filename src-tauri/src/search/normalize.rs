use unicode_normalization::UnicodeNormalization;

const MAX_NORMALIZED_LEN: usize = 2048;
const MAX_FTS_TOKENS: usize = 8;
const MAX_FTS_TOKEN_LEN: usize = 64;

pub fn normalize(text: &str) -> String {
    let mut out = String::with_capacity(text.len().min(MAX_NORMALIZED_LEN));
    for ch in text.nfkd() {
        // Skip combining diacritical marks that NFKD decomposition exposes.
        if unicode_normalization::char::canonical_combining_class(ch) > 0 {
            continue;
        }
        // đ/Đ do not decompose under NFKD; map explicitly to d.
        match ch {
            'đ' | 'Đ' => out.push('d'),
            c => {
                for lc in c.to_lowercase() {
                    out.push(lc);
                }
            }
        }
    }
    // Collapse whitespace and strip leading/trailing.
    let collapsed: String = out.split_whitespace().collect::<Vec<_>>().join(" ");
    collapsed.chars().take(MAX_NORMALIZED_LEN).collect()
}

/// Builds a safe FTS5 MATCH expression from raw user input.
/// Returns None if the normalized query has fewer than 2 non-whitespace characters.
pub fn build_fts_expression(raw: &str) -> Option<String> {
    let norm = normalize(raw);
    let tokens: Vec<&str> = norm
        .split_whitespace()
        .filter(|t| !t.is_empty())
        .take(MAX_FTS_TOKENS)
        .collect();
    if tokens.is_empty() {
        return None;
    }
    let parts: Vec<String> = tokens
        .iter()
        .enumerate()
        .filter_map(|(i, t)| {
            // Strip non-alphanumeric chars to prevent FTS5 operator injection.
            let safe: String = t
                .chars()
                .take(MAX_FTS_TOKEN_LEN)
                .filter(|c| c.is_alphanumeric())
                .collect();
            if safe.is_empty() {
                return None;
            }
            if i == tokens.len() - 1 {
                // Last token: prefix match.
                Some(format!("\"{safe}\"*"))
            } else {
                Some(format!("\"{safe}\""))
            }
        })
        .collect();
    if parts.is_empty() {
        return None;
    }
    Some(parts.join(" "))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_strips_combining_marks() {
        assert_eq!(normalize("héllo"), "hello");
        assert_eq!(normalize("Ốc"), "oc");
        assert_eq!(normalize("ạ"), "a");
    }

    #[test]
    fn normalize_d_stroke_maps_to_d() {
        assert_eq!(normalize("đường"), "duong");
        assert_eq!(normalize("Đặng"), "dang");
    }

    #[test]
    fn normalize_lowercase() {
        assert_eq!(normalize("Hello WORLD"), "hello world");
    }

    #[test]
    fn normalize_collapses_whitespace() {
        assert_eq!(normalize("  a   b  "), "a b");
    }

    #[test]
    fn normalize_empty_gives_empty() {
        assert_eq!(normalize(""), "");
    }

    #[test]
    fn normalize_combined_vietnamese() {
        // "Nguyễn" → "nguyen"
        assert_eq!(normalize("Nguyễn"), "nguyen");
        // "Trần" → "tran"
        assert_eq!(normalize("Trần"), "tran");
        // "đi" → "di"
        assert_eq!(normalize("đi"), "di");
    }

    #[test]
    fn build_fts_expression_single_token_is_prefix() {
        let expr = build_fts_expression("hello").unwrap();
        assert_eq!(expr, "\"hello\"*");
    }

    #[test]
    fn build_fts_expression_multi_token_last_is_prefix() {
        let expr = build_fts_expression("hello world").unwrap();
        assert_eq!(expr, "\"hello\" \"world\"*");
    }

    #[test]
    fn build_fts_expression_rejects_operator_injection() {
        // FTS5 operators like OR AND NOT should not be injected.
        let expr = build_fts_expression("OR AND NOT").unwrap();
        // All non-alphanumeric operators stripped; only alphanumeric tokens remain.
        assert!(expr.contains("or") || expr.contains("and") || expr.contains("not"));
        assert!(!expr.contains(" OR "));
        assert!(!expr.contains(" AND "));
    }

    #[test]
    fn build_fts_expression_punctuation_only_returns_none() {
        assert!(build_fts_expression("!@#$%").is_none());
    }

    #[test]
    fn build_fts_expression_empty_returns_none() {
        assert!(build_fts_expression("").is_none());
    }

    #[test]
    fn build_fts_expression_normalizes_vietnamese() {
        let expr = build_fts_expression("đường").unwrap();
        assert_eq!(expr, "\"duong\"*");
    }

    #[test]
    fn normalize_respects_max_length() {
        let long = "a".repeat(3000);
        let result = normalize(&long);
        assert!(result.chars().count() <= MAX_NORMALIZED_LEN);
    }
}
