# 01 — Design System Authority

**Status:** current Product Owner visual authority.  
**Art direction:** **Lifeweave — Matte Anime Painted Atlas**.  
**Target:** a premium Windows productivity application that feels authored like an anime artbook or title-sequence frame: tactile, matte, painted, coherent and immediately distinctive.

This authority supersedes earlier visual language wherever it implies glass-first, acrylic, frosted or generic SaaS presentation. Product capability, local-first/data safety, geometry authority, keyboard behavior and semantic accessibility remain unchanged.

## 1. Core visual thesis

Lifeweave is a **painted personal world for structuring a life**, not a transparent dashboard floating over wallpaper.

The global visual language may use:
- hand-painted sky washes, atmospheric color fields and abstract anime scenery;
- flat paper / plaster / painted-wood grain with extremely fine directional texture;
- ink-like contour lines, orbit/weave geometry, stars, petals and quiet geometric sigils;
- opaque layered boards and sheets with tonal depth rather than transparent glass;
- blue → indigo → violet identity, with cyan and restrained rose only as supporting paint/wash;
- editorial typography and deliberate negative space;
- sparse cinematic motion that makes the whole application feel continuous rather than animated in isolated widgets.

The intended first impression is **“this looks illustrated and crafted”**, not merely clean or colorful.

## 2. Material law — MATTE, OPAQUE, PAINTED

The default persistent material is an opaque matte painted surface.

Canonical material layers:
1. **canvas** — quiet painted ground with fine paper/wood-like grain;
2. **board** — opaque structural workspace surface, slightly darker/warmer than canvas;
3. **sheet** — readable content surface with subtle directional fibers/grain;
4. **ink edge** — hairline or tonal edge, never a shiny refractive rim;
5. **pressed/selected wash** — blue/indigo paint wash and structural accent;
6. **floating paper** — popover/dialog surface with modest physical shadow, still opaque.

Depth comes from value separation, texture, edge treatment, overlap and restrained shadow. **Backdrop blur is not a primary depth mechanism.** Persistent surfaces must not look transparent.

Legacy class/token names containing `glass` may remain temporarily for compatibility, but their rendered result must be matte/opaque and they must be treated as migration aliases, not visual authority.

## 3. Texture

Texture is part of the identity and must be subtle enough for long sessions.

Allowed:
- low-contrast directional fibers reminiscent of flat painted wood;
- paper grain and dry-brush variation;
- broad watercolor/gouache washes behind sparse composition;
- tiny speckle/noise encoded locally through CSS/SVG patterns.

Forbidden:
- photographic wood texture;
- fake 3D bevels;
- high-frequency noise that hurts text readability;
- obvious repeating wallpaper tiles;
- glossy plastic, liquid glass, acrylic or chrome sheen.

Texture belongs to shared material recipes. Feature CSS must not invent its own unrelated grain.

## 4. Anime means abstract editorial, not fandom decoration

Allowed motifs:
- open sky, distant cloud/wash masses and horizon-like compositional fields;
- sakura/petal silhouettes;
- orbital rings and weave curves;
- constellation geometry, stars and glints;
- brush-stroke dividers, painted gradients and geometric emblems;
- layered editorial composition.

Forbidden:
- copyrighted characters/fan art;
- gacha banners/rarity framing;
- dense cyberpunk neon;
- visual-novel dialogue framing as global chrome;
- random particles/effects without compositional purpose;
- remote decorative assets.

## 5. Cohesion rule

Every primary surface must visibly belong to the same world.

Today, Calendar, Analytics, Focus Plans, Life, Reader/Narrative and Settings share:
- the same canvas/board/sheet material family;
- the same edge and selection grammar;
- the same blue/indigo identity;
- the same texture density range;
- the same motion easing vocabulary;
- the same relationship between operational UI and decorative art.

Surface-specific character is allowed, but no screen may become an unrelated theme demo.

## 6. Color

Light theme is the aesthetic acceptance target.

- primary identity: celestial/royal blue;
- secondary identity: indigo/violet;
- atmospheric support: cyan and restrained rose;
- destructive/error: red semantic authority;
- completion remains blue-family, not green.

Color should read as **pigment on a surface**, not emitted neon light. Saturated color is concentrated in selected/current/hero accents; large persistent surfaces remain calmer painted tones.

## 7. Typography

Keep:
- Segoe UI Variable optical families for dense operational text;
- Literata Variable for editorial/high-expression moments and authored content.

Use editorial type strategically for major identity/object moments. Dense tables, controls and navigation stay highly readable.

## 8. Motion — continuity before spectacle

Motion must feel continuous across the application rather than like independent hover tricks.

Rules:
- state commits before motion;
- prefer transform + opacity + color/background interpolation;
- do not animate blur, large filters, box geometry or expensive layout properties;
- page/surface changes use one consistent settle curve and short travel;
- hover uses tiny lift/press or paint-wash change, not glow flashing;
- ambient art moves only in very large, very slow, low-amplitude layers;
- no continuous animation is required for a surface to look premium;
- Reduced Motion removes travel/loops and keeps short tonal feedback.

The user should never perceive stutter, snapping between unrelated easing curves, or a collection of individually animated cards.

## 9. Shell

The shell is a matte painted navigation board.

- opaque/semi-opaque only to the degree required for antialiasing; visually it must read solid;
- current destination uses a painted blue-indigo ribbon/wash with structural edge;
- infinity mark may sit in a quiet painted emblem field, but no glossy aura;
- separators may resemble ink/brush hairlines;
- no avatar, profile, meetings or invented capability.

## 10. Surface-specific character

- **Today:** personal planning manuscript / timeline board; selected work gains a painted wash, not glass glow.
- **Calendar:** one large painted month board with cells cut by ink-like hairlines; today/selection feel illustrated but remain factual.
- **Analytics:** observatory notebook / data plate; metrics sit on shared matte sheets rather than KPI glass cards.
- **Focus Plans:** strategic manuscript/mission-board with paper-board layering.
- **Life:** strongest atlas identity; nodes read as painted coordinates/placards connected by ink lines.
- **Reader/Narrative:** richest editorial expression; authored worlds may push texture and illustration further.
- **Settings:** quieter, still same matte material family.

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

## 12. Anti-generic rejection test

A visual change fails if it can plausibly be described as:
- clean SaaS;
- Notion but blue;
- Linear with softer corners;
- Windows Settings with glass;
- generic AI dashboard;
- frosted/glassy anime skin.

A successful result has a recognizable Lifeweave silhouette and material language even if all text is replaced with grey bars: **painted matte boards, directional grain, anime-editorial atmosphere, ink-like structure and one coherent motion personality**.
