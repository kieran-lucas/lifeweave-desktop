# Task 51 — dependency admission notes

One note per dependency, covering every field `docs/DEPENDENCY_POLICY.md` requires. Four
dependencies were added. Nothing else on the activation prompt's recommended list was installed:
`@base-ui/react` is explicitly conditional and the prototype did not identify a primitive that
justifies it (§5).

Measured impact on the shipped application, `pnpm build` with no prototype flag:

```text
                    before        after         delta
main_js_bytes       529,527       529,527       0
total_js_bytes    1,241,349     1,241,349       0
total_js_gzip       380,846       380,846       0
chunk count              24            24       0
index.js hash    index-BUpQfGW6.js  index-BUpQfGW6.js   identical
```

**Zero.** The visual token contract, the icon subset and the prototype are reachable only from the
`prototype.html` entry, which the production build does not include. The 5,473 bytes of headroom
against the locked `index.js` ceiling are untouched at this stage. They will be consumed during
production reconstruction, and that delta will be measured and reported then rather than estimated
now.

---

## 1. `@vanilla-extract/recipes@0.5.7` — frontend dependency

**Feature that requires it.** Slice 041 §2: type-safe variants for the visual primitives — a task
row's four evaluation states, three chip tones, five Life node tones, three dialog widths.

**Why platform code is insufficient.** It is not, strictly — `styleVariants` from
`@vanilla-extract/css`, which is already a dependency, covers single-axis variants and is what the
prototype actually uses today. `recipes` earns its place only when a primitive needs two independent
axes at once (tone × emphasis), which the production primitives are expected to need and the
prototype does not yet.

**Honest status: this one is provisional.** It is installed and currently unused. If the production
slice does not produce a genuine multi-axis primitive, it is removed before closure rather than kept
because it was already installed.

**Alternatives.** `styleVariants` alone (in use); hand-written class concatenation (loses type
safety, and the 31-radius sprawl this slice exists to fix started that way); CVA or `tailwind-variants`
(both would add a second styling philosophy alongside vanilla-extract).

**Maintenance.** Part of the vanilla-extract monorepo, same maintainers as the `@vanilla-extract/css`
1.21.1 already in use. **License** MIT. **Advisories** none. **Runtime behaviour** build-time only;
emits static CSS, ships no runtime. **Accessibility** none — it produces class names.
**Format lock-in** none. **Removal cost** low, and it is the one dependency here explicitly marked
for removal if unused.

---

## 2. `@fontsource-variable/literata@5.3.0` — frontend dependency

**Feature that requires it.** Slice 041 §6: the editorial family for the Today title, the inspector
object title, Reader and document titles.

**Why platform code is insufficient.** Windows ships no variable serif suitable for this role.
Georgia is static, has no optical-size or weight axis, and its Vietnamese coverage is materially
worse. The reference image's editorial character is the thing being reproduced, and a system serif
does not reproduce it.

**Why this package rather than the font.** Fontsource self-hosts. The CSP is
`font-src 'self'` and `scripts/verify_no_remote_assets.py` fails the build on any remote reference,
so a Google Fonts link is not merely discouraged here — it does not build.

