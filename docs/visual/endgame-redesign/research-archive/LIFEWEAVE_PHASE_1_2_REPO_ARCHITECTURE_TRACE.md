# Lifeweave Desktop — Phase 1 + Phase 2 MAXPING Repo Trace

**Repository:** `kieran-lucas/lifeweave-desktop`  
**Remote baseline:** `main` @ `a1078c1f91c251aaa7a453ef1e8a5108551c852d`  
**Baseline meaning:** committed remote GitHub state only; this audit cannot prove whether the user's local working tree has uncommitted changes.  
**Audit date:** 2026-08-10 (Asia/Bangkok)  
**Current workflow status:** Phase 1 complete; Phase 2 complete; Phase 3 not started.  
**Important:** No screenshot image was visually reviewed during Phase 1–2.

---

## 0. Executive conclusion

The repo is **not** a weak or generic frontend foundation. It already has unusually serious governance, layout authority, visual tokens, typography, motion, Windows-native E2E geometry measurement, visual regression, accessibility contracts, performance budgets, and a prior Craft-class reconstruction program.

However, the codebase is in a very specific state:

> **The foundation is materially more mature than the last-mile surface convergence.**

The strongest architecture already exists:

- one shared page/dialog geometry authority under `frontend/src/app/layout/`;
- one typed visual authority under `frontend/src/design-system/visual/`;
- finite radius/elevation/hairline/motion vocabularies;
- explicit typography roles and correct Windows Segoe UI Variable optical families;
- one authorized self-hosted editorial family (Literata, including Vietnamese subset);
- curated/tree-shakeable Fluent icon paths;
- deterministic native Windows/WebView2 geometry and pixel regression infrastructure;
- mechanical checks against visual residue and layout authority drift;
- feature completeness already traced from backend handlers to reachable UI.

The main design-engineering problem is therefore **not “invent a design system from nothing.”** It is:

1. determine whether the present visual direction is actually worthy of the new endgame target;
2. identify where screen-level composition diverges from the shared system;
3. decide what existing design grammar deserves to survive;
4. tighten or replace the remaining weak abstractions without touching backend semantics;
5. converge the entire product around one genuinely superior North Star instead of merely preserving the current baseline.

### High-confidence preliminary diagnosis

The current code has **three layers of maturity**:

1. **Foundation / verification — strong.**  
   Layout, color roles, radii, elevation, motion, font loading, regression discipline, and major accessibility constraints are governed seriously.

2. **Core surfaces — medium-to-strong but uneven.**  
   Today/Inspector, Calendar, Analytics, Search, Reader and some dialogs clearly received deliberate reconstruction. Some still have private control/spacing/typography decisions.

3. **Long-tail / specialized surfaces — uneven.**  
   Focus Plans, Life Edit/Graph, Narrative Studio, Tag settings, Backup settings and edge-state surfaces still contain local visual grammar that can make the app feel like multiple design generations even when the palette is shared.

This conclusion is code/evidence-based. **It is not yet a visual quality verdict.** Phase 3 is required before any claim such as “Today looks excellent” or “Focus Plans looks bad.”

---

# 1. Phase 1 — Frozen remote baseline

## 1.1 Remote authority

GitHub reports:

- default branch: `main`;
- current remote HEAD: `a1078c1f91c251aaa7a453ef1e8a5108551c852d`;
- HEAD is the merge commit for PR #6, **Task 51 visual experience**;
- PR #6 head was `task-51-visual-experience` @ `1fbcbe65921bdfc150d60d3d8560de86969bf43b`;
- merge occurred on 2026-08-09 UTC;
- PR #6 changed 76 files with 1,154 additions / 259 deletions.

The recent history is heavily visual/regression-oriented, so this is not a pre-design baseline. It is a repo that has just completed a substantial visual reconstruction campaign.

## 1.2 Limitation: local working tree is unknown

The GitHub connector can establish the committed remote state. It cannot prove:

- whether `D:\Programming\Github\Other\lifeweave-desktop` is on `main`;
- whether it is ahead/behind remote;
- whether there are dirty local changes;
- whether generated/runtime artifacts differ locally.

Therefore all statements in this report refer to **remote `main` @ `a1078c1...`** unless explicitly marked as historical evidence from an earlier commit.

This matters later when an implementation agent is created: before any write, the agent must lock its *local* SHA and dirty tree independently.

## 1.3 CI/status context

The GitHub combined-status endpoint exposes no current status contexts on the merge commit. That does **not** mean the repo is untested; the repo instead contains extensive local/native gate evidence and scripts. It simply means this connector did not see GitHub status checks attached to this SHA.

No Phase 1 claim is made that the current checkout was freshly rebuilt by this audit.

---

# 2. Governance and source-of-truth chain

The repo has a real authority model rather than ad-hoc README instructions.

Key files traced:

- `AGENTS.md`
- `AI_CONSTITUTION.md`
- `CLAUDE.md`
- `docs/source-of-truth/SOURCE_INTEGRITY.md`
- `docs/STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/adr/0045-visual-experience-overhaul.md`
- `specs/041-visual-experience-overhaul/spec.md`
- `specs/041-visual-experience-overhaul/acceptance.md`
- `specs/041-visual-experience-overhaul/tasks.md`
- `docs/audits/task-51-craft-coverage-ledger.md`

