import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { pageFrame } from "../../app/layout/layout.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { button } from "../../design-system/primitives/controls.css";
import { tab, tabList } from "../../design-system/primitives/navigation.css";
import { text } from "../../design-system/visual/typography.css";

export const heading = style({ margin: 0, color: "var(--text-primary)", ...text.display });
export const readerTitle = style({ margin: `${space.x3} 0 ${space.x1}`, color: "var(--text-primary)", ...text.display });
export const modes = style([tabList, { flexWrap: "wrap" }]);
export const modeButton = tab;
export const toolbar = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, minBlockSize: 40, minInlineSize: 0 });
export const quietButton = style([button.ghost, { justifySelf: "start" }]);
export const breadcrumb = style({ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--text-muted)" });
export const crumb = style([button.ghost, { minHeight: 26, padding: "2px 5px", textDecoration: "underline", textUnderlineOffset: 3 }]);

/** Life is the strongest atlas surface: one painted map board, not loose glass cards. */
export const scene = style({
  position: "relative",
  display: "grid",
  gap: space.x5,
  width: "min(1040px,100%)",
  minBlockSize: 360,
  minInlineSize: 0,
  padding: space.x4,
  border: "1px solid var(--paint-edge-strong)",
  borderRadius: "var(--radius-surface)",
  backgroundColor: "var(--paint-board)",
  backgroundImage: "var(--paint-grain), var(--paint-wash-blue), var(--paint-wash-violet), var(--paint-wash-rose)",
  boxShadow: "var(--glow-hero)",
});
export const connectors = style({ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 0 });
export const focalWrap = style({ position: "relative", zIndex: 1, display: "flex", justifyContent: "flex-start" });

export const focal = style({
  width: "100%",
  padding: `${space.group} ${space.x5}`,
  border: "1px solid var(--paint-edge-strong)",
  borderInlineStart: "3px solid var(--accent)",
  borderRadius: "var(--radius-surface)",
  backgroundColor: "var(--paint-sheet-strong)",
  backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)",
  color: "var(--text-primary)",
  textAlign: "left",
  boxShadow: "var(--glow-crystal-strong)",
});
export const focalTitle = style({ margin: `${space.x2} 0 ${space.x1}`, ...text.objectTitle, color: "var(--text-primary)" });
export const nodeDescription = style({ margin: 0, color: "var(--text-muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" });
export const nodeMeta = style({ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", ...text.metadata });

export const children = style({ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: space.x3, listStyle: "none", padding: 0, margin: 0, minInlineSize: 0, "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "minmax(0,1fr)" } } });
export const childItem = style({ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "start", gap: 6 });

export const card = style({
  minHeight: 118,
  width: "100%",
  border: "1px solid var(--paint-edge)",
  borderRadius: "var(--radius-surface)",
  padding: "15px 72px 15px 16px",
  backgroundColor: "var(--paint-sheet)",
  backgroundImage: "var(--paint-grain-fine)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "var(--glow-crystal)",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": {
      backgroundColor: "var(--surface-hover)",
      backgroundImage: "var(--paint-grain-fine), var(--paint-wash-blue)",
      borderColor: "var(--paint-edge-strong)",
      boxShadow: "var(--glow-hover)",
      transform: "translateY(-2px)",
    },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:hover": { transform: "none" } } } },
});

export const cardTitle = style({ display: "block", margin: "8px 0 5px", ...text.cardTitle });
export const pinButton = style({ position: "absolute", top: 10, right: 10, zIndex: 2, minBlockSize: 30, padding: "5px 8px", border: "1px solid transparent", borderRadius: "var(--radius-control)", background: "transparent", color: "var(--text-muted)", fontSize: 12, fontWeight: 650, cursor: "pointer", selectors: { "&:hover": { backgroundColor: "var(--paint-selected)", backgroundImage: "var(--paint-grain-fine)", borderColor: "var(--paint-edge-strong)", color: "var(--accent)" } } });
export const icon = style({ display: "inline-grid", placeItems: "center", width: 34, height: 34, borderRadius: "var(--radius-control)", backgroundColor: "var(--paint-selected)", backgroundImage: "var(--paint-grain-fine)", color: "var(--accent)", border: "1px solid var(--paint-edge-strong)", boxShadow: "var(--glow-compact)", fontWeight: 800 });
export const empty = style({ padding: `${space.group} ${space.x5}`, borderBlockStart: "1px solid var(--paint-edge)", textAlign: "left", color: "var(--text-muted)" });
export const paging = style({ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 });
export const pinList = style({ display: "grid", gridTemplateColumns: "minmax(0,760px)", justifyContent: "start", gap: space.x3, listStyle: "none", padding: 0, margin: 0, minInlineSize: 0 });
export const unavailable = style({ color: "var(--text-muted)", background: "var(--surface-subtle, var(--active-background))" });
export const readerShell = style({ inlineSize: "80%", marginInlineStart: "5%", marginInlineEnd: "15%", minInlineSize: 0, "@container": { "(max-width: 900px)": { inlineSize: "100%", marginInline: 0 } } });
export const readerHero = style({ marginTop: space.group, paddingBlockEnd: space.x6, minInlineSize: 0 });
export const readerEmpty = style({ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--paint-edge)", color: "var(--text-muted)" });
export const status = style({ padding: 24, color: "var(--text-muted)" });

globalStyle(`${connectors} path`, { stroke: "color-mix(in srgb, var(--accent) 25%, var(--paint-edge-strong))", strokeWidth: 1.5, fill: "none", transition: `opacity ${duration.inspectorState} ${easing.standard}` });
globalStyle(`${card} p`, { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" });
globalStyle(`${pageFrame.wide} button:focus-visible`, { outline: "3px solid var(--focus-ring)", outlineOffset: 2 });
globalStyle(`${pageFrame.reading} button:focus-visible`, { outline: "3px solid var(--focus-ring)", outlineOffset: 2 });
