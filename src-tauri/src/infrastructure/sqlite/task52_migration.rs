use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task51_migration};

pub const TASK52_SCHEMA_VERSION: u32 = 29;

// The Product Owner's canonical Life Focus System is an identity-preserving correction. Stable
// node IDs keep all existing leaf documents, task/Plan links, tags, backlinks, and revisions
// attached while titles, icons, ordering, and parentage converge to the exact 53-node hierarchy.
// In particular, Finance belongs to Security, never Community.
const MIGRATION_29_SQL: &str = r#"
UPDATE life_nodes
   SET title='LIFE FOCUS SYSTEM', icon_key='life-system', branch_theme_id='violet',
       sort_key=0, archived_at=NULL, updated_at=strftime('%s','now'), revision=revision+1
 WHERE id='life-root';

INSERT INTO life_nodes(
  id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,
  archived_at,created_at,updated_at,revision
) VALUES
('10000000-0000-7000-8000-000000000001','life-root','VITALITY','','life-vitality','green',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000002','10000000-0000-7000-8000-000000000001','BODY','','life-body','green',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000003','10000000-0000-7000-8000-000000000002','Sleep & Physical Recovery','','life-sleep','green',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000004','10000000-0000-7000-8000-000000000002','Movement & Fitness','','life-fitness','green',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000005','10000000-0000-7000-8000-000000000002','Nutrition & Healthcare','','life-nutrition','green',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000006','10000000-0000-7000-8000-000000000001','MIND','','life-mind','green',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000007','10000000-0000-7000-8000-000000000006','Emotional Wellbeing','','life-emotional','green',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000008','10000000-0000-7000-8000-000000000006','Stress & Coping','','life-stress','green',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000009','10000000-0000-7000-8000-000000000006','Mental Healthcare','','life-mental-health','green',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000010','10000000-0000-7000-8000-000000000001','REST & PLAY','','life-rest-play','green',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000011','10000000-0000-7000-8000-000000000010','Detachment & Downtime','','life-detachment','green',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000012','10000000-0000-7000-8000-000000000010','Play & Entertainment','','life-entertainment','green',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000013','10000000-0000-7000-8000-000000000010','Hobbies & Exploration','','life-hobbies','green',2,NULL,strftime('%s','now'),strftime('%s','now'),0),

('10000000-0000-7000-8000-000000000014','life-root','CAPABILITY & CONTRIBUTION','','life-capability','blue',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000015','10000000-0000-7000-8000-000000000014','LEARNING','','life-learning','blue',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000016','10000000-0000-7000-8000-000000000015','Formal & Structured Learning','','life-formal-learning','blue',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000017','10000000-0000-7000-8000-000000000015','Domain Knowledge','','life-domain-knowledge','blue',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000018','10000000-0000-7000-8000-000000000015','Language & Communication','','life-language','blue',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000019','10000000-0000-7000-8000-000000000014','CRAFT','','life-craft','blue',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000020','10000000-0000-7000-8000-000000000019','Technical Practice','','life-technical','blue',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000021','10000000-0000-7000-8000-000000000019','Research & Inquiry','','life-research','blue',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000022','10000000-0000-7000-8000-000000000019','Projects & Portfolio','','life-projects','blue',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000023','10000000-0000-7000-8000-000000000014','WORK & CONTRIBUTION','','life-work','blue',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000024','10000000-0000-7000-8000-000000000023','Career Pathways','','life-career','blue',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000025','10000000-0000-7000-8000-000000000023','Professional Performance','','life-performance','blue',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000026','10000000-0000-7000-8000-000000000023','Leadership & Impact','','life-leadership','blue',2,NULL,strftime('%s','now'),strftime('%s','now'),0),

