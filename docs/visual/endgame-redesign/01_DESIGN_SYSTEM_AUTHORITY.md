# 01 — Design System Authority

**Status:** superseded visual direction approved by the Product Owner after post-execution review.  
**Art direction:** **Lifeweave — Celestial Anime Editorial**.  
**Target:** a premium Windows productivity application whose first impression is unmistakably crafted, cinematic and anime-inspired while remaining fast, readable and operational.

This authority replaces the earlier interpretation of “Quiet Precision Atlas” wherever that interpretation suppressed visual character. Product capability, local-first/data-safety rules, geometry authority, keyboard behavior and semantic accessibility remain unchanged.

## 1. Core visual thesis

Lifeweave should feel like a **luminous personal world for structuring a life**, not a generic SaaS dashboard with blue buttons.

The global visual language may deliberately use:
- sky light, aurora, crystal/prismatic light, orbit lines, constellations, stars and abstract petals;
- layered translucent material where the atmosphere materially contributes to depth;
- blue → indigo → violet as the primary identity spectrum, with cyan and restrained rose as atmospheric support;
- luminous selected/current states;
- editorial scale contrast and title-sequence-like composition;
- slow ambient motion and small interaction choreography;
- custom local SVG/CSS art that is decorative only and never becomes product capability.

The intended reaction is **“this is a distinctive premium product”** before the user has inspected individual controls.

## 2. Anime means abstract editorial, not fandom decoration

Use **Abstract Anime Editorial** rather than characters or franchise imagery.

Allowed motifs:
- open sky and atmospheric light;
- stars, glints and constellation geometry;
- orbital rings and flowing weave curves;
- glass/crystal refraction;
- abstract sakura/petal silhouettes;
- elegant geometric sigils;
- layered spatial depth;
- restrained cinematic motion.

Forbidden:
- copyrighted anime characters or fan art;
- gacha banners, rarity framing or loot-box visual language;
- dense cyberpunk neon;
- visual-novel dialogue framing as global chrome;
- random particles/effects without compositional purpose;
- remote decorative assets.

## 3. Global composition hierarchy

The visual stack is:

`atmospheric world → workspace glass/plane → structured content → selected/luminous object → inspector → floating surface → modal`.

The atmosphere is allowed to be clearly visible. It must not be reduced until it is barely perceptible merely because content is important. Instead, dense content receives stronger local material so readability and art can coexist.

Use whitespace, alignment and typography for hierarchy, but **do not treat visible art, depth or glow as defects by default**.

## 4. Color

Light theme is the acceptance target.

Identity spectrum:
- royal/celestial blue is primary;
- indigo/violet is the second identity pole;
- cyan is a cool atmospheric highlight;
- restrained rose may appear only as ambient/supporting light;
- red remains destructive/error semantic authority.

Near-white content planes remain readable, but they may carry cool chroma and controlled translucency. Selected/current states should visibly gain light and depth.

Completion semantics remain blue-family, not green.

## 5. Typography

Keep the existing high-quality families:
- Segoe UI Variable optical families for dense operational text;
- Literata Variable for editorial/high-expression moments and authored content.

Large identity moments may use the editorial register more freely than the previous direction allowed, provided repeated dense headings remain operationally clear.

Hierarchy may use stronger scale contrast than before. The page should not look like every string belongs to one enterprise form.

## 6. Material

Persistent surfaces may use **controlled glass** when the atmospheric field is genuinely visible behind them.

Canonical material behaviors:
- translucent cool-white tint;
- chromatic hairline/refraction edge;
- subtle inner top highlight;
- soft blue/indigo depth shadow;
- backdrop blur only where it materially improves layering;
- stronger opacity for text-dense surfaces.

Avoid stacking five glass cards inside one another. Glass is a material system, not a reason to box every paragraph.

## 7. Glow and light

Glow is now an authorized identity tool.

Use it for:
- current navigation;
- primary actions;
- selected/high-value objects;
- focused atmospheric accents;
- sparse star/glint art.

Do not put a neon halo around every control. A page needs dark/quiet intervals for luminous moments to read.

## 8. Motion

Motion has two layers.

**Ambient:** long-period, tiny-amplitude transform/opacity movement in the decorative world: aurora breathing, orbital drift, glints and petal drift.

**Interaction:** fast controlled choreography for hover, selection, modal entry and direct manipulation. Small lifts and light changes are permitted.

No mutation waits for animation. Reduced Motion removes ambient travel/loops and preserves short tonal feedback.

## 9. Shell

The shell is the strongest persistent brand carrier.

- sidebar may be frosted/translucent;
- current destination should read as a luminous blue-indigo ribbon, not a flat enterprise selection fill;
- the infinity mark may have a restrained aura/refraction field while its core geometry remains the approved simple infinity mark;
- no avatar, profile, meeting widget or invented capability.

## 10. Surface-specific character

- **Today:** luminous timeline instrument; task content stays primary, but period groups and selection may carry atmospheric depth.
- **Calendar:** the month grid is a crystalline hero surface; today and selection should feel special at a glance.
- **Analytics:** evidence presented like an observatory/dashboard instrument, not generic KPI cards.
- **Focus Plans:** strategic manuscript/mission-board seriousness with celestial accents.
- **Life:** strongest atlas/spatial identity; nodes may feel like luminous coordinates in a personal constellation.
- **Reader/Narrative:** full editorial expression; authored Visual Worlds remain valid and may be richer than operational chrome.
- **Settings:** calmer than other pages, but still unmistakably belongs to the same world.

## 11. Geometry and semantics that remain locked

Do not change product behavior to obtain a visual effect.

Preserve:
- standard / wide / reading frame taxonomy;
- reading measure discipline;
- real Task/Calendar/Life/Focus Plan capability boundaries;
- native/semantic control meaning;
- focus visibility and keyboard parity;
- Reduced Motion and forced-colors fallbacks;
- no backend/schema/domain/generated-IPC change for art;
- no remote runtime assets.

## 12. Anti-generic rejection test

A visual change fails if the result could plausibly be described as:
- “clean SaaS”; 
- “Notion but blue”; 
- “Linear with softer corners”; 
- “Windows settings with glass”; or
- “generic AI dashboard”.

A successful result has a recognizable Lifeweave silhouette, light field, material language and motion personality even with all text replaced by grey bars.
