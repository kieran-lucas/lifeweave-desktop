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

    # ── Task 51 visual authority (ADR 0045) ─────────────────────────────────────────────────
    #
    # Task 50 froze the palette, font family and focus ring, because art direction was explicitly
    # unallocated and deferred to a later Product Owner gate. Task 51 *is* that gate, so the freeze
    # is replaced rather than deleted.
    #
    # These rules deliberately assert **invariants**, not sampled literals. An earlier revision
    # pinned exact v2 hex strings in global.css; under ADR 0045's "Craft-class craftsmanship
    # benchmark" override the palette is re-derived from rendered evidence, so pinning the old
    # measurement would forbid the improvement the Product Owner ordered. What must not regress is
    # the *identity* — one blue accent, a near-neutral plane, a designed reduced-motion state, and a
    # single typed authority for colour, radius, elevation and motion.
    global_css = (FRONTEND / "design-system/global.css").read_text(encoding="utf-8")

    # Reduced motion is a designed state. Zeroing every duration replaces a movement with a jump,
    # which docs/ACCESSIBILITY_AND_INPUT.md forbids and Task 51 deliberately undid.
    # Matched as a declaration, not as a substring: the file's own comment explains what the old
    # rule did, and a naive search would flag that prose as the defect it describes.
    if re.search(r"(?:animation|transition)-duration:\s*0\.01ms", global_css):
        errors.append(
            "reduced motion must not zero every duration; use a short cross-fade (ADR 0045 §6)"
        )

    # ADR 0045 Override 2 authorizes exactly **one** self-hosted editorial family. The prohibition is
    # narrowed, not removed: any other @font-face is still a governance failure, so a second family
    # cannot arrive without a new Product Owner decision.
    # Matched as a real declaration, not as a substring. `typography.css.ts` discusses `@font-face`
    # in prose, and a naive search flags that commentary as the defect it describes — the same trap
    # the reduced-motion rule above already documents.
    for path in sorted(FRONTEND.rglob("*.css")) + sorted(FRONTEND.rglob("*.css.ts")):
        source = path.read_text(encoding="utf-8")
        for match in FONT_FACE_DECLARATION.finditer(source):
            window = source[match.start(): match.start() + 400]
            if AUTHORIZED_EDITORIAL_FAMILY.lower() not in window.lower():
                errors.append(
                    f"{path.relative_to(ROOT).as_posix()} declares an @font-face that is not "
                    f"`{AUTHORIZED_EDITORIAL_FAMILY}`; ADR 0045 authorizes exactly one editorial "
                    "family"
                )

    # Colour, radius, elevation and motion belong to the visual contract, not to feature CSS.
    visual = FRONTEND / "design-system/visual/contract.css.ts"
    if not visual.is_file():
        errors.append("create the visual contract at frontend/src/design-system/visual/contract.css.ts")
    else:
        contract = visual.read_text(encoding="utf-8")
        for role in ("accent", "canvas", "surfaceSelected", "textPrimary", "borderHairline"):
            if f"{role}: null" not in contract:
                errors.append(f"visual contract must declare the `{role}` role")

    # Green is not task-completion language; completion is blue.
    for path, source in domain_css():
        rel = path.relative_to(ROOT).as_posix()
        for green in ("#7BAC84", "#7bac84", "#93BA9A", "#93ba9a"):
            if green in source:
                errors.append(f"{rel} uses a green completion tone; completion is the blue accent")

    check_visual_residue(errors)


# ── Ratcheting residue budget ───────────────────────────────────────────────────────────────
#
# Feature CSS must resolve colour, radius and elevation through the typed visual contract. It does
# not yet: the Task 51 foundation landed before the surfaces migrated. Failing outright would leave
# `pnpm verify` red for the whole migration, which teaches the gate to be ignored.
#
# So the budget ratchets instead. Each number is the count measured at the last commit; the check
# fails when a count *rises*, and fails again when a count falls without the budget being lowered.
# Residue can therefore only ever decrease, and the file records honestly how much is left.
MAX_RESIDUE = {
    "color": 0,     # hardcoded colour literals in production app/feature *.css.ts
    "radius": 0,    # raw border-radius literals not resolved through vars.radius
    "shadow": 0,     # raw box-shadow literals not resolved through vars.elevation
    "motion": 0,    # literal transition/animation timings outside the motion authority
    "font_size": 125,  # feature-local sizes remaining before semantic-role migration
    "focus": 43,       # local focus-visible recipes remaining before shared utility migration
    "control_clone": 53,  # feature-local button/action/trigger style exports
}

AUTHORIZED_EDITORIAL_FAMILY = "Literata"

