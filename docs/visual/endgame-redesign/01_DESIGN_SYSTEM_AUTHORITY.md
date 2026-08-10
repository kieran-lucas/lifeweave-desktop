# 01 — Design System Authority

**Status:** current Product Owner visual authority.  
**Art direction:** **Lifeweave — Monochrome Matte**.  
**Target:** a flagship Windows productivity application built from black, white and neutral gray only, with tactile matte surfaces, high-quality iconography, disciplined contrast and no decorative-background noise.

This authority supersedes every earlier aesthetic rule that implies blue/chromatic accents, glass/acrylic, atmospheric illustration, multicolor theming, tint washes or effect-led premium styling. Product capability, local-first/data safety, geometry authority, keyboard behavior and semantic accessibility remain unchanged.

## 1. Core visual thesis

Lifeweave is a **precise monochrome work instrument with tactile editorial character**.

The visual system has three color classes only:
- white / near-white paper;
- black / near-black ink and identity planes;
- neutral gray for hierarchy, disabled states, separators and quiet interaction feedback.

Impact must come from composition, typography, spacing, icon shape, optical alignment, line weight, inversion and material tooth—not hue.

## 2. Material law — OPAQUE, MATTE, ZERO-CHROMA

Every persistent surface is opaque.

Canonical layers:
1. **paper canvas** — white in Light, near-black in Dark;
2. **ink plane** — near-black in Light, near-white in Dark, reserved for strong identity/current/primary states;
3. **paper surface** — content, cards, forms, tables, editors and dialogs;
4. **neutral rule** — gray structural borders and separators;
5. **ink edge** — black/white underline, inset rule or outline for selection/focus;
6. **floating paper** — popover/dialog with modest neutral physical elevation only when separation requires it.

Forbidden material mechanisms:
- backdrop blur;
- translucent persistent fills;
- glass/acrylic/frosted treatment;
- chromatic color;
- glow/bloom;
- tint blending;
- decorative gradients;
- specular highlights.

Legacy source/token names such as `accent`, `glass`, `danger` may remain for compatibility, but their normal rendered values must remain zero-chroma.

## 3. Texture

Texture exists only to make flat surfaces feel dry and tactile.

Allowed:
- one shared extremely sparse micro-speckle/paper-tooth recipe;
- subtle neutral fiber variation that does not change the perceived base color;
- no texture on Dark surfaces when it harms clarity.

Forbidden:
- photographic texture;
- visible repeating stripes;
- watercolor/gouache wash;
- gradients used as texture;
- feature-specific decorative texture systems;
- noise that competes with text or icons.

## 4. Background law — NO DECORATIVE ATMOSPHERE

No stars, petals, particles, orbit/weave lines, auras, decorative SVG fields, brush scenery, wallpaper motifs or continuously animated ambient art.

Page identity comes from information architecture and solid composition.

## 5. Color and semantic state

Normal rendering uses **zero chroma**.

Light target:
- canvas/surface: `#FFFFFF` family;
- strong ink: `#111111` family;
- secondary text/borders: neutral grays only.

Dark target is the same system inverted.

Status meaning must never depend on hue. Error/destructive/success/completion states use combinations of:
- explicit text/icon labels;
- border weight/style;
- fill inversion/value;
- shape and iconography;
- accessible semantics already present in the product.

## 6. Iconography — RICH BUT ONE FAMILY

Lifeweave should use a broad icon vocabulary wherever icons improve scanability or distinguish actions/features.

Rules:
- prefer the existing governed Fluent-derived icon pipeline;
- use distinct semantic glyphs instead of repeatedly reusing generic dots/arrows when an existing suitable glyph exists;
- user-defined categories may be deterministically assigned among a curated fallback set without changing domain data;
- all icons remain monochrome `currentColor` drawings;
- maintain consistent optical size, stroke/fill character and alignment;
- no emoji, Unicode icon glyphs, clip-art, multicolor symbols or mixed icon libraries;
- icon-only controls retain accessible names/tooltips where required;
- do not add a heavy runtime dependency merely to increase icon count.

## 7. Application icon

Canonical desktop identity:
- solid black rounded-square field;
- centered continuous white Lifeweave infinity mark;
- strong silhouette at 16–32 px;
- no gradient, glow, shadow, border decoration or color;
- the shell mark and packaged Windows icon must visibly belong to the same identity system.

Canonical source: `assets/brand/lifeweave-app-icon.svg`.
Generated bundle outputs live under `src-tauri/icons/`.

## 8. Typography and hierarchy

Keep Segoe UI Variable for operational UI and Literata Variable where authored/editorial content already justifies it.

With color removed, typography must carry more hierarchy through:
- deliberate weight steps;
- compact metadata;
- disciplined numeric treatment;
- restrained editorial contrast;
- line length and spacing rather than oversized decorative type.

## 9. Motion — CONTINUITY, NOT EFFECT

- state commits before motion;
- short opacity/transform transitions only where they clarify continuity;
- 1 px press/lift is acceptable;
- no animated blur, glow, gradients, background art or continuous ambient loops;
- use one easing vocabulary across surfaces;
- Reduced Motion removes travel and keeps short tonal feedback;
- no interaction should visibly stutter because of paint-heavy effects.

## 10. Shell

The shell is the strongest inversion composition:
- Light: black sidebar + white workspace;
- Dark: white/light sidebar + black workspace;
- current navigation inverts against the sidebar plane;
- icons are a major navigation differentiator;
- no avatar/profile/meetings or invented capability;
- no atmosphere, gradient, glow or translucency.

## 11. Surface continuity

Today, Calendar, Analytics, Focus Plans, Life, Reader/Editor/Narrative, Search, Settings, dialogs and interchange flows share:
- the same paper/ink/neutral material family;
- the same grain density;
- the same border and selected-state grammar;
- the same monochrome icon vocabulary;
- the same motion cadence.

No deep workflow may reintroduce color or default enterprise chrome.

## 12. Geometry, capability and accessibility remain locked

Preserve:
- standard / wide / reading frame taxonomy;
- reading measure discipline;
- real Task/Calendar/Life/Focus Plan capability boundaries;
- semantic control meaning and keyboard parity;
- visible focus, Reduced Motion and forced-colors behavior;
- no backend/schema/domain/generated-IPC change for aesthetics;
- no remote runtime decorative assets;
- governed performance ceilings.

## 13. Rejection test

A visual change fails if it can be described as:
- blue-accented;
- chromatic;
- glassy/frosted;
- gradient/glow-heavy;
- wallpaper/decorative-background-led;
- icon-poor or icon-inconsistent;
- generic enterprise/SaaS styling;
- a different design language inside a deep workflow.

A successful result remains recognizable with all copy replaced by gray bars: **hard black/white inversion, dry matte paper, disciplined neutral rules, distinctive monochrome iconography and one coherent geometry/motion language**.
