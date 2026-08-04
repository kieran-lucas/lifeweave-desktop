use super::{
    conflict::overlaps,
    domain::{Priority, validate_date, validate_description, validate_range, validate_title},
    dto::{CreateTaskInput, TaskCategoryView, TaskLifeAreaView, TaskView, UpdateTaskInput},
};
use crate::tag::repository as tag_repo;
use rusqlite::{Connection, OptionalExtension, params};
use std::collections::HashMap;
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
fn map_tag_err(e: tag_repo::TagError) -> TaskError {
    match e {
        tag_repo::TagError::Validation(msg) => TaskError::Validation(msg),
        tag_repo::TagError::Db(e) => TaskError::Db(e),
        _ => TaskError::Validation("Invalid tags."),
    }
}
fn category_exists(conn: &Connection, id: &str) -> Result<bool, rusqlite::Error> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM task_categories WHERE id=?1 AND archived_at IS NULL)",
        params![id],
        |r| r.get(0),
    )
}
fn validate_life_target(conn: &Connection, id: Option<&str>) -> Result<(), TaskError> {
    let Some(id) = id else {
        return Ok(());
    };
    let valid: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND id!='life-root' AND archived_at IS NULL)",
        params![id], |r| r.get(0),
    )?;
    if valid {
        Ok(())
    } else {
        Err(TaskError::Validation(
            "Choose an active non-root Life area.",
        ))
    }
}
fn life_area(
    conn: &Connection,
    id: Option<String>,
) -> Result<Option<TaskLifeAreaView>, rusqlite::Error> {
    let Some(id) = id else {
        return Ok(None);
    };
    conn.query_row("WITH RECURSIVE path(id,parent_id,title,depth) AS (
        SELECT id,parent_id,title,0 FROM life_nodes WHERE id=?1
        UNION ALL SELECT n.id,n.parent_id,n.title,p.depth+1 FROM life_nodes n JOIN path p ON p.parent_id=n.id WHERE p.depth<128
      ) SELECT (SELECT title FROM life_nodes WHERE id=?1),
        (SELECT group_concat(title,' › ') FROM (SELECT title FROM path WHERE id!='life-root' ORDER BY depth DESC)),
        (SELECT archived_at IS NOT NULL FROM life_nodes WHERE id=?1)", params![id], |r| Ok(TaskLifeAreaView { id: id.clone(), title: r.get(0)?, breadcrumb: r.get(1)?, archived: r.get(2)? })
    ).optional()
}
pub(crate) fn life_area_map(
    conn: &Connection,
) -> Result<HashMap<String, TaskLifeAreaView>, rusqlite::Error> {
    let mut statement = conn.prepare(
        "WITH RECURSIVE paths(id,title,breadcrumb,archived) AS (
          SELECT id,title,'',archived_at IS NOT NULL FROM life_nodes WHERE id='life-root'
          UNION ALL
          SELECT n.id,n.title,CASE WHEN p.id='life-root' THEN n.title ELSE p.breadcrumb || ' › ' || n.title END,
                 n.archived_at IS NOT NULL
          FROM life_nodes n JOIN paths p ON n.parent_id=p.id
        ) SELECT id,title,breadcrumb,archived FROM paths WHERE id!='life-root'",
    )?;
    let rows = statement.query_map([], |r| {
        Ok(TaskLifeAreaView {
            id: r.get(0)?,
            title: r.get(1)?,
            breadcrumb: r.get(2)?,
            archived: r.get(3)?,
        })
    })?;
    let mut areas = HashMap::new();
    for area in rows {
        let area = area?;
        areas.insert(area.id.clone(), area);
    }
    Ok(areas)
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
    for occurrence in recurring_for_date(conn, date)? {
        if overlaps(start, end, occurrence.start_minute, occurrence.end_minute)
            && !(start == occurrence.start_minute && end == occurrence.end_minute)
        {
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
        life_area: None,
        tags: vec![],
    })
}
pub fn categories(conn: &Connection) -> Result<Vec<TaskCategoryView>, TaskError> {
    let mut st=conn.prepare("SELECT id,name,icon_key,color_key,weekly_minimum_minutes,weekly_target_minutes,goal_revision FROM task_categories WHERE archived_at IS NULL ORDER BY id")?;
    Ok(st
        .query_map([], |r| {
            Ok(TaskCategoryView {
                id: r.get(0)?,
                name: r.get::<_, String>(1)?,
                icon_key: r.get::<_, String>(2)?,
                color_key: r.get::<_, String>(3)?,
                weekly_minimum_minutes: r.get(4)?,
                weekly_target_minutes: r.get(5)?,
                goal_revision: r.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?)
}
pub fn related_for_life_node(
    conn: &Connection,
    node_id: &str,
    anchor_local_date: &str,
) -> Result<Vec<super::dto::RelatedTaskView>, TaskError> {
    if !validate_date(anchor_local_date) {
        return Err(TaskError::Validation("Enter a valid anchor date."));
    }
    if node_id == "life-root" {
        return Ok(Vec::new());
    }
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM life_nodes WHERE id=?1 AND archived_at IS NULL)",
        params![node_id],
        |r| r.get(0),
    )?;
    if !exists {
        return Err(TaskError::NotFound);
    }
    let mut result = Vec::new();
    let mut one_offs = conn.prepare(
        "SELECT id,title,local_date,CASE WHEN EXISTS(
           SELECT 1 FROM task_evaluations e
           WHERE e.subject_kind='one_off' AND e.task_id=tasks.id AND e.is_current=1
         ) THEN 'completed' ELSE 'active' END
         FROM tasks WHERE life_node_id=?1",
    )?;
    for row in one_offs.query_map(params![node_id], |row| {
        Ok(super::dto::RelatedTaskView {
            id: row.get(0)?,
            kind: super::dto::RelatedTaskKind::OneOff,
            title: row.get(1)?,
            group: row.get(3)?,
            navigation_local_date: row.get(2)?,
            series_id: None,
            tags: vec![],
        })
    })? {
        result.push(row?);
    }

    let mut series_statement = conn.prepare(
        "SELECT id,title,dtstart_local_date,rrule
         FROM task_series WHERE life_node_id=?1 AND archived_at IS NULL",
    )?;
    let series = series_statement
        .query_map(params![node_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })?
        .collect::<Result<Vec<_>, _>>()?;

    #[derive(Clone)]
    struct NavigationOverride {
        replacement_local_date: Option<String>,
        cancelled: bool,
    }
    let mut overrides: HashMap<(String, String), NavigationOverride> = HashMap::new();
    let mut moved_in: HashMap<String, Vec<(String, String)>> = HashMap::new();
    let mut override_statement = conn.prepare(
        "SELECT o.series_id,o.original_local_date,o.replacement_local_date,o.cancelled
         FROM task_occurrence_overrides o
         JOIN task_series s ON s.id=o.series_id
         WHERE s.life_node_id=?1 AND s.archived_at IS NULL",
    )?;
    for row in override_statement.query_map(params![node_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, i32>(3)? != 0,
        ))
    })? {
        let (series_id, original, replacement, cancelled) = row?;
        if !cancelled {
            if let Some(replacement_date) = replacement.as_ref() {
                if replacement_date.as_str() >= anchor_local_date {
                    moved_in
                        .entry(series_id.clone())
                        .or_default()
                        .push((original.clone(), replacement_date.clone()));
                }
            }
        }
        overrides.insert(
            (series_id, original),
            NavigationOverride {
                replacement_local_date: replacement,
                cancelled,
            },
        );
    }

    for (series_id, title, dtstart, rule) in series {
        let generated = crate::task::recurrence::occurrences_on_or_after(
            &dtstart,
            anchor_local_date,
            &rule,
            crate::task::recurrence::MAX_EXPANSION_OCCURRENCES,
        )?;
        let mut candidates: HashMap<String, String> = HashMap::new();
        for original in generated {
            match overrides.get(&(series_id.clone(), original.clone())) {
                Some(value) if value.cancelled => {}
                Some(value) => {
                    if let Some(replacement) = value.replacement_local_date.as_ref() {
                        if replacement.as_str() >= anchor_local_date {
                            candidates.insert(original, replacement.clone());
                        }
                    } else {
                        candidates.insert(original.clone(), original);
                    }
                }
                None => {
                    candidates.insert(original.clone(), original);
                }
            }
        }
        if let Some(authoritative) = moved_in.get(&series_id) {
            for (original, replacement) in authoritative {
                candidates.insert(original.clone(), replacement.clone());
            }
        }
        if let Some(navigation_local_date) = candidates.into_values().min() {
            result.push(super::dto::RelatedTaskView {
                id: series_id.clone(),
                kind: super::dto::RelatedTaskKind::Recurring,
                title,
                group: "active".into(),
                navigation_local_date,
                series_id: Some(series_id),
                tags: vec![],
            });
        }
    }

    let kind_rank = |kind: &super::dto::RelatedTaskKind| match kind {
        super::dto::RelatedTaskKind::OneOff => 0,
        super::dto::RelatedTaskKind::Recurring => 1,
    };
    result.sort_by(|left, right| {
        let left_group = if left.group == "active" { 0 } else { 1 };
        let right_group = if right.group == "active" { 0 } else { 1 };
        left_group
            .cmp(&right_group)
            .then_with(|| {
                if left_group == 0 {
                    left.navigation_local_date.cmp(&right.navigation_local_date)
                } else {
                    right.navigation_local_date.cmp(&left.navigation_local_date)
                }
            })
            .then_with(|| left.title.cmp(&right.title))
            .then_with(|| kind_rank(&left.kind).cmp(&kind_rank(&right.kind)))
            .then_with(|| left.id.cmp(&right.id))
    });
    let task_ids: Vec<String> = result
        .iter()
        .filter(|item| matches!(item.kind, super::dto::RelatedTaskKind::OneOff))
        .map(|item| item.id.clone())
        .collect();
    if !task_ids.is_empty() {
        let tag_map = tag_repo::batch_load_task_tags(conn, &task_ids).map_err(TaskError::Db)?;
        for item in &mut result {
            if matches!(item.kind, super::dto::RelatedTaskKind::OneOff) {
                if let Some(tags) = tag_map.get(&item.id) {
                    item.tags = tags.clone();
                }
            }
        }
    }
    let series_ids: Vec<String> = result
        .iter()
        .filter_map(|item| item.series_id.clone())
        .collect();
    if !series_ids.is_empty() {
        let tag_map = tag_repo::batch_load_series_tags(conn, &series_ids).map_err(TaskError::Db)?;
        for item in &mut result {
            if let Some(sid) = &item.series_id {
                if let Some(tags) = tag_map.get(sid) {
                    item.tags = tags.clone();
                }
            }
        }
    }
    Ok(result)
}
pub fn list(conn: &Connection, date: &str) -> Result<Vec<TaskView>, TaskError> {
    if !validate_date(date) {
        return Err(TaskError::Validation("Enter a valid date."));
    }
    let areas = life_area_map(conn)?;
    let mut st=conn.prepare("SELECT id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at,life_node_id FROM tasks WHERE local_date=?1 ORDER BY start_minute,end_minute,CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,created_at,id")?;
    let mut out = Vec::new();
    for item in st.query_map(params![date], |r| {
        Ok((row(r)?, r.get::<_, Option<String>>(10)?))
    })? {
        let (mut task, life) = item?;
        task.life_area = life.and_then(|id| areas.get(&id).cloned());
        out.push(task);
    }
    let ids: Vec<String> = out.iter().map(|t| t.id.clone()).collect();
    let tag_map = tag_repo::batch_load_task_tags(conn, &ids).map_err(TaskError::Db)?;
    for task in &mut out {
        if let Some(tags) = tag_map.get(&task.id) {
            task.tags = tags.clone();
        }
    }
    Ok(out)
}
pub fn create(conn: &Connection, input: CreateTaskInput) -> Result<TaskView, TaskError> {
    let p = validate(&input)?;
    if !category_exists(conn, &input.category_id)? {
        return Err(TaskError::Validation("Choose an active category."));
    }
    validate_life_target(conn, input.life_node_id.as_deref())?;
    check_conflict(
        conn,
        &input.local_date,
        input.start_minute,
        input.end_minute,
        None,
    )?;
    tag_repo::validate_active_tag_ids(conn, &input.tag_ids).map_err(map_tag_err)?;
    let id = id();
    let t = now();
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at,life_node_id) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9,?10)",
        params![
            id,
            input.local_date,
            input.start_minute,
            input.end_minute,
            input.title.trim(),
            input.description,
            input.category_id,
            p.as_str(),
            t,input.life_node_id
        ],
    )?;
    tag_repo::replace_active_task_tags(&tx, &id, &input.tag_ids, &t)?;
    let mut result=tx.query_row("SELECT id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at FROM tasks WHERE id=?1",params![id],row)?;
    result.life_area = life_area(&tx, input.life_node_id)?;
    let tag_map =
        tag_repo::batch_load_task_tags(&tx, std::slice::from_ref(&id)).map_err(TaskError::Db)?;
    result.tags = tag_map.get(&id).cloned().unwrap_or_default();
    crate::task::analytics::bump_source_revision(&tx)?;
    tx.commit()?;
    Ok(result)
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
        life_node_id: input.life_node_id.clone(),
        tag_ids: vec![],
    };
    let p = validate(&create)?;
    if !category_exists(conn, &input.category_id)? {
        return Err(TaskError::Validation("Choose an active category."));
    }
    let existing: Option<String> = conn
        .query_row(
            "SELECT life_node_id FROM tasks WHERE id=?1",
            params![input.id],
            |r| r.get(0),
        )
        .optional()?
        .flatten();
    if input.life_node_id != existing {
        validate_life_target(conn, input.life_node_id.as_deref())?;
    }
    check_conflict(
        conn,
        &input.local_date,
        input.start_minute,
        input.end_minute,
        Some(&input.id),
    )?;
    tag_repo::validate_active_tag_ids(conn, &input.tag_ids).map_err(map_tag_err)?;
    let t = now();
    let tx = conn.unchecked_transaction()?;
    if tx.execute("UPDATE tasks SET local_date=?2,start_minute=?3,end_minute=?4,title=?5,description=?6,category_id=?7,priority=?8,updated_at=?9,life_node_id=?10 WHERE id=?1",params![input.id,input.local_date,input.start_minute,input.end_minute,input.title.trim(),input.description,input.category_id,p.as_str(),t,input.life_node_id])?==0{return Err(TaskError::NotFound)}
    tag_repo::replace_active_task_tags(&tx, &input.id, &input.tag_ids, &t)?;
    let mut result=tx.query_row("SELECT id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at FROM tasks WHERE id=?1",params![input.id],row)?;
    result.life_area = life_area(&tx, input.life_node_id)?;
    let tag_map = tag_repo::batch_load_task_tags(&tx, std::slice::from_ref(&input.id))
        .map_err(TaskError::Db)?;
    result.tags = tag_map.get(&input.id).cloned().unwrap_or_default();
    crate::task::analytics::bump_source_revision(&tx)?;
    tx.commit()?;
    Ok(result)
}
pub fn delete(conn: &Connection, id: &str) -> Result<(), TaskError> {
    let tx = conn.unchecked_transaction()?;
    if tx.execute("DELETE FROM tasks WHERE id=?1", params![id])? == 0 {
        Err(TaskError::NotFound)
    } else {
        crate::task::analytics::bump_source_revision(&tx)?;
        tx.commit()?;
        Ok(())
    }
}

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
    conn: &mut Connection,
    input: crate::task::dto::CreateRecurringTaskInput,
) -> Result<String, TaskError> {
    let base = CreateTaskInput {
        title: input.title.clone(),
        description: input.description.clone(),
        local_date: input.local_date.clone(),
        start_minute: input.start_minute,
        end_minute: input.end_minute,
        category_id: input.category_id.clone(),
        priority: input.priority.clone(),
        life_node_id: input.life_node_id.clone(),
        tag_ids: vec![],
    };
    let priority = validate(&base)?;
    if !validate_date(&input.local_date) || !validate_range(input.start_minute, input.end_minute) {
        return Err(TaskError::Validation("Invalid recurrence date or time."));
    }
    let rule = build_rule(
        &input.frequency,
        input.interval,
        &input.weekdays,
        input.until.as_deref(),
        input.count,
    )?;
    tag_repo::validate_active_tag_ids(conn, &input.tag_ids).map_err(map_tag_err)?;
    let tx = conn.transaction()?;
    if !category_exists(&tx, &input.category_id)? {
        return Err(TaskError::Validation("Choose an active category."));
    }
    validate_life_target(&tx, input.life_node_id.as_deref())?;
    validate_series_conflicts(
        &tx,
        None,
        &input.local_date,
        &rule,
        input.start_minute,
        input.end_minute,
    )?;
    let id = id();
    let t = now();
    tx.execute("INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at,life_node_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",params![id,input.title.trim(),input.description,input.category_id,priority.as_str(),input.start_minute,input.end_minute,input.local_date,"local",rule,t,t,input.life_node_id])?;
    tag_repo::replace_active_series_tags(&tx, &id, &input.tag_ids, &t)?;
    crate::task::analytics::bump_source_revision(&tx)?;
    tx.commit()?;
    Ok(id)
}

