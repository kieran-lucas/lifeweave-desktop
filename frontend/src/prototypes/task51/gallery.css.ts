import { style } from "@vanilla-extract/css";

import { text } from "../../design-system/visual/typography.css";

/** Layout for the control state matrix. Harness chrome only — no design decisions live here. */

export const page = style({
  minBlockSize: "100%",
  padding: "28px 34px 56px",
  display: "flex",
  flexDirection: "column",
  gap: 26,
  background: "var(--app-background)",
});

export const pageTitle = style({ ...text.pageTitle, margin: 0, color: "var(--text-primary)" });
export const lede = style({ ...text.body, margin: 0, color: "var(--text-muted)", maxInlineSize: "70ch" });

export const section = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  paddingBlockStart: 18,
  borderBlockStart: "1px solid var(--border-subtle)",
});

export const sectionTitle = style({ ...text.eyebrow, margin: 0, color: "var(--accent)" });

export const row = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 });

export const grid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
});

export const field = style({
  display: "flex",
  flexDirection: "column",
  gap: 5,
  minInlineSize: 0,
  ...text.label,
  color: "var(--text-muted)",
});

export const check = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  ...text.body,
  color: "var(--text-primary)",
});

export const stateGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
});

export const stateCell = style({
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-surface)",
  padding: 10,
  minInlineSize: 0,
});

export const iconCell = style({
  display: "grid",
  placeItems: "center",
  inlineSize: 34,
  blockSize: 34,
  borderRadius: "var(--radius-control)",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-muted)",
});

const roleBase = { margin: 0, color: "var(--text-primary)" } as const;
export const display = style({ ...text.display, ...roleBase });
export const h1 = style({ ...text.pageTitle, ...roleBase });
export const h2 = style({ ...text.objectTitle, ...roleBase });
export const h3 = style({ ...text.sectionTitle, ...roleBase });
export const body = style({ ...text.body, ...roleBase });
export const meta = style({ ...text.metadata, margin: 0, color: "var(--text-muted)" });
export const eyebrow = style({ ...text.eyebrow, margin: 0, color: "var(--text-muted)" });
export const numeric = style({ ...text.numeric, margin: 0, color: "var(--text-primary)" });
export const metric = style({ ...text.numericMetric, ...roleBase });
export const code = style({ ...text.code, margin: 0, color: "var(--text-primary)" });
export const editorBody = style({ ...text.editorBody, ...roleBase, maxInlineSize: "62ch" });
