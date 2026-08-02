use super::{
    conflict::overlaps,
    domain::{Priority, validate_date, validate_description, validate_range, validate_title},
    dto::{CreateTaskInput, TaskCategoryView, TaskView, UpdateTaskInput},
};
use rusqlite::{Connection, OptionalExtension, params};
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
        local_date: r.get::<_, String>(1)?,
        start_minute: r.get(2)?,
        end_minute: r.get(3)?,
        title: r.get::<_, String>(4)?,
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
                name: r.get::<_, String>(1)?,
                icon_key: r.get::<_, String>(2)?,
                color_key: r.get::<_, String>(3)?,
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
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, String>(4)?,
            r.get(5)?,
            r.get(6)?,
            r.get::<_, String>(7)?,
            r.get::<_, String>(8)?,
        ))
    })? {
        let (id, title, desc, cat, pri, start, end, dt, rule) = r?;
        let occurs = occurrence_matches(&dt, date, &rule);
        if occurs {
            let mut original = dt.clone();
            let mut replacement = date.to_string();
            let mut title2 = title.clone();
            let mut desc2 = desc.clone();
            let mut start2 = start;
            let mut end2 = end;
            let mut pri2 = pri.clone();
            let mut cat2 = cat.clone();
            let mut cancelled = false;
            if let Some(o)=conn.query_row("SELECT original_local_date,replacement_local_date,title_override,description_override,category_id_override,priority_override,start_minute_override,end_minute_override,cancelled FROM task_occurrence_overrides WHERE series_id=?1 AND original_local_date=?2",params![id,date],|x|Ok((x.get::<_,String>(0)?,x.get::<_,Option<String>>(1)?,x.get::<_,Option<String>>(2)?,x.get::<_,Option<String>>(3)?,x.get::<_,Option<String>>(4)?,x.get::<_,Option<String>>(5)?,x.get::<_,Option<i32>>(6)?,x.get::<_,Option<i32>>(7)?,x.get::<_,i32>(8)?))).optional()? { original=o.0; if let Some(rp)=o.1{replacement=rp}; if let Some(v)=o.2{title2=v}; if let Some(v)=o.3{desc2=v}; if let Some(v)=o.4{cat2=v}; if let Some(v)=o.5{pri2=v}; if let Some(v)=o.6{start2=v}; if let Some(v)=o.7{end2=v}; cancelled=o.8!=0; }
            if cancelled || replacement != date {
                continue;
            }
            out.push(crate::task::dto::RecurringOccurrenceView {
                occurrence_id: format!("{id}:{original}"),
                series_id: id,
                original_local_date: original,
                local_date: date.to_string(),
                start_minute: start2,
                end_minute: end2,
                title: title2,
                description: desc2,
                category_id: cat2,
                priority: pri2,
                is_recurring: true,
                is_override: false,
            });
        }
    }
    // Include occurrences moved into this displayed date, even when their original
    // recurrence date is earlier; identity remains series + original date.
    let mut moved = conn.prepare("SELECT s.id,s.title,s.description,s.category_id,s.priority,s.start_minute,s.end_minute,o.original_local_date,o.title_override,o.description_override,o.category_id_override,o.priority_override,o.start_minute_override,o.end_minute_override FROM task_series s JOIN task_occurrence_overrides o ON o.series_id=s.id WHERE s.archived_at IS NULL AND o.replacement_local_date=?1 AND o.cancelled=0")?;
    for r in moved.query_map(params![date], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, String>(4)?,
            r.get::<_, i32>(5)?,
            r.get::<_, i32>(6)?,
            r.get::<_, String>(7)?,
            r.get::<_, Option<String>>(8)?,
            r.get::<_, Option<String>>(9)?,
            r.get::<_, Option<String>>(10)?,
            r.get::<_, Option<String>>(11)?,
            r.get::<_, Option<i32>>(12)?,
            r.get::<_, Option<i32>>(13)?,
        ))
    })? {
        let (sid, title, desc, cat, pri, start, end, orig, to, do_, co, po, so, eo) = r?;
        out.push(crate::task::dto::RecurringOccurrenceView {
            occurrence_id: format!("{sid}:{orig}"),
            series_id: sid,
            original_local_date: orig,
            local_date: date.to_string(),
            start_minute: so.unwrap_or(start),
            end_minute: eo.unwrap_or(end),
            title: to.unwrap_or(title),
            description: do_.unwrap_or(desc),
            category_id: co.unwrap_or(cat),
            priority: po.unwrap_or(pri),
            is_recurring: true,
            is_override: true,
        });
    }
    Ok(out)
}

