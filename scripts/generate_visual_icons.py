#!/usr/bin/env python3
"""Vendor the Lifeweave icon subset and generated brand mark.

The package ships 20,621 SVGs. Lifeweave needs 22. Shipping the package to the renderer to reach
0.1% of it would be indefensible against a 5,473-byte startup budget headroom, and Vite treats an
imported SVG as an asset rather than as a component, so each icon would also become a separate
network-less-but-still-parsed request.

So the subset is vendored as one generated TSX module of inline paths. The simple infinity brand
mark is emitted by the same pipeline so shell identity cannot drift into a feature-local SVG. It is
generated rather than hand-copied so the provenance is reproducible and a future agent can re-run it after an upgrade
instead of trusting that 22 path strings were transcribed correctly.

    python scripts/generate_visual_icons.py

Source: @fluentui/svg-icons 1.1.334, MIT, microsoft/fluentui-system-icons.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "frontend/node_modules/@fluentui/svg-icons/icons"
TARGET = ROOT / "frontend/src/design-system/visual/icons.tsx"

# name in Lifeweave  ->  Fluent file stem.
#
# Regular 20px throughout, per ADR 0045 §26, except where a filled counterpart carries genuine state
# semantics: a completed task and a raised priority are states, not decorations.
ICONS: dict[str, str] = {
    "today": "weather_sunny_20_regular",
    "calendar": "calendar_ltr_20_regular",
    "analytics": "data_trending_20_regular",
    "plans": "target_20_regular",
    "life": "leaf_three_20_regular",
    "reader": "book_open_20_regular",
    "search": "search_20_regular",
    "settings": "settings_20_regular",
    "chevronLeft": "chevron_left_20_regular",
    "chevronRight": "chevron_right_20_regular",
    "moon": "weather_moon_20_regular",
    "panelLeft": "panel_left_20_regular",
    "circle": "circle_20_regular",
    "checkCircle": "checkmark_circle_20_filled",
    "flag": "flag_20_regular",
    "flagFilled": "flag_20_filled",
    "note": "document_text_20_regular",
    "details": "info_20_regular",
    "subtasks": "task_list_ltr_20_regular",
    "link": "link_20_regular",
    "more": "more_horizontal_20_regular",
    "dismiss": "dismiss_20_regular",
}

HEADER = '''/*
 * GENERATED FILE — do not edit by hand.
 * Regenerate with:  python scripts/generate_visual_icons.py
 *
 * The Lifeweave icon vocabulary (ADR 0045): a curated {count}-icon subset of Fluent System Icons
 * plus the Lifeweave infinity brand mark, vendored as inline geometry.
 *
 * Source:  @fluentui/svg-icons {version}  (npm)
 * License: MIT — Copyright (c) Microsoft Corporation
 *          upstream repository: github.com/microsoft/fluentui-system-icons
 *
 * The attribution deliberately omits the URL scheme: `scripts/verify_no_remote_assets.py` rejects
 * any `https?://` under `frontend/src`, and that gate is more valuable than a clickable comment.
 *
 * **Each path is a separate named export, deliberately.** An earlier version kept them in one
 * `Record<IconName, string>` and let `Icon` look the path up by name. That reads nicely and cannot
 * tree-shake: a dynamic lookup forces every entry into the bundle, so production shipped all
 * {count} icons to render the seven the shell actually uses, and `index.js` went 1,551 bytes over
 * its locked ceiling. Named exports let the bundler drop what no one imports.
 *
 * Predominantly 20px regular weight, themed with `currentColor`. Filled variants appear only where
 * state semantics benefit — a completed task, a raised priority. No colour-icon variants.
 *
 * Every icon is `aria-hidden` and focusable={{false}}: an icon is never the accessible name. A
 * control that renders only an icon must carry its own `aria-label`.
 */
import type {{ SVGProps }} from "react";

{entries}

/** Lifeweave infinity mark â€” simple stroke geometry, never a feature glyph or status icon. */
export const iconBrand =
  "M2 10c3-5 5-5 8 0s5 5 8 0M2 10c3 5 5 5 8 0s5-5 8 0";

export function Icon({{
  d,
  size = 20,
  ...rest
}}: {{ d: string; size?: number }} & Omit<SVGProps<SVGSVGElement>, "d">) {{
  return (
    <svg
      width={{size}}
      height={{size}}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable={{false}}
      {{...rest}}
    >
      <path d={{d}} />
    </svg>
  );
}}
'''


def main() -> int:
    if not SOURCE.is_dir():
        print(f"missing icon source: {SOURCE}", file=sys.stderr)
        return 1

    version = "1.1.334"
    package = SOURCE.parent / "package.json"
    if package.is_file():
        match = re.search(r'"version":\s*"([^"]+)"', package.read_text(encoding="utf-8"))
        if match:
            version = match.group(1)

    entries: list[str] = []
    for name, stem in ICONS.items():
        path = SOURCE / f"{stem}.svg"
        if not path.is_file():
            print(f"missing icon: {stem}.svg", file=sys.stderr)
            return 1
        svg = path.read_text(encoding="utf-8")
        found = re.findall(r'<path d="([^"]+)"', svg)
        if len(found) != 1:
            print(f"{stem}.svg has {len(found)} paths; expected exactly 1", file=sys.stderr)
            return 1
        export_name = "icon" + name[0].upper() + name[1:]
        entries.append(f'/** {stem} */\nexport const {export_name} =\n  "{found[0]}";')

    TARGET.write_text(
        HEADER.format(
            count=len(ICONS),
            version=version,
            entries="\n\n".join(entries),
        ),
        encoding="utf-8",
    )
    print(f"generated {TARGET.relative_to(ROOT)} with {len(ICONS)} icons from @fluentui/svg-icons {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
