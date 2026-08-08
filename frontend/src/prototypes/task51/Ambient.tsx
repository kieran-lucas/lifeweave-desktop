import { vars } from "../../design-system/visual/contract.css";
import * as s from "./prototype.css";

/**
 * The ambient art layer — light blue, per Product Owner direction (ADR 0045 §7).
 *
 * Everything here is static SVG and CSS gradients. There is no animation, no blur filter, no
 * particle system and no canvas. Two reasons, both recorded:
 *
 *   1. Today requires no continuous animation (spec §10), and a tool that stays open for hours
 *      should be calmer after two hours, not busier.
 *   2. The measured target machine has two cores and integrated graphics. A `filter: blur()` over a
 *      large field is real per-frame GPU work; a radial gradient is painted once.
 *
 * The whole layer is `aria-hidden` and `pointer-events: none`, and its opacity steps down as the
 * day gets denser, so art occupies empty space and retreats when information arrives.
 */
export function Ambient({ density }: { density: "quiet" | "normal" | "dense" }) {
  return (
    <div className={`${s.ambient} ${s.ambientDensity[density]}`} aria-hidden="true">
      {/*
        Two glow fields rather than one. `primary` is the light blue itself; `secondary` sits a few
        degrees toward violet so the overlap shifts hue slightly instead of flattening into a single
        wash. Both are radial gradients fading to transparent — no hard edge anywhere.
      */}
      <div className={`${s.ambientLayer} ${s.ambientGlow}`} />

      {/*
        Contour lines. Few paths, low opacity, no semantic role — the topographic language the
        activation prompt specifies, kept to five strokes so it reads as terrain rather than as a
        pattern. They sit in the workspace's right margin, which is the empty band the measured
        reference reserves.
      */}
      <svg
        className={s.ambientLayer}
        viewBox="0 0 800 600"
        preserveAspectRatio="xMaxYMin slice"
        fill="none"
        stroke={vars.color.ambientContour}
        strokeWidth={1}
      >
        <path d="M470 -40 C 560 30, 610 90, 664 168 C 706 228, 742 268, 812 300" opacity="0.55" />
        <path d="M516 -46 C 606 26, 656 92, 706 172 C 748 238, 780 276, 850 306" opacity="0.45" />
        <path d="M564 -52 C 652 24, 700 96, 748 178 C 790 244, 820 282, 890 312" opacity="0.35" />
        <path d="M612 -58 C 700 22, 744 100, 790 184 C 832 250, 860 288, 930 318" opacity="0.26" />
        <path d="M660 -64 C 746 20, 788 104, 832 190" opacity="0.18" />
        {/* A few sparse spatial dots. Not a particle field — five marks, placed, not generated. */}
        <circle cx="672" cy="150" r="2.5" fill={vars.color.ambientContour} stroke="none" opacity="0.7" />
        <circle cx="742" cy="238" r="1.8" fill={vars.color.ambientContour} stroke="none" opacity="0.5" />
        <circle cx="614" cy="86" r="1.5" fill={vars.color.ambientContour} stroke="none" opacity="0.4" />
        <circle cx="788" cy="330" r="2" fill={vars.color.ambientContour} stroke="none" opacity="0.35" />
        <circle cx="556" cy="44" r="1.4" fill={vars.color.ambientContour} stroke="none" opacity="0.3" />
      </svg>
    </div>
  );
}