('10000000-0000-7000-8000-000000000027','life-root','RELATIONSHIPS','','life-relationships','violet',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000028','10000000-0000-7000-8000-000000000027','FAMILY & LOVE','','life-family','violet',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000029','10000000-0000-7000-8000-000000000028','Parents & Family of Origin','','life-parents','violet',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000030','10000000-0000-7000-8000-000000000028','Partner & Marriage','','life-partner','violet',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000031','10000000-0000-7000-8000-000000000028','Children & Household','','life-children','violet',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000032','10000000-0000-7000-8000-000000000027','FRIENDS & MENTORS','','life-friends-mentors','violet',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000033','10000000-0000-7000-8000-000000000032','Close Friends','','life-close-friends','violet',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000034','10000000-0000-7000-8000-000000000032','Peers & Collaborators','','life-peers','violet',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000035','10000000-0000-7000-8000-000000000032','Mentors & Mentees','','life-mentors','violet',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000036','10000000-0000-7000-8000-000000000027','COMMUNITY','','life-community','violet',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000037','10000000-0000-7000-8000-000000000036','Academic & Professional Communities','','life-academic-community','violet',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000038','10000000-0000-7000-8000-000000000036','Local & Civic Community','','life-civic','violet',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000039','10000000-0000-7000-8000-000000000036','Membership & Belonging','','life-belonging','violet',2,NULL,strftime('%s','now'),strftime('%s','now'),0),

