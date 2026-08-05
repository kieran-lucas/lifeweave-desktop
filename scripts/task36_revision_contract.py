from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_exact(relative: str, old: str, new: str, expected: int = 1) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise SystemExit(
            f"{relative}: expected {expected} occurrences of {old!r}, found {count}"
        )
    path.write_text(text.replace(old, new), encoding="utf-8", newline="\n")


DTO = "src-tauri/src/focus_plan/dto.rs"
REPOSITORY = "src-tauri/src/focus_plan/repository.rs"

replace_exact(DTO, "pub base_revision: u64,", "pub base_revision: u32,", expected=2)
replace_exact(DTO, "pub expected_revision: u64,", "pub expected_revision: u32,")
replace_exact(DTO, "pub revision: u64,", "pub revision: u32,", expected=4)

replace_exact(REPOSITORY, "revision: u64::from(revision),", "revision,", expected=2)
replace_exact(REPOSITORY, "revision: u64::from(plan.10),", "revision: plan.10,")
replace_exact(
    REPOSITORY,
    "revision: u64::from(row.get::<_, u32>(0)?),",
    "revision: row.get(0)?,",
    expected=2,
)
replace_exact(
    REPOSITORY,
    "base_revision: u64::from(row.get::<_, u32>(0)?),",
    "base_revision: row.get(0)?,",
)
replace_exact(
    REPOSITORY,
    "revision: u64::from(row.get::<_, u32>(1)?),",
    "revision: row.get(1)?,",
)
replace_exact(
    REPOSITORY,
    """    let expected_revision = u32::try_from(input.expected_revision).map_err(|_| {
        FocusPlanError::Validation("Focus Plan revision exceeds the supported range".into())
    })?;
""",
    "    let expected_revision = input.expected_revision;\n",
)
replace_exact(
    REPOSITORY,
    """    let base_revision = u32::try_from(input.base_revision).map_err(|_| {
        FocusPlanError::Validation("Focus Plan revision exceeds the supported range".into())
    })?;
""",
    "    let base_revision = input.base_revision;\n",
)