## 2.1 Important product/architecture invariants

The repository's own governance already supports the frontend-only boundary needed for this redesign:

- React owns rendering, focus, selection, ephemeral state and motion;
- Rust owns validation, transactions, persistence and authoritative domain work;
- SQLite remains source of truth;
- Zustand is not permitted to become a database mirror;
- TanStack Query is a projection/cache layer;
- UI must not invent semantics simply to imitate a reference;
- Today is task-first/default;
- Task rows are not meant to become generic cards;
- Life Browse and Life Edit have distinct product semantics;
- no raw network dependence for the local-first core;
- native semantics / keyboard / focus restoration / forced colors / reduced-motion evidence are treated as product quality, not optional polish.

This is excellent for the coming redesign because it gives us a hard line: **recompose presentation aggressively while preserving domain behavior.**

## 2.2 Documentation drift exists

There is meaningful but understandable temporal drift in docs:

- `README.md` still describes an older Task 39-era checkpoint while `main` has merged Task 51.
- parts of `specs/041/.../tasks.md` remain unchecked even though later implementation/evidence clearly moved beyond them;
- some Task 51 acceptance/process prose says the branch remains local/no PR is opened, but PR #6 is now merged;
- historical evidence reports branch-local states that are no longer literally current.

This must **not** be misclassified as a visual product defect. It is governance/process metadata drift caused by rapid progression.

### Rule for future agent prompts

Do not tell an implementation agent to blindly obey stale procedural sentences simply because they live in an acceptance file. The execution prompt should resolve authority in this order:

1. immutable product semantics / constitution;
2. explicit later Product Owner decisions;
3. accepted ADR supersessions;
4. current committed implementation + current ledger;
5. older planning/process prose as historical evidence.

---

# 3. Current visual-design authority

## 3.1 Geometry authority

`frontend/src/app/layout/` is the central geometry layer.

Important assets:

- `tokens.css.ts`
- `layout.css.ts`
- `PageFrame.tsx`
- `DialogSurface.tsx`

The spacing ramp is finite:

`4, 8, 12, 16, 24, 32, 48, 64`

Semantic aliases are then used for controls, fields, groups, sections and pages.

Page taxonomy is finite:

- `standard`
- `wide`
- `reading`

Dialog taxonomy is finite:

- `compact`
- `standard`
- `wide`

The layout authority owns:

- page widths;
- responsive gutters;
- shared stacks;
- split workspace geometry;
- dialog containment and scrolling;
- form-grid geometry;
- native-control geometry floor;
- scrollbar gutter / overflow protections;
- container-query breakpoints.

This is substantially better than letting each feature declare its own `max-width`, viewport math, dialog width and page gutters.

## 3.2 Automated authority enforcement

`scripts/check_layout_authority.py` is not decorative documentation. It mechanically rejects:

- competing declarations of shared frame/dialog/gutter tokens;
- page-local geometry on page roots;
- viewport-unit page sizing that can reintroduce scrollbar overflow;
- concealed horizontal overflow;
- significant negative-margin alignment hacks;
- `translateX` used as layout alignment;
- modal owners that bypass shared dialog geometry;
- top-level surfaces that fail to use `PageFrame`;
- raw visual residue categories;
- unauthorized font faces;
- Unicode glyph icons in production TSX;
- green task-completion tones.

Notably, the current visual residue ratchet is **0** for raw production feature/app:

- color literals;
- uncontracted radii;
- uncontracted elevation shadows;
- ad-hoc motion literals.

That is a serious foundation achievement.

## 3.3 What the authority check does NOT solve

The existing gate is much weaker on:

- feature-local spacing choices;
- feature-local font sizes;
- feature-local weights/line heights;
- repeated field/button compositions that still resolve through approved color/radius roles;
- local “semantic enclosure” decisions;
- optical balance;
- information hierarchy;
- art-direction quality;
- whether a technically legal glass surface is visually justified;
- whether a screen has too many locally designed controls.

This gap is central to the coming endgame pass.

---

# 4. Visual contract, light theme, material and depth

## 4.1 Typed visual contract

`frontend/src/design-system/visual/contract.css.ts` defines semantic roles for:

- canvas/surfaces;
- text;
- borders/hairlines;
- accent/selection;
- status semantics;
- Life-specific tints;
- ambient art;
- focus/backdrop;
- radius;
- elevation.

The declared geometry-like visual vocabulary is finite:

- radius: small / control / surface / floating / full;
- elevation: none / floating / modal;
- hairline: structural / subtle.

This prevents the old state where each feature accumulated its own almost-identical shadow/radius values.

## 4.2 Compatibility layer remains

`theme.css.ts` does more than apply the typed contract. It also aliases a large legacy CSS custom-property vocabulary into the new contract.

This is strategically useful for migration, but it creates a key distinction:

> **Value convergence is not the same as API/grammar convergence.**

A feature may display the correct new blue, radius and surface because its old `--foo` alias maps to a new semantic role, while the component itself still belongs to an older local styling architecture.

