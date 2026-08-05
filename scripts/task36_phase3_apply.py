#!/usr/bin/env python3
"""Apply the bounded Task 36 Phase 3 integration patch with exact assertions."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path: str) -> tuple[Path, str]:
    target = ROOT / path
    return target, target.read_text(encoding="utf-8")


def save(target: Path, text: str) -> None:
    target.write_text(text, encoding="utf-8", newline="\n")


def replace(text: str, old: str, new: str, *, count: int = 1, label: str) -> str:
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f"{label}: expected {count} anchor(s), found {actual}")
    return text.replace(old, new)


def patch_search_mod() -> None:
    target, text = load("src-tauri/src/search/mod.rs")
    text = replace(
        text,
        "pub mod dto;\npub mod normalize;\npub mod repository;",
        "pub mod dto;\nmod focus_plan;\npub mod normalize;\npub mod repository;",
        label="search module registration",
    )
    save(target, text)


def patch_search_dto() -> None:
    target, text = load("src-tauri/src/search/dto.rs")
    text = replace(
        text,
        "    ReaderDocument,\n}",
        "    ReaderDocument,\n    FocusPlan,\n}",
        label="search entity kind",
    )
    text = replace(
        text,
        "    LifeReader {\n        node_id: String,\n    },\n}",
        "    LifeReader {\n        node_id: String,\n    },\n    FocusPlan {\n        plan_id: String,\n    },\n}",
        label="search navigation target",
    )
    text = replace(
        text,
        "    Documents,\n}",
        "    Documents,\n    Plans,\n}",
        label="search result group",
    )
    save(target, text)


def patch_search_repository() -> None:
    target, text = load("src-tauri/src/search/repository.rs")
    text = replace(
        text,
        "use super::SearchError;\nuse super::dto::{",
        "use super::SearchError;\nuse super::focus_plan::rebuild_focus_plans_scope;\nuse super::dto::{",
        label="search focus plan import",
    )
    text = replace(
        text,
        "        let rebuild_docs = rebuild_all || has(\"documents\");",
        "        let rebuild_docs = rebuild_all || has(\"documents\");\n        let rebuild_plans = rebuild_all || has(\"focus_plans\");",
        label="search focus plan dirty scope",
    )
    text = replace(
        text,
        "        if rebuild_docs {\n            if let Some(ref nodes) = life_nodes {\n                rebuild_documents_scope(conn, nodes)?;\n            }\n        }\n        clear_dirty_scopes(conn)?;",
        "        if rebuild_docs {\n            if let Some(ref nodes) = life_nodes {\n                rebuild_documents_scope(conn, nodes)?;\n            }\n        }\n        if rebuild_plans {\n            rebuild_focus_plans_scope(conn)?;\n        }\n        clear_dirty_scopes(conn)?;",
        label="search focus plan rebuild call",
    )
    text = replace(
        text,
        "    let mut doc_results: Vec<SearchResultView> = Vec::new();",
        "    let mut doc_results: Vec<SearchResultView> = Vec::new();\n    let mut plan_results: Vec<SearchResultView> = Vec::new();",
        label="search plan result vector",
    )
    text = replace(
        text,
        '            "reader_document" => SearchEntityKind::ReaderDocument,\n            _ => continue,',
        '            "reader_document" => SearchEntityKind::ReaderDocument,\n            "focus_plan" => SearchEntityKind::FocusPlan,\n            _ => continue,',
        label="search plan kind mapping",
    )
    text = replace(
        text,
        "            SearchEntityKind::ReaderDocument => SearchNavigationTarget::LifeReader {\n                node_id: row.navigation_id.clone(),\n            },\n        };",
        "            SearchEntityKind::ReaderDocument => SearchNavigationTarget::LifeReader {\n                node_id: row.navigation_id.clone(),\n            },\n            SearchEntityKind::FocusPlan => SearchNavigationTarget::FocusPlan {\n                plan_id: row.entity_id.clone(),\n            },\n        };",
        label="search plan navigation",
    )
    text = replace(
        text,
        "            SearchEntityKind::ReaderDocument => doc_results.push(result),\n        }",
        "            SearchEntityKind::ReaderDocument => doc_results.push(result),\n            SearchEntityKind::FocusPlan => plan_results.push(result),\n        }",
        label="search plan result routing",
    )
    text = replace(
        text,
        "    add_group(doc_results, SearchResultGroupKind::Documents, &mut groups);",
        "    add_group(doc_results, SearchResultGroupKind::Documents, &mut groups);\n    add_group(plan_results, SearchResultGroupKind::Plans, &mut groups);",
        label="search plan group",
    )
    text = replace(
        text,
        "        connection::open_memory_connection, migrations::run_migrations,\n",
        "        connection::open_memory_connection, task36_migration::run_all_migrations,\n",
        label="search test migration import",
    )
    text = replace(
        text,
        "        run_migrations(&mut conn).unwrap();",
        "        run_all_migrations(&mut conn).unwrap();",
        count=1,
        label="search test migration call",
    )
    save(target, text)


def patch_focus_search_module() -> None:
    target, text = load("src-tauri/src/search/focus_plan.rs")
    text = replace(
        text,
        "             LEFT JOIN focus_plan_phases ignored_phase ON 1=0\n",
        "",
        label="remove unused search join",
    )
    marker = "    fn rebuild_indexes_plan_context_without_reader_rows() {"
    if text.count(marker) != 1:
        raise SystemExit("focus plan search test anchor missing")
    insert_before_final = '''

    #[test]
    fn archived_plan_is_removed_from_search_projection() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        let plan = focus_plan_repository::create(
            &mut conn,
            CreateFocusPlanInput {
                title: "Temporary Strategy".into(),
                life_node_id: None,
                start_date: None,
                target_date: None,
                outcome: "Should disappear".into(),
                success_criteria: vec!["Archive it".into()],
                initial_variant_label: "Only variant".into(),
                operation_id: "search-archive-create".into(),
            },
        )
        .unwrap();
        rebuild_focus_plans_scope(&conn).unwrap();
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM search_documents WHERE entity_id=?1",
                [&plan.id],
                |row| row.get(0),
            )
            .unwrap(),
            1
        );
        conn.execute(
            "UPDATE focus_plans SET archived_at='now' WHERE id=?1",
            [&plan.id],
        )
        .unwrap();
        rebuild_focus_plans_scope(&conn).unwrap();
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM search_documents WHERE entity_id=?1",
                [&plan.id],
                |row| row.get(0),
            )
            .unwrap(),
            0
        );
    }
'''
    head, tail = text.rsplit("\n}", 1)
    save(target, head + insert_before_final + "\n}" + tail)


def patch_backup_restore() -> None:
    target, text = load("src-tauri/src/infrastructure/backup/restore.rs")
    marker = "\n#[cfg(test)]\nmod tests {"
    if text.count(marker) != 1:
        raise SystemExit("backup restore test boundary missing")
    production, tests = text.split(marker, 1)
    production = replace(
        production,
        "    migrations::{current_schema_version, max_supported_schema_version, run_migrations},",
        "    task36_migration::{\n        current_schema_version, max_supported_schema_version, run_all_migrations,\n    },",
        label="backup production migration import",
    )
    count = production.count("run_migrations(")
    if count < 3:
        raise SystemExit(f"backup production migration calls unexpectedly low: {count}")
    production = production.replace("run_migrations(", "run_all_migrations(")
    if "run_migrations(" in production:
        raise SystemExit("schema-19 migration call remains in backup production code")
    save(target, production + marker + tests)


def patch_backup_lifecycle() -> None:
    target, text = load("src-tauri/src/infrastructure/backup/lifecycle.rs")
    text = replace(
        text,
        "use crate::infrastructure::sqlite::migrations::max_supported_schema_version;",
        "use crate::infrastructure::sqlite::task36_migration::max_supported_schema_version;",
        label="backup lifecycle schema authority",
    )
    save(target, text)


def patch_focus_repository() -> None:
    target, text = load("src-tauri/src/focus_plan/repository.rs")
    text = replace(
        text,
        '    tx.execute("DELETE FROM focus_plan_tags WHERE plan_id=?1", [plan_id])?;',
        '    tx.execute(\n        "DELETE FROM focus_plan_tags WHERE plan_id=?1\n         AND tag_id IN (SELECT id FROM tags WHERE archived_at IS NULL AND merged_into_tag_id IS NULL)",\n        [plan_id],\n    )?;',
        label="preserve archived focus plan tag joins",
    )
    save(target, text)


def patch_migration() -> None:
    target, text = load("src-tauri/src/infrastructure/sqlite/task36_migration.rs")
    text = replace(
        text,
        "    WHERE (SELECT COUNT(*) FROM focus_plan_tags WHERE plan_id=NEW.plan_id) >= 20;",
        "    WHERE (SELECT COUNT(*) FROM focus_plan_tags fpt JOIN tags t ON t.id=fpt.tag_id\n           WHERE fpt.plan_id=NEW.plan_id AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL) >= 20;",
        label="active focus plan tag cap",
    )
    dirty_anchor = "CREATE TRIGGER search_dirty_focus_plan_tags_ai AFTER INSERT ON focus_plan_tags BEGIN"
    delete_triggers = """CREATE TRIGGER search_dirty_focus_plans_ad AFTER DELETE ON focus_plans BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_variants_ad AFTER DELETE ON focus_plan_variants BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_phases_ad AFTER DELETE ON focus_plan_phases BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;