('10000000-0000-7000-8000-000000000040','life-root','SECURITY','','life-security','amber',3,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000041','10000000-0000-7000-8000-000000000040','FINANCE','','life-finance','amber',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000042','10000000-0000-7000-8000-000000000041','Cash Flow & Buffer','','life-cash-flow','amber',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000043','10000000-0000-7000-8000-000000000041','Investing & Growth','','life-investing','amber',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000044','10000000-0000-7000-8000-000000000041','Insurance & Obligations','','life-insurance','amber',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000045','10000000-0000-7000-8000-000000000040','HOME & ENVIRONMENT','','life-home','amber',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000046','10000000-0000-7000-8000-000000000045','Housing','','life-housing','amber',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000047','10000000-0000-7000-8000-000000000045','Location & Mobility','','life-location','amber',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000048','10000000-0000-7000-8000-000000000045','Living Environment','','life-living-environment','amber',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000049','10000000-0000-7000-8000-000000000040','SAFETY & CONTINUITY','','life-safety','amber',2,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000050','10000000-0000-7000-8000-000000000049','Personal & Digital Safety','','life-digital-safety','amber',0,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000051','10000000-0000-7000-8000-000000000049','Documents & Administration','','life-documents','amber',1,NULL,strftime('%s','now'),strftime('%s','now'),0),
('10000000-0000-7000-8000-000000000052','10000000-0000-7000-8000-000000000049','Contingency & Recovery','','life-contingency','amber',2,NULL,strftime('%s','now'),strftime('%s','now'),0)
ON CONFLICT(id) DO UPDATE SET
  parent_id=excluded.parent_id,
  title=excluded.title,
  icon_key=excluded.icon_key,
  branch_theme_id=excluded.branch_theme_id,
  sort_key=excluded.sort_key,
  archived_at=NULL,
  updated_at=excluded.updated_at,
  revision=life_nodes.revision+1;

INSERT OR IGNORE INTO life_node_pins(node_id,sort_key,created_at) VALUES
('life-root',0,strftime('%s','now')),
('10000000-0000-7000-8000-000000000001',1,strftime('%s','now')),
('10000000-0000-7000-8000-000000000014',2,strftime('%s','now')),
('10000000-0000-7000-8000-000000000027',3,strftime('%s','now')),
('10000000-0000-7000-8000-000000000040',4,strftime('%s','now')),
('10000000-0000-7000-8000-000000000002',5,strftime('%s','now')),
('10000000-0000-7000-8000-000000000006',6,strftime('%s','now')),
('10000000-0000-7000-8000-000000000010',7,strftime('%s','now')),
('10000000-0000-7000-8000-000000000015',8,strftime('%s','now')),
('10000000-0000-7000-8000-000000000019',9,strftime('%s','now')),
('10000000-0000-7000-8000-000000000023',10,strftime('%s','now')),
('10000000-0000-7000-8000-000000000028',11,strftime('%s','now')),
('10000000-0000-7000-8000-000000000032',12,strftime('%s','now')),
('10000000-0000-7000-8000-000000000036',13,strftime('%s','now')),
('10000000-0000-7000-8000-000000000041',14,strftime('%s','now')),
('10000000-0000-7000-8000-000000000045',15,strftime('%s','now')),
('10000000-0000-7000-8000-000000000049',16,strftime('%s','now'));

UPDATE life_tree_meta SET tree_revision=tree_revision+1 WHERE singleton=1;
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK52_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK52_SCHEMA_VERSION,
        });
    }
    if current == TASK52_SCHEMA_VERSION {
        return Ok(());
    }

    task51_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current != task51_migration::TASK51_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK52_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_29_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK52_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK52_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    #[test]
    fn fresh_database_receives_the_exact_canonical_53_node_tree_once() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        run_all_migrations(&mut conn).unwrap();

        assert_eq!(current_schema_version(&conn).unwrap(), 29);
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version=29",
                [],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            1
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM life_nodes WHERE archived_at IS NULL",
                [],
                |row| row.get::<_, i64>(0)
            )
            .unwrap(),
            53
        );
        assert_eq!(conn.query_row("SELECT COUNT(*) FROM life_nodes WHERE parent_id='life-root' AND archived_at IS NULL", [], |row| row.get::<_, i64>(0)).unwrap(), 4);
        assert_eq!(conn.query_row("SELECT COUNT(*) FROM life_nodes WHERE icon_key NOT IN ('life-root','life-branch','life-leaf','life-focus','life-note')", [], |row| row.get::<_, i64>(0)).unwrap(), 53);
        assert_eq!(
            conn.query_row(
                "SELECT parent_id FROM life_nodes WHERE title='FINANCE'",
                [],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
            "10000000-0000-7000-8000-000000000040"
        );
        assert_eq!(conn.query_row("SELECT parent_id||'|'||sort_key||'|'||icon_key FROM life_nodes WHERE title='Contingency & Recovery'", [], |row| row.get::<_, String>(0)).unwrap(), "10000000-0000-7000-8000-000000000049|2|life-contingency");
    }

    #[test]
    fn upgrade_preserves_existing_leaf_document_content_by_stable_identity() {
        let mut conn = open_memory_connection().unwrap();
        task51_migration::run_all_migrations(&mut conn).unwrap();
        conn.execute(
            "INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision) VALUES('10000000-0000-7000-8000-000000000052','life-root','Old recovery title','Keep this summary','life-leaf','neutral',99,NULL,'1','1',0)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO reader_documents(id,life_node_id,schema_version,revision,canonical_json,plain_text,created_at,updated_at,archived_at) VALUES('document-recovery','10000000-0000-7000-8000-000000000052',1,0,'{\"type\":\"doc\",\"content\":[]}','Complete recovery content','1','1',NULL)",
            [],
        ).unwrap();

        run_all_migrations(&mut conn).unwrap();
        assert_eq!(
            conn.query_row(
                "SELECT title FROM life_nodes WHERE id='10000000-0000-7000-8000-000000000052'",
                [],
                |row| row.get::<_, String>(0)
            )
            .unwrap(),
            "Contingency & Recovery"
        );
        assert_eq!(conn.query_row("SELECT short_description FROM life_nodes WHERE id='10000000-0000-7000-8000-000000000052'", [], |row| row.get::<_, String>(0)).unwrap(), "Keep this summary");
        assert_eq!(conn.query_row("SELECT plain_text FROM reader_documents WHERE life_node_id='10000000-0000-7000-8000-000000000052'", [], |row| row.get::<_, String>(0)).unwrap(), "Complete recovery content");
    }
}