Therefore the current app can be numerically/palette-consistent while still feeling compositionally inconsistent.

## 4.3 Light theme

The light theme is a near-white / cool-neutral system with Lifeweave blue as the strong semantic accent and restrained depth.

For the future endgame redesign, light is the only theme we need to optimize. Existing dark support is evidence of architecture quality but is out of redesign scope unless a frontend change would accidentally break shared code.

## 4.4 Atmosphere/art layer

`Atmosphere.tsx` is mounted once behind the application shell. The corresponding CSS builds static blue/cool ambient fields, lines/crosses/glints via gradients and CSS composition.

Positive engineering properties:

- static, not perpetual animation;
- `pointer-events: none`;
- `aria-hidden`;
- viewport-aware simplification;
- no domain semantics;
- one shared owner rather than one decorative system per screen.

Potential design risk to test in Phase 3:

- ambient blue/glass can either create a distinctive premium spatial field **or** become the exact “AI/vibe-app” signature we want to avoid if it competes with content, appears everywhere without semantic purpose, or makes every surface look equally luminous.

No visual verdict is made yet.

---

# 5. Typography architecture — one of the strongest parts, with an enforcement gap

`typography.css.ts` is unusually thoughtful.

## 5.1 Correct Windows optical-size families

The repo discovered that the umbrella `"Segoe UI Variable"` name did not resolve as expected in the target WebView2 and switched to explicit Windows families:

- `Segoe UI Variable Small`
- `Segoe UI Variable Text`
- `Segoe UI Variable Display`

That is a real implementation-quality improvement, not visual cargo culting.

## 5.2 Editorial family

ADR 0045 authorizes one self-hosted editorial family: **Literata Variable**.

The implementation deliberately ships only needed subsets:

- Latin;
- Vietnamese.

It avoids loading all upstream subsets and keeps italics out of startup where possible.

## 5.3 Role vocabulary

The role system includes, among others:

- display;
- pageTitle;
- objectTitle;
- sectionTitle;
- editor body/H1/H2/H3;
- cardTitle;
- row;
- body/bodyStrong/compactBody;
- button/navigation/tab;
- label;
- metadata/caption.

The source states the intended rule explicitly:

> A surface picks a role; it never picks a size.

## 5.4 Actual last-mile contradiction

Many production feature styles still declare their own font sizes directly, for example:

- `LifeGraph.css.ts` — node title/meta, inspector text, controls, table;
- `LifeEditWorkspace.css.ts` — compact metadata, fields, inspector, instructions;
- `NarrativeCanvas.css.ts` — numerous heading/metric/control/block sizes;
- `GlobalSearchDialog.css.ts` — input/status/group/option sizes;
- `TagSettings.css.ts` — input/table/warning/merge text sizes;
- `BackupSettings.css.ts` — heading/subheading/table/status styles;
- `TaskInspector.css.ts` — multiple local sizes;
- `FocusPlansScreen.css.ts` — substantial local typography/geometry decisions.

This is one of the clearest Phase 2 findings:

> **Typography has a strong authority but incomplete adoption/enforcement.**

That can create exactly the “almost coherent” product feel that fails at flagship level: nothing looks obviously wrong, yet rhythm, density and hierarchy shift subtly by surface.

## 5.5 Code-comment drift inside the type layer

`globalType.css.ts` contains commentary describing headings as editorial. The actual `typography.css.ts` confirms current page/object/section title roles *are* Literata, so the main behavior is consistent; however, some comments elsewhere in the reconstruction history reflect prior design iterations. Future agent prompts must privilege current role values over stale prose.

---

# 6. Motion architecture

The motion layer is finite and named rather than arbitrary.

Vocabulary includes durations around:

- instant ~80ms;
- quick ~120ms;
- base ~160ms;
- slow ~240ms;
- deliberate ~320ms;

and named easing/transition property sets.

Important properties:

- no `transition: all` policy;
- reduced motion is designed rather than simply setting everything to ~0ms;
- transform-based lift/press is intentionally tiny;
- shared recipes exist for focus, rows, controls, icons, selected emphasis, disclosure and modal surfaces.

This is a strong basis for endgame motion.

The remaining Phase 3/5 question is not “does motion infrastructure exist?” It is:

> Are screen transitions and microinteractions spatially meaningful enough to create a memorable product identity, or is the vocabulary technically clean but visually ordinary?

That cannot be answered from source alone.

---

# 7. Icons

`frontend/src/design-system/visual/icons.tsx` is generated from a curated **22-icon Fluent System Icons subset**.

Key engineering choices:

- predominantly 20px regular weight;
- `currentColor`;
- filled forms only where state semantics justify them;
- named exports for tree-shaking;
- icon itself is `aria-hidden`; control supplies accessible name;
- source-generation script provides reproducibility;
- repository gate rejects Unicode-glyph pseudo-icons.

This is coherent and disciplined.

Endgame Phase 5 may still decide Fluent's visual personality is too generic for the product. If so, the architecture is already prepared for replacement because icon ownership is centralized/generated. There is no need to make that decision before visual evidence.

---

# 8. Shared primitives and the “last-mile convergence” problem

## 8.1 Controls

