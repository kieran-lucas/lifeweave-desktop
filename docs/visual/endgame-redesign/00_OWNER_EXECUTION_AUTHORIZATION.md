# 00 — Product Owner Execution Authorization

**Status:** APPROVED — LATEST VISUAL OVERRIDE  
**Date:** 2026-08-11  
**Planning baseline:** `a1078c1f91c251aaa7a453ef1e8a5108551c852d`

This file records explicit Product Owner authority for Lifeweave visual work. The latest decision in this file supersedes every earlier aesthetic direction where they conflict.

## Current authorized objective

The Product Owner requires **Lifeweave — Monochrome Matte**: a premium Windows productivity experience rendered in **black, white and neutral gray only**.

This explicitly supersedes the earlier blue/white Flat Matte direction as well as prior glass, atmospheric and multicolor experiments.

The Product Owner explicitly requires:
- no chromatic accent color, including blue;
- no red/green/orange semantic presentation in normal rendering; meaning must also be carried by text, icon, geometry and contrast;
- no glass, acrylic, frosted or translucent persistent material;
- no decorative background atmosphere, stars, petals, orbit lines, auras or wallpaper art;
- no colored or monochrome decorative gradients used as spectacle;
- no glow/bloom;
- white regions remain genuinely white/neutral paper;
- dark identity regions remain genuinely black/deep neutral;
- tactile character comes from extremely fine shared matte grain and disciplined physical edges;
- a substantially richer icon vocabulary, while keeping one coherent monochrome icon family;
- the desktop application icon must use the same black/white identity and remain legible at small Windows icon sizes.

The desired first impression is **sharp, tactile, authored and expensive**. The product should create visual impact through proportion, typography, contrast, icon quality, spacing and coherent inversion—not color or effects.

This remains a frontend art-direction override only. Preserve real product capabilities, domain contracts, local-first behavior, data safety, keyboard semantics, geometry authority and governed performance limits.

## Superseded visual constraints

Earlier instructions are superseded wherever they authorize or require:
- blue as identity/accent;
- blue focus, selection, completion or progress presentation;
- semantic red/green/orange presentation where monochrome structure can carry the same status;
- global abstract-anime atmosphere;
- painted color washes;
- blue→indigo→violet identity;
- decorative stars/petals/orbits/sigils;
- persistent glass/acrylic/frosted/translucent presentation;
- glow as a state or identity mechanism;
- tinted selected fills.

The current authority instead requires:
- pure white / near-black primary planes;
- neutral gray only for hierarchy and state separation;
- black/white inversion for strong selected/current/primary states;
- one subtle shared matte grain recipe;
- no decorative background layer;
- varied but stylistically unified icons sourced through the existing governed icon system where practical.

Old visual-reference PNGs remain capability/composition evidence only; their colors are not authoritative.

`01_DESIGN_SYSTEM_AUTHORITY.md` contains the current visual language.

## Reversible frontend authority

For reversible, in-scope frontend presentation decisions, the implementation agent may choose the strongest solution without routine Product Owner confirmation. This includes shared material recipes, icon assignment, typography application, component presentation, bounded motion, deterministic fixtures and visual verification.

Decision order:
1. immutable product/domain/data-safety authority;
2. this latest Product Owner authorization;
3. current design-system authority;
4. proven geometry/accessibility/performance constraints;
5. real source capability;
6. strongest reversible monochrome visual result.

## Safe fallback authority

If a choice would expand product or data risk, use the safest in-scope fallback:
- uncertain dependency → do not add it;
- uncertain backend/schema/domain change → leave it unchanged;
- uncertain capability → do not invent it;
- uncertain destructive action → do not perform it;
- uncertain workflow/seal change → leave it untouched;
- visual ambition vs product correctness → preserve correctness and achieve the effect in presentation only.

## Hard boundaries

Still forbidden without a separate Product Owner decision:
- new product capabilities;
- backend/domain/schema/database/migration changes;
- hand-editing generated IPC bindings;
- heavy dependencies merely for visual effect or icon variety;
- `.github/workflows/` or workflow-seal changes;
- deleting or mutating real user data;
- raising locked performance ceilings;
- remote runtime decorative assets;
- copyrighted anime characters/fan art;
- gacha, loot-box or dense cyberpunk framing.

## Quality requirement

Passing tests is necessary but not sufficient. Visual completion requires rendered Product Owner acceptance. A result that is technically correct but still looks colored, glassy, washed-out, effect-heavy, icon-poor, inconsistent between deep workflows or enterprise-default is **not endgame**.

Retain the strong product foundation—layout, semantics, tests, component convergence and safety—and evolve the presentation layer rather than rebuilding product logic.
