import { style } from "@vanilla-extract/css";

export const world = style({ borderRadius: 12, padding: 20, background: "var(--world-canvas)", color: "var(--world-text)", "@media": { "(forced-colors: active)": { background: "Canvas", color: "CanvasText", boxShadow: "none" } } });
export const paper = style({ vars: { "--world-canvas": "#FAF8F4", "--world-surface": "#FFFFFF", "--world-text": "#2E2924" } });
export const sakura = style({ vars: { "--world-canvas": "#FFF7FA", "--world-surface": "#FFFFFF", "--world-text": "#3B2430" } });
export const aurora = style({ vars: { "--world-canvas": "#F4FBFF", "--world-surface": "#FFFFFF", "--world-text": "#17323A" } });
export const nocturne = style({ vars: { "--world-canvas": "#F7F5FF", "--world-surface": "#FFFFFF", "--world-text": "#28233E" } });