"""
    text = replace(
        text,
        dirty_anchor,
        delete_triggers + dirty_anchor,
        label="focus plan delete dirty triggers",
    )
    text = text.replace("VALUES('all',strftime", "VALUES('focus_plans',strftime")
    bootstrap = "INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))"
    if bootstrap not in text:
        raise SystemExit("focus plan search dirty scope was not normalized")
    save(target, text)


def patch_tag_repository() -> None:
    target, text = load("src-tauri/src/tag/repository.rs")
    restore_anchor = '''    if would_exceed_life {
        return Err(TagError::Validation(
            "Restoring this tag would exceed the 12-tag limit on one or more assigned life nodes."
                .to_string(),
        ));
    }

    let t = now();'''
    restore_replacement = '''    if would_exceed_life {
        return Err(TagError::Validation(
            "Restoring this tag would exceed the 12-tag limit on one or more assigned life nodes."
                .to_string(),
        ));
    }

    let would_exceed_plans: bool = conn
        .query_row(
            "SELECT 1 FROM focus_plan_tags fpt
             WHERE fpt.tag_id = ?1
               AND (SELECT COUNT(*) FROM focus_plan_tags fpt2
                    JOIN tags t ON t.id = fpt2.tag_id
                    WHERE fpt2.plan_id = fpt.plan_id
                      AND t.archived_at IS NULL
                      AND t.merged_into_tag_id IS NULL
                      AND fpt2.tag_id != ?1) >= 20
             LIMIT 1",
            params![input.tag_id],
            |_| Ok(true),
        )
        .optional()?
        .unwrap_or(false);

    if would_exceed_plans {
        return Err(TagError::Validation(
            "Restoring this tag would exceed the 20-tag limit on one or more Focus Plans."
                .to_string(),
        ));
    }

    let t = now();'''
    text = replace(
        text,
        restore_anchor,
        restore_replacement,
        label="focus plan tag restore preflight",
    )
    merge_anchor = '''    tx.execute(
        "DELETE FROM life_node_tags WHERE tag_id=?1",
        params![input.source_tag_id],
    )?;

    // Flatten alias chain:'''
    merge_replacement = '''    tx.execute(
        "DELETE FROM life_node_tags WHERE tag_id=?1",
        params![input.source_tag_id],
    )?;

    // Move Focus Plan tags and deduplicate when the target is already assigned.
    tx.execute(
        "INSERT OR IGNORE INTO focus_plan_tags(plan_id,tag_id,created_at)
         SELECT plan_id,?2,?3 FROM focus_plan_tags WHERE tag_id=?1",
        params![input.source_tag_id, input.target_tag_id, t],
    )?;
    tx.execute(
        "DELETE FROM focus_plan_tags WHERE tag_id=?1",
        params![input.source_tag_id],
    )?;

    // Flatten alias chain:'''
    text = replace(
        text,
        merge_anchor,
        merge_replacement,
        label="focus plan tag merge",
    )
    text = replace(
        text,
        "        connection::open_memory_connection, migrations::run_migrations,\n",
        "        connection::open_memory_connection, task36_migration::run_all_migrations,\n",
        label="tag test migration import",
    )
    text = replace(
        text,
        "        run_migrations(&mut conn).unwrap();",
        "        run_all_migrations(&mut conn).unwrap();",
        count=1,
        label="tag test migration call",
    )
    test = r'''

    #[test]
    fn merge_moves_and_deduplicates_focus_plan_assignments() {
        let mut conn = db();
        let source = make_tag(&conn, "machine-learning");
        let target = make_tag(&conn, "artificial-intelligence");
        let plan = crate::focus_plan::repository::create(
            &mut conn,
            crate::focus_plan::dto::CreateFocusPlanInput {
                title: "AI Foundations".into(),
                life_node_id: None,
                start_date: None,
                target_date: None,
                outcome: "Learn".into(),
                success_criteria: vec!["Complete".into()],
                initial_variant_label: "Primary".into(),
                operation_id: "tag-merge-plan".into(),
            },
        )
        .unwrap();
        conn.execute(
            "INSERT INTO focus_plan_tags(plan_id,tag_id,created_at) VALUES(?1,?2,'0')",
            params![plan.id, source.id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO focus_plan_tags(plan_id,tag_id,created_at) VALUES(?1,?2,'0')",
            params![plan.id, target.id],
        )
        .unwrap();

        merge(
            &conn,
            MergeTagsInput {
                source_tag_id: source.id.clone(),
                target_tag_id: target.id.clone(),
                source_expected_revision: 0,
                target_expected_revision: 0,
            },
        )
        .unwrap();

        let source_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_tags WHERE plan_id=?1 AND tag_id=?2",
                params![plan.id, source.id],
                |row| row.get(0),
            )
            .unwrap();
        let target_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM focus_plan_tags WHERE plan_id=?1 AND tag_id=?2",
                params![plan.id, target.id],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(source_count, 0);
        assert_eq!(target_count, 1);
    }
'''
    head, tail = text.rsplit("\n}", 1)
    save(target, head + test + "\n}" + tail)


def main() -> None:
    patch_search_mod()
    patch_search_dto()
    patch_search_repository()
    patch_focus_search_module()
    patch_backup_restore()
    patch_backup_lifecycle()
    patch_focus_repository()
    patch_migration()
    patch_tag_repository()
    print("Task 36 Phase 3 integration patch applied")


if __name__ == "__main__":
    main()
