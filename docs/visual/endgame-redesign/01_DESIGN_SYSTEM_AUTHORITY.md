# 01 — Design System Authority

**Status:** current Product Owner visual authority.  
**Art direction:** **Lifeweave — Monochrome Matte**.  
**Target:** a flagship **Light-only** Windows productivity application built from black, white and neutral gray only, with tactile matte surfaces, high-quality iconography, disciplined contrast and no decorative-background noise.

This authority supersedes every earlier aesthetic rule that implies blue/chromatic accents, Dark mode, glass/acrylic, atmospheric illustration, multicolor theming, tint washes or effect-led premium styling. Product capability, local-first/data safety, geometry authority, keyboard behavior and semantic accessibility remain unchanged.

## 1. Core visual thesis

Lifeweave is a **precise monochrome work instrument with tactile editorial character**.

The visual system has three color classes only:
- white / near-white paper;
- black / near-black ink and identity planes;
- neutral gray for hierarchy, disabled states, separators and quiet interaction feedback.

Impact must come from composition, typography, spacing, icon shape, optical alignment, line weight, inversion and material tooth—not hue.

## 2. Theme law — ONE LIGHT RUNTIME

Lifeweave has exactly one product theme: **Light**.

Rules:
- do not assign product tokens from `prefers-color-scheme: dark`;
- do not expose a Dark toggle or Dark preference;
- do not maintain a parallel Dark token file or Dark Narrative palette;
- do not require Dark visual goldens or Dark acceptance captures;
- forced-colors remains an accessibility/system override and is not a product theme;
- Reduced Motion remains supported and is independent of color theme.

## 3. Material law — OPAQUE, MATTE, ZERO-CHROMA

Every persistent surface is opaque.

Canonical layers:
1. **paper canvas** — pure/near white;
2. **ink plane** — near-black, reserved for strong identity/current/primary states;
3. **paper surface** — content, cards, forms, tables, editors and dialogs;
4. **neutral rule** — gray structural borders and separators;
5. **ink edge** — black underline, inset rule or outline for selection/focus;
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

## 4. Texture

Texture exists only to make flat surfaces feel dry and tactile.

Allowed:
- one shared extremely sparse micro-speckle/paper-tooth recipe;
- subtle neutral fiber variation that does not change the perceived base color.

Forbidden:
- photographic texture;
- visible repeating stripes;
- watercolor/gouache wash;
- gradients used as texture;
- feature-specific decorative texture systems;
- noise that competes with text or icons.

## 5. Background law — NO DECORATIVE ATMOSPHERE

No stars, petals, particles, orbit/weave lines, auras, decorative SVG fields, brush scenery, wallpaper motifs or continuously animated ambient art.

Page identity comes from information architecture and solid composition.

## 6. Color and semantic state

Normal rendering uses **zero chroma**.

Canonical palette:
- canvas/surface: `#FFFFFF` family;
- strong ink: `#111111` family;
- secondary text/borders: neutral grays only.

Status meaning must never depend on hue. Error/destructive/success/completion states use combinations of explicit text/icon labels, border weight/style, fill inversion/value, shape/iconography and accessible semantics already present in the product.

## 7. Iconography — RICH BUT ONE FAMILY

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

## 8. Application icon

Canonical desktop identity:
- Lifeweave blue-to-violet rounded-square field;
- centered woven-W mark: a white outer life path crossed by a pale secondary thread;
- the paths converge on a compact diamond, expressing life areas woven around focused work;
- strong silhouette at 16–32 px;
- no text, checkmark, calendar, leaf, copied third-party geometry, remote asset or decorative shadow;
- the shell mark and packaged Windows icon must visibly belong to the same identity system.

Canonical source: `assets/brand/lifeweave-app-icon.svg`.
Generated bundle outputs live under `src-tauri/icons/`.

## 9. Typography and hierarchy

Keep Segoe UI Variable for operational UI and Literata Variable where authored/editorial content already justifies it.

With color removed, typography must carry more hierarchy through deliberate weight steps, compact metadata, disciplined numeric treatment, restrained editorial contrast, line length and spacing rather than oversized decorative type.

## 10. Motion — CONTINUITY, NOT EFFECT

- state commits before motion;
- short opacity/transform transitions only where they clarify continuity;
- 1 px press/lift is acceptable;
- no animated blur, glow, gradients, background art or continuous ambient loops;
- use one easing vocabulary across surfaces;
- Reduced Motion removes travel and keeps short tonal feedback;
- no interaction should visibly stutter because of paint-heavy effects.

## 11. Shell and information architecture

Primary sidebar order is:
1. Today
2. Calendar
3. Plans
4. Life System
5. Settings

**Search and Analytics are not primary destinations.** They are Settings-owned tools.

Rules:
- Settings exposes clear Search and Analytics entries;
- Analytics may render as a Settings subview while retaining its full existing capability;
- Search may remain a modal tool but its visible owner/invoker is Settings;
- preserve Ctrl+3 as direct Settings → Analytics access and Ctrl+K as Settings-owned Search where practical;
- Settings remains the active primary destination while its Analytics subview is open;
- no avatar/profile/meetings or invented capability.

The shell itself is a hard black sidebar against a white workspace; there is no alternate Dark inversion.

## 12. Surface continuity

Today, Calendar, Focus Plans, Life, Reader/Editor/Narrative and Settings-owned Analytics/Search, plus dialogs and interchange flows, share the same paper/ink/neutral material family, grain density, border/selected-state grammar, monochrome icon vocabulary and motion cadence.

No deep workflow may reintroduce color or default enterprise chrome.

## 13. Geometry, capability and accessibility remain locked

Preserve:
- standard / wide / reading frame taxonomy;
- reading measure discipline;
- real Task/Calendar/Life/Focus Plan/Analytics/Search capability boundaries;
- semantic control meaning and keyboard parity;
- visible focus, Reduced Motion and forced-colors behavior;
- no backend/schema/domain/generated-IPC change for aesthetics/placement;
- no remote runtime decorative assets;
- governed performance ceilings.

## 14. Rejection test

A visual change fails if it can be described as:
- blue-accented;
- chromatic;
- dark-theme-dependent;
- glassy/frosted;
- gradient/glow-heavy;
- wallpaper/decorative-background-led;
- icon-poor or icon-inconsistent;
- generic enterprise/SaaS styling;
- a different design language inside a deep workflow;
- Analytics/Search promoted back into primary navigation.

A successful result is immediately legible as **hard black/white Light composition, dry matte paper, disciplined neutral rules, distinctive monochrome iconography and one coherent geometry/motion language**.
