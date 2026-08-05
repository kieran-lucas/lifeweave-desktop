#!/usr/bin/env python3
"""Executable architecture prototype for Task 35.

This module re-exports the public prototype contract for tests while keeping
each implementation file small and reviewable. It is isolated under specs/.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from prototype_model import *  # noqa: F401,F403
from prototype_options import *  # noqa: F401,F403
from prototype_workload import *  # noqa: F401,F403

RESULT_PATH = Path(__file__).with_name("prototype-results.json")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--operations", type=int, default=100_000)
    args = parser.parse_args()

    results = generate_results(args.operations)
    text = json.dumps(results, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.check:
        if not RESULT_PATH.exists():
            print("prototype-results.json is missing")
            return 1
        try:
            committed = json.loads(RESULT_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            print("prototype-results.json is invalid")
            return 1
        if deterministic_projection(committed) != deterministic_projection(results):
            print("prototype-results.json deterministic evidence is stale")
            return 1
        errors = validate_benchmark_evidence(committed)
        if errors:
            print("prototype benchmark evidence invalid: " + "; ".join(errors))
            return 1
        print(
            f"Task 35 prototype check passed: {len(OPERATIONS)} operations; "
            f"{args.operations} applied/option; deterministic evidence matched"
        )
        return 0

    RESULT_PATH.write_text(text, encoding="utf-8", newline="\n")
    print(f"Wrote {RESULT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
