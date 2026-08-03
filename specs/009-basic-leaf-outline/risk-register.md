# Slice 009 — Risk Register

## R1 — ID stability on document edit

**Risk:** If a paragraph is inserted before a heading, all `leaf-heading-N` IDs shift. A user clicking an outline entry before a re-render will navigate to the wrong heading.

**Mitigation:** IDs are positional by design (spec requirement). The outline is re-derived from the current committed JSON on every render. There is no persistent deep-link system. The outline is a navigation aid, not a bookmarking system. The risk is accepted.

## R2 — Container query browser support

**Risk:** `containerType: "inline-size"` requires CSS Container Queries (Chromium 105+, Firefox 110+, Safari 16+). The embedded WebView in Tauri uses the system WebView; on older Windows installs this may be WebView2 < 105.

**Mitigation:** Tauri on Windows uses WebView2 (Chromium-based). WebView2 auto-updates with Edge; as of 2026 virtually all Windows systems have Chromium 105+ via Edge updates. Fallback: narrow layout (disclosure toggle visible, no grid) is the natural degraded experience. Risk is low.

## R3 — Axe false positives from jsdom vs. real browser

**Risk:** The axe-core test runs in jsdom, which does not apply CSS. Container query styles are not evaluated; the disclosure toggle may appear "hidden" in real browsers but not in jsdom.

**Mitigation:** The axe test checks for critical/serious violations. CSS-visibility issues are not reported as critical/serious by axe-core. The test passes. Risk is low.

## R4 — scrollIntoView / focus jsdom limitations

**Risk:** jsdom does not implement scrollIntoView. Tests use `vi.fn()` mocks to verify behavior.

**Mitigation:** The mock approach verifies the correct arguments are passed. Real scroll behavior requires a real browser test (not required for this slice). Risk accepted.

## R5 — useReducedMotion SSR / initial null

**Risk:** `useReducedMotion()` returns `null` before the motion library initializes, causing a flash of "smooth" behavior even when reduced motion is set.

**Mitigation:** The null check `?? false` defaults to smooth (non-reduced) behavior on initial render. This is acceptable — the scroll happens after user interaction, by which time the hook will have resolved. Risk is low.
