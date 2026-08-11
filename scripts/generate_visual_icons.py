#!/usr/bin/env python3
"""Vendor the Lifeweave icon subset and generated brand mark.

The upstream package contains thousands of SVGs. Lifeweave deliberately vendors only the glyphs
that production actually imports: runtime icon-package dependencies and dozens of separate SVG
assets would waste startup budget and weaken visual governance.

The subset is emitted as one generated TSX module of named inline paths. Named exports let Vite
remove unused glyphs. The woven-W brand mark is emitted by the same pipeline so shell identity stays
reproducible.

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
BRAND_SOURCE = ROOT / "assets/brand/lifeweave-mark.svg"

# name in Lifeweave -> Fluent file stem.
# Regular 20px throughout, except filled counterparts that carry genuine state semantics.
# The set is intentionally broad enough that feature/category semantics do not collapse into one
# generic symbol, but each entry still needs a real production consumer before further expansion.
ICONS: dict[str, str] = {
    "today": "weather_sunny_20_regular",
    "morning": "weather_sunny_low_20_regular",
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
 * The Lifeweave icon vocabulary: a curated {count}-icon subset of Fluent System Icons plus the
 * Lifeweave woven-W brand mark, vendored as inline geometry.
 *
 * Source:  @fluentui/svg-icons {version}  (npm)
 * License: MIT — Copyright (c) Microsoft Corporation
 *          upstream repository: github.com/microsoft/fluentui-system-icons
 *
 * The attribution deliberately omits the URL scheme: `scripts/verify_no_remote_assets.py` rejects
 * any `https?://` under `frontend/src`.
 *
 * Each path is a separate named export so the bundler can drop unused glyphs. The vocabulary may be
 * semantically diverse, but production only pays for the names a screen imports.
 *
 * Icons render through `currentColor`, so the complete vocabulary remains black/white/gray under the
 * Monochrome Matte authority. Filled variants appear only where state semantics benefit.
 *
 * Every icon is `aria-hidden` and focusable={{false}}: an icon is never the accessible name. An
 * icon-only control must carry its own `aria-label`.
 */
import type {{ SVGProps }} from "react";

{entries}

/** Lifeweave woven-W mark — intersecting life paths shared with the desktop identity. */
export const iconBrand =
  "{brand_path}";

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

    brand_svg = BRAND_SOURCE.read_text(encoding="utf-8")
    brand_paths = re.findall(r'\bd="([^"]+)"', brand_svg)
    if len(brand_paths) != 1:
        print(f"{BRAND_SOURCE} has {len(brand_paths)} paths; expected exactly 1", file=sys.stderr)
        return 1

    TARGET.write_text(
        HEADER.format(
            count=len(ICONS),
            version=version,
            entries="\n\n".join(entries),
            brand_path=brand_paths[0],
        ),
        encoding="utf-8",
    )
    print(f"generated {TARGET.relative_to(ROOT)} with {len(ICONS)} icons from @fluentui/svg-icons {version}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