fn build_rule(
    frequency: &str,
    interval: i32,
    weekdays: &[i32],
    until: Option<&str>,
    count: Option<i32>,
) -> Result<String, TaskError> {
    if !(1..=366).contains(&interval) || !matches!(frequency, "daily" | "weekly" | "monthly") {
        return Err(TaskError::Validation("Unsupported recurrence rule."));
    }
    if frequency == "weekly"
        && (weekdays.is_empty() || weekdays.iter().any(|d| !(0..=6).contains(d)))
    {
        return Err(TaskError::Validation("Choose at least one valid weekday."));
    }
    if until.is_some() && count.is_some() {
        return Err(TaskError::Validation("Choose count or until, not both."));
    }
    if until.is_some_and(|d| !validate_date(d)) {
        return Err(TaskError::Validation("Enter a valid recurrence end date."));
    }
    if count.is_some_and(|c| !(1..=1000).contains(&c)) {
        return Err(TaskError::Validation(
            "Occurrence count must be between 1 and 1000.",
        ));
    }
    let mut rule = format!(
        "FREQ={};INTERVAL={}",
        frequency.to_ascii_uppercase(),
        interval
    );
    if frequency == "weekly" {
        rule.push_str(";BYDAY=");
        rule.push_str(
            &weekdays
                .iter()
                .map(|weekday| match weekday {
                    0 => "MO",
                    1 => "TU",
                    2 => "WE",
                    3 => "TH",
                    4 => "FR",
                    5 => "SA",
                    _ => "SU",
                })
                .collect::<Vec<_>>()
                .join(","),
        );
    }
    if let Some(v) = until {
        rule.push_str(";UNTIL=");
        rule.push_str(v);
    }
    if let Some(v) = count {
        rule.push_str(&format!(";COUNT={v}"));
    }
    Ok(rule)
}
pub fn recurring_for_date(
    conn: &Connection,
    date: &str,
) -> Result<Vec<crate::task::dto::RecurringOccurrenceView>, TaskError> {
    let areas = life_area_map(conn)?;
    let mut st=conn.prepare("SELECT id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,rrule,life_node_id FROM task_series WHERE archived_at IS NULL AND dtstart_local_date<=?1")?;
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
            r.get::<_, Option<String>>(9)?,
        ))
    })? {
        let (id, title, desc, cat, pri, start, end, dt, rule, life_node_id) = r?;
        let occurs = occurrence_matches(&dt, date, &rule)?;
        let occurrence_override=conn.query_row("SELECT original_local_date,replacement_local_date,title_override,description_override,category_id_override,priority_override,start_minute_override,end_minute_override,cancelled FROM task_occurrence_overrides WHERE series_id=?1 AND original_local_date=?2",params![id,date],|x|Ok((x.get::<_,String>(0)?,x.get::<_,Option<String>>(1)?,x.get::<_,Option<String>>(2)?,x.get::<_,Option<String>>(3)?,x.get::<_,Option<String>>(4)?,x.get::<_,Option<String>>(5)?,x.get::<_,Option<i32>>(6)?,x.get::<_,Option<i32>>(7)?,x.get::<_,i32>(8)?))).optional()?;
        // Overrides are explicit RFC-style occurrence authority. After a series
        // split they remain projectable even when the new master rule no longer
        // generates their original date.
        if occurs || occurrence_override.is_some() {
            let mut original = date.to_string();
            let mut replacement = date.to_string();
            let mut title2 = title.clone();
            let mut desc2 = desc.clone();
            let mut start2 = start;
            let mut end2 = end;
            let mut pri2 = pri.clone();
            let mut cat2 = cat.clone();
            let mut cancelled = false;
            if let Some(o) = occurrence_override {
                original = o.0;
                if let Some(rp) = o.1 {
                    replacement = rp
                };
                if let Some(v) = o.2 {
                    title2 = v
                };
                if let Some(v) = o.3 {
                    desc2 = v
                };
                if let Some(v) = o.4 {
                    cat2 = v
                };
                if let Some(v) = o.5 {
                    pri2 = v
                };
                if let Some(v) = o.6 {
                    start2 = v
                };
                if let Some(v) = o.7 {
                    end2 = v
                };
                cancelled = o.8 != 0;
            }
            if cancelled || replacement != date {
                continue;
            }
            let is_override = original != date
                || title2 != title
                || desc2 != desc
                || start2 != start
                || end2 != end
                || pri2 != pri
                || cat2 != cat;
            out.push(crate::task::dto::RecurringOccurrenceView {
                occurrence_id: format!("{id}:{original}"),
                series_id: id.clone(),
                original_local_date: original,
                local_date: date.to_string(),
                start_minute: start2,
                end_minute: end2,
                title: title2,
                description: desc2,
                category_id: cat2,
                priority: pri2,
                is_recurring: true,
                is_override,
                life_area: life_node_id.and_then(|id| areas.get(&id).cloned()),
                tags: vec![],
            });
        }
    }
    // Include occurrences moved into this displayed date, even when their original
    // recurrence date is earlier; identity remains series + original date.
    let mut moved = conn.prepare("SELECT s.id,s.title,s.description,s.category_id,s.priority,s.start_minute,s.end_minute,o.original_local_date,o.title_override,o.description_override,o.category_id_override,o.priority_override,o.start_minute_override,o.end_minute_override,s.life_node_id FROM task_series s JOIN task_occurrence_overrides o ON o.series_id=s.id WHERE s.archived_at IS NULL AND o.replacement_local_date=?1 AND o.original_local_date<>?1 AND o.cancelled=0")?;
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
            r.get::<_, Option<String>>(14)?,
        ))
    })? {
        let (sid, title, desc, cat, pri, start, end, orig, to, do_, co, po, so, eo, life_node_id) =
            r?;
        out.push(crate::task::dto::RecurringOccurrenceView {
            occurrence_id: format!("{sid}:{orig}"),
            series_id: sid.clone(),
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
            life_area: life_node_id.and_then(|id| areas.get(&id).cloned()),
            tags: vec![],
        });
    }
    let series_ids: Vec<String> = out.iter().map(|o| o.series_id.clone()).collect();
    let tag_map = tag_repo::batch_load_series_tags(conn, &series_ids).map_err(TaskError::Db)?;
    for occurrence in &mut out {
        if let Some(tags) = tag_map.get(&occurrence.series_id) {
            occurrence.tags = tags.clone();
        }
    }
    Ok(out)
}

