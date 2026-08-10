import { globalStyle, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { pageFrame } from "../../app/layout/layout.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { button } from "../../design-system/primitives/controls.css";
import { tab, tabList } from "../../design-system/primitives/navigation.css";
import { text } from "../../design-system/visual/typography.css";

export const heading = style({
  margin: 0,
  color: "var(--text-primary)",
  ...text.display,
  textShadow: "0 14px 38px color-mix(in srgb, var(--accent-violet) 14%, transparent)",
});
export const readerTitle = style({ margin: `${space.x3} 0 ${space.x1}`, color: "var(--text-primary)", ...text.display });
export const modes = style([tabList, { flexWrap: "wrap" }]);
export const modeButton = tab;
export const toolbar = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: space.control, minBlockSize: 40, minInlineSize: 0 });
export const quietButton = style([button.ghost, { justifySelf: "start" }]);
export const breadcrumb = style({ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--text-muted)" });
export const crumb = style([button.ghost, { minHeight: 26, padding: "2px 5px", textDecoration: "underline", textUnderlineOffset: 3 }]);

/* Life is the atlas surface: a restrained constellation field behind real hierarchy. */
export const scene = style({
  position: "relative",
  display: "grid",
  gap: space.x5,
  width: "min(1040px,100%)",
  minBlockSize: 360,
  minInlineSize: 0,
  padding: space.x4,
  borderRadius: "calc(var(--radius-surface) + 8px)",
  background:
    "radial-gradient(540px 260px at 7% 8%, color-mix(in srgb, var(--accent-cyan) 10%, transparent), transparent 68%), radial-gradient(620px 300px at 88% 96%, color-mix(in srgb, var(--accent-violet) 9%, transparent), transparent 72%)",
});
export const connectors = style({ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 0 });
export const focalWrap = style({ position: "relative", zIndex: 1, display: "flex", justifyContent: "flex-start" });

export const focal = style({
  width: "100%",
  padding: `${space.group} ${space.x5}`,
  border: "1px solid color-mix(in srgb, var(--accent) 27%, var(--border-subtle))",
  borderInlineStart: "3px solid var(--accent)",
  borderRadius: "var(--radius-surface)",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 11%, var(--glass-surface-strong)), color-mix(in srgb, var(--accent-violet) 10%, var(--glass-surface-strong)))",
  color: "var(--text-primary)",
  textAlign: "left",
  boxShadow:
    "0 24px 64px color-mix(in srgb, var(--accent) 13%, transparent), 0 8px 28px color-mix(in srgb, var(--accent-violet) 9%, transparent), inset 0 1px 0 var(--glass-highlight)",
  "@supports": {
    "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": {
      backdropFilter: "blur(18px) saturate(1.2)",
      WebkitBackdropFilter: "blur(18px) saturate(1.2)",
    },
  },
});
export const focalTitle = style({ margin: `${space.x2} 0 ${space.x1}`, ...text.objectTitle, color: "var(--text-primary)" });
export const nodeDescription = style({ margin: 0, color: "var(--text-muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" });
export const nodeMeta = style({ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", ...text.metadata });

export const children = style({
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: space.x3,
  listStyle: "none",
  padding: 0,
  margin: 0,
  minInlineSize: 0,
  "@media": { "screen and (max-width: 900px)": { gridTemplateColumns: "minmax(0,1fr)" } },
});
export const childItem = style({ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", alignItems: "start", gap: 6 });

export const card = style({
  minHeight: 124,
  width: "100%",
  border: "1px solid var(--glass-border)",
  borderRadius: "var(--radius-surface)",
  padding: "16px 72px 16px 17px",
  background:
    "linear-gradient(145deg, color-mix(in srgb, white 34%, transparent), transparent 48%), var(--glass-surface)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 var(--glass-highlight), 0 12px 34px color-mix(in srgb, var(--accent) 7%, transparent)",
  transition:
    `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, ` +
    `box-shadow ${duration.state} ${easing.standard}, transform ${duration.state} ${easing.standard}`,
  selectors: {
    "&:hover": {
      background:
        "linear-gradient(145deg, color-mix(in srgb, var(--accent-cyan) 12%, var(--glass-surface-strong)), color-mix(in srgb, var(--accent-violet) 9%, var(--glass-surface-strong)))",
      borderColor: "color-mix(in srgb, var(--accent) 38%, var(--border-subtle))",
      boxShadow:
        "0 18px 44px color-mix(in srgb, var(--accent) 13%, transparent), 0 6px 20px color-mix(in srgb, var(--accent-violet) 8%, transparent), inset 0 1px 0 white",
      transform: "translateY(-2px)",
    },
  },
  "@supports": {
    "(backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))": {
      backdropFilter: "blur(14px) saturate(1.16)",
      WebkitBackdropFilter: "blur(14px) saturate(1.16)",
    },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none", selectors: { "&:hover": { transform: "none" } } } },
});

export const cardTitle = style({ display: "block", margin: "8px 0 5px", ...text.cardTitle });
export const pinButton = style({
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 2,
  minBlockSize: 30,
  padding: "5px 8px",
  border: "1px solid transparent",
  borderRadius: "var(--radius-control)",
  background: "transparent",
  color: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 650,
  cursor: "pointer",
  selectors: {
    "&:hover": {
      background: "color-mix(in srgb, var(--accent) 9%, var(--glass-surface-strong))",
      borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)",
      color: "var(--accent)",
    },
  },
});

export const icon = style({
  display: "inline-grid",
  placeItems: "center",
  width: 36,
  height: 36,
  borderRadius: "var(--radius-control)",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 24%, white), color-mix(in srgb, var(--accent-violet) 18%, white))",
  color: "var(--accent)",
  border: "1px solid color-mix(in srgb, var(--accent) 18%, white)",
  boxShadow: "0 8px 20px color-mix(in srgb, var(--accent) 12%, transparent), inset 0 1px 0 white",
  fontWeight: 800,
});

export const empty = style({ padding: `${space.group} ${space.x5}`, borderBlockStart: "1px solid var(--border-subtle)", textAlign: "left", color: "var(--text-muted)" });
export const paging = style({ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 });
export const pinList = style({ display: "grid", gridTemplateColumns: "minmax(0,760px)", justifyContent: "start", gap: space.x3, listStyle: "none", padding: 0, margin: 0, minInlineSize: 0 });
export const unavailable = style({ color: "var(--text-muted)", background: "var(--surface-subtle, var(--active-background))" });
export const readerShell = style({ inlineSize: "80%", marginInlineStart: "5%", marginInlineEnd: "15%", minInlineSize: 0, "@container": { "(max-width: 900px)": { inlineSize: "100%", marginInline: 0 } } });
export const readerHero = style({ marginTop: space.group, paddingBlockEnd: space.x6, minInlineSize: 0 });
export const readerEmpty = style({ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" });
export const status = style({ padding: 24, color: "var(--text-muted)" });

globalStyle(`${connectors} path`, {
  stroke: "color-mix(in srgb, var(--accent) 26%, var(--border-subtle))",
  strokeWidth: 1.5,
  fill: "none",
  filter: "drop-shadow(0 2px 5px color-mix(in srgb, var(--accent) 12%, transparent))",
  transition: `opacity ${duration.inspectorState} ${easing.standard}`,
});
globalStyle(`${card} p`, { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" });
globalStyle(`${pageFrame.wide} button:focus-visible`, { outline: "3px solid var(--focus-ring)", outlineOffset: 2 });
globalStyle(`${pageFrame.reading} button:focus-visible`, { outline: "3px solid var(--focus-ring)", outlineOffset: 2 });
