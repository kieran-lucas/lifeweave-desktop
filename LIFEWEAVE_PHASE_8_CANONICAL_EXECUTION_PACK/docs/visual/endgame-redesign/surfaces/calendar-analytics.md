# Surface Authority — Calendar Analytics

**Scope:** Calendar and Analytics. Calendar source capability wins over invented concept content.

**Canonical closure IDs:** C-01, C-02, A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-08, A-09

**Visual references:** `references/02-calendar-approved-direction.png`, `references/03-analytics-direction.png`

> ID rule: headings below preserve Phase 6 prose numbering for design detail. For execution/closure, the canonical IDs above and `02_SURFACE_MANIFEST.md` win. Resolve by surface title + source, never numeric heading alone.

> Capability rule: production source and the canonical manifest decide what controls/features exist. The text below defines visual/compositional treatment; it cannot authorize invented capability.

# Calendar

## 13. C-01 — Calendar / month grid

**This is the most important correction from the approved mockup.**

Actual Calendar does **not** expose a day-detail inspector.

Actual header actions:

- Previous month
- current month label
- Next month
- Today

Actual day cell content:

- date;
- task count;
- scheduled duration;
- category icons + additional-category count;
- three load bars:
  - Morning
  - Afternoon
  - Evening;
- missed marker when applicable.

Activation:

- click / Enter / Space opens Today for that date.

### Target composition

The month board is the hero object.

- Use the full wide frame confidently.
- Keep large `Calendar` title at page top.
- Header controls should read as one compact month-navigation cluster.
- Weekday header forms a strong but quiet axis.
- Seven equal columns.
- Five/six week rows remain geometrically stable.
- Preserve the verified ~96 px cell behavior as the default density target.
- Use hairlines rather than card gaps between cells.
- The calendar should read as one coherent board, not 35 independent cards.

### Day cell visual hierarchy

Order:

1. date;
2. compact task-count + scheduled duration summary;
3. category icon strip;
4. Morning/Afternoon/Evening load triplet;
5. missed state if present.

The load bars are a signature visual opportunity:

- keep all three;
- use the shared progress material;
- approximately current 5 px thickness is appropriate;
- align them consistently across every day cell;
- blue intensity/fill communicates load amount, but accessible names remain semantic.

### Today vs selected date

- Today marker: compact blue date-ring/disc or blue date text.
- Selected date: pale selected surface + blue companion edge/ring.
- Today+selected must combine without becoming a double-outline mess.
- keyboard focus remains distinct.

### Missed day

Use existing `has_past_scheduled_unevaluated` only.

Presentation may improve from literal `!` to a compact warning mark/badge, but no new data may be invented.

### Explicitly forbidden on Calendar

- event-chip agenda not present in projection;
- right Day Details inspector;
- Add Task button on Calendar;
- New Plan;
- Focus score;
- day notes;
- linked items;
- month/week/day mode switch unless source gains it;
- drag/drop events.

The approved Calendar mockup governs **beauty, whitespace, hierarchy, selected-state confidence and prominence**, not unsupported data structure.

---

# Analytics

## 14. A-01 — Analytics / Week

Actual header:

- eyebrow `Objective Analytics · scheduled and recorded time`;
- Analytics title;
- period tabs Week / Month / Year;
- Previous period;
- period range;
- Next period;
- Current period.

Actual content:

1. Scheduled overview
2. Recorded actual time
3. Category scheduled time
4. Objective streaks
5. Completion distribution
6. Focus Plan activity

### Target composition

Do not produce generic “four KPI cards + line chart + donut chart.”

Use an editorial data report:

- page title and period controls top;
- Scheduled overview is the opening fact band;
- Recorded actual time sits as the second factual band with clear plan-vs-actual relationship;
- Category scheduled time is the primary detailed section;
- streak and completion distribution form a balanced secondary row when width permits;
- Focus Plan activity is a substantial bottom section/table.

### A-02 — Scheduled overview

Actual facts:

- Scheduled time
- Scheduled tasks
- Evaluated
- Missed

Target:

- one primary large metric + three secondary facts;
- no equal visual weight;
- numeric roles, tabular figures;
- one subtle shared plane/hairline, not four detached cards.

### A-03 — Recorded actual time

Actual:

- Recorded time
- Tracked plan
- Variance
- Tracked Tasks
- Completed segments
- explicit zero-session explanation.

Target:

- Recorded time and Tracked plan form the comparison pair;
- variance adjacent, semantically clear;
- task/segment counts secondary;
- zero state is factual, not empty-chart artwork.

### A-04 — Category scheduled time

Actual per category:

- scheduled duration;
- recorded/tracked/variance when present;
- weekly minimum/target progress;
- shortfall/overage;
- month/year may add weekly counts.

Target:

- category name + scheduled time are primary row;
- goals use the one progress material;
- actual-time facts align in secondary column;
- shortfall/overage uses warning/success text sparingly;
- avoid one card per category unless number of categories is tiny; list/table rhythm scales better.

### A-05 — Objective streaks

Target:

- compact structured list;
- numerals stronger than labels;
- no gamified oversized flames/badges.

### A-06 — Completion distribution

Actual evaluation counts + progress/distribution.

Target:

- one clear visual distribution plus factual table;
- no decorative pie chart unless implementation already uses/supports it;
- labels must make state understandable without color.

### A-07 — Focus Plan activity

Actual summary facts:

- Plans with activity
- Linked scheduled time
- Linked work items
- Evaluated
- Missed
- Reviews
- Recorded actual time

Actual table columns:

- Focus Plan
- State
- Scheduled
- Work items
- Evaluated
- Missed
- Recorded actual time
- Reviews
- Open Plan

Target:

- summary fact band, then horizontally scrollable table when needed;
- Plan title left anchored;
- Open Plan compact action;
- do not synthesize “plan health” or progress percentage.

### A-08 — Month / Year

Same information architecture.

Differences:

- period label changes;
- category weekly counts may appear;
- density must remain readable;
- do not introduce a different dashboard layout merely because period is larger.

---


# Calendar Interaction Appendix

## 42. Calendar day interaction

Actual:

- each day cell is one button;
- click / Enter / Space activates date;
- activation navigates to Today for that date.

Target:

- whole cell should read as actionable without looking like a raised button;
- hover = faint tonal shift;
- focus = proper ring;
- selection/today state remain different from hover/focus;
- no nested buttons inside the day cell unless backend/frontend interaction model is explicitly changed later.