pub fn today_items(
    conn: &Connection,
    date: &str,
) -> Result<Vec<crate::task::dto::TodayItemView>, TaskError> {
    let mut out = Vec::new();
    let (one_off_evaluations, recurring_evaluations) =
        crate::task::evaluation::current_for_date(conn, date)?;
    let areas = life_area_map(conn)?;
    let mut stmt=conn.prepare("SELECT t.id,t.local_date,t.start_minute,t.end_minute,t.title,t.description,t.category_id,c.name,c.icon_key,c.color_key,t.priority,t.life_node_id FROM tasks t JOIN task_categories c ON c.id=t.category_id WHERE t.local_date=?1")?;
    for row in stmt.query_map(params![date], |r| {
        Ok((
            crate::task::dto::TodayItemView {
                kind: crate::task::dto::TodayItemKind::OneOff,
                id: r.get(0)?,
                occurrence_id: None,
                series_id: None,
                original_local_date: None,
                local_date: r.get(1)?,
                start_minute: r.get(2)?,
                end_minute: r.get(3)?,
                title: r.get(4)?,
                description: r.get(5)?,
                category_id: r.get(6)?,
                category_name: r.get(7)?,
                category_icon_key: r.get(8)?,
                category_color_key: r.get(9)?,
                priority: r.get(10)?,
                is_override: false,
                evaluation: None,
                life_area: None,
                tags: vec![],
            },
            r.get::<_, Option<String>>(11)?,
        ))
    })? {
        let (mut item, life_node_id) = row?;
        item.evaluation = one_off_evaluations.get(&item.id).cloned();
        item.life_area = life_node_id.and_then(|id| areas.get(&id).cloned());
        out.push(item);
    }
    for occurrence in recurring_for_date(conn, date)? {
        let (name, icon, color): (String, String, String) = conn.query_row(
            "SELECT name,icon_key,color_key FROM task_categories WHERE id=?1",
            params![occurrence.category_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )?;
        let evaluation = recurring_evaluations
            .get(&(
                occurrence.series_id.clone(),
                occurrence.original_local_date.clone(),
            ))
            .cloned();
        out.push(crate::task::dto::TodayItemView {
            kind: crate::task::dto::TodayItemKind::Recurring,
            id: occurrence.occurrence_id.clone(),
            occurrence_id: Some(occurrence.occurrence_id),
            series_id: Some(occurrence.series_id),
            original_local_date: Some(occurrence.original_local_date),
            local_date: occurrence.local_date,
            start_minute: occurrence.start_minute,
            end_minute: occurrence.end_minute,
            title: occurrence.title,
            description: occurrence.description,
            category_id: occurrence.category_id,
            category_name: name,
            category_icon_key: icon,
            category_color_key: color,
            priority: occurrence.priority,
            is_override: occurrence.is_override,
            evaluation,
            life_area: occurrence.life_area,
            tags: occurrence.tags,
        });
    }
    let task_ids: Vec<String> = out
        .iter()
        .filter(|item| matches!(item.kind, crate::task::dto::TodayItemKind::OneOff))
        .map(|item| item.id.clone())
        .collect();
    if !task_ids.is_empty() {
        let tag_map = tag_repo::batch_load_task_tags(conn, &task_ids).map_err(TaskError::Db)?;
        for item in &mut out {
            if matches!(item.kind, crate::task::dto::TodayItemKind::OneOff) {
                if let Some(tags) = tag_map.get(&item.id) {
                    item.tags = tags.clone();
                }
            }
        }
    }
    out.sort_by_key(|x| {
        (
            x.start_minute,
            x.end_minute,
            match x.priority.as_str() {
                "high" => 0,
                "medium" => 1,
                _ => 2,
            },
            x.id.clone(),
        )
    });
    Ok(out)
}

pub fn update_recurring(
    conn: &mut Connection,
    input: crate::task::dto::UpdateRecurringOccurrenceInput,
) -> Result<(), TaskError> {
    use crate::task::dto::OccurrenceEditScope;
    let tx = conn.transaction()?;
    let master:(String,String,String,String,i32,i32,String,String,Option<String>)=tx.query_row("SELECT title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,rrule,life_node_id FROM task_series WHERE id=?1 AND archived_at IS NULL",params![input.series_id],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?,r.get(6)?,r.get(7)?,r.get(8)?))).map_err(|e|if matches!(e,rusqlite::Error::QueryReturnedNoRows){TaskError::NotFound}else{TaskError::Db(e)})?;
    if input.life_node_id != master.8 {
        validate_life_target(&tx, input.life_node_id.as_deref())?;
    }
    if !occurrence_matches(&master.6, &input.original_local_date, &master.7)? {
        return Err(TaskError::Validation(
            "Occurrence does not belong to this series.",
        ));
    }
    let target_date = input
        .replacement_local_date
        .as_deref()
        .unwrap_or(&input.original_local_date);
    let target_start = input.start_minute.unwrap_or(master.4);
    let target_end = input.end_minute.unwrap_or(master.5);
    if !input.cancelled {
        if !validate_date(target_date) || !validate_range(target_start, target_end) {
            return Err(TaskError::Validation("Invalid occurrence date or time."));
        }
        ensure_no_conflict(
            &tx,
            target_date,
            target_start,
            target_end,
            Some((&input.series_id, &input.original_local_date)),
        )?;
    }
    // series_tag_ids is only meaningful for EntireSeries non-cancel edits.
    match input.scope {
        OccurrenceEditScope::OnlyThisOccurrence | OccurrenceEditScope::ThisAndFuture => {
            if input.series_tag_ids.is_some() {
                return Err(TaskError::Validation(
                    "series_tag_ids must be None for this scope",
                ));
            }
        }
        OccurrenceEditScope::EntireSeries => {
            if !input.cancelled && input.series_tag_ids.is_none() {
                return Err(TaskError::Validation(
                    "series_tag_ids is required for EntireSeries scope",
                ));
            }
        }
    }

    match input.scope {
        OccurrenceEditScope::OnlyThisOccurrence => {
            if input.life_node_id != master.8 {
                return Err(TaskError::Validation(
                    "Change the Life area for the entire series.",
                ));
            }
            tx.execute("INSERT INTO task_occurrence_overrides(id,series_id,original_local_date,replacement_local_date,title_override,description_override,category_id_override,priority_override,start_minute_override,end_minute_override,cancelled,created_at,updated_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?12) ON CONFLICT(series_id,original_local_date) DO UPDATE SET replacement_local_date=excluded.replacement_local_date,title_override=excluded.title_override,description_override=excluded.description_override,category_id_override=excluded.category_id_override,priority_override=excluded.priority_override,start_minute_override=excluded.start_minute_override,end_minute_override=excluded.end_minute_override,cancelled=excluded.cancelled,updated_at=excluded.updated_at",params![id(),input.series_id,input.original_local_date,input.replacement_local_date,input.title,input.description,input.category_id,input.priority,input.start_minute,input.end_minute,if input.cancelled{1}else{0},now()])?;
        }
        OccurrenceEditScope::EntireSeries => {
            if input.cancelled {
                tx.execute(
                    "UPDATE task_series SET archived_at=?2,updated_at=?2 WHERE id=?1",
                    params![input.series_id, now()],
                )?;
            } else {
                let rule = updated_rule(&master.7, &input)?;
                validate_series_conflicts(
                    &tx,
                    Some(&input.series_id),
                    &master.6,
                    &rule,
                    target_start,
                    target_end,
                )?;
                tx.execute("UPDATE task_series SET title=COALESCE(?2,title),description=COALESCE(?3,description),category_id=COALESCE(?4,category_id),priority=COALESCE(?5,priority),start_minute=COALESCE(?6,start_minute),end_minute=COALESCE(?7,end_minute),rrule=?8,updated_at=?9,life_node_id=?10 WHERE id=?1",params![input.series_id,input.title,input.description,input.category_id,input.priority,input.start_minute,input.end_minute,rule,now(),input.life_node_id])?;
                if let Some(tag_ids) = &input.series_tag_ids {
                    tag_repo::validate_active_tag_ids(&tx, tag_ids).map_err(map_tag_err)?;
                    tag_repo::replace_active_series_tags(&tx, &input.series_id, tag_ids, &now())?;
                }
            }
        }
        OccurrenceEditScope::ThisAndFuture => {
            let old_rule = truncate_rule(&master.7, &previous_day(&input.original_local_date));
            tx.execute(
                "UPDATE task_series SET rrule=?2,updated_at=?3 WHERE id=?1",
                params![input.series_id, old_rule, now()],
            )?;
            if !input.cancelled {
                let new_id = id();
                let new_rule = updated_rule(&master.7, &input)?;
                validate_series_conflicts(
                    &tx,
                    Some(&input.series_id),
                    target_date,
                    &new_rule,
                    target_start,
                    target_end,
                )?;
                tx.execute("INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at,life_node_id) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,'local',?9,?10,?10,?11)",params![new_id,input.title.unwrap_or(master.0),input.description.unwrap_or(master.1),input.category_id.unwrap_or(master.2),input.priority.unwrap_or(master.3),target_start,target_end,target_date,new_rule,now(),input.life_node_id])?;
                tag_repo::copy_all_series_tags(&tx, &input.series_id, &new_id, &now())?;
                tx.execute("UPDATE task_occurrence_overrides SET series_id=?1 WHERE series_id=?2 AND original_local_date>=?3",params![new_id,input.series_id,input.original_local_date])?;
            }
        }
    }
    crate::task::analytics::bump_source_revision(&tx)?;
    tx.commit()?;
    Ok(())
}

