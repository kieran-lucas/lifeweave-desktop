use super::{domain::NarrativeError, dto::*, markdown, repository};
use crate::{
    document::domain::MAX_MARKDOWN_BYTES,
    infrastructure::sqlite::{DbError, runtime::DatabaseRuntime},
    ipc::error::IpcError,
};
use tauri::State;

fn map_db(e: DbError) -> IpcError {
    match e {
        DbError::Maintenance => IpcError::Validation {
            message: "Database is busy; try again.".into(),
        },
        DbError::SchemaTooNew { .. }
        | DbError::PragmaAssertion { .. }
        | DbError::InvalidMigrationList => IpcError::Corruption,
        _ => IpcError::Storage,
    }
}

fn map(e: NarrativeError) -> IpcError {
    match e {
        NarrativeError::Validation(message) => IpcError::Validation {
            message: message.into(),
        },
        NarrativeError::NotFound => IpcError::NotFound,
        NarrativeError::Stale => IpcError::StaleRevision,
        NarrativeError::Conflict => IpcError::Validation {
            message: "The recoverable draft is based on an older document revision.".into(),
        },
        NarrativeError::Db(_) => IpcError::Storage,
    }
}

macro_rules! run {
    ($state:expr,$body:expr) => {{
        $state
            .execute(move |c| Ok($body(c)))
            .map_err(map_db)?
            .map_err(map)
    }};
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn get_narrative_document(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeNodeInput,
) -> Result<NarrativeDocumentProjection, IpcError> {
    run!(state, |c| repository::get(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn create_narrative_document(
    state: State<'_, DatabaseRuntime>,
    input: CreateNarrativeDocumentInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::create(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_narrative_document(
    state: State<'_, DatabaseRuntime>,
    input: SaveNarrativeDocumentInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::save(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn save_narrative_draft(
    state: State<'_, DatabaseRuntime>,
    input: SaveNarrativeDraftInput,
) -> Result<NarrativeDocumentProjection, IpcError> {
    run!(state, |c| repository::save_draft(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn discard_narrative_draft(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeDocumentProjection, IpcError> {
    run!(state, |c| repository::discard_draft(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn recover_narrative_draft(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::recover_draft(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(input))]
pub fn preview_narrative_markdown(
    input: PreviewNarrativeMarkdownInput,
) -> Result<NarrativeMarkdownPreview, IpcError> {
    if input.markdown.len() > MAX_MARKDOWN_BYTES {
        return Err(IpcError::Validation {
            message: "Markdown is too large.".into(),
        });
    }
    let proposed_title = input
        .markdown
        .lines()
        .find_map(|line| {
            line.strip_prefix("# ")
                .map(str::trim)
                .filter(|t| !t.is_empty())
                .map(str::to_owned)
        })
        .unwrap_or_else(|| markdown::sanitize_file_stem(&input.original_name));
    let top_level_node_count: i32 = {
        let mut count = 0i32;
        let mut in_code = false;
        let mut prev_blank = true;
        for line in input.markdown.lines() {
            if line.starts_with("```") {
                in_code = !in_code;
                if prev_blank {
                    count += 1;
                    prev_blank = false;
                }
                continue;
            }
            if in_code {
                continue;
            }
            let blank = line.trim().is_empty();
            if !blank && prev_blank {
                count += 1;
            }
            prev_blank = blank;
        }
        count
    };
    let referenced_asset_count = input
        .markdown
        .lines()
        .filter(|l| l.contains("](assets/"))
        .count() as i32;
    let plain_text_excerpt: String = {
        let mut raw = String::new();
        for line in input.markdown.lines() {
            if line.starts_with('#') || line.starts_with("```") || line.trim().is_empty() {
                continue;
            }
            let stripped = line
                .trim_start_matches(|c: char| {
                    c == '>' || c == '-' || c == '*' || c.is_ascii_digit() || c == '.' || c == ' '
                })
                .trim();
            if !stripped.is_empty() {
                if !raw.is_empty() {
                    raw.push(' ');
                }
                raw.push_str(stripped);
            }
            if raw.len() > 300 {
                break;
            }
        }
        raw.chars().take(240).collect()
    };
    let mut warnings = vec![
        "Import creates one rich_text block. Block types, layout, and metadata are not preserved."
            .to_owned(),
    ];
    if referenced_asset_count > 0 {
        warnings
            .push("This document references local assets that will not be included.".to_owned());
    }
    Ok(NarrativeMarkdownPreview {
        proposed_title,
        plain_text_excerpt,
        top_level_node_count,
        referenced_asset_count,
        warnings,
    })
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn import_narrative_markdown(
    state: State<'_, DatabaseRuntime>,
    input: ImportNarrativeMarkdownInput,
) -> Result<NarrativeDocumentView, IpcError> {
    run!(state, |c| repository::import_from_markdown(c, input))
}

#[tauri::command]
#[tracing::instrument(skip(state, input))]
pub fn export_narrative_markdown(
    state: State<'_, DatabaseRuntime>,
    input: NarrativeDocumentIdInput,
) -> Result<NarrativeMarkdownExport, IpcError> {
    run!(state, |c| repository::export_to_markdown(c, input))
}
