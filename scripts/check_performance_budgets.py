#!/usr/bin/env python3
"""Check the production JavaScript bundle against the Task 41 performance budget v2.

The Task 16 budget tracked four metrics against sixteen emitted chunks and could be satisfied
while most shipped JavaScript went unmeasured. Budget v2 tracks every chunk of consequence under
an identity that survives a rebuild, so a regression cannot hide behind a new content hash, a
renamed chunk, or an aggregate that absorbs it.

Standard library only, by contract.
"""
from __future__ import annotations

import argparse
import gzip
import io
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BUDGET = ROOT / "docs" / "audits" / "task-44-performance-budgets.json"
DEFAULT_ASSETS = ROOT / "frontend" / "dist" / "assets"

BUDGET_VERSION = 2
# Rolldown emits `<name>-<contenthash>.js`. Only the terminal hash segment is stripped, so
# `index-vNoPa-NR.js` normalizes to `index.js` while a genuinely different chunk keeps its name.
HASHED_NAME = re.compile(r"^(?P<stem>.+)-(?P<hash>[A-Za-z0-9_-]{8,})\.js$")
REQUIRED_AGGREGATES = ("main_js_bytes", "total_js_bytes", "total_js_gzip_bytes")


class BudgetError(Exception):
    """A budget file, a build, or an observed size violated the contract."""


def normalize_chunk_name(file_name: str) -> str:
    """Map an emitted asset file name onto its hash-independent chunk identity."""
    match = HASHED_NAME.match(file_name)
    return f"{match.group('stem')}.js" if match else file_name


def gzip_size(payload: bytes) -> int:
    """Deterministic gzip size.

    `mtime=0` matters: gzip stamps the current time into its header by default, which would make
    the measured size and therefore the frozen budget depend on when the build ran.
    """
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode="wb", compresslevel=9, mtime=0) as handle:
        handle.write(payload)
    return len(buffer.getvalue())


def load_budget(path: Path) -> dict:
    """Read and structurally validate a budget file."""
    try:
        budget = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise BudgetError(f"budget file is missing: {path}") from exc
    except (OSError, json.JSONDecodeError) as exc:
        raise BudgetError(f"budget file is not readable valid JSON: {exc}") from exc

    if not isinstance(budget, dict):
        raise BudgetError("budget file must contain a JSON object")
    if budget.get("budget_version") != BUDGET_VERSION:
        raise BudgetError(
            f"budget_version must be {BUDGET_VERSION}, found {budget.get('budget_version')!r}"
        )

    threshold = budget.get("unknown_chunk_raw_bytes_threshold")
    if not isinstance(threshold, int) or isinstance(threshold, bool) or threshold <= 0:
        raise BudgetError("unknown_chunk_raw_bytes_threshold must be a positive integer")

    aggregates = budget.get("aggregates")
    if not isinstance(aggregates, dict):
        raise BudgetError("aggregates must be a JSON object")
    for metric in REQUIRED_AGGREGATES:
        entry = aggregates.get(metric)
        if not isinstance(entry, dict):
            raise BudgetError(f"aggregates.{metric} must be a JSON object")
        maximum = entry.get("maximum")
        if not isinstance(maximum, int) or isinstance(maximum, bool) or maximum < 0:
            raise BudgetError(f"aggregates.{metric}.maximum must be a non-negative integer")
    expected_count = aggregates.get("expected_chunk_count")
    if (
        not isinstance(expected_count, int)
        or isinstance(expected_count, bool)
        or expected_count <= 0
    ):
        raise BudgetError("aggregates.expected_chunk_count must be a positive integer")

    main_chunk = budget.get("main_chunk")
    if not isinstance(main_chunk, str) or not main_chunk:
        raise BudgetError("main_chunk must be a non-empty chunk identity")

    chunks = budget.get("chunks")
    if not isinstance(chunks, dict) or not chunks:
        raise BudgetError("chunks must be a non-empty JSON object")
    for name, entry in chunks.items():
        if not isinstance(entry, dict):
            raise BudgetError(f"chunks.{name} must be a JSON object")
        maximum = entry.get("maximum_raw_bytes")
        if not isinstance(maximum, int) or isinstance(maximum, bool) or maximum < 0:
            raise BudgetError(f"chunks.{name}.maximum_raw_bytes must be a non-negative integer")
    if main_chunk not in chunks:
        raise BudgetError(f"main_chunk {main_chunk!r} is not present in chunks")
    return budget


def scan_assets(assets_dir: Path) -> dict:
    """Inventory every emitted JavaScript asset deterministically."""
    if not assets_dir.is_dir():
        raise BudgetError(
            f"performance gate requires a current build; {assets_dir} does not exist "
            "(run `pnpm build` first)"
        )

    # Sorted by file name so the emitted report is stable across filesystems and platforms.
    observed: dict[str, list[dict]] = {}
    for path in sorted(assets_dir.glob("*.js"), key=lambda p: p.name):
        if path.name.endswith(".js.map"):
            continue
        payload = path.read_bytes()
        chunk = normalize_chunk_name(path.name)
        observed.setdefault(chunk, []).append(
            {
                "file": path.name,
                "raw_bytes": len(payload),
                "gzip_bytes": gzip_size(payload),
            }
        )
    if not observed:
        raise BudgetError(
            f"performance gate requires a current build; no JavaScript assets in {assets_dir}"
        )
    return observed