**Alternatives.** Georgia (rejected above); bundling the TTF by hand (same bytes, no versioning, no
subset metadata); a different editorial face (Literata is the activation prompt's explicit choice).

**Maintenance.** Fontsource is actively maintained and mirrors upstream Google Fonts releases.
**License** SIL Open Font License 1.1 for the font; MIT for the packaging. Both permit
redistribution in an application. **Advisories** none; the package contains no executable code.

**Measured asset impact.** Only three of the seven subsets are imported:

```text
literata-latin-wght-normal.woff2         52,496
literata-latin-ext-wght-normal.woff2     42,656
literata-vietnamese-wght-normal.woff2    11,408
                                        -------
                                        106,560 bytes
```

Cyrillic, cyrillic-ext, greek and greek-ext are deliberately **not** imported — roughly 200 KB of
glyphs Lifeweave will never draw. Verified in `dist/assets`: exactly three woff2 files are emitted.

Vietnamese is imported deliberately, not incidentally. `docs/ACCESSIBILITY_AND_INPUT.md` makes
Vietnamese rendering a first-class check, and a latin-only subset renders stacked diacritics through
the fallback face at a visibly different weight.

**Runtime/network.** None. Local assets, no request leaves the machine. **Accessibility** improves
it: real Vietnamese glyphs instead of fallback substitution. **Format lock-in** none — woff2 is a
standard. **Removal cost** low: delete three imports and one token family; headings fall back to
Georgia.

---

## 3. `@fluentui/svg-icons@1.1.334` — frontend **devDependency**

**Feature that requires it.** Slice 041 §7: an icon vocabulary. The application currently has none —
every destination renders its own first letter in a filled grey square.

**Why platform code is insufficient.** There is no system icon font available to a WebView, and
hand-drawing 22 icons at a consistent optical weight is not a good use of the slice.

**Why it is a devDependency and not shipped.** The package contains **20,621 SVGs**; Lifeweave needs
**22**. Shipping it to reach 0.1% of it would be indefensible against 5,473 bytes of headroom, and
Vite treats an imported SVG as an asset, so each icon would also become a separate emitted file.

Instead `scripts/generate_visual_icons.py` vendors the 22 paths into one generated module,
`frontend/src/design-system/visual/icons.tsx` (9,064 bytes of source, one `<path>` each). The
package stays as a devDependency purely so the generator is reproducible after an upstream upgrade —
the activation prompt's §10.1 explicitly sanctions vendoring with license information preserved, and
the generated file carries the MIT notice and the upstream URL.

**Alternatives.** `@fluentui/react-icons` (a React component package, far heavier, and adopting it
edges toward the Fluent UI framework the prompt prohibits); an icon font (poor forced-colors
behaviour, a whole extra font file); drawing them (inconsistent); CSS masks over imported asset URLs
(viable, but 22 extra emitted files and no tree-shaking).

**Maintenance.** Microsoft, actively released. **License** MIT. **Advisories** none; SVG data only.
**Runtime behaviour** none — nothing from the package reaches the bundle. **Accessibility** every
generated icon is `aria-hidden` with `focusable={false}`, so an icon is never an accessible name;
icon-only controls carry their own `aria-label`. Themed by `currentColor`, so forced colors works.
**Removal cost** near zero — the generated file is self-contained and would survive uninstalling the
package.

---

## 4. `@wdio/visual-service@^9` (resolved 9.3.0) — e2e-tests devDependency

**Feature that requires it.** Slice 041 §13: visual regression over the 78-state matrix, so an
approved appearance cannot silently drift.

**Why platform code is insufficient.** The harness can already save a screenshot — that is how the
Task 50 audit and the Task 51 capture work. What it cannot do is compare against an approved
baseline with a controlled tolerance and produce a diff image.

**Why the v9 line.** The repository runs WebdriverIO 9.27.1. The activation prompt is explicit that
Task 51 must not be coupled to a WebdriverIO major migration to obtain a newer comparison engine;
a v10 baseline migration is a separate decision.

**Alternatives.** Hand-rolled pixel comparison (re-implements masking, anti-alias tolerance and diff
rendering); `pixelmatch` directly (viable but the same work, without the WebdriverIO integration);
Playwright's comparator (a second browser-automation stack alongside WebdriverIO — prohibited by the
no-duplicate-owners rule).

**Maintenance.** Part of the WebdriverIO org. **License** MIT. **Advisories** none.
**Bundle impact** zero — test-only, in a separate workspace project from `frontend`. It added 62
transitive packages to `e2e-tests`, which ships nothing. **Runtime/network** none at test time.
**Accessibility** none. **Format lock-in** the baseline PNGs are ordinary images. **Removal cost**
low; the goldens remain readable without it.

---

## 5. Considered and not installed

**`@base-ui/react@1.6.0`.** Authorized for evaluation, conditional on the prototype identifying a
concrete primitive where it beats what exists. The prototype did not: the composition's interactive
elements are native `<button>`, a `role="tablist"` of buttons, and `role="list"`/`role="listitem"`,
all of which already have correct semantics and keyboard behaviour. The surfaces that might justify
it — the tag combobox, the assessment radial fan — are production surfaces that Task 51 has not
reached, and the decision is deferred to that point rather than pre-empted. Installing it now would
mean shipping an unused behavioural library.

**Everything in the prompt's §10.3 prohibition list** — Tailwind, shadcn, Material UI, full Fluent
UI React, GSAP, Rive, PixiJS, Three.js, React Flow, Sigma, Cytoscape, Electron, `window-vibrancy`,
a second drag-and-drop library, a second editor, a chart library, React canary — none installed, and
none needed. The ambient art is static SVG and CSS gradients; the Life preview is absolutely
positioned DOM with an SVG edge layer, which is the same technique the existing Life Graph already
uses with `d3-hierarchy`.
