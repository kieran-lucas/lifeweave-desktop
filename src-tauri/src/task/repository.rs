use super::{
    conflict::overlaps,
    domain::{Priority, validate_date, validate_description, validate_range, validate_title},
    dto::{CreateTaskInput, TaskCategoryView, TaskView, UpdateTaskInput},
};
use rusqlite::{Connection, params};
use uuid::{NoContext, Timestamp, Uuid};

#[derive(Debug)]
pub enum TaskError {
    Db(rusqlite::Error),
    Validation(&'static str),
    NotFound,
    Conflict,
}
impl From<rusqlite::Error> for TaskError {
    fn from(e: rusqlite::Error) -> Self {
        Self::Db(e)
    }
}
fn now() -> String {
    format!(
        "{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    )
}
fn id() -> String {
    Uuid::new_v7(Timestamp::now(NoContext)).to_string()
}
fn validate(input: &CreateTaskInput) -> Result<Priority, TaskError> {
    if !validate_date(&input.local_date) {
        return Err(TaskError::Validation("Enter a valid date."));
    }
    if !validate_range(input.start_minute, input.end_minute) {
        return Err(TaskError::Validation(
            "Tasks must be scheduled between 04:00 and 24:00.",
        ));
    }
    if !validate_title(&input.title) {
        return Err(TaskError::Validation(
            "Title is required and must be 200 characters or fewer.",
        ));
    }
    if !validate_description(&input.description) {
        return Err(TaskError::Validation("Description is too long."));
    }
    Priority::parse(&input.priority).ok_or(TaskError::Validation("Choose a valid priority."))
}
fn category_exists(conn: &Connection, id: &str) -> Result<bool, rusqlite::Error> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM task_categories WHERE id=?1 AND archived_at IS NULL)",
        params![id],
        |r| r.get(0),
    )
}
fn check_conflict(
    conn: &Connection,
    date: &str,
    start: i32,
    end: i32,
    exclude: Option<&str>,
) -> Result<(), TaskError> {
    let mut st=conn.prepare("SELECT start_minute,end_minute FROM tasks WHERE local_date=?1 AND (?2 IS NULL OR id != ?2)")?;
    let rows = st.query_map(params![date, exclude], |r| {
        Ok((r.get::<_, i32>(0)?, r.get::<_, i32>(1)?))
    })?;
    for row in rows {
        let (s, e) = row?;
        if overlaps(start, end, s, e) && !(start == s && end == e) {
            return Err(TaskError::Conflict);
        }
    }
    Ok(())
}
fn row(r: &rusqlite::Row<'_>) -> rusqlite::Result<TaskView> {
    Ok(TaskView {
        id: r.get(0)?,
        local_date: r.get(1)?,
        start_minute: r.get(2)?,
        end_minute: r.get(3)?,
        title: r.get(4)?,
        description: r.get(5)?,
        category_id: r.get(6)?,
        priority: r.get(7)?,
        created_at: r.get(8)?,
        updated_at: r.get(9)?,
    })
}
pub fn categories(conn: &Connection) -> Result<Vec<TaskCategoryView>, TaskError> {
    let mut st=conn.prepare("SELECT id,name,icon_key,color_key FROM task_categories WHERE archived_at IS NULL ORDER BY id")?;
    Ok(st
        .query_map([], |r| {
            Ok(TaskCategoryView {
                id: r.get(0)?,
                name: r.get(1)?,
                icon_key: r.get(2)?,
                color_key: r.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?)
}
pub fn list(conn: &Connection, date: &str) -> Result<Vec<TaskView>, TaskError> {
    if !validate_date(date) {
        return Err(TaskError::Validation("Enter a valid date."));
    }
    let mut st=conn.prepare("SELECT id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at FROM tasks WHERE local_date=?1 ORDER BY start_minute,end_minute,CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,created_at,id")?;
    Ok(st
        .query_map(params![date], row)?
        .collect::<Result<Vec<_>, _>>()?)
}
pub fn create(conn: &Connection, input: CreateTaskInput) -> Result<TaskView, TaskError> {
    let p = validate(&input)?;
    if !category_exists(conn, &input.category_id)? {
        return Err(TaskError::Validation("Choose an active category."));
    }
    check_conflict(
        conn,
        &input.local_date,
        input.start_minute,
        input.end_minute,
        None,
    )?;
    let id = id();
    let t = now();
    conn.execute(
        "INSERT INTO tasks VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)",
        params![
            id,
            input.local_date,
            input.start_minute,
            input.end_minute,
            input.title.trim(),
            input.description,
            input.category_id,
            p.as_str(),
            t
        ],
    )?;
    conn.query_row("SELECT id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at FROM tasks WHERE id=?1",params![id],row).map_err(Into::into)
}
pub fn update(conn: &Connection, input: UpdateTaskInput) -> Result<TaskView, TaskError> {
    let create = CreateTaskInput {
        title: input.title.clone(),
        description: input.description.clone(),
        local_date: input.local_date.clone(),
        start_minute: input.start_minute,
        end_minute: input.end_minute,
        category_id: input.category_id.clone(),
        priority: input.priority.clone(),
    };
    let p = validate(&create)?;
    if !category_exists(conn, &input.category_id)? {
        return Err(TaskError::Validation("Choose an active category."));
    }
    check_conflict(
        conn,
        &input.local_date,
        input.start_minute,
        input.end_minute,
        Some(&input.id),
    )?;
    let t = now();
    if conn.execute("UPDATE tasks SET local_date=?2,start_minute=?3,end_minute=?4,title=?5,description=?6,category_id=?7,priority=?8,updated_at=?9 WHERE id=?1",params![input.id,input.local_date,input.start_minute,input.end_minute,input.title.trim(),input.description,input.category_id,p.as_str(),t])?==0{return Err(TaskError::NotFound)}
    conn.query_row("SELECT id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at FROM tasks WHERE id=?1",params![input.id],row).map_err(Into::into)
}
pub fn delete(conn: &Connection, id: &str) -> Result<(), TaskError> {
    if conn.execute("DELETE FROM tasks WHERE id=?1", params![id])? == 0 {
        Err(TaskError::NotFound)
    } else {
        Ok(())
    }
}

#[allow(dead_code)]
fn next_day(date: &str) -> String {
    let (y, m, d) = (
        date[0..4].parse::<i32>().unwrap(),
        date[5..7].parse::<i32>().unwrap(),
        date[8..10].parse::<i32>().unwrap(),
    );
    let md = [
        31,
        if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) {
            29
        } else {
            28
        },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let (ny, nm, nd) = if d < md[(m - 1) as usize] {
        (y, m, d + 1)
    } else if m < 12 {
        (y, m + 1, 1)
    } else {
        (y + 1, 1, 1)
    };
    format!("{ny:04}-{nm:02}-{nd:02}")
}
pub fn create_recurring(
    conn: &Connection,
    input: crate::task::dto::CreateRecurringTaskInput,
) -> Result<String, TaskError> {
    if !validate_date(&input.local_date) || !validate_range(input.start_minute, input.end_minute) {
        return Err(TaskError::Validation("Invalid recurrence date or time."));
    }
    if input.interval < 1 || !matches!(input.frequency.as_str(), "daily" | "weekly" | "monthly") {
        return Err(TaskError::Validation("Unsupported recurrence rule."));
    }
    if !category_exists(conn, &input.category_id)? {
        return Err(TaskError::Validation("Choose an active category."));
    }
    let rule = match input.frequency.as_str() {
        "daily" => format!("FREQ=DAILY;INTERVAL={}", input.interval),
        "weekly" => format!(
            "FREQ=WEEKLY;INTERVAL={};BYDAY={}",
            input.interval,
            input
                .weekdays
                .iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(",")
        ),
        _ => format!("FREQ=MONTHLY;INTERVAL={}", input.interval),
    };
    let id = id();
    let t = now();
    conn.execute("INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",params![id,input.title.trim(),input.description,input.category_id,input.priority,input.start_minute,input.end_minute,input.local_date,"local",rule,t,t])?;
    Ok(id)
}
pub fn recurring_for_date(
    conn: &Connection,
    date: &str,
) -> Result<Vec<crate::task::dto::RecurringOccurrenceView>, TaskError> {
    let mut st=conn.prepare("SELECT id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,rrule FROM task_series WHERE archived_at IS NULL AND dtstart_local_date<=?1")?;
    let mut out = Vec::new();
    for r in st.query_map(params![date], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get(1)?,
            r.get(2)?,
            r.get(3)?,
            r.get(4)?,
            r.get(5)?,
            r.get(6)?,
            r.get::<_, String>(7)?,
            r.get::<_, String>(8)?,
        ))
    })? {
        let (id, title, desc, cat, pri, start, end, dt, rule) = r?;
        let daily = rule.starts_with("FREQ=DAILY");
        if daily || dt == date {
            out.push(crate::task::dto::RecurringOccurrenceView {
                occurrence_id: format!("{id}:{date}"),
                series_id: id,
                original_local_date: dt,
                local_date: date.to_string(),
                start_minute: start,
                end_minute: end,
                title,
                description: desc,
                category_id: cat,
                priority: pri,
                is_recurring: true,
                is_override: false,
            });
        }
    }
    Ok(out)
}
