import * as styles from "./atmosphere.css";

/**
 * The Lifeweave atmosphere — Layer 0 of the art system.
 *
 * One field for the entire application, mounted once behind the shell. This is the decision that
 * makes the art *a system* rather than decoration: every page sits on the same light, so pages
 * cannot drift apart visually, and there is exactly one thing to tune when the mood needs adjusting.
 *
 * Composition, in order of what carries the mood:
 *
 *   1. three wide aura fields — cool blue, blue-violet and cyan — anchored to the corners and edges
 *      so the centre of every page stays clean where text lives;
 *   2. a set of long flowing contour lines, drawn once and reused, which give the field structure
 *      without reading as a pattern;
 *   3. a handful of glints — sparse, placed, never generated — that catch the eye the way a star
 *      field does at the edge of vision.
 *
 * Everything here is **static paint**. There is no animation, no timer, no canvas and no filter:
 * the target machine has two cores and integrated graphics, and an animated background would spend
 * real frames on something the user is meant to notice only peripherally. It is `aria-hidden` and
 * `pointer-events: none`, so it can never intercept input or reach a screen reader.
 *
 * Intensity is not adjusted here. Pages that need a quieter ground raise their own surface opacity
 * over this field rather than asking the field to dim, which keeps one source of truth.
 */
export function Atmosphere() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.aura} />
      <svg
        className={styles.lines}
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/*
          Flowing contours. Five strokes, weighted so the field reads as depth rather than as a
          repeating texture: the nearest is the most visible, the furthest barely there.
        */}
        <g stroke="var(--art-line)" strokeLinecap="round">
          <path d="M-120 210 C 260 120, 520 300, 900 200 C 1200 120, 1420 250, 1760 170" opacity="0.5" strokeWidth="1.1" />
          <path d="M-120 300 C 300 200, 560 380, 940 280 C 1240 200, 1460 330, 1760 250" opacity="0.36" strokeWidth="1" />
          <path d="M-120 640 C 300 760, 620 560, 1000 690 C 1300 790, 1500 640, 1760 720" opacity="0.3" strokeWidth="1" />
          <path d="M-120 730 C 320 850, 640 650, 1020 780 C 1320 880, 1520 730, 1760 810" opacity="0.22" strokeWidth="0.9" />
          <path d="M980 -60 C 1140 180, 1220 420, 1180 700 C 1150 860, 1200 960, 1320 1060" opacity="0.18" strokeWidth="0.9" />
        </g>
        {/*
          Glints. Placed by hand, not generated — nine marks across a 1600×1000 field, clustered
          where the auras are strongest so they read as light catching rather than as dust.
        */}
        <g fill="var(--art-glint)">
          <circle cx="1290" cy="150" r="2.4" opacity="0.55" />
          <circle cx="1420" cy="264" r="1.6" opacity="0.4" />
          <circle cx="1180" cy="86" r="1.4" opacity="0.34" />
          <circle cx="1512" cy="360" r="2" opacity="0.3" />
          <circle cx="96" cy="742" r="2.2" opacity="0.4" />
          <circle cx="228" cy="860" r="1.5" opacity="0.32" />
          <circle cx="40" cy="640" r="1.3" opacity="0.26" />
          <circle cx="1360" cy="820" r="1.8" opacity="0.24" />
          <circle cx="700" cy="60" r="1.2" opacity="0.2" />
        </g>
      </svg>
    </div>
  );
}
