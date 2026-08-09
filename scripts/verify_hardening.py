"""Deterministic Core hardening and independent-CI policy gate."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"hardening verification failed: {message}")


workflows = sorted((ROOT / ".github" / "workflows").glob("*.yml"))
require(len(workflows) == 1, f"expected exactly one workflow, found {len(workflows)}: {[w.name for w in workflows]}")
manual = workflows[0]
require(manual.name == "manual-clean-build.yml", f"unexpected workflow file: {manual.name}")
manual_text = manual.read_text(encoding="utf-8")
require("workflow_dispatch" in manual_text, "manual-clean-build.yml is not dispatch-only")
require("push:" not in manual_text and "pull_request:" not in manual_text and "schedule:" not in manual_text,
        "manual-clean-build.yml has an automatic trigger")
require("permissions:\n  contents: read" in manual_text, "manual-clean-build.yml lacks least privilege")
require("timeout-minutes:" in manual_text, "manual-clean-build.yml lacks a job timeout")
for action in re.findall(r"uses:\s*([^\s#]+)", manual_text):
    require(bool(re.search(r"@[0-9a-f]{40}$", action)), f"manual-clean-build.yml action is not commit-pinned: {action}")

tauri = (ROOT / "src-tauri" / "tauri.conf.json").read_text(encoding="utf-8")
require("unsafe-eval" not in tauri, "production CSP permits unsafe-eval")
require("https:" not in re.search(r'"csp":\s*"([^"]+)', tauri).group(1), "production CSP permits remote resources")
require('"minWidth": 960' in tauri and '"minHeight": 640' in tauri, "measured minimum window contract drifted")
require('"maximized": true' in tauri and '"fullscreen": false' in tauri,
        "main window must launch maximized with native window controls retained")

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

print("Core hardening policy verified: one manual-dispatch-only clean build workflow.")