pub fn update_recurring(
    conn: &Connection,
    input: crate::task::dto::UpdateRecurringOccurrenceInput,
) -> Result<(), TaskError> {
    use crate::task::dto::OccurrenceEditScope;
    let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM task_series WHERE id=?1",
        params![input.series_id],
        |r| r.get(0),
    )?;
    if exists == 0 {
        return Err(TaskError::NotFound);
    }
    match input.scope {
        OccurrenceEditScope::OnlyThisOccurrence => {
            conn.execute("INSERT INTO task_occurrence_overrides(id,series_id,original_local_date,replacement_local_date,title_override,description_override,category_id_override,priority_override,start_minute_override,end_minute_override,cancelled,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?12) ON CONFLICT(series_id,original_local_date) DO UPDATE SET replacement_local_date=excluded.replacement_local_date,title_override=excluded.title_override,description_override=excluded.description_override,category_id_override=excluded.category_id_override,priority_override=excluded.priority_override,start_minute_override=excluded.start_minute_override,end_minute_override=excluded.end_minute_override,cancelled=excluded.cancelled,updated_at=excluded.updated_at",params![id(),input.series_id,input.original_local_date,input.replacement_local_date,input.title,input.description,input.category_id,input.priority,input.start_minute,input.end_minute,if input.cancelled{1}else{0},now()])?;
            Ok(())
        }
        OccurrenceEditScope::EntireSeries => {
            conn.execute("UPDATE task_series SET title=COALESCE(?2,title),description=COALESCE(?3,description),category_id=COALESCE(?4,category_id),priority=COALESCE(?5,priority),start_minute=COALESCE(?6,start_minute),end_minute=COALESCE(?7,end_minute),updated_at=?8 WHERE id=?1",params![input.series_id,input.title,input.description,input.category_id,input.priority,input.start_minute,input.end_minute,now()])?;
            Ok(())
        }
        OccurrenceEditScope::ThisAndFuture => {
            conn.execute(
                "UPDATE task_series SET archived_at=?2,updated_at=?2 WHERE id=?1",
                params![input.series_id, now()],
            )?;
            Ok(())
        }
    }
}

fn occurrence_matches(start: &str, date: &str, rule: &str) -> bool {
    if date < start {
        return false;
    }
    let diff = day_number(date) - day_number(start);
    let mut freq = "DAILY";
    let mut interval = 1i64;
    let mut byday: Vec<i64> = Vec::new();
    let mut count = None;
    let mut until = None;
    for p in rule.split(';') {
        let mut z = p.splitn(2, '=');
        let k = z.next().unwrap_or("");
        let v = z.next().unwrap_or("");
        match k {
            "FREQ" => freq = v,
            "INTERVAL" => interval = v.parse().unwrap_or(1),
            "BYDAY" => byday = v.split(',').filter_map(|x| x.parse().ok()).collect(),
            "COUNT" => count = v.parse().ok(),
            "UNTIL" => until = Some(v),
            _ => {}
        }
    }
    if until.is_some_and(|u| date > u) {
        return false;
    }
    let hit = match freq {
        "DAILY" => diff % interval == 0,
        "WEEKLY" => {
            let weeks = diff / 7;
            weeks % interval == 0 && (byday.is_empty() || byday.contains(&weekday(date)))
        }
        "MONTHLY" => {
            let (sy, sm, _) = ymd(start);
            let (y, m, _) = ymd(date);
            let months = (y - sy) as i64 * 12 + (m - sm) as i64;
            months % interval == 0 && date[8..10] == start[8..10]
        }
        _ => false,
    };
    if !hit {
        return false;
    }
    count.is_none_or(|c: i32| {
        let n = match freq {
            "DAILY" => diff,
            "WEEKLY" => diff / 7,
            "MONTHLY" => {
                let (sy, sm, _) = ymd(start);
                let (y, m, _) = ymd(date);
                ((y - sy) * 12 + (m - sm)) as i64
            }
            _ => 0,
        };
        n < c as i64
    })
}
fn ymd(s: &str) -> (i32, i32, i32) {
    (
        s[0..4].parse().unwrap_or(0),
        s[5..7].parse().unwrap_or(0),
        s[8..10].parse().unwrap_or(0),
    )
}
fn day_number(s: &str) -> i64 {
    let (y, m, d) = ymd(s);
    let y2 = y - (m <= 2) as i32;
    let era = (if y2 >= 0 { y2 } else { y2 - 399 }) / 400;
    let yoe = y2 - era * 400;
    let mp = m + if m > 2 { -3 } else { 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era as i64 * 146097 + doe as i64
}
fn weekday(s: &str) -> i64 {
    (day_number(s) + 3).rem_euclid(7)
}

#[cfg(test)]
mod recurrence_tests {
    use super::*;
    #[test]
    fn daily_interval_count_and_until() {
        assert!(occurrence_matches(
            "2026-01-01",
            "2026-01-03",
            "FREQ=DAILY;INTERVAL=2"
        ));
        assert!(!occurrence_matches(
            "2026-01-01",
            "2026-01-02",
            "FREQ=DAILY;INTERVAL=2"
        ));
        assert!(!occurrence_matches(
            "2026-01-01",
            "2026-01-03",
            "FREQ=DAILY;COUNT=2"
        ));
        assert!(!occurrence_matches(
            "2026-01-01",
            "2026-01-04",
            "FREQ=DAILY;UNTIL=2026-01-03"
        ));
    }
    #[test]
    fn weekly_and_monthly_rules() {
        assert!(occurrence_matches(
            "2026-01-01",
            "2026-01-08",
            "FREQ=WEEKLY;INTERVAL=1;BYDAY=4"
        ));
        assert!(occurrence_matches(
            "2026-01-15",
            "2026-02-15",
            "FREQ=MONTHLY;INTERVAL=1"
        ));
        assert!(!occurrence_matches(
            "2026-01-15",
            "2026-02-16",
            "FREQ=MONTHLY;INTERVAL=1"
        ));
    }
    #[test]
    fn date_arithmetic_is_stable_at_leap_boundary() {
        assert!(day_number("2024-03-01") - day_number("2024-02-29") == 1);
    }
}
