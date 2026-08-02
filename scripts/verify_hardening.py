"""Deterministic Core hardening and independent-CI policy gate."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"hardening verification failed: {message}")


workflows = sorted((ROOT / ".github" / "workflows").glob("*.yml"))
require(len(workflows) >= 4, "independent workflow coverage is missing")
for workflow in workflows:
    text = workflow.read_text(encoding="utf-8")
    require("permissions:\n  contents: read" in text, f"{workflow.name} lacks least privilege")
    require("concurrency:" in text and "cancel-in-progress: true" in text, f"{workflow.name} lacks cancellation")
    require("timeout-minutes:" in text, f"{workflow.name} lacks a job timeout")
    for action in re.findall(r"uses:\s*([^\s#]+)", text):
        require(bool(re.search(r"@[0-9a-f]{40}$", action)), f"{workflow.name} action is not commit-pinned: {action}")

tauri = (ROOT / "src-tauri" / "tauri.conf.json").read_text(encoding="utf-8")
require("unsafe-eval" not in tauri, "production CSP permits unsafe-eval")
require("https:" not in re.search(r'"csp":\s*"([^"]+)', tauri).group(1), "production CSP permits remote resources")
require('"minWidth": 960' in tauri and '"minHeight": 640' in tauri, "measured minimum window contract drifted")

cargo = (ROOT / "src-tauri" / "Cargo.toml").read_text(encoding="utf-8")
require("default = [\"e2e-test\"]" not in cargo, "production build enables the E2E feature")

commands = []
for source in (ROOT / "frontend" / "src").rglob("*.ts*"):
    if "ipc" in source.parts and source.name == "commands.ts":
        continue
    if "invoke(" in source.read_text(encoding="utf-8"):
        commands.append(str(source.relative_to(ROOT)))
require(not commands, f"raw IPC escaped the adapter: {commands}")

package = (ROOT / "frontend" / "package.json").read_text(encoding="utf-8")
for forbidden in ("react-flow", "@tiptap/extension-collaboration", "@sentry", "posthog"):
    require(forbidden not in package, f"forbidden expansion/telemetry dependency present: {forbidden}")

print(f"Core hardening policy verified across {len(workflows)} independent workflows.")
