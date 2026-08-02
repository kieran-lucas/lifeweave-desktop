"""Deterministic security boundary checks for the Foundation desktop shell."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    raise SystemExit(f"security verification failed: {message}")


def main() -> None:
    config = json.loads((ROOT / "src-tauri/tauri.conf.json").read_text(encoding="utf-8"))
    csp = config["app"]["security"]["csp"]
    required = {
        "script-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'none'",
        "style-src 'self'",
    }
    for directive in required:
        if directive not in csp:
            fail(f"missing CSP directive: {directive}")
    if "unsafe-eval" in csp or "unsafe-inline" in csp or "*" in csp:
        fail("production CSP contains unsafe or wildcard source")
    if re.search(r"(?:https?:)?//(?!ipc\.localhost)", csp):
        fail("production CSP contains an unapproved remote origin")

    capability_dir = ROOT / "src-tauri/capabilities"
    capability_files = sorted(capability_dir.glob("*.json"))
    if [p.name for p in capability_files] != ["main.json"]:
        fail("unexpected capability files are enabled")
    capability = json.loads(capability_files[0].read_text(encoding="utf-8"))
    if capability.get("identifier") != "main-capability":
        fail("unexpected capability identifier")
    if capability.get("windows") != ["main"] or capability.get("platforms") != ["windows"]:
        fail("capability is not restricted to the main Windows window")
    if "remote" in capability or "remote.urls" in json.dumps(capability):
        fail("remote capability authority is present")
    permissions = capability.get("permissions", [])
    forbidden = ("shell:", "fs:", "http:", "process:", "updater:", "clipboard:",
                 "notification:", "dialog:", "global-shortcut:", "tray:")
    if "core:default" in permissions or any(str(p).startswith(forbidden) for p in permissions):
        fail("capability grants broad or unused plugin authority")

    lib = (ROOT / "src-tauri/src/lib.rs").read_text(encoding="utf-8")
    handler = re.search(r"generate_handler!\s*\[([^]]+)\]", lib, re.S)
    if not handler:
        fail("could not locate command handler inventory")
    commands = [
        command for command in re.findall(r"\b([a-z][a-z0-9_]*)\b", handler.group(1))
        if command != "ipc"
    ]
    build = (ROOT / "src-tauri/build.rs").read_text(encoding="utf-8")
    listed = re.findall(r'"([a-z][a-z0-9_]*)"', build)
    if commands != listed:
        fail("build manifest command inventory differs from generate_handler")
    expected = {"allow-" + command.replace("_", "-") for command in commands}
    if set(permissions) != expected:
        fail("capability permissions do not exactly match registered commands")

    frontend = "\n".join(
        p.read_text(encoding="utf-8")
        for p in (ROOT / "frontend/src").rglob("*")
        if p.suffix in {".ts", ".tsx", ".css"} and "ipc/generated" not in p.as_posix()
    )
    for token in ("dangerouslySetInnerHTML", "innerHTML", "eval(", "new Function", "<iframe", "fetch(", "WebSocket", "style={{"):
        if token in frontend:
            fail(f"forbidden frontend API or inline style: {token}")
    for p in (ROOT / "frontend/src").rglob("*.ts"):
        if p.as_posix().endswith("frontend/src/ipc/commands.ts"):
            continue
        if "invoke(" in p.read_text(encoding="utf-8"):
            fail(f"raw invoke outside IPC adapter: {p}")
    print("security verification passed")


if __name__ == "__main__":
    main()
