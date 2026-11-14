//! Domain validation and transactional persistence, exclusively on the existing DB worker.
use super::domain::{MilestoneError, validate, validate_id};
use super::dto::*;
use rusqlite::{Connection, OptionalExtension, params};

fn storage(_: rusqlite::Error) -> MilestoneError {
    MilestoneError::Storage
}
fn row(r: &rusqlite::Row<'_>) -> rusqlite::Result<MilestoneView> {
    Ok(MilestoneView {
        id: r.get(0)?,
        title: r.get(1)?,
        date: r.get(2)?,
        description: r.get(3)?,
        pinned: r.get(4)?,
        created_at: r.get(5)?,
        updated_at: r.get(6)?,
        revision: r.get(7)?,
        deleted_at: r.get(8)?,
    })
}
const COLUMNS: &str =
    "id,title,local_date,description,pinned,created_at,updated_at,revision,deleted_at";
fn get(conn: &Connection, id: &str) -> Result<MilestoneView, MilestoneError> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM milestones WHERE id=?1"),
        [id],
        row,
    )
    .optional()
    .map_err(storage)?
    .ok_or(MilestoneError::NotFound)
}
pub fn list(conn: &Connection) -> Result<Vec<MilestoneView>, MilestoneError> {
    let mut q = conn
        .prepare(&format!(
            "SELECT {COLUMNS} FROM milestones ORDER BY local_date,id"
        ))
        .map_err(storage)?;
    q.query_map([], row)
        .map_err(storage)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(storage)
}
pub fn save(
    conn: &mut Connection,
    input: SaveMilestoneInput,
) -> Result<MilestoneView, MilestoneError> {
    validate(&input)?;
    let title = input.title.trim();
    let tx = conn.transaction().map_err(storage)?;
    if let Some(revision) = input.expected_revision {
        let changed = tx.execute("UPDATE milestones SET title=?1,local_date=?2,description=?3,pinned=?4,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),revision=revision+1 WHERE id=?5 AND revision=?6 AND deleted_at IS NULL",
            params![title,input.date,input.description,input.pinned,input.id,revision]).map_err(storage)?;
        if changed != 1 {
            return Err(MilestoneError::StaleRevision);
        }
    } else {
        let changed = tx.execute("INSERT INTO milestones(id,title,local_date,description,pinned,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO NOTHING",
            params![input.id,title,input.date,input.description,input.pinned]).map_err(storage)?;
        if changed != 1 {
            return Err(MilestoneError::StaleRevision);
        }
    }
    let result = get(&tx, &input.id)?;
    tx.commit().map_err(storage)?;
    Ok(result)
}
pub fn mutate(
    conn: &mut Connection,
    input: MutateMilestoneInput,
) -> Result<MilestoneView, MilestoneError> {
    validate_id(&input.id)?;
    let tx = conn.transaction().map_err(storage)?;
    let previous = get(&tx, &input.id)?;
    if previous.revision != input.expected_revision {
        return Err(MilestoneError::StaleRevision);
    }
    let restore = matches!(input.action, MilestoneAction::Restore);
    if restore != previous.deleted_at.is_some() {
        return Err(MilestoneError::StaleRevision);
    }
    let pinned = match input.action {
        MilestoneAction::Pin => true,
        MilestoneAction::Unpin => false,
        _ => previous.pinned,
    };
    let deleted = matches!(input.action, MilestoneAction::Delete);
    tx.execute("UPDATE milestones SET pinned=?1,deleted_at=CASE WHEN ?2 THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),revision=revision+1 WHERE id=?3 AND revision=?4",
        params![pinned,deleted,input.id,input.expected_revision]).map_err(storage)?;
    let result = get(&tx, &input.id)?;
    tx.commit().map_err(storage)?;
    Ok(result)
}
