import * as styles from "./atmosphere.css";

/**
 * Global abstract-anime painted field.
 * Decorative only: local SVG/CSS, no input, no network and no product capability.
 */
export function Atmosphere() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.aura} />
      <div className={styles.veil} />

      <svg
        className={styles.lines}
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="lw-ink" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-cyan)" stopOpacity="0.22" />
            <stop offset="0.52" stopColor="var(--art-line-strong)" stopOpacity="0.72" />
            <stop offset="1" stopColor="var(--accent-violet)" stopOpacity="0.20" />
          </linearGradient>
          <linearGradient id="lw-brush" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--accent-cyan)" stopOpacity="0" />
            <stop offset="0.24" stopColor="var(--accent-cyan)" stopOpacity="0.13" />
            <stop offset="0.68" stopColor="var(--accent-violet)" stopOpacity="0.10" />
            <stop offset="1" stopColor="var(--accent-rose)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Broad dry-brush gestures: intentionally soft-edged through geometry, not blur. */}
        <g stroke="url(#lw-brush)" strokeLinecap="round">
          <path d="M980 112 C1180 24 1440 42 1690 154" strokeWidth="84" opacity="0.58" />
          <path d="M-120 838 C162 714 394 738 626 874" strokeWidth="66" opacity="0.42" />
          <path d="M1120 792 C1320 696 1506 718 1690 816" strokeWidth="38" opacity="0.28" />
        </g>

        {/* Anime-editorial wind/cloud contours. */}
        <g className={styles.orbital} stroke="url(#lw-ink)" strokeLinecap="round">
          <path d="M936 144 C1108 62 1278 74 1430 154 C1512 198 1594 196 1694 148" strokeWidth="1.3" opacity="0.70" />
          <path d="M1002 196 C1178 124 1332 132 1468 202 C1542 240 1612 238 1702 198" strokeWidth="0.9" opacity="0.47" />
          <path d="M1132 88 C1222 42 1328 38 1414 74" strokeWidth="0.8" opacity="0.34" />
        </g>

        {/* Long weave curves give the application one continuous silhouette across pages. */}
        <g stroke="var(--art-line)" strokeLinecap="round">
          <path d="M-180 218 C212 78 470 286 812 204 C1110 132 1362 182 1760 72" strokeWidth="1.35" opacity="0.58" />
          <path d="M-160 306 C236 164 504 366 846 286 C1152 214 1392 256 1744 166" strokeWidth="0.9" opacity="0.38" />
          <path d="M-122 680 C272 810 608 590 936 704 C1226 806 1456 706 1744 778" strokeWidth="1.15" opacity="0.44" />
          <path d="M-82 762 C294 896 636 684 986 798 C1264 888 1488 812 1748 868" strokeWidth="0.8" opacity="0.28" />
        </g>

        {/* Lower-left hand-drawn atlas rings balance the composition. */}
        <g className={styles.orbitalSlow} stroke="url(#lw-ink)">
          <ellipse cx="150" cy="878" rx="316" ry="146" strokeWidth="1" opacity="0.36" />
          <ellipse cx="150" cy="878" rx="224" ry="94" strokeWidth="0.75" opacity="0.25" />
          <path d="M-104 816 C82 744 284 758 476 864" strokeWidth="0.9" opacity="0.32" />
        </g>

        {/* Flat illustrated seal: more artbook insignia than crystal badge. */}
        <g className={styles.prism} transform="translate(1390 230)">
          <circle r="48" fill="var(--paint-sheet)" stroke="var(--art-line-strong)" strokeWidth="1" />
          <circle r="35" stroke="var(--art-line)" strokeWidth="0.8" opacity="0.72" />
          <path d="M0 -25 C8 -8 20 -5 27 0 C16 5 8 11 0 26 C-8 11 -16 5 -27 0 C-20 -5 -8 -8 0 -25Z" fill="var(--accent-ice)" stroke="var(--art-line-strong)" strokeWidth="0.9" />
          <circle r="3.5" fill="var(--accent)" />
        </g>

        {/* Sparse ink/silver stars. Static marks avoid distracting pulse loops. */}
        <g className={styles.stars} fill="var(--art-glint)">
          <g className={styles.starA}>
            <path d="M1218 94 l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
            <path d="M1494 332 l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity="0.72" />
            <circle cx="310" cy="126" r="2.2" opacity="0.58" />
          </g>
          <g className={styles.starB}>
            <path d="M1060 164 l2.4 6.4 6.4 2.4-6.4 2.4-2.4 6.4-2.4-6.4-6.4-2.4 6.4-2.4z" opacity="0.76" />
            <circle cx="1460" cy="104" r="2" opacity="0.54" />
            <circle cx="92" cy="708" r="2.3" opacity="0.62" />
          </g>
          <g className={styles.starC}>
            <path d="M184 820 l2.8 7.2 7.2 2.8-7.2 2.8-2.8 7.2-2.8-7.2-7.2-2.8 7.2-2.8z" opacity="0.68" />
            <circle cx="686" cy="72" r="1.8" opacity="0.48" />
            <circle cx="1282" cy="822" r="1.9" opacity="0.44" />
          </g>
        </g>

        {/* Abstract petals — hand-placed, very sparse. */}
        <g className={styles.petals} fill="var(--art-petal)">
          <path d="M1450 454 C1464 444 1476 451 1471 465 C1464 478 1452 476 1450 454Z" opacity="0.58" />
          <path d="M1510 516 C1522 504 1537 510 1531 525 C1524 538 1512 536 1510 516Z" opacity="0.42" />
          <path d="M234 762 C246 751 260 757 255 771 C248 784 236 782 234 762Z" opacity="0.46" />
          <path d="M320 846 C332 836 344 842 339 855 C332 867 322 865 320 846Z" opacity="0.34" />
        </g>
      </svg>
    </div>
  );
}
