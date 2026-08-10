import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { space } from "../../app/layout/tokens.css";
import { pageFrame } from "../../app/layout/layout.css";
import { duration, easing } from "../../design-system/visual/motion.css";
import { button } from "../../design-system/primitives/controls.css";
import { tab, tabList } from "../../design-system/primitives/navigation.css";
import { text } from "../../design-system/visual/typography.css";

const constellationDrift = keyframes({
  "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)", opacity: 0.42 },
  "50%": { transform: "translate3d(18px, -12px, 0) scale(1.04)", opacity: 0.68 },
});

const dashFlow = keyframes({
  from: { strokeDashoffset: 0 },
  to: { strokeDashoffset: -32 },
});

export const heading = style({ margin: 0, color: "var(--text-primary)", ...text.display, letterSpacing: "-0.045em", textShadow: "0 1px 0 rgba(255,255,255,.82)" });
export const readerTitle = style({ margin: `${space.x3} 0 ${space.x1}`, color: "var(--text-primary)", ...text.display, letterSpacing: "-0.04em" });
export const modes = style([tabList, { flexWrap: "nowrap", gap: space.x3, borderBottomColor: "rgba(189,205,230,.72)" }]);
export const modeButton = tab;
/* Browse and Edit are the primary Life operations. Pinned/Graph remain data-compatible but leave the front door. */
globalStyle(`${modes} > button:nth-child(n+3)`, { display: "none" });

export const toolbar = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: space.control,
  minBlockSize: 38,
  minInlineSize: 0,
  padding: "4px 7px",
  border: "1px solid rgba(190,205,229,.66)",
  borderRadius: "12px",
  background: "rgba(255,255,255,.52)",
  backdropFilter: "blur(12px)",
});
export const quietButton = style([button.ghost, { justifySelf: "start" }]);
export const breadcrumb = style({ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", color: "var(--text-muted)", ...text.metadata });
export const crumb = style([button.ghost, { minHeight: 24, padding: "1px 4px", color: "var(--accent-muted)" }]);

export const scene = style({
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  display: "grid",
  gap: space.x5,
  width: "100%",
  minBlockSize: 360,
  minInlineSize: 0,
  padding: "clamp(20px, 2.7vw, 34px)",
  border: "1px solid rgba(178,199,231,.72)",
  borderRadius: "28px",
  background:
    "radial-gradient(circle at 16% 20%, rgba(255,255,255,.94) 0 1px, transparent 2px), radial-gradient(circle at 72% 14%, rgba(255,255,255,.96) 0 1.5px, transparent 2.5px), radial-gradient(circle at 88% 68%, rgba(124,172,255,.40) 0 1px, transparent 2px), radial-gradient(circle at 34% 82%, rgba(154,116,255,.30) 0 1px, transparent 2px), linear-gradient(145deg, rgba(251,253,255,.89), rgba(239,246,255,.73))",
  backgroundSize: "180px 180px, 240px 240px, 210px 210px, 260px 260px, auto",
  backdropFilter: "blur(18px) saturate(1.10)",
  boxShadow: "var(--glow-hero), inset 0 1px 0 rgba(255,255,255,.92)",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      zIndex: 0,
      inlineSize: 520,
      blockSize: 520,
      insetInlineStart: "-260px",
      insetBlockStart: "-260px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(105,191,255,.18), rgba(93,128,255,.09) 38%, rgba(151,113,255,.05) 58%, transparent 72%)",
      filter: "blur(4px)",
      animation: `${constellationDrift} 15s ease-in-out infinite`,
      pointerEvents: "none",
    },
    "&::after": {
      content: '""',
      position: "absolute",
      zIndex: 0,
      inlineSize: 600,
      blockSize: 260,
      insetInlineEnd: "-210px",
      insetBlockEnd: "-135px",
      border: "1px solid rgba(91,125,215,.12)",
      borderRadius: "50%",
      boxShadow: "0 0 0 45px rgba(103,139,224,.026), 0 0 0 94px rgba(148,111,226,.018)",
      transform: "rotate(-12deg)",
      pointerEvents: "none",
    },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { selectors: { "&::before": { animation: "none" } } },
    "(forced-colors: active)": {
      background: "Canvas",
      borderColor: "CanvasText",
      boxShadow: "none",
      selectors: { "&::before": { display: "none" }, "&::after": { display: "none" } },
    },
  },
});

export const connectors = style({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  overflow: "visible",
  zIndex: 0,
  opacity: 0.62,
});
export const focalWrap = style({ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" });

export const focal = style({
  position: "relative",
  width: "min(720px, 100%)",
  padding: `${space.x4} ${space.x5}`,
  border: "1px solid rgba(116,145,221,.46)",
  borderRadius: "20px",
  background: "linear-gradient(145deg, rgba(255,255,255,.91), rgba(235,242,255,.78))",
  backdropFilter: "blur(16px)",
  color: "var(--text-primary)",
  textAlign: "left",
  boxShadow: "0 20px 58px rgba(64,89,160,.16), inset 0 1px 0 rgba(255,255,255,.94)",
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      inlineSize: 82,
      blockSize: 3,
      insetInlineStart: space.x5,
      insetBlockStart: 0,
      borderRadius: 999,
      background: "linear-gradient(90deg, var(--accent), var(--accent-violet), var(--accent-cyan))",
      boxShadow: "var(--glow-dot)",
    },
  },
});
export const focalTitle = style({ margin: `${space.x2} 0 ${space.x1}`, ...text.objectTitle, color: "var(--text-primary)", letterSpacing: "-0.03em", fontSize: "clamp(1.35rem, 2vw, 1.8rem)" });
export const nodeDescription = style({ margin: 0, color: "var(--text-muted)", lineHeight: 1.55, whiteSpace: "pre-wrap" });
export const nodeMeta = style({ display: "flex", alignItems: "center", gap: 7, color: "var(--text-muted)", ...text.metadata });
/* Tags and pinning are secondary organization mechanics, not the branch headline. */
globalStyle(`${focal} > :nth-child(4)`, { display: "none" });
globalStyle(`${focal} > button`, { display: "none" });

