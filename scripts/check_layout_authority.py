#!/usr/bin/env python3
"""Verify the Task 50 / ADR 0044 global layout authority.

Lifeweave has exactly one place that decides how wide a page is:
``frontend/src/app/layout/``. Before Task 50 there were seven page maximum widths, three centring
rules, and three page-local paddings stacked on the one shared viewport gutter.

These are structural invariants about the source tree, not behaviour of a component, so they live
here rather than in a unit test. jsdom cannot prove geometry at all, and the real box-model
assertions belong to ``e2e-tests/specs/phase21-global-layout.e2e.ts``.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend/src"
LAYOUT = FRONTEND / "app/layout"
FEATURES = FRONTEND / "features"

# The tokens that may be *declared* in exactly one file.
SOLE_AUTHORITY_TOKENS = (
    "--lw-frame-standard",
    "--lw-frame-wide",
    "--lw-frame-reading",
    "--lw-dialog-compact",
    "--lw-dialog-standard",
    "--lw-dialog-wide",
    "--lw-gutter",
)

EXPECTED_RAMP = [4, 8, 12, 16, 24, 32, 48, 64]

# Page geometry lived in exports named for the page itself. A bounded component may still declare
# its own maximum; that is a component decision, not a competing page authority.
PAGE_ROOT = re.compile(
    r"export const (root|screen|reader|destination|page)\s*=\s*style\(\{([^}]*)\}",
)
PAGE_GEOMETRY = re.compile(
    r"max(?:Width|InlineSize)|width:\s*\"min\(|margin(?:Inline)?:\s*\"?0 auto|marginInline:\s*\"auto\"",
)

# Every file that owns a modal backdrop must take its surface from the shared grammar.
MODAL_OWNERS = (
    "backup/BackupSettings.css.ts",
    "life/branch/LifeBranch.css.ts",
    "life/links/LifeLinksPanel.css.ts",
    "life/narrative/NarrativeMarkdownImportDialog.css.ts",
    "life/portable/PortablePackage.css.ts",
    "search/GlobalSearchDialog.css.ts",
    "task/saved-views/TaskSavedViews.css.ts",
)

# Every top-level surface declares one page type from the finite taxonomy.
PAGE_COMPONENTS = (
    "task/today/TodayScreen.tsx",
    "analytics/AnalyticsScreen.tsx",
    "focus-plan/FocusPlansScreen.tsx",
    "calendar/CalendarScreen.tsx",
    "life/LifeScreen.tsx",
)


def domain_css() -> list[tuple[Path, str]]:
    return [
        (path, path.read_text(encoding="utf-8"))
        for path in sorted(FEATURES.rglob("*.css.ts"))
    ]


def check(errors: list[str]) -> None:
    tokens = (LAYOUT / "tokens.css.ts").read_text(encoding="utf-8")

    for name in SOLE_AUTHORITY_TOKENS:
        if f'"{name}"' not in tokens:
            errors.append(f"declare {name} in frontend/src/app/layout/tokens.css.ts")

    ramp = [int(value) for value in re.findall(r'"--lw-space-\d":\s*"(\d+)px"', tokens)]
    if ramp != EXPECTED_RAMP:
        errors.append(
            f"keep the spacing ramp 4px-derived and finite: expected {EXPECTED_RAMP}, found {ramp}"
        )

    # Only geometry tokens may live in the layout authority; art direction is frozen.
    for name in re.findall(r'"(--lw-[a-z0-9-]+)":', tokens):
        if not re.match(r"^--lw-(space|gutter|frame|dialog)", name):
            errors.append(f"remove non-geometry layout token {name} (art direction is frozen)")

    for path, source in domain_css():
        rel = path.relative_to(ROOT).as_posix()

        for name in SOLE_AUTHORITY_TOKENS:
            if f'"{name}":' in source:
                errors.append(f"{rel} declares {name}; consume it instead of redefining it")

        for match in PAGE_ROOT.finditer(source):
            if PAGE_GEOMETRY.search(match.group(2)):
                errors.append(
                    f"{rel} declares page geometry on `{match.group(1)}`; use the shared PageFrame"
                )

        if re.search(r"(?:width|inlineSize):\s*\"?100v[wh]", source):
            errors.append(
                f"{rel} sizes in viewport units; they include the scrollbar gutter and reintroduce "
                "the global horizontal scrollbar"
            )

        if re.search(r"overflowX:\s*\"hidden\"", source):
            errors.append(f"{rel} conceals horizontal overflow instead of removing its source")

        for match in re.finditer(r"margin[A-Za-z]*:\s*\"?-(\d+)", source):
            if int(match.group(1)) > 1:
                errors.append(f"{rel} uses a negative margin of {match.group(1)}px as an offset")

        if re.search(r"transform:\s*\"translateX\(", source):
            errors.append(f"{rel} uses translateX as an alignment tool")

    for owner in MODAL_OWNERS:
        path = FEATURES / owner
        if not path.exists():
            errors.append(f"missing modal owner {owner}")
        elif "dialogSurface" not in path.read_text(encoding="utf-8"):
            errors.append(f"{owner} must take its surface from the shared modal grammar")

    for component in PAGE_COMPONENTS:
        source = (FEATURES / component).read_text(encoding="utf-8")
        if "<PageFrame" not in source:
            errors.append(f"{component} must render a PageFrame")
        if not re.search(r'type="(standard|wide|reading)"', source):
            errors.append(f"{component} must declare a page type from the finite taxonomy")

    shell = (FRONTEND / "app/App.tsx").read_text(encoding="utf-8")
    if 'data-app-viewport=""' not in shell:
        errors.append("App.tsx must mark the main viewport for geometry measurement")
    if "<PageFrame" not in shell:
        errors.append("App.tsx must render Settings inside a PageFrame")

    shell_css = (FRONTEND / "app/App.css.ts").read_text(encoding="utf-8")
    if re.search(r"(?:width|inlineSize|height|blockSize):\s*\"?100v[wh]", shell_css):
        errors.append("App.css.ts must not size the application root in viewport units")
    if "scrollbarGutter" not in shell_css:
        errors.append("App.css.ts must reserve the main viewport scrollbar gutter")

    # The palette, font family and focus ring are frozen for Task 50.
    global_css = (FRONTEND / "design-system/global.css").read_text(encoding="utf-8")
    for frozen in (
        "font-family: Inter,",
        "--accent: #476dd6;",
        "--surface: #ffffff;",
        "--focus-ring: #476dd6;",
    ):
        if frozen not in global_css:
            errors.append(f"art-direction freeze violated: global.css no longer contains `{frozen}`")


def main() -> int:
    errors: list[str] = []
    check(errors)
    if errors:
        for error in errors:
            print(f"layout authority verification failed: {error}", file=sys.stderr)
        return 1
    print("layout authority verification passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
