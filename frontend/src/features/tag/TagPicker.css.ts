import { style } from "@vanilla-extract/css";

import { space } from "../../app/layout/tokens.css";
import { button, compact } from "../../design-system/primitives/controls.css";
import { text } from "../../design-system/visual/typography.css";

export const fieldset = style({
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-surface)",
  padding: `${space.x2} ${space.x3} ${space.x3}`,
  margin: 0,
  position: "relative",
});

export const legend = style({
  ...text.eyebrow,
  color: "var(--text-muted, var(--text-muted))",
  padding: "0 4px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
});

export const trigger = style([button.secondary, { display: "flex", inlineSize: "100%", justifyContent: "flex-start", color: "var(--text-muted)" }]);

export const panel = style({
  marginTop: space.x2,
  display: "flex",
  flexDirection: "column",
  gap: space.x2,
  padding: space.x3,
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-control)",
  background: "var(--surface-subtle)",
});

export const searchLabel = style({
  ...text.label,
  color: "var(--text-muted, var(--text-muted))",
  display: "block",
  marginBottom: 2,
});

export const search = style({
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--border-subtle, var(--border-subtle))",
  borderRadius: "var(--radius-small)",
  ...text.compactBody,
  boxSizing: "border-box",
});

export const status = style({
  margin: "2px 0",
  ...text.metadata,
  color: "var(--text-muted, var(--text-muted))",
});

export const list = style({
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxHeight: 200,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 2,
});

export const checkLabel = style({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 8px",
  borderRadius: "var(--radius-small)",
  ...text.compactBody,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--surface-raised)" },
  },
});

export const checkLabelDisabled = style({
  opacity: 0.5,
  cursor: "default",
});

export const selectedCount = style({
  ...text.metadata,
  color: "var(--text-muted, var(--text-muted))",
});

export const limitWarning = style({
  ...text.metadata,
  color: "var(--danger)",
  fontWeight: 600,
});

export const createButton = style([button.ghost, compact, { alignSelf: "flex-start", color: "var(--accent)", textAlign: "left" }]);

export const footer = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: 6,
  borderTop: "1px solid var(--border-subtle, var(--border-subtle))",
  paddingTop: 6,
  marginTop: 2,
});

export const doneButton = style([button.secondary, compact]);

export const errorMsg = style({
  ...text.metadata,
  color: "var(--danger)",
  marginTop: 2,
});

export const retryButton = style([button.secondary, compact, { marginTop: 2 }]);