# A real at-rule or a vanilla-extract font-face call — never prose that merely names the construct.
FONT_FACE_DECLARATION = re.compile(r"@font-face\s*\{|\bglobalFontFace\(|\bfontFace\(")

# The four Narrative Visual Worlds are an approved per-world palette (ADR 0022), not stray colour.
# They are exempt from the hex budget and harmonised rather than deleted.
RESIDUE_EXEMPT = ("life/narrative/NarrativeVisualWorld.css.ts",)

RAW_COLOR = re.compile(r"#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(")
# A resolved radius is `vars.radius.*` or the `--radius-*` custom property. `borderRadius: 0` is
# deliberate squareness — a declaration, not an unscaled literal — so it is not counted as residue.
RAW_RADIUS = re.compile(r"borderRadius:\s*(?!.*(?:vars\.radius|--radius-))[\"']?(?!0\s*[,}])[\d.]+")
# Elevation must resolve through the contract. A *ring* is not elevation: `0 0 0 Npx` draws a
# border-like halo for focus or selection and has no depth, and neither does an `inset` highlight —
# so both are declarations rather than unscaled literals, exactly like `borderRadius: 0`.
RAW_SHADOW = re.compile(
    r"boxShadow:\s*(?!.*(?:vars\.elevation|--elevation-|--glow-|--world-shadow))"
    r"[\"'](?!none|inset|0 0 0)[^\"']*\d"
)
RAW_MOTION = re.compile(
    r"(?:transition|animation):\s*[\"'][^\"']*(?:\d+(?:\.\d+)?m?s|ease|cubic-bezier)"
)
RAW_FONT_SIZE = re.compile(r"\bfontSize\s*:")
LOCAL_FOCUS = re.compile(r"focus-visible")
CONTROL_CLONE = re.compile(
    r"export const \w*(?:button|action|trigger)\w*\s*=\s*style",
    re.IGNORECASE,
)
GLYPH_ICON_LITERAL = re.compile(
    r'[\"\'][^\r\n\"\']*[▲▼◉◇▶►◀◁▷◆■□●○★☆✓✔✕×＋→←↗↘][^\r\n\"\']*[\"\']'
)


def check_visual_residue(errors: list[str]) -> None:
    counts = {kind: 0 for kind in MAX_RESIDUE}
    for path, source in domain_css():
        if path.relative_to(FEATURES).as_posix() not in RESIDUE_EXEMPT:
            counts["color"] += len(RAW_COLOR.findall(source))
        counts["radius"] += len(RAW_RADIUS.findall(source))
        counts["shadow"] += len(RAW_SHADOW.findall(source))
        counts["motion"] += len(RAW_MOTION.findall(source))
        counts["font_size"] += len(RAW_FONT_SIZE.findall(source))
        counts["focus"] += len(LOCAL_FOCUS.findall(source))
        counts["control_clone"] += len(CONTROL_CLONE.findall(source))

    # Shell and shared layout CSS are production visual owners too. Radius/elevation declarations
    # there are the authority or deliberate shell geometry, but raw motion and colour must still be
    # rejected so a legacy island cannot hide outside `features/`.
    for path in sorted((FRONTEND / "app").rglob("*.css.ts")):
        source = path.read_text(encoding="utf-8")
        counts["color"] += len(RAW_COLOR.findall(source))
        counts["motion"] += len(RAW_MOTION.findall(source))
        counts["font_size"] += len(RAW_FONT_SIZE.findall(source))
        counts["focus"] += len(LOCAL_FOCUS.findall(source))
        counts["control_clone"] += len(CONTROL_CLONE.findall(source))

    for root in (FRONTEND / "app", FEATURES):
        for path in sorted(root.rglob("*.tsx")):
            if ".test." in path.name:
                continue
            source = path.read_text(encoding="utf-8")
            if GLYPH_ICON_LITERAL.search(source):
                errors.append(
                    f"{path.relative_to(ROOT).as_posix()} uses a Unicode glyph as an icon; "
                    "use the generated icon vocabulary or a contract-backed CSS drawing instead"
                )

    for kind, found in counts.items():
        budget = MAX_RESIDUE[kind]
        if found > budget:
            errors.append(
                f"visual residue increased: {found} {kind} declarations in app/feature CSS, budget "
                f"{budget}. Resolve them through the visual contract rather than raising the budget."
            )
        elif found < budget:
            errors.append(
                f"visual residue budget is stale: {found} {kind} declarations remain but the budget "
                f"is {budget}. Lower MAX_RESIDUE['{kind}'] to {found} so the ratchet holds."
            )


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
