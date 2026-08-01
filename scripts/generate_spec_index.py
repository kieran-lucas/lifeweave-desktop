#!/usr/bin/env python3
"""Generate/check the complete Markdown heading index for the immutable source."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs/source-of-truth/SOURCE_MANIFEST.json"
OUTPUT_MD = ROOT / "docs/source-of-truth/SPEC_INDEX.md"
OUTPUT_JSON = ROOT / "docs/source-of-truth/SPEC_HEADINGS.json"

def collect(source: Path) -> tuple[list[str], list[dict[str, object]]]:
    lines = source.read_text(encoding="utf-8").splitlines()
    headings: list[dict[str, object]] = []
    for number, line in enumerate(lines, 1):
        match = re.match(r"^(#{1,6})\s+(.*)$", line)
        if match:
            headings.append({
                "level": len(match.group(1)),
                "title": match.group(2).strip(),
                "start_line": number,
            })
    for index, heading in enumerate(headings):
        end_line = len(lines)
        for next_heading in headings[index + 1:]:
            if int(next_heading["level"]) <= int(heading["level"]):
                end_line = int(next_heading["start_line"]) - 1
                break
        heading["end_line"] = end_line
    return lines, headings

def render_md(lines: list[str], headings: list[dict[str, object]]) -> str:
    output = [
        "# Full specification heading index",
        "",
        f"Generated from the immutable source. **{len(headings)} headings**, {len(lines)} lines.",
        "",
        "| Level | Line range | Heading |",
        "|---:|---:|---|",
    ]
    for heading in headings:
        title = str(heading["title"]).replace("|", "\\|")
        output.append(
            f"| {heading['level']} | {heading['start_line']}–{heading['end_line']} | {title} |"
        )
    return "\n".join(output) + "\n"

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    source = ROOT / manifest["source_file"]
    lines, headings = collect(source)
    md = render_md(lines, headings)
    machine = json.dumps({
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "heading_count": len(headings),
        "headings": headings,
    }, ensure_ascii=False, indent=2) + "\n"

    if args.check:
        failures = []
        if not OUTPUT_MD.exists() or OUTPUT_MD.read_text(encoding="utf-8") != md:
            failures.append(str(OUTPUT_MD.relative_to(ROOT)))
        if not OUTPUT_JSON.exists() or OUTPUT_JSON.read_text(encoding="utf-8") != machine:
            failures.append(str(OUTPUT_JSON.relative_to(ROOT)))
        if failures:
            print("Generated index is stale: " + ", ".join(failures), file=sys.stderr)
            return 1
        print(f"Specification index current: {len(headings)} headings")
        return 0

    OUTPUT_MD.write_text(md, encoding="utf-8", newline="\n")
    OUTPUT_JSON.write_text(machine, encoding="utf-8", newline="\n")
    print(f"Generated {OUTPUT_MD} and {OUTPUT_JSON}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