const CONFLICT_HORIZON_DAYS: usize = 366;

fn validate_series_conflicts(
    conn: &Connection,
    exclude_series: Option<&str>,
    dtstart: &str,
    rule: &str,
    start: i32,
    end: i32,
) -> Result<(), TaskError> {
    let mut date = dtstart.to_string();
    for _ in 0..=CONFLICT_HORIZON_DAYS {
        if occurrence_matches(dtstart, &date, rule)? {
            for task in list(conn, &date)? {
                if overlaps(start, end, task.start_minute, task.end_minute)
                    && !(start == task.start_minute && end == task.end_minute)
                {
                    return Err(TaskError::Conflict);
                }
            }
            for occurrence in recurring_for_date(conn, &date)? {
                if exclude_series.is_some_and(|series| occurrence.series_id == series) {
                    continue;
                }
                if overlaps(start, end, occurrence.start_minute, occurrence.end_minute)
                    && !(start == occurrence.start_minute && end == occurrence.end_minute)
                {
                    return Err(TaskError::Conflict);
                }
            }
        }
        date = next_day(&date);
    }
    Ok(())
}

fn ensure_no_conflict(
    conn: &Connection,
    date: &str,
    start: i32,
    end: i32,
    exclude: Option<(&str, &str)>,
) -> Result<(), TaskError> {
    for task in list(conn, date)? {
        if overlaps(start, end, task.start_minute, task.end_minute)
            && !(start == task.start_minute && end == task.end_minute)
        {
            return Err(TaskError::Conflict);
        }
    }
    for item in recurring_for_date(conn, date)? {
        if exclude.is_some_and(|(s, o)| item.series_id == s && item.original_local_date == o) {
            continue;
        }
        if overlaps(start, end, item.start_minute, item.end_minute)
            && !(start == item.start_minute && end == item.end_minute)
        {
            return Err(TaskError::Conflict);
        }
    }
    Ok(())
}
fn updated_rule(
    old: &str,
    input: &crate::task::dto::UpdateRecurringOccurrenceInput,
) -> Result<String, TaskError> {
    if let Some(f) = input.frequency.as_deref() {
        build_rule(
            f,
            input.interval.unwrap_or(1),
            input.weekdays.as_deref().unwrap_or(&[]),
            input.until.as_deref(),
            input.count,
        )
    } else {
        Ok(old.to_string())
    }
}
fn truncate_rule(rule: &str, until: &str) -> String {
    let mut result = rule
        .split(';')
        .filter(|p| !p.starts_with("UNTIL=") && !p.starts_with("COUNT="))
        .collect::<Vec<_>>()
        .join(";");
    result.push_str(";UNTIL=");
    result.push_str(until);
    result
}
fn previous_day(date: &str) -> String {
    let (y, m, d) = ymd(date);
    if d > 1 {
        return format!("{y:04}-{m:02}-{:02}", d - 1);
    }
    let (pm, py) = if m == 1 { (12, y - 1) } else { (m - 1, y) };
    let days = match pm {
        2 if py % 4 == 0 && (py % 100 != 0 || py % 400 == 0) => 29,
        2 => 28,
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    };
    format!("{py:04}-{pm:02}-{days:02}")
}

