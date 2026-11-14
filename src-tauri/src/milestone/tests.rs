use super::{domain::MilestoneError, dto::*, repository::*};
use crate::infrastructure::sqlite::{
    connection::{open_file_connection, open_memory_connection},
    task57_migration, task58_migration,
};

fn input(id: u128, date: &str) -> SaveMilestoneInput {
    SaveMilestoneInput {
        id: uuid::Uuid::from_u128(id).to_string(),
        title: "Thi SPhO — vật lý".into(),
        date: date.into(),
        description: "Ôn tập\nNghiên cứu".into(),
        pinned: true,
        expected_revision: None,
    }
}
#[test]
fn milestone_migration_preserves_existing_rows_is_atomic_idempotent_and_rejects_future_schema() {
    let mut conn = open_memory_connection().unwrap();
    task57_migration::run_all_migrations(&mut conn).unwrap();
    conn.execute("INSERT INTO foundation_records(id,label,created_at,updated_at) VALUES('before','Keep me','1','1')", []).unwrap();
    conn.execute_batch("CREATE TEMP TRIGGER fail_milestones_migration BEFORE INSERT ON schema_migrations WHEN NEW.version=35 BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;").unwrap();
    assert!(task58_migration::run_all_migrations(&mut conn).is_err());
    assert_eq!(task57_migration::current_schema_version(&conn).unwrap(), 34);
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE name='milestones'",
            [],
            |row| row.get::<_, i64>(0)
        )
        .unwrap(),
        0
    );
    conn.execute_batch("DROP TRIGGER fail_milestones_migration;")
        .unwrap();
    for _ in 0..2 {
        task58_migration::run_all_migrations(&mut conn).unwrap();
    }
    assert_eq!(task58_migration::current_schema_version(&conn).unwrap(), 35);
    assert_eq!(
        conn.query_row(
            "SELECT label FROM foundation_records WHERE id='before'",
            [],
            |r| r.get::<_, String>(0)
        )
        .unwrap(),
        "Keep me"
    );
    assert_eq!(
        conn.query_row(
            "SELECT COUNT(*) FROM schema_migrations WHERE version=35",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        1
    );
    conn.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(36,'future')",
        [],
    )
    .unwrap();
    assert!(matches!(
        task58_migration::run_all_migrations(&mut conn),
        Err(crate::infrastructure::sqlite::DbError::SchemaTooNew {
            stored: 36,
            supported: 35
        })
    ));
    assert!(list(&conn).unwrap().is_empty());
}
#[test]
fn milestone_crud_duplicate_dates_sorting_and_stale_write_guards() {
    let mut conn = open_memory_connection().unwrap();
    task58_migration::run_all_migrations(&mut conn).unwrap();
    save(&mut conn, input(2, "2027-01-01")).unwrap();
    let first = save(&mut conn, input(1, "2026-12-17")).unwrap();
    save(&mut conn, input(3, "2026-12-17")).unwrap();
    assert_eq!(
        list(&conn)
            .unwrap()
            .iter()
            .map(|r| r.date.as_str())
            .collect::<Vec<_>>(),
        ["2026-12-17", "2026-12-17", "2027-01-01"]
    );
    assert!(matches!(
        save(&mut conn, input(1, "2026-12-17")),
        Err(MilestoneError::StaleRevision)
    ));
    let mut edit = input(1, "2024-02-29");
    edit.title = "  Thành công  ".into();
    edit.expected_revision = Some(0);
    let edited = save(&mut conn, edit).unwrap();
    assert_eq!(edited.title, "Thành công");
    assert_eq!(edited.revision, 1);
    assert_eq!(edited.created_at, first.created_at);
    assert!(matches!(
        mutate(
            &mut conn,
            MutateMilestoneInput {
                id: first.id.clone(),
                expected_revision: 0,
                action: MilestoneAction::Delete
            }
        ),
        Err(MilestoneError::StaleRevision)
    ));
    for (revision, action) in [
        (1, MilestoneAction::Unpin),
        (2, MilestoneAction::Pin),
        (3, MilestoneAction::Delete),
    ] {
        let row = mutate(
            &mut conn,
            MutateMilestoneInput {
                id: first.id.clone(),
                expected_revision: revision,
                action,
            },
        )
        .unwrap();
        assert_eq!(row.revision, revision + 1);
    }
    let deleted = list(&conn)
        .unwrap()
        .into_iter()
        .find(|r| r.id == first.id)
        .unwrap();
    assert!(deleted.deleted_at.is_some());
    let mut edit = input(1, "2026-12-17");
    edit.expected_revision = Some(4);
    assert!(matches!(
        save(&mut conn, edit),
        Err(MilestoneError::StaleRevision)
    ));
    let restored = mutate(
        &mut conn,
        MutateMilestoneInput {
            id: first.id,
            expected_revision: 4,
            action: MilestoneAction::Restore,
        },
    )
    .unwrap();
    assert!(restored.deleted_at.is_none());
    assert!(restored.pinned);
    assert_eq!(restored.description, "Ôn tập\nNghiên cứu");
}
#[test]
fn milestone_rejects_invalid_calendar_dates_titles_sizes_and_identity_without_writes() {
    let mut conn = open_memory_connection().unwrap();
    task58_migration::run_all_migrations(&mut conn).unwrap();
    for date in [
        "2026-02-29",
        "2026-11-31",
        "2026-1-01",
        "2026-13-01",
        "0000-01-01",
        "2026-01-01T00:00:00Z",
    ] {
        assert!(
            matches!(
                save(&mut conn, input(1, date)),
                Err(MilestoneError::Validation(_))
            ),
            "{date}"
        );
    }
    for title in [
        " ".into(),
        "x".repeat(201),
        "bad\nline".into(),
        "bad\0title".into(),
    ] {
        let mut value = input(1, "2026-12-17");
        value.title = title;
        assert!(save(&mut conn, value).is_err());
    }
    let mut value = input(1, "2026-12-17");
    value.description = "x".repeat(4001);
    assert!(save(&mut conn, value).is_err());
    let mut value = input(1, "2026-12-17");
    value.id = "invalid' OR 1=1".into();
    assert!(save(&mut conn, value).is_err());
    assert!(list(&conn).unwrap().is_empty());
    for (i, date) in ["2024-02-29", "0100-01-01", "9999-12-31"]
        .into_iter()
        .enumerate()
    {
        save(&mut conn, input(i as u128 + 1, date)).unwrap();
    }
    assert_eq!(list(&conn).unwrap().len(), 3);
}
#[test]
fn milestone_file_reopen_preserves_unicode_pin_revision_and_deletion() {
    let dir = std::env::temp_dir().join(format!(
        "lw-milestone-{}",
        uuid::Uuid::new_v7(uuid::Timestamp::now(uuid::NoContext))
    ));
    std::fs::create_dir_all(&dir).unwrap();
    let file = dir.join("test.db");
    let before = {
        let mut conn = open_file_connection(&file).unwrap();
        task58_migration::run_all_migrations(&mut conn).unwrap();
        let row = save(&mut conn, input(1, "2026-12-17")).unwrap();
        mutate(
            &mut conn,
            MutateMilestoneInput {
                id: row.id,
                expected_revision: 0,
                action: MilestoneAction::Delete,
            },
        )
        .unwrap();
        list(&conn).unwrap()
    };
    {
        let conn = open_file_connection(&file).unwrap();
        assert_eq!(list(&conn).unwrap(), before);
    }
    std::fs::remove_file(file).unwrap();
    // SQLite may retain empty WAL files; this directory contains synthetic test data only.
    std::fs::remove_dir_all(dir).unwrap();
}
