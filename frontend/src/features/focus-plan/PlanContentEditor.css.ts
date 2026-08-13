import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../design-system/visual/contract.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { text } from "../../design-system/visual/typography.css";

export const shell = style({ display: "grid", gap: 12, minInlineSize: 0 });
export const toolbarChrome = style({
  position: "static",
  insetBlockStart: "auto",
  zIndex: "auto",
});
globalStyle(`${shell} [role="toolbar"]`, {
  minBlockSize: 48,
  boxSizing: "border-box",
  alignItems: "center",
  gap: 7,
  padding: "8px 10px",
});
globalStyle(`${shell} [role="toolbar"] > div`, {
  minBlockSize: 32,
  alignItems: "center",
  gap: 3,
});
globalStyle(`${shell} [role="toolbar"] button`, {
  minBlockSize: 32,
  display: "inline-grid",
  placeItems: "center",
  paddingBlock: 0,
  lineHeight: "16px",
  fontStyle: "normal !important",
  fontWeight: "680 !important",
  textAlign: "center",
  transformOrigin: "center",
});
globalStyle(`${shell} [role="toolbar"] button[aria-label="Bold"]`, { fontWeight: "820 !important" });
globalStyle(`${shell} [role="toolbar"] button[aria-label="Italic"]`, { fontStyle: "normal !important" });
export const surface = style({
  display: "grid",
  minBlockSize: "clamp(300px, 46vh, 600px)",
  minInlineSize: 0,
  overflowX: "auto",
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-surface)",
  background: vars.color.surface,
  transition: `border-color ${duration.state} ${easing.standard}, outline-color ${duration.state} ${easing.standard}`,
  selectors: { "&:focus-within": { borderColor: vars.color.borderStrong, outline: `2px solid ${vars.color.focusRing}`, outlineOffset: 2 } },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" }, "(forced-colors: active)": { borderColor: "CanvasText" } },
});
export const textarea = style({
  display: "block",
  inlineSize: "100%",
  blockSize: "100%",
  minBlockSize: "clamp(300px, 46vh, 600px)",
  boxSizing: "border-box",
  resize: "vertical",
  padding: "clamp(22px, 3vw, 38px)",
  border: 0,
  outline: 0,
  background: "transparent",
  color: "var(--text-primary)",
  caretColor: "var(--text-primary)",
  ...text.editorBody,
});
export const preview = style({ minInlineSize: "max(100%, 420px)", margin: 0, padding: 0, color: "var(--text-primary)", overflowWrap: "anywhere", ...text.editorBody });
globalStyle(`${surface} ${preview}`, { padding: "clamp(22px, 3vw, 38px)" });
globalStyle(`${preview} > :first-child`, { marginBlockStart: 0 });
globalStyle(`${preview} > :last-child`, { marginBlockEnd: 0 });
globalStyle(`${preview} p`, { whiteSpace: "pre-wrap" });
globalStyle(`${preview} h1`, { ...text.editorH1, marginBlock: "1.45em .5em" });
globalStyle(`${preview} h2`, { ...text.editorH2, marginBlock: "1.4em .45em" });
globalStyle(`${preview} h3`, { ...text.editorH3, marginBlock: "1.35em .4em" });
globalStyle(`${preview} blockquote`, { marginInline: 0, padding: "6px 0 6px 14px", borderInlineStart: "2px solid #111111", color: "var(--text-muted)" });
globalStyle(`${preview} pre`, { overflowX: "auto", padding: 14, border: "1px solid var(--paint-edge)", borderRadius: "var(--radius-control)", background: vars.color.surfaceSubtle, ...text.code });
globalStyle(`${preview} code`, { ...text.code });
globalStyle(`${preview} table`, { inlineSize: "100%", minInlineSize: 420, tableLayout: "fixed", borderCollapse: "collapse", marginBlock: 18 });
globalStyle(`${preview} th, ${preview} td`, { padding: "9px 10px", border: "1px solid var(--paint-edge)", textAlign: "start", verticalAlign: "top" });
globalStyle(`${preview} th`, { background: vars.color.surfaceSubtle, fontWeight: 650 });
export const placeholder = style({ margin: 0, color: "var(--text-muted)", ...text.editorBody });