fn occurrence_matches(start: &str, date: &str, rule: &str) -> Result<bool, TaskError> {
    crate::task::recurrence::occurs_on(start, date, rule)
}
fn ymd(s: &str) -> (i32, i32, i32) {
    (
        s[0..4].parse().unwrap_or(0),
        s[5..7].parse().unwrap_or(0),
        s[8..10].parse().unwrap_or(0),
    )
}
#[cfg(test)]
mod recurrence_tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, migrations::run_migrations,
    };
    use crate::task::dto::{
        CreateRecurringTaskInput, OccurrenceEditScope, UpdateRecurringOccurrenceInput,
    };
    fn db() -> Connection {
        let mut c = open_memory_connection().unwrap();
        run_migrations(&mut c).unwrap();
        c
    }
    fn recurring(date: &str) -> CreateRecurringTaskInput {
        CreateRecurringTaskInput {
            title: "Series".into(),
            description: "".into(),
            local_date: date.into(),
            start_minute: 480,
            end_minute: 540,
            category_id: "general".into(),
            priority: "medium".into(),
            frequency: "daily".into(),
            interval: 1,
            weekdays: vec![],
            until: None,
            count: None,
            life_node_id: None,
            tag_ids: vec![],
        }
    }
    fn mutation(
        series: &str,
        date: &str,
        scope: OccurrenceEditScope,
        cancelled: bool,
    ) -> UpdateRecurringOccurrenceInput {
        // EntireSeries non-cancel edits must provide series_tag_ids (even empty).
        let series_tag_ids = if scope == OccurrenceEditScope::EntireSeries && !cancelled {
            Some(vec![])
        } else {
            None
        };
        UpdateRecurringOccurrenceInput {
            series_id: series.into(),
            original_local_date: date.into(),
            replacement_local_date: None,
            title: None,
            description: None,
            category_id: None,
            priority: None,
            start_minute: None,
            end_minute: None,
            scope,
            cancelled,
            frequency: None,
            interval: None,
            weekdays: None,
            until: None,
            count: None,
            life_node_id: None,
            series_tag_ids,
        }
    }
    #[test]
    fn daily_interval_count_and_until() {
        assert!(occurrence_matches("2026-01-01", "2026-01-03", "FREQ=DAILY;INTERVAL=2").unwrap());
        assert!(!occurrence_matches("2026-01-01", "2026-01-02", "FREQ=DAILY;INTERVAL=2").unwrap());
        assert!(!occurrence_matches("2026-01-01", "2026-01-03", "FREQ=DAILY;COUNT=2").unwrap());
        assert!(
            !occurrence_matches("2026-01-01", "2026-01-04", "FREQ=DAILY;UNTIL=2026-01-03").unwrap()
        );
    }
    #[test]
    fn weekly_and_monthly_rules() {
        assert!(
            occurrence_matches(
                "2026-01-01",
                "2026-01-08",
                "FREQ=WEEKLY;INTERVAL=1;BYDAY=TH"
            )
            .unwrap()
        );
        assert!(occurrence_matches("2026-01-15", "2026-02-15", "FREQ=MONTHLY;INTERVAL=1").unwrap());
        assert!(
            !occurrence_matches("2026-01-15", "2026-02-16", "FREQ=MONTHLY;INTERVAL=1").unwrap()
        );
    }
    #[test]
    fn moved_override_projects_only_on_replacement_date() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        let mut m = mutation(
            &sid,
            "2026-08-02",
            OccurrenceEditScope::OnlyThisOccurrence,
            false,
        );
        m.replacement_local_date = Some("2026-08-03".into());
        m.title = Some("Moved".into());
        update_recurring(&mut c, m).unwrap();
        assert!(recurring_for_date(&c, "2026-08-02").unwrap().is_empty());
        let items = recurring_for_date(&c, "2026-08-03").unwrap();
        assert_eq!(items.len(), 2);
        assert!(
            items
                .iter()
                .any(|x| x.original_local_date == "2026-08-02" && x.title == "Moved")
        );
    }
    #[test]
    fn only_this_cancel_preserves_other_occurrences() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        update_recurring(
            &mut c,
            mutation(
                &sid,
                "2026-08-02",
                OccurrenceEditScope::OnlyThisOccurrence,
                true,
            ),
        )
        .unwrap();
        assert!(recurring_for_date(&c, "2026-08-02").unwrap().is_empty());
        assert_eq!(recurring_for_date(&c, "2026-08-03").unwrap().len(), 1);
    }
    #[test]
    fn this_and_future_split_has_one_boundary_occurrence() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        let mut m = mutation(
            &sid,
            "2026-08-03",
            OccurrenceEditScope::ThisAndFuture,
            false,
        );
        m.title = Some("Future".into());
        update_recurring(&mut c, m).unwrap();
        assert_eq!(recurring_for_date(&c, "2026-08-02").unwrap().len(), 1);
        let boundary = recurring_for_date(&c, "2026-08-03").unwrap();
        assert_eq!(boundary.len(), 1);
        assert_eq!(boundary[0].title, "Future");
    }
    #[test]
    fn this_and_future_delete_terminates_without_archiving_history() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        update_recurring(
            &mut c,
            mutation(&sid, "2026-08-03", OccurrenceEditScope::ThisAndFuture, true),
        )
        .unwrap();
        assert_eq!(recurring_for_date(&c, "2026-08-02").unwrap().len(), 1);
        assert!(recurring_for_date(&c, "2026-08-03").unwrap().is_empty());
    }
    #[test]
    fn entire_series_update_and_archive() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        let mut edit = mutation(&sid, "2026-08-01", OccurrenceEditScope::EntireSeries, false);
        edit.title = Some("Renamed".into());
        update_recurring(&mut c, edit).unwrap();
        assert_eq!(
            recurring_for_date(&c, "2026-08-02").unwrap()[0].title,
            "Renamed"
        );
        update_recurring(
            &mut c,
            mutation(&sid, "2026-08-01", OccurrenceEditScope::EntireSeries, true),
        )
        .unwrap();
        assert!(recurring_for_date(&c, "2026-08-02").unwrap().is_empty());
    }
    #[test]
    fn conflict_rolls_back_override() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        create(
            &c,
            CreateTaskInput {
                title: "One".into(),
                description: "".into(),
                local_date: "2026-08-02".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "low".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let mut m = mutation(
            &sid,
            "2026-08-02",
            OccurrenceEditScope::OnlyThisOccurrence,
            false,
        );
        m.start_minute = Some(500);
        m.end_minute = Some(560);
        assert!(matches!(
            update_recurring(&mut c, m),
            Err(TaskError::Conflict)
        ));
        let count: i64 = c
            .query_row("SELECT COUNT(*) FROM task_occurrence_overrides", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn series_creation_checks_one_off_and_recurring_conflicts_atomically() {
        let mut c = db();
        create(
            &c,
            CreateTaskInput {
                title: "One".into(),
                description: "".into(),
                local_date: "2026-08-01".into(),
                start_minute: 510,
                end_minute: 570,
                category_id: "general".into(),
                priority: "low".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        assert!(matches!(
            create_recurring(&mut c, recurring("2026-08-01")),
            Err(TaskError::Conflict)
        ));
        delete(&c, &list(&c, "2026-08-01").unwrap()[0].id).unwrap();
        create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        assert!(matches!(
            create(
                &c,
                CreateTaskInput {
                    title: "One-off against series".into(),
                    description: "".into(),
                    local_date: "2026-08-02".into(),
                    start_minute: 500,
                    end_minute: 560,
                    category_id: "general".into(),
                    priority: "low".into(),
                    life_node_id: None,
                    tag_ids: vec![],
                },
            ),
            Err(TaskError::Conflict)
        ));
        let mut competing = recurring("2026-08-01");
        competing.start_minute = 500;
        competing.end_minute = 560;
        assert!(matches!(
            create_recurring(&mut c, competing),
            Err(TaskError::Conflict)
        ));
    }

    #[test]
    fn split_conflict_rolls_back_old_series_unchanged() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        create(
            &c,
            CreateTaskInput {
                title: "Conflict".into(),
                description: "".into(),
                local_date: "2026-08-03".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "low".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let mut edit = mutation(
            &sid,
            "2026-08-03",
            OccurrenceEditScope::ThisAndFuture,
            false,
        );
        edit.start_minute = Some(500);
        edit.end_minute = Some(560);
        assert!(matches!(
            update_recurring(&mut c, edit),
            Err(TaskError::Conflict)
        ));
        assert_eq!(recurring_for_date(&c, "2026-08-04").unwrap().len(), 1);
        let series_count: i64 = c
            .query_row("SELECT COUNT(*) FROM task_series", [], |row| row.get(0))
            .unwrap();
        assert_eq!(series_count, 1);
    }

    #[test]
    fn split_transfers_future_override_as_explicit_occurrence() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        let mut future = mutation(
            &sid,
            "2026-08-04",
            OccurrenceEditScope::OnlyThisOccurrence,
            false,
        );
        future.title = Some("Preserved override".into());
        update_recurring(&mut c, future).unwrap();
        let mut split = mutation(
            &sid,
            "2026-08-03",
            OccurrenceEditScope::ThisAndFuture,
            false,
        );
        split.frequency = Some("weekly".into());
        split.interval = Some(1);
        split.weekdays = Some(vec![0]);
        update_recurring(&mut c, split).unwrap();
        let projected = recurring_for_date(&c, "2026-08-04").unwrap();
        assert_eq!(projected.len(), 1);
        assert_eq!(projected[0].title, "Preserved override");
    }

    #[test]
    fn entire_series_conflict_rolls_back_master_update() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        create(
            &c,
            CreateTaskInput {
                title: "Conflict".into(),
                description: "".into(),
                local_date: "2026-08-05".into(),
                start_minute: 480,
                end_minute: 540,
                category_id: "general".into(),
                priority: "low".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let mut edit = mutation(&sid, "2026-08-01", OccurrenceEditScope::EntireSeries, false);
        edit.title = Some("Should roll back".into());
        edit.start_minute = Some(500);
        edit.end_minute = Some(560);
        assert!(matches!(
            update_recurring(&mut c, edit),
            Err(TaskError::Conflict)
        ));
        assert_eq!(
            recurring_for_date(&c, "2026-08-02").unwrap()[0].title,
            "Series"
        );
    }

    #[test]
    fn task09_file_smoke_reopens_weekly_override_cancel_and_split_without_duplicates() {
        use crate::infrastructure::sqlite::connection::open_file_connection;
        let directory = std::env::temp_dir().join(format!("lifeweave-task09-{}", id()));
        std::fs::create_dir(&directory).unwrap();
        let database = directory.join("lifeweave.db");
        {
            let mut c = open_file_connection(&database).unwrap();
            run_migrations(&mut c).unwrap();
            let mut weekly = recurring("2026-08-03");
            weekly.frequency = "weekly".into();
            weekly.interval = 2;
            weekly.weekdays = vec![0];
            weekly.count = Some(8);
            let sid = create_recurring(&mut c, weekly).unwrap();

            let mut moved = mutation(
                &sid,
                "2026-08-17",
                OccurrenceEditScope::OnlyThisOccurrence,
                false,
            );
            moved.replacement_local_date = Some("2026-08-18".into());
            moved.title = Some("Moved occurrence".into());
            update_recurring(&mut c, moved).unwrap();
            update_recurring(
                &mut c,
                mutation(
                    &sid,
                    "2026-08-31",
                    OccurrenceEditScope::OnlyThisOccurrence,
                    true,
                ),
            )
            .unwrap();
            let mut split = mutation(
                &sid,
                "2026-09-14",
                OccurrenceEditScope::ThisAndFuture,
                false,
            );
            split.title = Some("Split future".into());
            update_recurring(&mut c, split).unwrap();
        }
        {
            let c = open_file_connection(&database).unwrap();
            assert!(recurring_for_date(&c, "2026-08-17").unwrap().is_empty());
            assert_eq!(recurring_for_date(&c, "2026-08-18").unwrap().len(), 1);
            assert!(recurring_for_date(&c, "2026-08-31").unwrap().is_empty());
            let boundary = recurring_for_date(&c, "2026-09-14").unwrap();
            assert_eq!(boundary.len(), 1);
            assert_eq!(boundary[0].title, "Split future");
        }
        for suffix in ["", "-wal", "-shm"] {
            let path = if suffix.is_empty() {
                database.clone()
            } else {
                directory.join(format!("lifeweave.db{suffix}"))
            };
            if path.exists() {
                std::fs::remove_file(path).unwrap();
            }
        }
        std::fs::remove_dir(directory).unwrap();
    }

    #[test]
    fn task_life_relationships_validate_preserve_and_project() {
        use crate::task::dto::{CreateTaskInput, UpdateTaskInput};
        let mut c = db();
        c.execute("INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision) VALUES('study','life-root','Study','','life-branch','neutral',1,NULL,'0','0',0),('university','study','University','','life-leaf','neutral',1,NULL,'0','0',0),('archived-area','life-root','Archived','','life-leaf','neutral',2,'1','0','0',0)", []).unwrap();
        let one_off = create(
            &c,
            CreateTaskInput {
                title: "Essay".into(),
                description: "".into(),
                local_date: "2026-08-04".into(),
                start_minute: 600,
                end_minute: 660,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: Some("university".into()),
                tag_ids: vec![],
            },
        )
        .unwrap();
        assert_eq!(
            one_off.life_area.as_ref().unwrap().breadcrumb,
            "Study › University"
        );
        assert!(matches!(
            create(
                &c,
                CreateTaskInput {
                    title: "Root".into(),
                    description: "".into(),
                    local_date: "2026-08-04".into(),
                    start_minute: 700,
                    end_minute: 760,
                    category_id: "general".into(),
                    priority: "medium".into(),
                    life_node_id: Some("life-root".into()),
                    tag_ids: vec![],
                }
            ),
            Err(TaskError::Validation(_))
        ));
        assert!(matches!(
            create(
                &c,
                CreateTaskInput {
                    title: "Unknown".into(),
                    description: "".into(),
                    local_date: "2026-08-04".into(),
                    start_minute: 700,
                    end_minute: 760,
                    category_id: "general".into(),
                    priority: "medium".into(),
                    life_node_id: Some("missing".into()),
                    tag_ids: vec![],
                }
            ),
            Err(TaskError::Validation(_))
        ));
        assert!(matches!(
            create(
                &c,
                CreateTaskInput {
                    title: "Archived".into(),
                    description: "".into(),
                    local_date: "2026-08-04".into(),
                    start_minute: 700,
                    end_minute: 760,
                    category_id: "general".into(),
                    priority: "medium".into(),
                    life_node_id: Some("archived-area".into()),
                    tag_ids: vec![],
                }
            ),
            Err(TaskError::Validation(_))
        ));
        c.execute(
            "UPDATE life_nodes SET archived_at='1' WHERE id='university'",
            [],
        )
        .unwrap();
        let preserved = update(
            &c,
            UpdateTaskInput {
                id: one_off.id.clone(),
                title: "Essay revised".into(),
                description: "".into(),
                local_date: "2026-08-04".into(),
                start_minute: 600,
                end_minute: 660,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: Some("university".into()),
                tag_ids: vec![],
            },
        )
        .unwrap();
        assert!(preserved.life_area.unwrap().archived);
        let unlinked = update(
            &c,
            UpdateTaskInput {
                id: one_off.id,
                title: "Essay revised".into(),
                description: "".into(),
                local_date: "2026-08-04".into(),
                start_minute: 600,
                end_minute: 660,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        assert!(unlinked.life_area.is_none());
        c.execute(
            "UPDATE life_nodes SET archived_at=NULL WHERE id='university'",
            [],
        )
        .unwrap();
        let mut series_input = recurring("2026-08-05");
        series_input.life_node_id = Some("university".into());
        let series = create_recurring(&mut c, series_input).unwrap();
        assert_eq!(
            recurring_for_date(&c, "2026-08-05").unwrap()[0]
                .life_area
                .as_ref()
                .unwrap()
                .id,
            "university"
        );
        let mut series_edit = mutation(
            &series,
            "2026-08-05",
            OccurrenceEditScope::EntireSeries,
            false,
        );
        series_edit.life_node_id = Some("study".into());
        update_recurring(&mut c, series_edit).unwrap();
        assert_eq!(
            recurring_for_date(&c, "2026-08-06").unwrap()[0]
                .life_area
                .as_ref()
                .unwrap()
                .id,
            "study"
        );
        let related = related_for_life_node(&c, "study", "2026-08-04").unwrap();
        assert_eq!(
            related
                .iter()
                .filter(|row| row.series_id.as_deref() == Some(&series))
                .count(),
            1
        );
    }

    fn seed_related_area(conn: &Connection) {
        conn.execute(
            "INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision)
             VALUES('related-area','life-root','Related','','life-leaf','neutral',1,NULL,'0','0',0),
                   ('related-archived','life-root','Archived','','life-leaf','neutral',2,'1','0','0',0)",
            [],
        )
        .unwrap();
    }

    fn insert_related_series(
        conn: &Connection,
        series_id: &str,
        title: &str,
        start: &str,
        rule: &str,
        archived: bool,
    ) {
        conn.execute(
            "INSERT INTO task_series(id,title,description,category_id,priority,start_minute,end_minute,dtstart_local_date,timezone_id,rrule,created_at,updated_at,archived_at,life_node_id)
             VALUES(?1,?2,'','general','medium',480,540,?3,'local',?4,'0','0',?5,'related-area')",
            params![series_id, title, start, rule, archived.then_some("1")],
        )
        .unwrap();
    }

    fn insert_related_override(
        conn: &Connection,
        override_id: &str,
        series_id: &str,
        original: &str,
        replacement: Option<&str>,
        cancelled: bool,
    ) {
        conn.execute(
            "INSERT INTO task_occurrence_overrides(id,series_id,original_local_date,replacement_local_date,cancelled,created_at,updated_at)
             VALUES(?1,?2,?3,?4,?5,'0','0')",
            params![override_id, series_id, original, replacement, i32::from(cancelled)],
        )
        .unwrap();
    }

    #[test]
    fn related_navigation_projects_one_off_groups_and_recurring_dates() {
        let c = db();
        seed_related_area(&c);
        let active = create(
            &c,
            CreateTaskInput {
                title: "Active one-off".into(),
                description: "".into(),
                local_date: "2026-08-09".into(),
                start_minute: 600,
                end_minute: 660,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: Some("related-area".into()),
                tag_ids: vec![],
            },
        )
        .unwrap();
        let completed = create(
            &c,
            CreateTaskInput {
                title: "Completed one-off".into(),
                description: "".into(),
                local_date: "2026-08-02".into(),
                start_minute: 700,
                end_minute: 760,
                category_id: "general".into(),
                priority: "medium".into(),
                life_node_id: Some("related-area".into()),
                tag_ids: vec![],
            },
        )
        .unwrap();
        c.execute(
            "INSERT INTO task_evaluations(id,subject_kind,task_id,series_id,original_local_date,state_id,state_label_snapshot,state_value_bp_snapshot,state_visual_snapshot,evaluated_at,operation_id,supersedes_evaluation_id,is_current)
             VALUES('eval-related','one_off',?1,NULL,NULL,'completion-met','Met expectation',7500,'met','0','op-related',NULL,1)",
            params![completed.id],
        )
        .unwrap();
        insert_related_series(
            &c,
            "series-first",
            "First",
            "2026-08-07",
            "FREQ=DAILY;COUNT=3",
            false,
        );
        insert_related_series(
            &c,
            "series-interval",
            "Interval",
            "2026-08-05",
            "FREQ=DAILY;INTERVAL=3",
            false,
        );

        let rows = related_for_life_node(&c, "related-area", "2026-08-06").unwrap();
        let active_row = rows.iter().find(|row| row.id == active.id).unwrap();
        assert_eq!(active_row.navigation_local_date, "2026-08-09");
        assert_eq!(active_row.group, "active");
        assert!(active_row.series_id.is_none());
        let completed_row = rows.iter().find(|row| row.id == completed.id).unwrap();
        assert_eq!(completed_row.navigation_local_date, "2026-08-02");
        assert_eq!(completed_row.group, "completed");
        assert_eq!(
            rows.iter()
                .find(|row| row.id == "series-first")
                .unwrap()
                .navigation_local_date,
            "2026-08-07"
        );
        let interval = rows.iter().find(|row| row.id == "series-interval").unwrap();
        assert_eq!(interval.navigation_local_date, "2026-08-08");
        assert_eq!(interval.series_id.as_deref(), Some("series-interval"));
        assert_eq!(rows.last().unwrap().group, "completed");
    }

    #[test]
    fn related_navigation_respects_cancelled_and_moved_overrides() {
        let c = db();
        seed_related_area(&c);
        insert_related_series(
            &c,
            "series-cancel",
            "Cancelled first",
            "2026-08-05",
            "FREQ=DAILY;COUNT=3",
            false,
        );
        insert_related_override(
            &c,
            "override-cancel",
            "series-cancel",
            "2026-08-05",
            None,
            true,
        );
        insert_related_series(
            &c,
            "series-moved-later",
            "Moved later",
            "2026-08-05",
            "FREQ=DAILY;COUNT=1",
            false,
        );
        insert_related_override(
            &c,
            "override-later",
            "series-moved-later",
            "2026-08-05",
            Some("2026-08-10"),
            false,
        );
        insert_related_series(
            &c,
            "series-moved-out",
            "Moved before",
            "2026-08-05",
            "FREQ=DAILY;COUNT=1",
            false,
        );
        insert_related_override(
            &c,
            "override-out",
            "series-moved-out",
            "2026-08-05",
            Some("2026-08-03"),
            false,
        );
        insert_related_series(
            &c,
            "series-moved-in",
            "Moved in",
            "2026-08-01",
            "FREQ=DAILY;COUNT=1",
            false,
        );
        insert_related_override(
            &c,
            "override-in",
            "series-moved-in",
            "2026-08-01",
            Some("2026-08-09"),
            false,
        );

        let rows = related_for_life_node(&c, "related-area", "2026-08-05").unwrap();
        assert_eq!(
            rows.iter()
                .find(|row| row.id == "series-cancel")
                .unwrap()
                .navigation_local_date,
            "2026-08-06"
        );
        assert_eq!(
            rows.iter()
                .find(|row| row.id == "series-moved-later")
                .unwrap()
                .navigation_local_date,
            "2026-08-10"
        );
        assert!(rows.iter().all(|row| row.id != "series-moved-out"));
        assert_eq!(
            rows.iter()
                .find(|row| row.id == "series-moved-in")
                .unwrap()
                .navigation_local_date,
            "2026-08-09"
        );
    }

    #[test]
    fn related_navigation_omits_ended_and_archived_and_validates_inputs() {
        let c = db();
        seed_related_area(&c);
        insert_related_series(
            &c,
            "ended",
            "Ended",
            "2026-08-01",
            "FREQ=DAILY;COUNT=2",
            false,
        );
        insert_related_series(&c, "archived", "Archived", "2026-08-06", "FREQ=DAILY", true);
        assert!(
            related_for_life_node(&c, "related-area", "2026-08-05")
                .unwrap()
                .is_empty()
        );
        assert!(
            related_for_life_node(&c, "life-root", "2026-08-05")
                .unwrap()
                .is_empty()
        );
        assert!(matches!(
            related_for_life_node(&c, "missing", "2026-08-05"),
            Err(TaskError::NotFound)
        ));
        assert!(matches!(
            related_for_life_node(&c, "related-archived", "2026-08-05"),
            Err(TaskError::NotFound)
        ));
        assert!(matches!(
            related_for_life_node(&c, "related-area", "not-a-date"),
            Err(TaskError::Validation(_))
        ));
        let occurrence_columns: i64 = c
            .query_row(
                "SELECT COUNT(*) FROM pragma_table_info('task_occurrence_overrides') WHERE name='life_node_id'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        let schema: u32 = c
            .query_row("SELECT MAX(version) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(occurrence_columns, 0);
        assert_eq!(schema, 18);
    }

    #[test]
    fn related_navigation_sorts_multiple_series_deterministically() {
        let c = db();
        seed_related_area(&c);
        insert_related_series(&c, "z-series", "Beta", "2026-08-06", "FREQ=DAILY", false);
        insert_related_series(&c, "b-series", "Alpha", "2026-08-06", "FREQ=DAILY", false);
        insert_related_series(&c, "a-series", "Alpha", "2026-08-06", "FREQ=DAILY", false);
        let ids = related_for_life_node(&c, "related-area", "2026-08-06")
            .unwrap()
            .into_iter()
            .map(|row| row.id)
            .collect::<Vec<_>>();
        assert_eq!(ids, ["a-series", "b-series", "z-series"]);
    }

    #[test]
    fn scope_only_this_occurrence_rejects_series_tag_ids() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        let mut m = mutation(
            &sid,
            "2026-08-02",
            OccurrenceEditScope::OnlyThisOccurrence,
            false,
        );
        m.series_tag_ids = Some(vec![]);
        assert!(matches!(
            update_recurring(&mut c, m),
            Err(TaskError::Validation(_))
        ));
    }

    #[test]
    fn scope_this_and_future_rejects_series_tag_ids() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        let mut m = mutation(
            &sid,
            "2026-08-02",
            OccurrenceEditScope::ThisAndFuture,
            false,
        );
        m.series_tag_ids = Some(vec![]);
        assert!(matches!(
            update_recurring(&mut c, m),
            Err(TaskError::Validation(_))
        ));
    }

    #[test]
    fn scope_entire_series_accepts_series_tag_ids() {
        let mut c = db();
        let sid = create_recurring(&mut c, recurring("2026-08-01")).unwrap();
        let m = mutation(&sid, "2026-08-01", OccurrenceEditScope::EntireSeries, false);
        assert!(update_recurring(&mut c, m).is_ok());
    }
}
