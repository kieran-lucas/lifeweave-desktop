import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { pageFrame } from "../../app/layout/layout.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { button } from "../../design-system/primitives/controls.css";
import { tab, tabList } from "../../design-system/primitives/navigation.css";
import { text } from "../../design-system/visual/typography.css";

export const heading = style({ margin: 0, color: "var(--text-primary)", ...text.display, letterSpacing: "-0.04em" });
export const readerTitle = style({ margin: `${space.x3} 0 ${space.x1}`, color: "var(--text-primary)", ...text.display, letterSpacing: "-0.035em" });
export const modes = style([tabList, { flexWrap: "nowrap", gap: space.x3 }]);
export const modeButton = tab;
/* Browse and Edit are the primary Life operations. Pinned/Graph remain data-compatible but leave the front door. */
globalStyle(`${modes} > button:nth-child(n+3)`, { display: "none" });

export const toolbar = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, minBlockSize: 34, minInlineSize: 0 });
export const quietButton = style([button.ghost, { justifySelf: "start" }]);
export const breadcrumb = style({ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", color: "var(--text-muted)", ...text.metadata });
export const crumb = style([button.ghost, { minHeight: 24, padding: "1px 4px", color: "var(--text-muted)" }]);

export const scene = style({
  position: "relative",
  display: "grid",
  gap: space.x5,
  width: "100%",
  minBlockSize: 280,
  minInlineSize: 0,
  paddingBlock: space.x2,
  background: "#FFFFFF",
});

/* Connector spaghetti costs attention and adds resize work without helping branch navigation. */
export const connectors = style({ display: "none" });
export const focalWrap = style({ position: "relative", display: "block" });

export const focal = style({
  width: "100%",
  padding: `${space.x2} 0 ${space.x4}`,
  border: 0,
  borderBottom: "1px solid #111111",
  background: "#FFFFFF",
  color: "var(--text-primary)",
  textAlign: "left",
  boxShadow: "none",
});
export const focalTitle = style({ margin: `${space.x2} 0 ${space.x1}`, ...text.objectTitle, color: "var(--text-primary)", letterSpacing: "-0.025em" });
export const nodeDescription = style({ margin: 0, color: "var(--text-muted)", lineHeight: 1.5, whiteSpace: "pre-wrap" });
export const nodeMeta = style({ display: "flex", alignItems: "center", gap: 7, color: "var(--text-muted)", ...text.metadata });
/* Tags and pinning are secondary organization mechanics, not the branch headline. */
globalStyle(`${focal} > :nth-child(4)`, { display: "none" });
globalStyle(`${focal} > button`, { display: "none" });

export const children = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 0,
  listStyle: "none",
  padding: 0,
  margin: 0,
  minInlineSize: 0,
  borderBlockStart: "1px solid var(--border-subtle)",
  "@media": { "screen and (max-width: 760px)": { gridTemplateColumns: "minmax(0,1fr)" } },
});
export const childItem = style({ position: "relative", display: "block", minInlineSize: 0, borderBlockEnd: "1px solid var(--border-subtle)" });

export const card = style({
  minHeight: 82,
  width: "100%",
  display: "grid",
  gridTemplateColumns: "34px minmax(0,1fr)",
  gridTemplateRows: "auto auto",
  columnGap: space.x2,
  rowGap: 3,
  alignItems: "center",
  padding: "13px 14px",
  border: 0,
  background: "#FFFFFF",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "none",
  transition: `background-color ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": { backgroundColor: "#F5F5F5" },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -2 },
  },
});

export const cardTitle = style({ display: "block", margin: 0, ...text.cardTitle, letterSpacing: "-0.012em" });
export const pinButton = style({ display: "none" });
export const icon = style({
  gridRow: "1 / span 2",
  display: "inline-grid",
  placeItems: "center",
  width: 32,
  height: 32,
  borderRadius: "var(--radius-control)",
  background: "#FFFFFF",
  color: "#111111",
  border: "1px solid #111111",
  boxShadow: "none",
});
/* Keep only title + structural cue on branch tiles; full prose and tags belong after opening. */
globalStyle(`${card} > p`, { display: "none" });
globalStyle(`${card} > :nth-child(n+5)`, { display: "none" });
globalStyle(`${card} > ${nodeMeta}`, { gridColumn: 2, alignSelf: "start" });

export const empty = style({ padding: `${space.x4} 0`, borderBlockStart: "1px solid var(--border-subtle)", textAlign: "left", color: "var(--text-muted)" });
export const paging = style({ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, ...text.metadata, color: "var(--text-muted)" });
export const pinList = style({ display: "grid", gridTemplateColumns: "minmax(0,760px)", justifyContent: "start", gap: 0, listStyle: "none", padding: 0, margin: 0, minInlineSize: 0 });
export const unavailable = style({ color: "var(--text-muted)", background: "#F5F5F5" });

export const readerShell = style({ inlineSize: "min(760px, 100%)", marginInline: "auto", minInlineSize: 0 });
export const readerHero = style({ marginTop: space.group, paddingBlockEnd: space.x6, minInlineSize: 0 });
export const readerEmpty = style({ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" });
export const status = style({ padding: 24, color: "var(--text-muted)" });

globalStyle(`${connectors} path`, { stroke: "#111111", strokeWidth: 1, fill: "none" });
globalStyle(`${pageFrame.wide} button:focus-visible`, { outline: "2px solid var(--focus-ring)", outlineOffset: 2 });
globalStyle(`${pageFrame.reading} button:focus-visible`, { outline: "2px solid var(--focus-ring)", outlineOffset: 2 });
