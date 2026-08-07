import { style } from "@vanilla-extract/css";
export const root=style({display:"flex",flexDirection:"column",gap:24,maxWidth:960}); export const header=style({display:"flex",justifyContent:"space-between",alignItems:"center"}); export const eyebrow=style({color:"var(--text-muted)",margin:0}); export const create=style({padding:"10px 16px"}); export const timeline=style({display:"flex",flexDirection:"column",gap:28}); export const empty=style({color:"var(--text-muted)"}); export const group=style({display:"grid",gridTemplateColumns:"minmax(92px,116px) minmax(0,1fr)",gap:16,borderTop:"1px solid var(--border-subtle)",paddingTop:12}); export const time=style({fontVariantNumeric:"tabular-nums",color:"var(--text-muted)"}); export const row=style({display:"grid",gridTemplateColumns:"minmax(0,1fr) 44px 44px",gap:12,alignItems:"start",padding:"8px 0",borderBottom:"1px solid var(--border-subtle)",cursor:"pointer"}); export const selected=style({outline:"2px solid var(--focus-ring)"}); export const assessment=style({color:"var(--text-muted)",textAlign:"center"}); export const category=style({color:"var(--text-muted)",fontSize:12}); export const wheel=style({display:"block"}); export const dialog=style({position:"fixed",inset:0,background:"color-mix(in srgb, black 30%, transparent)",display:"grid",placeItems:"center",zIndex:"var(--layer-modal)"});
export const undo=style({margin:0,color:"var(--text-muted)"});
export const seriesTagsNote=style({fontSize:11,color:"var(--text-muted, #666)",margin:"4px 0 0"});

// ── Actual time (Task 43). Running state is conveyed by text and a border, never colour alone.
export const timerStrip = style({ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center", marginBlock: "0.6rem", padding: "0.55rem 0.75rem", border: "1px solid currentColor", borderRadius: "0.6rem" });
export const timerRunning = style({ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.75rem", border: "1px solid currentColor", borderRadius: "0.4rem", padding: "0.1rem 0.4rem" });
export const timerTitle = style({ fontWeight: 600 });
export const timerDate = style({ opacity: 0.8 });
export const timerCounter = style({ fontVariantNumeric: "tabular-nums", fontSize: "1.1rem", fontWeight: 700, marginInlineStart: "auto" });
export const timerTotal = style({ opacity: 0.8, fontVariantNumeric: "tabular-nums" });
export const timerButton = style({ border: "1px solid currentColor", borderRadius: "0.5rem", background: "transparent", color: "inherit", padding: "0.35rem 0.7rem", cursor: "pointer", selectors: { "&:disabled": { cursor: "not-allowed", opacity: 0.6 } } });
export const timerError = style({ margin: 0, border: "2px solid currentColor", padding: "0.5rem" });
export const rowTimer = style({ display: "inline-flex", gap: "0.4rem", alignItems: "center" });
export const rowTimerTotal = style({ fontVariantNumeric: "tabular-nums", opacity: 0.85 });
export const rowTimerButton = style({ border: "1px solid currentColor", borderRadius: "0.5rem", background: "transparent", color: "inherit", padding: "0.25rem 0.55rem", cursor: "pointer", selectors: { "&:disabled": { cursor: "not-allowed", opacity: 0.5 } } });
export const srOnly = style({ position: "absolute", inlineSize: "1px", blockSize: "1px", overflow: "hidden", clipPath: "inset(50%)" });