export const children = style({
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: space.x3,
  listStyle: "none",
  padding: 0,
  margin: 0,
  minInlineSize: 0,
  "@media": { "screen and (max-width: 760px)": { gridTemplateColumns: "minmax(0,1fr)" } },
});
export const childItem = style({ position: "relative", display: "block", minInlineSize: 0 });

export const card = style({
  position: "relative",
  overflow: "hidden",
  minHeight: 94,
  width: "100%",
  display: "grid",
  gridTemplateColumns: "38px minmax(0,1fr)",
  gridTemplateRows: "auto auto",
  columnGap: space.x2,
  rowGap: 3,
  alignItems: "center",
  padding: "15px 16px",
  border: "1px solid rgba(190,205,229,.70)",
  borderRadius: "16px",
  background: "rgba(255,255,255,.70)",
  backdropFilter: "blur(13px)",
  color: "var(--text-primary)",
  textAlign: "left",
  cursor: "pointer",
  boxShadow: "var(--glow-crystal)",
  transition: `background-color ${duration.state} ${easing.standard}, border-color ${duration.state} ${easing.standard}, box-shadow ${duration.state} ${easing.standard}, transform ${duration.press} ${easing.standard}`,
  selectors: {
    "&::after": {
      content: '""',
      position: "absolute",
      inlineSize: 88,
      blockSize: 88,
      insetInlineEnd: -36,
      insetBlockStart: -42,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(107,153,255,.12), transparent 68%)",
      pointerEvents: "none",
    },
    "&:hover": {
      background: "linear-gradient(135deg, rgba(255,255,255,.94), rgba(232,241,255,.84))",
      borderColor: "rgba(106,137,216,.46)",
      boxShadow: "var(--glow-hover)",
      transform: "translateY(-2px)",
    },
    "&:focus-visible": { outline: "2px solid var(--focus-ring)", outlineOffset: -3 },
  },
  "@media": { "(prefers-reduced-motion: reduce)": { selectors: { "&:hover": { transform: "none" } } } },
});

export const cardTitle = style({ position: "relative", zIndex: 1, display: "block", margin: 0, ...text.cardTitle, letterSpacing: "-0.015em", color: "var(--text-primary)" });
export const pinButton = style({ display: "none" });
export const icon = style({
  position: "relative",
  zIndex: 1,
  gridRow: "1 / span 2",
  display: "inline-grid",
  placeItems: "center",
  width: 36,
  height: 36,
  borderRadius: "12px",
  background: "linear-gradient(145deg, rgba(233,240,255,.98), rgba(239,232,255,.94))",
  color: "var(--accent-muted)",
  border: "1px solid rgba(115,143,219,.34)",
  boxShadow: "0 7px 18px rgba(76,106,185,.12), inset 0 1px 0 rgba(255,255,255,.90)",
});
/* Keep only title + structural cue on branch tiles; full prose and tags belong after opening. */
globalStyle(`${card} > p`, { display: "none" });
globalStyle(`${card} > :nth-child(n+5)`, { display: "none" });
globalStyle(`${card} > ${nodeMeta}`, { position: "relative", zIndex: 1, gridColumn: 2, alignSelf: "start" });

export const empty = style({ position: "relative", zIndex: 1, padding: `${space.x4} ${space.x2}`, border: "1px dashed rgba(143,163,203,.54)", borderRadius: "15px", background: "rgba(255,255,255,.46)", textAlign: "left", color: "var(--text-muted)" });
export const paging = style({ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 12, ...text.metadata, color: "var(--text-muted)" });
export const pinList = style({ display: "grid", gridTemplateColumns: "minmax(0,760px)", justifyContent: "start", gap: space.x2, listStyle: "none", padding: 0, margin: 0, minInlineSize: 0 });
export const unavailable = style({ color: "var(--text-muted)", background: "rgba(245,248,252,.80)" });

export const readerShell = style({
  inlineSize: "min(800px, 100%)",
  marginInline: "auto",
  minInlineSize: 0,
  padding: "clamp(20px, 3vw, 38px)",
  border: "1px solid rgba(184,202,230,.70)",
  borderRadius: "24px",
  background: "linear-gradient(145deg, rgba(255,255,255,.88), rgba(245,248,255,.76))",
  backdropFilter: "blur(16px)",
  boxShadow: "var(--glow-hero)",
});
export const readerHero = style({ marginTop: space.group, paddingBlockEnd: space.x6, minInlineSize: 0 });
export const readerEmpty = style({ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border-subtle)", color: "var(--text-muted)" });
export const status = style({ padding: 24, color: "var(--text-muted)" });

globalStyle(`${connectors} path`, {
  stroke: "rgba(78,111,210,.48)",
  strokeWidth: 1.35,
  strokeDasharray: "7 9",
  strokeLinecap: "round",
  fill: "none",
  filter: "drop-shadow(0 0 4px rgba(78,111,255,.20))",
  animation: `${dashFlow} 10s linear infinite`,
});
globalStyle(`${pageFrame.wide} button:focus-visible`, { outline: "2px solid var(--focus-ring)", outlineOffset: 2 });
globalStyle(`${pageFrame.reading} button:focus-visible`, { outline: "2px solid var(--focus-ring)", outlineOffset: 2 });

/* Motion never carries meaning; reduce it to a static constellation when requested. */
globalStyle(`${pageFrame.wide} ${connectors}`, { transition: `opacity ${duration.state} ${easing.standard}` });