`design-system/primitives/controls.css.ts` provides shared visual recipes for primary/secondary/ghost/destructive buttons and icon/compact variants.

`app/layout/layout.css.ts` also provides a global native-control geometry floor.

However, there is no single universal React `<Button>` abstraction that every feature must consume. As a result, production still has three patterns:

1. shared control recipe;
2. native element inheriting global floor;
3. feature-local CSS for button/input/select/tabs.

All three can pass the token residue gate while still differing optically.

This is likely one of the highest-leverage convergence targets later.

## 8.2 States

`design-system/primitives/States.tsx` provides:

- `EmptyState`;
- `SkeletonList`;
- `LoadingRow`.

`states.css.ts` explicitly documents the previous problem: many bare “No x.” and “Loading…” strings existed.

This is good system work.

### Concrete residual duplication

The shared state stylesheet says its `srOnly` utility should be the canonical surviving implementation. Yet production still includes local hidden-text utilities such as:

- `NarrativeCanvas.css.ts` → `srOnly`;
- `TagSettings.css.ts` → `srOnly`;
- `BackupSettings.css.ts` → `visuallyHidden`.

This is not just aesthetic speculation. It is direct evidence that the migration is unfinished at component-grammar level.

## 8.3 Dialogs

`DialogSurface.tsx` centralizes geometry but deliberately does **not** centralize every modal behavior. That is a good separation because existing Escape/focus/semantic behavior remains owned by the dialog when needed.

There is also `DecisionDialog`, which uses the shared modal focus trap.

The repo therefore has a viable path to converge dialog appearance without destabilizing business flows.

---

# 9. App shell and route architecture

`App.tsx` owns the application shell and destination state.

Primary destinations traced:

- Today;
- Calendar;
- Analytics;
- Plans;
- Life System;
- Settings.

Global/secondary surfaces include:

- Global Search;
- shortcut help;
- backup/restore flows;
- task dialogs;
- editor/narrative flows;
- Life package/link dialogs.

Important implementation details:

- `Atmosphere` is mounted exactly once;
- several heavy surfaces are lazy-loaded;
- Today remains default/startup;
- focus management exists on destination changes;
- Life entry can alter sidebar presentation;
- search can navigate to multiple domain entities.

The shell itself uses a 260px expanded sidebar and a compact collapsed state.

### Phase 3 question

The source cannot answer whether the sidebar, main viewport and ambient field currently achieve premium spatial balance. This must be judged from screenshot evidence, not inferred from the existence of a 260px token.

---

# 10. Surface-by-surface architecture trace

This section intentionally records **code maturity and convergence**, not visual beauty.

## 10.1 Today

### Strengths

- uses `PageFrame type="wide"`;
- real page header;
- shared split workspace;
- inspector loads lazily;
- no inspector rail is reserved when nothing is selected;
- time groups preserve task-first semantic structure;
- rows are keyboard-operable;
- task dialog uses shared dialog/form geometry;
- timer/assessment states are real product states, not mock UI;
- inspector uses shared spacing tokens and shared glass material.

### Residual local grammar

- inspector defines its own typography sizes;
- inspector tab/control geometry is private;
- link rows use a local button-like pattern;
- Today edge/timer UI still owns local rhythm;
- some legacy compatibility var fallbacks remain in nearby styles.

### Preliminary classification

**Foundation adoption: high. Last-mile convergence: medium-high. Visual quality: unjudged.**

Today is the likely existing North-Star candidate, but Phase 3 may still reject its art direction.

---

## 10.2 Calendar

### Strengths

- shared wide page frame;
- responsive grid behavior;
- geometry audit coverage is strong;
- current craft ledger marks Calendar `VERIFIED` under its prior Task 51 bar;
- calendar cell/load-bar dimensions were deliberately corrected during recovery.

### Residual local grammar

- segmented controls/toolbar/buttons contain private dimensions and spacing;
- some direct `color-mix` / local surface composition remains;
- week strip has its own date-button geometry.

### Preliminary classification

**Geometry maturity: high. System convergence: medium-high. Visual quality: unjudged.**

---

## 10.3 Analytics

### Strengths

- shared wide frame;
- intentional data composition, not a random dashboard library;
- explicit summary/streak/facts structures;
- responsive facts grid;
- empty/loading states are part of the coverage plan.

### Risk

Analytics naturally uses tiles/panels, so it is where an otherwise disciplined app can drift into generic SaaS dashboard language.

Source alone cannot determine whether its enclosure density is justified. Phase 3 must evaluate:

- whether tiles create information hierarchy or merely boxes;
- whether numerical typography dominates appropriately;
- whether summary/secondary facts have enough separation without excessive chrome.

### Preliminary classification

**Architecture maturity: medium-high. Cardification risk: visual check required.**

---

## 10.4 Focus Plans

This is one of the clearest convergence-debt surfaces from source inspection.

`FocusPlansScreen.css.ts` imports shared visual authority but still owns many local decisions for:

- gaps/padding;
- tabs;
- cards/list items;
- action groups;
- inputs;
- detail areas;
- typographic sizing;
- selected/open plan presentation.

The existing Task 51 ledger itself records that card nesting, stretched create group, boxed tabs and a dead detail frame had to be repaired, while many states remain `PARTIAL`.

