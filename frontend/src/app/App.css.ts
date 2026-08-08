import { globalStyle, style } from "@vanilla-extract/css";

import { gutter, space } from "./layout/tokens.css";

/**
 * Application shell geometry only. Page width, page gutter, dialog width, and page-level section
 * gaps live in `layout/` (ADR 0044); nothing in this file may declare them again.
 */

/*
 * Sized in percentage terms, never viewport units. `100vw`/`100vh` include the classic scrollbar
 * gutter by definition, so before Task 50 a vertical scrollbar made the root 15 px wider than the
 * space available to it, that horizontal scrollbar shrank the available height, and the two axes
 * fed each other. Measured evidence is in `docs/audits/task-50-layout-baseline.md` §2.1.
 */
export const appRoot = style({ display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", inlineSize: "100%", blockSize: "100%", overflow: "hidden", background: "var(--app-background)", selectors: { "&[data-sidebar-mode=collapsed]": { gridTemplateColumns: "68px minmax(0, 1fr)" } } });
export const sidebar = style({ display: "flex", flexDirection: "column", minWidth: 0, padding: "24px 14px", borderRight: "1px solid var(--border-subtle)", background: "var(--sidebar-background)", transition: "width 160ms ease, padding 160ms ease" });
export const brand = style({ padding: "0 12px 28px", fontWeight: 750, letterSpacing: "-0.02em", color: "var(--text-primary)" });
export const navGroup = style({ display: "grid", gap: 5 });
export const navButton = style({ display: "flex", alignItems: "center", gap: 12, minHeight: 42, width: "100%", padding: "8px 11px", border: 0, borderRadius: 10, background: "transparent", color: "var(--text-muted)", textAlign: "left", cursor: "pointer", selectors: { "&[aria-current=page]": { background: "var(--active-background)", color: "var(--text-primary)", fontWeight: 700 }, "&:hover": { background: "var(--active-background)" }, "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } } });
export const navIcon = style({ display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: 7, fontSize: 12, fontWeight: 800, background: "var(--icon-background)" });
export const navLabel = style({ overflow: "hidden", whiteSpace: "nowrap" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${navLabel}`, { display: "none" });
globalStyle(`${appRoot}[data-sidebar-mode=collapsed] .${brand}`, { fontSize: 0, paddingInline: 11 });
export const divider = style({ height: 1, margin: "12px 10px", background: "var(--border-subtle)" });
export const collapseButton = style({ marginTop: "auto", display: "flex", gap: 12, alignItems: "center", minHeight: 42, padding: "8px 11px", border: 0, borderRadius: 10, background: "transparent", color: "var(--text-muted)", cursor: "pointer" });

/*
 * The one main viewport. It owns the single responsive gutter and reserves its scrollbar gutter on
 * *both* edges, so a page frame is optically centred whether or not the scrollbar is drawn.
 *
 * `stable` alone reserves the gutter on the inline-end edge only. That keeps the content box a
 * constant width — which is what stops the frame jumping as content grows — but leaves the visible
 * composition 15.2px heavier on one side, and native phase 21 measured exactly that imbalance.
 * `both-edges` costs one gutter of width and makes the equilibrium real rather than nominal.
 *
 * `position: relative` is load-bearing, not decoration. Without it the viewport is not a containing
 * block, so an absolutely positioned descendant with no positioned ancestor — every `srOnly`
 * clipping span, and there are several deep in Settings — resolves against the initial containing
 * block instead. It then escapes this element's `overflow: auto`, lands at its static offset
 * hundreds of pixels down the document, and gives the *document* a vertical scrollbar. That
 * scrollbar was the second half of the measured Settings defect: it shrank `clientWidth` by 15px,
 * which the old `100vw` root then turned into horizontal overflow.
 */
export const viewport = style({ position: "relative", minInlineSize: 0, minBlockSize: 0, overflow: "auto", scrollbarGutter: "stable both-edges", padding: gutter });

export const heading = style({ margin: 0, color: "var(--text-primary)", fontSize: "clamp(1.8rem, 3vw, 2.5rem)", letterSpacing: "-0.04em" });
export const lede = style({ margin: 0, color: "var(--text-muted)", fontSize: "1.05rem" });
export const settingsSection = style({ display: "flex", flexDirection: "column", gap: space.group, minInlineSize: 0 });
export const coreStatus = style({ color: "var(--text-muted)" });
export const shortcutList = style({ display: "grid", gridTemplateColumns: "1fr auto", gap: `${space.control} ${space.field}`, margin: 0, alignItems: "center" });
globalStyle(`${shortcutList} dd`, { margin: 0, justifySelf: "end" });
export const shortcutChord = style({ padding: "3px 9px", borderRadius: 7, border: "1px solid var(--border-subtle)", background: "var(--icon-background)", fontFamily: "inherit", fontSize: "0.9rem", fontWeight: 700, whiteSpace: "nowrap" });
export const dialogButton = style({ minHeight: 38, padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "transparent", color: "var(--text-primary)", cursor: "pointer", selectors: { "&:focus-visible": { outline: "3px solid var(--focus-ring)", outlineOffset: 2 } } });
