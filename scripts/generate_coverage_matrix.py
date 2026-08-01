#!/usr/bin/env python3
"""Generate/check a row for every immutable-source heading."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HEADINGS = ROOT / "docs/source-of-truth/SPEC_HEADINGS.json"
OUTPUT = ROOT / "docs/source-of-truth/FULL_COVERAGE_MATRIX.md"

def classify(title: str) -> str:
    text = title.lower()
    if any(term in text for term in ("task", "calendar", "lịch tháng", "completion", "đánh giá mức độ")):
        return "Core / Task"
    if any(term in text for term in ("analytics", "điểm số", "streak")):
        return "Core analytics (formula may remain OPEN)"
    if any(term in text for term in ("life system dạng cây", "life system edit", "duyệt life", "chỉnh cây")):
        return "Core / Life"
    if any(term in text for term in ("anime narrative", "theme abstract", "scene", "studio", "read mode", "template")):
        return "Expansion unless separately approved"
    if any(term in text for term in ("search", "backlink", "outline", "noteboard", "graph", "tags")):
        return "OPEN/DEFERRED; no activation without approval"
    if any(term in text for term in (
        "kiến trúc", "dữ liệu", "performance", "accessibility", "security",
        "testing", "build", "release", "asset", "backup", "motion", "settings",
    )):
        return "Cross-cutting contract"
    if any(term in text for term in ("điểm chưa chốt", "open", "quyết định")):
        return "Decision governance"
    return "Source retained; inspect context before implementation"

def render() -> str:
    data = json.loads(HEADINGS.read_text(encoding="utf-8"))
    rows = [
        "# Full source coverage matrix",
        "",
        "Every heading in the immutable source appears below. This matrix prevents setup summaries from silently dropping a source section.",
        "",
        "| ID | Level | Source lines | Heading | Operational handling |",
        "|---:|---:|---:|---|---|",
    ]
    for index, heading in enumerate(data["headings"], 1):
        title = str(heading["title"]).replace("|", "\\|")
        rows.append(
            f"| S-{index:03d} | {heading['level']} | {heading['start_line']}–{heading['end_line']} "
            f"| {title} | {classify(str(heading['title']))} |"
        )
    return "\n".join(rows) + "\n"

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != expected:
            print("Coverage matrix is stale", file=sys.stderr)
            return 1
        print("Full coverage matrix current")
        return 0
    OUTPUT.write_text(expected, encoding="utf-8", newline="\n")
    print(f"Generated {OUTPUT}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
