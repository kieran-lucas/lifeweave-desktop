#!/usr/bin/env python3
"""Verify the immutable Product Owner source by byte count, line count, and SHA-256."""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs/source-of-truth/SOURCE_MANIFEST.json"

def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    source = ROOT / manifest["source_file"]
    if not source.is_file():
        print(f"ERROR: missing source file: {source}", file=sys.stderr)
        return 1

    data = source.read_bytes()
    actual = {
        "byte_count": len(data),
        "line_count": len(data.decode("utf-8").splitlines()),
        "sha256": hashlib.sha256(data).hexdigest(),
    }

    failures = []
    for key in ("byte_count", "line_count", "sha256"):
        if actual[key] != manifest[key]:
            failures.append(f"{key}: expected {manifest[key]!r}, got {actual[key]!r}")

    if failures:
        print("SOURCE INTEGRITY FAILURE", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print(
        "Source verified:",
        source.relative_to(ROOT),
        f"{actual['byte_count']} bytes, {actual['line_count']} lines, sha256={actual['sha256']}",
    )
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