### Preliminary classification

**Foundation adoption: medium. Last-mile convergence debt: high. Priority for Phase 3: high.**

---

## 10.5 Life Browse

Life Browse uses shared page/visual roles but contains product-specific hierarchy, child node surfaces and actions.

The prior coverage ledger records that it was deliberately changed from a card-inside-card presentation toward a more bounded left-anchored hierarchy.

### Risk

Life is structurally different from Task. Forcing Task-style primitives onto it would be a mistake. The goal later should be **shared grammar, specialized composition**, not identical layout.

### Preliminary classification

**Specialized surface; requires visual hierarchy review rather than token normalization alone.**

---

## 10.6 Life Edit

`LifeEditWorkspace.css.ts` combines:

- shared split workspace;
- local scroll canvas;
- positioned tree nodes;
- drag/drop states;
- inspector;
- controls and archive list.

It has strong structural logic but substantial private visual grammar:

- node size/padding;
- inspector panel styling;
- field/input/button patterns;
- metadata typography;
- drag overlay.

Because drag/drop/tree canvas is a legitimate specialized interaction, not all local values should be eliminated.

### Preliminary classification

**Specialized geometry justified; visual/control convergence still incomplete.**

---

## 10.7 Life Graph

`LifeGraph.css.ts` uses the shared split workspace but specializes:

- two-dimensional scroll canvas;
- SVG hierarchy/link edges;
- 152px graph nodes;
- inspector;
- relationship tables;
- direction/kind encoding beyond color.

Accessibility is considered: link types use dash/arrow/thickness semantics, not color alone.

Private control/input/button typography remains.

### Preliminary classification

**Good semantic graph engineering; visual DNA must be evaluated as a separate family in Phase 3.**

---

## 10.8 Basic Leaf Reader / Editor

`BasicLeafDocument.css.ts` is one of the stronger examples of shared-system consumption:

- shared primary/secondary button recipes;
- explicit `text.editorBody`;
- reading/editor structure;
- responsive outline via container query;
- sticky toolbar;
- consistent editor surface;
- image/table/pre/blockquote grammar.

There are still local spacing values, which can be appropriate for editorial typography.

### Preliminary classification

**System convergence: high relative to most specialized surfaces.**

This family is a strong candidate for preserving a distinct editorial mode rather than forcing the whole app into one density.

---

## 10.9 Narrative Reader / Studio

Narrative is intentionally richer and owns approved Visual Worlds.

Strengths:

- uses shared button recipes in many places;
- has real reader/studio modes;
- visual-world palettes are explicit semantic systems rather than random raw colors;
- heavy Narrative Studio is lazy;
- import/export and decision states have test coverage.

Convergence debt:

- many local font sizes and block styles;
- local field/input styling;
- local scene-tab grammar;
- local `srOnly` duplicates the shared accessibility utility;
- metric/callout/studio blocks create substantial enclosure opportunities.

### Preliminary classification

**High art-direction opportunity + high fragmentation risk.**

Narrative should not be visually flattened into Settings, but it must still feel unquestionably like Lifeweave.

---

## 10.10 Global Search

Strong structural choice:

- uses shared dialog geometry;
- top-anchored command-palette positioning is explicitly treated as an exception, not a random modal;
- internal results own scroll;
- search cancel glyph is removed for deterministic/custom UI;
- focus semantics are tested elsewhere.

Residual debt:

- local type sizes across input/headings/results;
- custom close button;
- compatibility fallbacks such as `var(--x, var(--x))` remain;
- group/option visual grammar is locally implemented.

### Preliminary classification

**Good modal architecture; moderate surface-level cleanup opportunity.**

---

## 10.11 Settings / Tags / Backup

Settings is a critical coherence test because it contains dense forms/tables and low-glamour utility flows.

### Tag settings

Strengths:

- shared page spacing and local-scroll table region;
- real merge/archive/restore semantics;
- loading skeleton;
- focus restoration after merge;
- table structure remains semantic HTML.

Debt:

- local input/select styling;
- native buttons partly rely on global floor rather than shared recipe;
- local `srOnly`;
- local type sizes;
- merge confirmation is another local surface pattern.

### Backup settings

Strengths:

- shared page rhythm;
- shared dialog geometry;
- semantic status/error flows;
- table scroll ownership.

Debt:

- local primary/secondary button styles;
- local heading/type sizes;
- local `visuallyHidden`;
- compatibility fallback vars.

### Preliminary classification

**Settings family is functionally serious but likely a major test of whether the visual system truly reaches boring/utility surfaces. Phase 3 priority: high.**

---

# 11. UI completeness is NOT the primary problem

`docs/audits/task-51-feature-ui-completeness.md` traced capability reachability mechanically.

At its recorded audit point:

- 117 registered Rust/Tauri handlers;
- 117 had frontend consumers;
- 0 orphaned handlers;
- 101 decided capabilities were UI-complete;
- no confirmed `UI-MISSING` capability remained;
- two unreferenced components were intentionally isolated prototypes.

The audit explicitly concluded that remaining Task 51 work was **visual convergence, not feature recovery**.

