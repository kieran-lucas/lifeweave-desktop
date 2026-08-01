#!/usr/bin/env python3
"""Reject remote production resources in frontend/Tauri source."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCOPES = [ROOT / "frontend/src", ROOT / "frontend/index.html", ROOT / "src-tauri"]
REMOTE = re.compile(r"https?://", re.IGNORECASE)
ALLOWED = {
    # Tauri development URL is local and belongs to config.
    "http://localhost:1420",
    "http://ipc.localhost",
    "https://schema.tauri.app/config/2",
}
TEXT_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".css", ".html", ".json", ".rs", ".toml"}

def iter_files():
    for scope in SCOPES:
        if scope.is_file():
            yield scope
        elif scope.is_dir():
            for path in scope.rglob("*"):
                if path.is_file() and path.suffix in TEXT_SUFFIXES and "gen" not in path.parts:
                    yield path

def main() -> int:
    failures = []
    for path in iter_files():
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            matches = REMOTE.findall(line)
            if not matches:
                continue
            sanitized = line
            for allowed in ALLOWED:
                sanitized = sanitized.replace(allowed, "")
            if REMOTE.search(sanitized):
                failures.append(f"{path.relative_to(ROOT)}:{number}: {line.strip()}")
    if failures:
        print("Remote production resource references detected:", file=sys.stderr)
        print("\n".join(failures), file=sys.stderr)
        return 1
    print("No disallowed remote production resources detected")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
