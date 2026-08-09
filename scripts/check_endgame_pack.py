#!/usr/bin/env python3
"""Validate the finite Endgame redesign packet identities and ledger crosswalk.

The canonical pack is compiled planning authority. This check deliberately validates structure
only: it does not reinterpret the 109-row design program or read the research archive.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "docs" / "visual" / "endgame-redesign"
LEDGER = PACK / "state" / "EXECUTION_LEDGER.md"
CANONICAL_ID = re.compile(r"[A-Z][A-Z0-9]*-\d{2}")
LEDGER_ROW = re.compile(r"^\| ([A-Z][A-Z0-9]*-\d{2}) \| (S\d{2}) \|", re.MULTILINE)
PACKET_ROW = re.compile(r"^\| ([A-Z][A-Z0-9]*-\d{2}) \|", re.MULTILINE)


def fail(errors: list[str]) -> int:
    for error in errors:
        print(f"endgame pack verification failed: {error}", file=sys.stderr)
    return 1


def main() -> int:
    errors: list[str] = []
    if not LEDGER.is_file():
        return fail(["missing state/EXECUTION_LEDGER.md"])

    rows = LEDGER_ROW.findall(LEDGER.read_text(encoding="utf-8"))
    ledger = dict(rows)
    if len(rows) != 109 or len(ledger) != 109:
        errors.append(
            f"ledger must persist exactly 109 unique canonical IDs; found {len(rows)} rows / "
            f"{len(ledger)} unique IDs"
        )

    expected_stages = {"F0.md", *(f"S{number:02}.md" for number in range(1, 13))}
    expected_checkpoints = {"FINAL.md", *(f"Q{number}.md" for number in range(1, 6))}
    actual_stages = {path.name for path in (PACK / "stages").glob("*.md")}
    actual_checkpoints = {path.name for path in (PACK / "checkpoints").glob("*.md")}
    if actual_stages != expected_stages:
        errors.append(f"stage packet set drifted: {sorted(actual_stages)}")
    if actual_checkpoints != expected_checkpoints:
        errors.append(f"checkpoint packet set drifted: {sorted(actual_checkpoints)}")

    known = set(ledger)
    for number in range(1, 13):
        stage = f"S{number:02}"
        path = PACK / "stages" / f"{stage}.md"
        if not path.is_file():
            continue
        source = path.read_text(encoding="utf-8")
        packet_rows = set(PACKET_ROW.findall(source))
        expected_rows = {row_id for row_id, owner in ledger.items() if owner == stage}
        if packet_rows != expected_rows:
            errors.append(
                f"{stage} row crosswalk drifted: expected {sorted(expected_rows)}, "
                f"found {sorted(packet_rows)}"
            )
        unknown = {
            row_id for row_id in CANONICAL_ID.findall(source)
            if row_id not in known and not row_id.startswith("F0-")
        }
        if unknown:
            errors.append(f"{stage} references unknown canonical IDs: {sorted(unknown)}")

    if errors:
        return fail(errors)
    print("Endgame execution pack verified: 109 IDs, 13 stages, 6 checkpoints.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
