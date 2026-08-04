#!/usr/bin/env python3
"""Validate the deterministic Lifeweave operational state ledger."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path, PurePosixPath
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FIELDS = {
    "format_version", "repository", "branch", "latest_closed_task",
    "latest_closed_slice", "latest_feature_task", "latest_feature_checkpoint",
    "database_schema_version", "active_spec", "next_action",
    "forbidden_feature_jump", "recommended_next_candidate", "source_sha256",
}
CHECKPOINT = re.compile(r"^[0-9a-f]{40}$")
SNAKE_CASE = re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$")


def _is_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _safe_spec(value: str) -> bool:
    path = PurePosixPath(value)
    return (
        value.startswith("specs/")
        and "\\" not in value
        and not path.is_absolute()
        and all(part not in ("", ".", "..") for part in path.parts)
    )


def _next_action_label(value: str) -> str:
    return {
        "product_owner_gate": "Product Owner gate",
        "implement_active_spec": "Implement active spec",
    }.get(value, value)


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    try:
        ledger = json.loads((root / "docs/PROJECT_STATE.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        return ["create docs/PROJECT_STATE.json"]
    except (OSError, json.JSONDecodeError) as exc:
        return [f"make docs/PROJECT_STATE.json valid UTF-8 JSON: {exc}"]
    if not isinstance(ledger, dict):
        return ["make docs/PROJECT_STATE.json a JSON object"]

    unknown = sorted(set(ledger) - FIELDS)
    missing = sorted(FIELDS - set(ledger))
    errors.extend(f"remove unknown PROJECT_STATE field: {field}" for field in unknown)
    errors.extend(f"add missing PROJECT_STATE field: {field}" for field in missing)
    if unknown or missing:
        return errors

    expected_types = {
        "format_version": _is_int,
        "repository": lambda value: isinstance(value, str),
        "branch": lambda value: isinstance(value, str),
        "latest_closed_task": _is_int,
        "latest_closed_slice": _is_int,
        "latest_feature_task": _is_int,
        "latest_feature_checkpoint": lambda value: isinstance(value, str),
        "database_schema_version": _is_int,
        "active_spec": lambda value: value is None or isinstance(value, str),
        "next_action": lambda value: isinstance(value, str),
        "forbidden_feature_jump": lambda value: isinstance(value, bool),
        "recommended_next_candidate": lambda value: value is None or isinstance(value, str),
        "source_sha256": lambda value: isinstance(value, str),
    }
    invalid_types = [key for key, check in expected_types.items() if not check(ledger[key])]
    if invalid_types:
        return [f"correct PROJECT_STATE field type: {field}" for field in invalid_types]

    checks = [
        (ledger["format_version"] == 2, "set format_version to 2"),
        (ledger["repository"] == "kieran-lucas/lifeweave-desktop", "set repository to kieran-lucas/lifeweave-desktop"),
        (ledger["branch"] == "main", "set branch to main"),
        (ledger["latest_feature_task"] <= ledger["latest_closed_task"], "make latest_feature_task less than or equal to latest_closed_task"),
        (ledger["latest_closed_slice"] >= 0, "make latest_closed_slice non-negative"),
        (CHECKPOINT.fullmatch(ledger["latest_feature_checkpoint"]) is not None, "set latest_feature_checkpoint to a lowercase 40-character hexadecimal commit"),
        (ledger["next_action"] in {"product_owner_gate", "implement_active_spec"}, "set next_action to an allowed value"),
        (ledger["forbidden_feature_jump"] is True, "set forbidden_feature_jump to true"),
        (ledger["recommended_next_candidate"] is None or SNAKE_CASE.fullmatch(ledger["recommended_next_candidate"]) is not None, "set recommended_next_candidate to null or safe snake_case"),
    ]
    errors.extend(message for valid, message in checks if not valid)

    active_spec = ledger["active_spec"]
    if active_spec is None:
        if ledger["next_action"] != "product_owner_gate":
            errors.append("set next_action to product_owner_gate when active_spec is null")
    else:
        if not _safe_spec(active_spec):
            errors.append("set active_spec to a safe relative specs/... path")
        elif not (root / PurePosixPath(active_spec)).is_dir():
            errors.append(f"create active specification directory: {active_spec}")
        if ledger["next_action"] != "implement_active_spec":
            errors.append("set next_action to implement_active_spec when active_spec is non-null")

    try:
        manifest = json.loads((root / "docs/source-of-truth/SOURCE_MANIFEST.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        errors.append(f"make SOURCE_MANIFEST.json readable valid JSON: {exc}")
    else:
        if ledger["source_sha256"] != manifest.get("sha256"):
            errors.append("set source_sha256 to SOURCE_MANIFEST.json sha256")

    try:
        migrations = (root / "src-tauri/src/infrastructure/sqlite/migrations.rs").read_text(encoding="utf-8")
        versions = [int(value) for value in re.findall(r"Migration\s*\{\s*version:\s*(\d+)", migrations)]
    except OSError as exc:
        errors.append(f"make migrations.rs readable: {exc}")
    else:
        if not versions:
            errors.append("declare at least one released Migration version in migrations.rs")
        elif max(versions) != ledger["database_schema_version"]:
            errors.append(f"set database_schema_version to highest released migration {max(versions)}")

    try:
        status = (root / "docs/STATUS.md").read_text(encoding="utf-8")
        first_task = re.search(r"^## Task (\d+)(?:/60)?\b", status, re.MULTILINE)
        expected = str(ledger["latest_closed_task"] + (1 if active_spec is not None else 0))
        if first_task is None or first_task.group(1) != expected:
            errors.append(f"place the Task {expected} STATUS section before every older Task section")
    except OSError as exc:
        errors.append(f"make docs/STATUS.md readable: {exc}")

    slice_markers = [f"Slice {ledger['latest_closed_slice']:03d}"]
    if active_spec is not None:
        match = re.search(r"specs/(\d{3})-", active_spec)
        if match:
            slice_markers.append(f"Slice {match.group(1)}")
    try:
        roadmap = (root / "docs/ROADMAP.md").read_text(encoding="utf-8")
        for slice_marker in dict.fromkeys(slice_markers):
            if slice_marker not in roadmap:
                errors.append(f"add {slice_marker} to docs/ROADMAP.md")
    except OSError as exc:
        errors.append(f"make docs/ROADMAP.md readable: {exc}")

    markers = (
        f"Latest closed task: **{ledger['latest_closed_task']}/60**",
        f"Database schema: **{ledger['database_schema_version']}**",
        f"Next action: **{_next_action_label(ledger['next_action'])}**",
    )
    try:
        start_here = (root / "START_HERE.md").read_text(encoding="utf-8")
        for marker in markers:
            if marker not in start_here:
                errors.append(f"add exact START_HERE marker: {marker}")
    except OSError as exc:
        errors.append(f"make START_HERE.md readable: {exc}")
    return errors


def main() -> int:
    errors = validate(ROOT)
    if errors:
        for error in errors:
            print(f"project state verification failed: {error}", file=sys.stderr)
        return 1
    print("project state verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
