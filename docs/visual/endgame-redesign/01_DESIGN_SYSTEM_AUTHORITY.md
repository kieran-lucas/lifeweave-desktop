# 01 — Design System Authority

**Status:** current Product Owner visual authority.  
**Art direction:** **Lifeweave — Flat Matte Monochrome**.  
**Target:** a premium Windows productivity application with tactile matte surfaces, strict blue/white separation, restrained geometry and zero decorative-background noise.

This authority supersedes earlier visual language wherever it implies glass, acrylic, frosted surfaces, atmospheric illustration, multicolor washes or blue-white blended tint fields. Product capability, local-first/data safety, geometry authority, keyboard behavior and semantic accessibility remain unchanged.

## 1. Core visual thesis

Lifeweave is a **solid, tactile work surface**, not a transparent dashboard floating over wallpaper and not an illustrated background with UI layered on top.

The global visual language is intentionally narrow:
- white means white;
- blue means solid blue;
- neutral gray may support borders, disabled states and hover separation;
- red remains allowed only where destructive/error semantics require it;
- matte texture comes from extremely fine shared grain, never translucency or color wash;
- composition comes from spacing, typography, alignment, borders and clear solid regions.

The intended first impression is **“crisp, tactile, deliberate and expensive”**, not colorful, luminous or effect-heavy.

## 2. Material law — FLAT, OPAQUE, MATTE

Every persistent surface is opaque.

Canonical material layers:
1. **white canvas** — pure white application ground;
2. **solid blue plane** — primary identity areas such as the navigation shell or explicit selected controls;
3. **white paper** — content surfaces, forms, cards, tables and readers;
4. **neutral rule** — gray structural border where separation is needed;
5. **blue ink edge** — blue border, underline or inset rule for focus/current/selected state;
6. **modal paper** — opaque white dialog with modest physical elevation only when separation from the backdrop requires it.

Depth comes from border, spacing, overlap and tiny physical shadow only where necessary. Persistent content cards should normally have no shadow.

**Forbidden as material mechanisms:**
- backdrop blur;
- translucent persistent fills;
- glass/acrylic/frosted treatment;
- glow/bloom;
- blue-white tint blending;
- decorative gradients;
- colored ambient washes;
- specular highlights.

Legacy source names containing `glass` may remain temporarily for compatibility, but their rendered result must be plain opaque white paper.

## 3. Texture

Texture is allowed only to create a subtle dry/matte feel.

Allowed:
- extremely sparse micro-speckle or paper fiber encoded locally;
- one shared low-contrast grain recipe;
- the same grain on blue or white surfaces without changing the base fill color.

Forbidden:
- watercolor/gouache wash;
- gradients used as texture;
- visible repeating stripes;
- photographic textures;
- noisy grain that competes with text;
- different decorative textures per feature.

Texture must never turn a white region blue-ish or a blue region pale/washed-out.

## 4. Background law — NO DECORATIVE ATMOSPHERE

The application background is not an illustration layer.

Forbidden globally:
- sky/cloud scenery;
- stars, petals, particles or glints;
- orbit/weave lines;
- decorative SVG fields;
- background sigils;
- animated ambient art;
- color auras;
- background brush strokes.

A page earns character through its information architecture and solid material composition, not wallpaper effects.

## 5. Cohesion rule

Today, Calendar, Analytics, Focus Plans, Life, Reader/Narrative, Search, dialogs and Settings share:
- pure white content planes;
- one solid royal/celestial blue identity;
- neutral gray structural borders;
- one grain density family;
- one focus/selection grammar;
- one motion easing vocabulary.

No screen may introduce a second decorative color system or its own atmosphere.

## 6. Color

Light theme is the aesthetic acceptance target.

- application canvas: `#FFFFFF`;
- primary identity/accent: one solid royal blue family;
- large blue regions are explicitly solid blue, not pastel or mixed with white;
- white surfaces remain white, not cool-blue/off-white tinted;
- neutral gray is structural only;
- destructive/error red is a semantic exception;
- completion remains blue-family.

Avoid `color-mix()` for ordinary blue/white presentation. Avoid blue-tinted whites. Avoid gradients between identity colors.

## 7. Typography

Keep:
- Segoe UI Variable optical families for dense operational text;
- Literata Variable for authored/editorial content where already justified.

Typography should provide more of the premium character now that decorative atmosphere is removed.

## 8. Motion — continuity without visual effects

Rules:
- state commits before motion;
- prefer short transform + opacity transitions;
- hover may use a 1px lift or solid fill/border change;
- do not animate blur, glow, filters, gradients or background art;
- page/surface changes use one consistent settle curve;
- Reduced Motion removes travel and keeps instant/short state feedback;
- no continuous ambient animation.

## 9. Shell

The shell is the clearest two-plane composition in the product:
- sidebar/navigation: **solid blue**;
- main viewport: **solid white**;
- active navigation may invert to a solid white block with blue ink;
- no sidebar gradient, wash, glow or translucent layer;
- infinity mark may use a white-on-blue or blue-on-white flat emblem;
- no avatar, profile, meetings or invented capability.

## 10. Surface-specific character

- **Today:** white planning paper with blue ink rules and solid blue action states.
- **Calendar:** white month grid; a deliberate solid-blue header/current-day treatment is allowed.
- **Analytics:** white report sheets; blue is concentrated in metrics/progress/current controls.
- **Focus Plans:** white manuscript/workspace; selection is blue edge or deliberate solid-blue control, never a pastel wash.
- **Life:** white atlas board with blue connectors/markers and neutral paper cards.
- **Reader/Narrative:** white editorial paper; content itself provides richness, not background decoration.
- **Settings/Search/Dialogs:** quiet white utility surfaces with the same grain and blue focus grammar.

## 11. Geometry and semantics remain locked

Preserve:
- standard / wide / reading frame taxonomy;
- reading measure discipline;
- real Task/Calendar/Life/Focus Plan capability boundaries;
- native/semantic control meaning;
- focus visibility and keyboard parity;
- Reduced Motion and forced-colors fallbacks;
- no backend/schema/domain/generated-IPC change for art;
- no remote runtime assets;
- governed performance ceilings.

## 12. Rejection test

A visual change fails if it can plausibly be described as:
- glassy;
- frosted;
- blue-white pastel blend;
- colorful anime wallpaper;
- gradient-heavy;
- glowing;
- generic translucent SaaS;
- visually busy behind the content.

A successful result remains recognizable with all decorative background layers removed: **solid blue shell, pure white workspace, subtle dry grain, crisp blue ink, neutral rules and disciplined typography**.
