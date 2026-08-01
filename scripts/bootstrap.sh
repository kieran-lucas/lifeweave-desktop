#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

python3 scripts/verify_source_integrity.py
python3 scripts/generate_spec_index.py --check
python3 scripts/generate_coverage_matrix.py --check
python3 scripts/check_repository.py

echo "The authoritative bootstrap target is native Windows."
echo "This shell script only validates governance on non-Windows hosts."
echo "Run scripts/bootstrap.ps1 on Windows to install/build Tauri."
