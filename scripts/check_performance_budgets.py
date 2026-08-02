"""Checks reproducible production bundle guardrails against the Task 16 baseline."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUDGETS = json.loads((ROOT / "docs" / "audits" / "task-16-performance-budgets.json").read_text(encoding="utf-8"))
ASSETS = ROOT / "frontend" / "dist" / "assets"
if not ASSETS.is_dir():
    raise SystemExit("performance gate requires `pnpm build` first")

javascript = [p for p in ASSETS.glob("*.js") if not p.name.endswith(".js.map")]
sizes = {p.name: p.stat().st_size for p in javascript}
main = max((size for name, size in sizes.items() if name.startswith("index-")), default=0)
editor = max((size for name, size in sizes.items() if name.startswith("BasicLeafEditor-")), default=0)
markdown = max((size for name, size in sizes.items() if name.startswith("markdown-")), default=0)
observed = {"main_js_bytes": main, "editor_lazy_bytes": editor, "markdown_lazy_bytes": markdown, "total_js_bytes": sum(sizes.values())}
for metric, value in observed.items():
    limit = BUDGETS[metric]["maximum"]
    if value > limit:
        raise SystemExit(f"performance regression: {metric}={value} exceeds {limit}")
if not editor or not markdown:
    raise SystemExit("editor/Markdown code-split chunks are missing")
print(json.dumps(observed, indent=2, sort_keys=True))
