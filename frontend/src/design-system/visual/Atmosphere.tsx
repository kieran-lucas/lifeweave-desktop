import * as styles from "./atmosphere.css";

/**
 * Global abstract-anime art field.
 * Decorative only: local SVG/CSS, no timers, no input, no network and no product capability.
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
          <linearGradient id="lw-orbit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-cyan)" stopOpacity="0.18" />
            <stop offset="0.5" stopColor="var(--art-line-strong)" stopOpacity="0.72" />
            <stop offset="1" stopColor="var(--accent-violet)" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="lw-weave" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--accent-cyan)" stopOpacity="0" />
            <stop offset="0.34" stopColor="var(--art-line)" stopOpacity="0.55" />
            <stop offset="0.72" stopColor="var(--accent-violet)" stopOpacity="0.46" />
            <stop offset="1" stopColor="var(--accent-rose)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="lw-prism" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="white" stopOpacity="0.78" />
            <stop offset="0.48" stopColor="var(--accent-cyan)" stopOpacity="0.26" />
            <stop offset="1" stopColor="var(--accent-violet)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Top-right celestial instrument: deliberately clipped by the viewport edge. */}
        <g className={styles.orbital} stroke="url(#lw-orbit)" strokeLinecap="round">
          <ellipse cx="1328" cy="150" rx="390" ry="186" strokeWidth="1.2" opacity="0.74" />
          <ellipse cx="1328" cy="150" rx="308" ry="132" strokeWidth="0.8" opacity="0.52" />
          <ellipse cx="1328" cy="150" rx="230" ry="88" strokeWidth="0.8" opacity="0.36" />
          <path d="M1010 292 C1188 192 1404 204 1660 74" strokeWidth="1.1" opacity="0.50" />
          <path d="M1100 348 C1280 238 1454 252 1708 146" strokeWidth="0.8" opacity="0.34" />
        </g>

        {/* Long weave curves give the product a recognizable silhouette without boxing content. */}
        <g stroke="url(#lw-weave)" strokeLinecap="round">
          <path d="M-180 215 C210 72 474 288 808 204 C1120 124 1360 182 1760 64" strokeWidth="1.35" opacity="0.62" />
          <path d="M-160 308 C238 164 508 370 842 286 C1160 206 1394 258 1740 164" strokeWidth="0.9" opacity="0.42" />
          <path d="M-120 678 C276 816 604 582 936 704 C1224 812 1450 702 1740 774" strokeWidth="1.15" opacity="0.48" />
          <path d="M-80 762 C298 902 634 674 984 796 C1258 890 1482 806 1744 866" strokeWidth="0.8" opacity="0.30" />
        </g>

        {/* Lower-left orbit balances the bright upper-right world. */}
        <g className={styles.orbitalSlow} stroke="url(#lw-orbit)">
          <ellipse cx="152" cy="878" rx="318" ry="148" strokeWidth="1" opacity="0.42" />
          <ellipse cx="152" cy="878" rx="224" ry="94" strokeWidth="0.75" opacity="0.30" />
          <path d="M-100 814 C86 742 286 758 474 864" strokeWidth="0.9" opacity="0.38" />
        </g>

        {/* Crystal sigil: abstract geometry, not a product control. */}
        <g className={styles.prism} transform="translate(1388 222)">
          <circle r="54" fill="url(#lw-prism)" opacity="0.42" />
          <path d="M0 -35 L30 0 L0 35 L-30 0 Z" stroke="var(--art-line-strong)" strokeWidth="1.1" />
          <path d="M0 -22 L19 0 L0 22 L-19 0 Z" stroke="var(--art-line)" strokeWidth="0.8" opacity="0.72" />
          <circle r="4" fill="var(--art-glint)" opacity="0.82" />
        </g>

        {/* Sparse hand-placed star/glint field. */}
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

        {/* Abstract petals: small enough to read as anime-editorial atmosphere, never wallpaper. */}
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