This is extremely important for the new redesign.

It means the implementation strategy should resist the temptation to touch Rust/database/domain layers simply because a frontend composition is awkward. The existing capabilities are already present; the challenge is to expose them with much better visual/information architecture.

---

# 12. Visual-state / coverage infrastructure

The original Task 51 visual matrix enumerated 78 surface/state rows plus global axes including theme, motion, forced colors, sidebar, inspector, viewport, DPI and language.

That matrix was a planning artifact. The repo later advanced beyond it.

The current craft ledger reports **105 tracked goldens** across light/maximized, light/minimum, dark/maximized, forced-colors and Vietnamese sets, plus real WebView geometry evidence and reduced-motion walks.

Important interpretation:

> 105 goldens with zero diff prove **stability against the approved current baseline**, not excellence of that baseline.

The repo's own ledger is explicit about this: a surface is not `VERIFIED` merely because it inherits the palette, glass, typography or shared controls.

In the current ledger excerpt:

- WeekStrip is `VERIFIED`;
- Calendar is `VERIFIED`;
- most major product surfaces remain `PARTIAL` under the older Craft-class closure rubric because states/review axes are incomplete.

Examples marked `PARTIAL` include:

- shell;
- Today;
- Today inspector;
- Today workspace tabs;
- task dialog;
- Analytics;
- Plans;
- Life Browse/Edit/Pinned/Graph;
- Basic Reader/Editor;
- Narrative;
- Search;
- Settings;
- several edge/dialog families.

This is excellent evidence discipline: the repo itself does not pretend that regression coverage equals design verification.

---

# 13. Visual-regression implementation quality

`e2e-tests/visual-baselines/README.md` documents an unusually disciplined native visual process:

- goldens are approved production baselines;
- actual/diff output is untracked evidence;
- baseline creation is opt-in and separate from compare;
- normal comparison cannot silently accept changes;
- caret blink/native WebView caret drift is normalized without losing focus state;
- 125% DPI rounding behavior is documented;
- dark/forced colors/reduced motion/Vietnamese have dedicated audit paths;
- replacement workflow requires first inspecting the diff;
- threshold widening and auto-refreshing are explicitly prohibited;
- scrollbars may not simply be hidden to make a comparison pass.

This should be preserved in the eventual endgame implementation. We do not need to reinvent visual regression; we need to point it at a better final baseline.

---

# 14. Accessibility posture

The repo's accessibility posture is stronger than typical visual-redesign projects.

Observed design/engineering patterns include:

- native semantics preferred;
- icon-only controls require accessible names;
- focus restoration and modal focus trapping;
- forced-color rules;
- reduced-motion variants;
- no meaning by color alone in graph edges / state indicators;
- live regions for pending/announcements;
- skeletons hidden from screen readers with real status text separately announced;
- keyboard parity tracked as a closure dimension;
- Vietnamese glyph/rendering evidence;
- honest recording of Narrator/DPI gaps rather than fabricated PASS claims.

For the new target, accessibility should be treated as a **constraint on interaction clarity**, not as a reason to accept mediocre aesthetics.

---

# 15. Performance constraints that matter to redesign

Task 51's performance budget system pins:

- chunk identities;
- expected chunk count;
- startup chunk ceiling;
- total raw/gzip ceilings;
- unknown-chunk threshold;
- explicit failure for missing/duplicate/unexpected large chunks.

Historical Task 51 budget evidence records a 550,000-byte locked `index.js` ceiling and careful lazy ownership for editor, Narrative, Focus Plans and inspector features.

At the recorded budget checkpoint, gzip aggregate headroom was especially thin (~1.1 KB).

Because those measurements were made at an earlier Task 51 commit, they must be remeasured at the current implementation before execution planning. The architectural lesson remains valid:

> Do not solve “endgame art” by dumping a large runtime visual dependency into startup.

Preferred future strategy:

- CSS/procedural/static effects first;
- local assets only when they create clear value;
- lazy-load specialized art/editor/graph tooling;
- reuse existing render layers;
- reclaim dead compatibility code while converging;
- measure every meaningful bundle change.

WebGPU/shader libraries are **not** a prerequisite for endgame quality and would need a very strong screen-specific justification under this budget.

---

# 16. Major structural strengths to preserve

These are architecture assets, not visual decisions, and should survive unless Phase 5 finds a compelling reason otherwise:

1. **Frontend/backend boundary.**  
   UI can be radically recomposed without rewriting stable Rust/domain code.

2. **One geometry authority.**  
   Prevents page-width/dialog/overflow chaos.

3. **Container-aware layouts.**  
   Better than viewport-only responsiveness for desktop workspace components.

4. **Typed visual contract.**  
   Makes color/radius/elevation migration tractable.

5. **Finite motion vocabulary.**  
   Good base for high-end spatial motion.

6. **Role-based typography + correct Segoe optical families.**  
   Very strong technical base.

7. **Single authorized editorial family.**  
   Prevents font soup.

8. **Generated/tree-shakeable icon vocabulary.**

9. **Shared modal geometry + focus infrastructure.**

10. **Real Windows/WebView2 geometry/visual regression.**

