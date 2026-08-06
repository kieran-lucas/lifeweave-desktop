#!/usr/bin/env python3
"""Validate governance files, workflow integrity, JSON, and forbidden artifacts."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_DIR = ROOT / ".github/workflows"
WORKFLOW_SEAL = ROOT / ".github/WORKFLOW_SEAL.sha256"
REQUIRED = [
    "START_HERE.md",
    "README.md",
    "AI_CONSTITUTION.md",
    "AGENTS.md",
    "CLAUDE.md",
    ".github/WORKFLOW_SEAL.sha256",
    ".github/workflows/manual-clean-build.yml",
    "docs/CORE_PRODUCT_SPEC.md",
    "docs/EXPANSION_VISION.md",
    "docs/ARCHITECTURE.md",
    "docs/DECISION_REGISTRY.md",
    "docs/source-of-truth/SOURCE_MANIFEST.json",
    "docs/source-of-truth/SPEC_INDEX.md",
    "docs/source-of-truth/FULL_COVERAGE_MATRIX.md",
    "specs/000-foundation-proof/spec.md",
    "specs/000-foundation-proof/acceptance.md",
]
FORBIDDEN_SUFFIXES = (
    ".sqlite",
    ".sqlite3",
    ".db",
    ".db-wal",
    ".db-shm",
    ".pfx",
    ".p12",
    ".pem",
    ".key",
)
FORBIDDEN_NAMES = {"node_modules", "target", "backups", "user-data", "AppData"}


def check_workflow_seal(errors: list[str]) -> None:
    if not WORKFLOW_SEAL.is_file() or not WORKFLOW_DIR.is_dir():
        return

    sealed: dict[str, str] = {}
    for number, raw in enumerate(WORKFLOW_SEAL.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        try:
            digest, relative = line.split(maxsplit=1)
        except ValueError:
            errors.append(f"invalid workflow seal entry on line {number}")
            continue
        if len(digest) != 64 or any(char not in "0123456789abcdef" for char in digest):
            errors.append(f"invalid workflow SHA-256 on line {number}")
            continue
        if not relative.startswith(".github/workflows/") or relative in sealed:
            errors.append(f"invalid or duplicate sealed workflow path on line {number}: {relative}")
            continue
        sealed[relative] = digest

    actual_paths = sorted(
        path.relative_to(ROOT).as_posix()
        for path in WORKFLOW_DIR.rglob("*")
        if path.is_file() and path.suffix in {".yml", ".yaml"}
    )
    if actual_paths != sorted(sealed):
        errors.append(
            "workflow set differs from .github/WORKFLOW_SEAL.sha256: "
            f"sealed={sorted(sealed)}, actual={actual_paths}"
        )

    for relative, expected in sealed.items():
        path = ROOT / relative
        if not path.is_file():
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != expected:
            errors.append(
                f"sealed workflow changed: {relative}; explicit Product Owner workflow "
                "authorization and a seal update are required"
            )


def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED:
        if not (ROOT / rel).is_file():
            errors.append(f"missing required file: {rel}")

    check_workflow_seal(errors)

    for path in ROOT.rglob("*.json"):
        if ".git" in path.parts or "node_modules" in path.parts or "target" in path.parts:
            continue
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"invalid JSON {path.relative_to(ROOT)}: {exc}")

    for path in ROOT.rglob("*"):
        if ".git" in path.parts or "node_modules" in path.parts or "target" in path.parts:
            continue
        if path.name in FORBIDDEN_NAMES and path.is_dir():
            ignored = subprocess.run(
                ["git", "check-ignore", "-q", str(path)],
                cwd=ROOT,
                capture_output=True,
            ).returncode == 0
            if not ignored:
                errors.append(f"forbidden generated/user directory present: {path.relative_to(ROOT)}")
        if path.is_file() and path.name.endswith(FORBIDDEN_SUFFIXES):
            errors.append(f"forbidden sensitive artifact present: {path.relative_to(ROOT)}")

    source_manifest = ROOT / "docs/source-of-truth/SOURCE_MANIFEST.json"
    if source_manifest.is_file():
        manifest = json.loads(source_manifest.read_text(encoding="utf-8"))
        attributes = (ROOT / ".gitattributes").read_text(encoding="utf-8")
        source_name = Path(manifest["source_file"]).name.replace(" ", "\\ ")
        if source_name not in attributes or "-text" not in attributes:
            errors.append("immutable source is not protected with .gitattributes -text")

    if errors:
        print("REPOSITORY GOVERNANCE FAILURE", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("Repository governance checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