def evaluate(budget: dict, observed: dict[str, list[dict]]) -> tuple[dict, list[str]]:
    """Compare an inventory against a budget. Returns the report and every violation found."""
    violations: list[str] = []
    threshold = budget["unknown_chunk_raw_bytes_threshold"]
    budgeted = budget["chunks"]

    # A duplicate normalized identity means two files claim the same chunk. Summing them would
    # understate each and let a regression split itself across both, so this is fatal.
    for chunk, entries in sorted(observed.items()):
        if len(entries) > 1:
            files = ", ".join(entry["file"] for entry in entries)
            violations.append(
                f"duplicate normalized chunk identity {chunk}: {files}"
            )

    flat = {chunk: entries[0] for chunk, entries in observed.items() if len(entries) == 1}
    total_raw = sum(entry["raw_bytes"] for entries in observed.values() for entry in entries)
    total_gzip = sum(entry["gzip_bytes"] for entries in observed.values() for entry in entries)
    chunk_count = sum(len(entries) for entries in observed.values())

    for chunk in sorted(budgeted):
        if chunk not in flat:
            violations.append(f"expected chunk is missing from the build: {chunk}")

    unknown_small: list[str] = []
    for chunk in sorted(flat):
        if chunk in budgeted:
            continue
        raw = flat[chunk]["raw_bytes"]
        if raw >= threshold:
            violations.append(
                f"unbudgeted chunk {chunk} is {raw} bytes, at or above the "
                f"{threshold}-byte threshold; add it to the budget"
            )
        else:
            unknown_small.append(chunk)

    for chunk in sorted(budgeted):
        entry = flat.get(chunk)
        if entry is None:
            continue
        maximum = budgeted[chunk]["maximum_raw_bytes"]
        if entry["raw_bytes"] > maximum:
            violations.append(
                f"chunk {chunk} is {entry['raw_bytes']} bytes, exceeding its {maximum}-byte maximum "
                f"by {entry['raw_bytes'] - maximum}"
            )

    aggregates = budget["aggregates"]
    main_chunk = budget["main_chunk"]
    main_entry = flat.get(main_chunk)
    measured = {
        "main_js_bytes": main_entry["raw_bytes"] if main_entry else 0,
        "total_js_bytes": total_raw,
        "total_js_gzip_bytes": total_gzip,
    }
    for metric in REQUIRED_AGGREGATES:
        maximum = aggregates[metric]["maximum"]
        value = measured[metric]
        if value > maximum:
            violations.append(
                f"{metric} is {value}, exceeding its {maximum}-byte maximum by {value - maximum}"
            )

    expected_count = aggregates["expected_chunk_count"]
    if chunk_count != expected_count:
        violations.append(
            f"expected_chunk_count is {expected_count} but the build emitted {chunk_count}"
        )

    report = {
        "budget_version": BUDGET_VERSION,
        "chunk_count": chunk_count,
        "expected_chunk_count": expected_count,
        "main_chunk": main_chunk,
        "main_js_bytes": measured["main_js_bytes"],
        "total_js_bytes": total_raw,
        "total_js_gzip_bytes": total_gzip,
        "unknown_chunk_raw_bytes_threshold": threshold,
        "untracked_small_chunks": unknown_small,
        "chunks": [
            {
                "chunk": chunk,
                "file": entries[0]["file"] if len(entries) == 1 else None,
                "files": [entry["file"] for entry in entries] if len(entries) > 1 else None,
                "raw_bytes": sum(entry["raw_bytes"] for entry in entries),
                "gzip_bytes": sum(entry["gzip_bytes"] for entry in entries),
                "maximum_raw_bytes": budgeted.get(chunk, {}).get("maximum_raw_bytes"),
                "budgeted": chunk in budgeted,
            }
            for chunk, entries in sorted(observed.items())
        ],
        "violations": violations,
    }
    return report, violations


def run(budget_path: Path, assets_dir: Path) -> tuple[dict, list[str]]:
    return evaluate(load_budget(budget_path), scan_assets(assets_dir))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--budget", type=Path, default=DEFAULT_BUDGET)
    parser.add_argument("--assets", type=Path, default=DEFAULT_ASSETS)
    args = parser.parse_args(argv)

    try:
        report, violations = run(args.budget, args.assets)
    except BudgetError as exc:
        print(f"performance gate failed: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(report, indent=2, sort_keys=True))
    if violations:
        for violation in violations:
            print(f"performance regression: {violation}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