11. **Feature completeness evidence.**  
    Lets redesign focus on presentation rather than feature recovery.

12. **Performance budgets.**  
    Prevents a visually ambitious pass from silently degrading startup.

---

# 17. Major structural weaknesses / opportunities

These are the highest-confidence Phase 2 issues.

## P0 — Typography authority is not fully enforced

**Evidence:** typography source says surfaces choose roles, yet many feature styles choose raw sizes/weights.

**Why it matters:** subtle cross-screen density/hierarchy drift survives even when font families/colors match.

**Later solution direction:** migrate repeated surface typography to explicit roles; allow documented specialized exceptions for graph/editor/narrative only when optically justified.

---

## P0 — Spacing authority is finite but not strongly enforced at feature level

**Evidence:** many features use raw `5/6/7/9/10/14/18/20px` gaps/padding despite the shared 4-derived ramp and semantic aliases.

**Why it matters:** this is probably the largest source of micro-rhythm inconsistency left after color/radius cleanup.

**Important:** do not mechanically snap every optical correction to multiples of 4. The goal is a semantic spacing grammar with explicit optical exceptions, not numerology.

---

## P0 — Control grammar has multiple ownership paths

Shared control recipes exist, but many screens still style native buttons/inputs/selects locally or rely on the global native floor.

**Why it matters:** buttons, tabs, fields and small actions are repeated hundreds of times; tiny divergence compounds into “different-era” UI.

**Later direction:** shared component grammar should own visual/interaction variants, while feature CSS owns only composition.

---

## P1 — Accessibility utility duplication remains

Private `srOnly`/`visuallyHidden` implementations remain after a shared canonical utility was introduced.

This is low visual severity but high signal: it proves migration cleanup has not fully converged.

---

## P1 — Compatibility alias layer can hide architectural debt

The current alias bridge is useful but can make old call sites look “updated” because values resolve to the new palette.

**Later direction:** after North Star is locked, migrate call sites to semantic typed ownership instead of preserving legacy names indefinitely.

---

## P1 — Specialized surfaces own too much local styling

Focus Plans, Life Edit/Graph, Narrative, Tags and Backup contain many private control/typography/spacing choices.

Some specialization is correct. The future design spec must distinguish:

- **specialized composition** — allowed/encouraged;
- **specialized visual grammar for a generic button/field/tab** — usually debt.

---

## P1 — Global atmosphere/glass is a potential “vibe-app” failure mode

Engineering is controlled and static, but visual evidence is needed to determine whether:

- depth/material supports hierarchy;
- glass is used semantically;
- atmosphere is quiet enough;
- decorative blue fields make the product feel premium or generic.

Do not pre-judge either way before Phase 3.

---

## P2 — Process/doc freshness

README/tasks/PR evidence are partially stale relative to current remote state.

This is not a visual defect, but future agents need a generated execution ledger with an exact baseline SHA to avoid repeating old work.

---

# 18. Screen families that should be compared together in Phase 3

Do **not** review screenshots as isolated images. The following cross-screen families should be inspected as systems:

## Family A — Core productivity

- Shell/sidebar
- Today
- Today inspector
- WeekStrip
- Calendar
- Analytics

Questions:

- Does the shell remain spatially stable while content density changes?
- Are Today/Calendar/Analytics visibly one product without forcing identical composition?
- Does spacing cadence remain consistent across sparse and dense surfaces?
- Are active/selected/focus states semantically related?

## Family B — Planning / relational work

- Focus Plans overview
- Focus Plan detail
- Life Browse
- Life Edit
- Life Pinned
- Life Graph

Questions:

- Does relationship hierarchy feel intentional rather than “cards for everything”?
- Do specialized canvases still use the same control/type/depth language?
- Does Life feel like a deeper mode of the same product, not a second app?

## Family C — Editorial

- Basic Leaf Reader
- Basic Leaf Editor
- Narrative Reader
- Narrative Studio
- Visual Worlds

Questions:

- Is the Literata/system-sans duality elegant or too dramatic?
- Does reading mode gain serenity without losing Lifeweave identity?
- Are Visual Worlds a coherent “different key” or an embedded foreign app?

## Family D — Utility / edge

- Search
- Settings
- Tags
- Backup/Restore
- dialogs
- comboboxes/pickers
- empty/loading/error
- keyboard help

Questions:

- Does quality collapse when the app reaches boring utility UI?
- Are form controls as crafted as primary screens?
- Are modal surfaces spatially related to their origin?
- Are empty/error/loading states designed, not merely styled?

---

# 19. Preliminary endgame opportunities — NOT YET prescriptions

These are hypotheses to test visually, not final redesign instructions.

1. **Reduce last-mile private typography.**  
   Likely high payoff for coherence.

2. **Create a stronger semantic spacing grammar.**  
   Keep optical exceptions; remove accidental values.

3. **Converge control grammar.**  
   A small number of exact button/field/tab/list-row primitives can lift dozens of surfaces.

4. **Make depth rarer and more meaningful.**  
   If Phase 3 shows glass/elevation everywhere, use it only for semantic layer changes.

5. **Use editorial typography as a controlled mode, not a global decorative signature.**  
   Current role architecture supports this decision either way.

6. **Treat Analytics, Graph and Narrative as specialized composition stress tests.**  
   They should prove that the design system can stretch without fragmenting.

7. **Preserve the current verification infrastructure.**  
   Replace goldens only after a new North Star is explicitly approved.

8. **Exploit frontend-only freedom through composition, not backend rewrites.**

---

# 20. What Phase 2 cannot establish

The following questions are intentionally unanswered until screenshot review:

- Is the current sidebar proportion visually correct?
- Is Literata attractive in the actual app or too editorial?
- Is the blue accent too saturated/too weak?
- Does glass feel premium or cheap?
- Does the ambient field add identity or generic vibe?
- Are radii too round?
- Is Calendar visually crowded?
- Does Analytics feel like generic SaaS?
- Does Focus Plans actually look less refined than Today?
- Is Life Graph attractive or merely functional?
- Are shadows/elevation optically correct?
- Are spacing values that look “off-ramp” actually needed optical corrections?
- Does typography scale feel balanced at real Windows DPR 1.25?
- Do all screens share a convincing master grid?
- Does the app have enough distinctive art direction to be endgame?

Any answer before Phase 3 would be overconfident.

---

# 21. Phase 3 entry protocol

**Next workflow phase: Phase 3 — Visual Evidence Audit.**

Per the agreed constraint, Phase 3 should inspect visual evidence **only from the repository's screenshot section/directory** unless the Product Owner explicitly broadens scope.

Phase 3 should:

1. inventory screenshot files without judging them first;
2. map each image to surface/state/viewport/date when possible;
3. classify screenshots as current/baseline/reference/stale/unknown;
4. visually inspect every relevant current screenshot at native resolution;
5. evaluate both per-screen quality and cross-screen continuity;
6. record issues separately as:
   - measured/visible defect;
   - system inconsistency;
   - trade-off;
   - art-direction judgement;
7. map each visual issue back to the code authority identified in Phase 2;
8. produce a Phase 3 Markdown report;
9. **do not redesign yet** — redesign begins only after Phase 4 root-cause synthesis.

---

# 22. Phase 2 risk register

| Risk | Confidence | Severity if confirmed visually | Phase 3 target |
|---|---:|---:|---|
| Cross-screen spacing rhythm drift | High | High | all families |
| Raw per-feature typography defeating role system | High | High | Plans/Life/Narrative/Search/Settings |
| Generic/private control grammar | High | High | Settings/Plans/Life/Search/dialogs |
| Glass/ambient art reading as generic vibe | Medium | Critical to endgame identity | shell/Today/Life/Settings |
| Analytics cardification | Medium | Medium–High | Analytics |
| Specialized Life UI feeling like separate app | Medium | High | Browse/Edit/Graph |
| Narrative visual grammar fragmenting product identity | Medium | High | Reader/Studio/Worlds |
| Editorial font overuse | Medium | Medium–High | headings across all screens |
| Inconsistent density between core and utility screens | High | High | Today vs Settings/Search |
| Existing goldens anchoring team to mediocre baseline | High conceptually | High | process, not screenshot defect |
| Performance budget constraining heavy art additions | High | High engineering impact | Phase 6–9 |
| Documentation drift confusing agents | High | Medium | execution planning |

---

# 23. Phase completion status

## Phase 0 — Quality Contract

**COMPLETE** (established before this report).

## Phase 1 — Repo Intake + Frozen Baseline

**COMPLETE for remote committed state.**

Locked:

`main @ a1078c1f91c251aaa7a453ef1e8a5108551c852d`

Local dirty-tree state remains intentionally unknown until an implementation agent runs locally.

## Phase 2 — Architecture Trace

**COMPLETE for design-relevant frontend architecture.**

Traced:

- governance/source authority;
- frontend/backend ownership;
- shell/routes;
- geometry authority;
- visual contract/light theme/material;
- typography;
- motion;
- icons;
- controls/states/dialogs;
- core screens;
- planning/Life/editorial/utility screen families;
- feature completeness evidence;
- performance constraints;
- Windows visual-regression architecture;
- current Task 51 coverage ledger and known gaps.

Backend internals were deliberately not deeply audited because the upcoming redesign is presentation-only and the repo already has independent completeness evidence.

## Phase 3 — Visual Evidence Audit

**NOT STARTED.**

No screenshot has been visually reviewed as part of this report.

---

# 24. Bottom line

Lifeweave is in a better starting position than a typical “vibe-coded” desktop app. Its existing engineering foundation is strong enough that a true endgame redesign does **not** require burning down the frontend.

But it is also not safe to declare the current product close to endgame just because:

- the token contract exists;
- raw colors/radii/shadows are at zero residue;
- tests pass historically;
- 105 goldens compare at zero diff;
- the prior program called its bar “Craft-class.”

Those are **quality-enabling mechanisms**, not the final quality itself.

The code reveals a clear frontier for the next phase:

> **Can the visual evidence prove that all these strong foundations produce one exceptional product — or does the last 10–20% of screen-level composition, spacing, typography, controls and art direction still separate Lifeweave from true flagship/endgame quality?**

Phase 3 exists to answer exactly that, without being biased by the intentions documented in the code.
