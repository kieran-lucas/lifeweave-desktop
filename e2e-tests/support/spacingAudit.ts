import { browser } from "@wdio/globals";

/**
 * Semantic-spacing audit support for the Task 50 maximized follow-up.
 *
 * The Task 50 gate proved *containment* — nothing overflows, nothing overlaps, frames agree. It
 * could not prove *separation*: `Morning04:00–12:00` overlaps nothing and overflows nothing, and is
 * still a blocking layout defect because two semantic units read as one string.
 *
 * This detector finds that class mechanically instead of relying on 26 screenshots being eyeballed
 * correctly. It runs entirely in the real WebView, because the whole question is where boxes
 * actually land.
 */

export type Collision = {
  kind: "inline" | "stacked" | "edge";
  screen: string;
  first: string;
  second: string;
  gap: number;
  /** Whether a whitespace-only text node separates the pair in the DOM. */
  literalSpace: boolean;
  parentDisplay: string;
  parentGap: string;
  path: string;
};

/**
 * Minimum gap between two adjacent semantic units sharing a line. The Lifeweave ramp's smallest
 * step is 4px and the policy floor for inline semantic units is 8px; 6px is used as the *detection*
 * threshold so a pair sitting on a literal space (~4px) is still reported.
 */
const INLINE_FLOOR = 6;

/** Text must not sit against its container's padding edge. */
const EDGE_FLOOR = 2;

export async function findCollisions(screen: string): Promise<Collision[]> {
  const found = await browser.execute(
    (screenName: string, inlineFloor: number, edgeFloor: number) => {
      const results: Array<Record<string, unknown>> = [];

      const describe = (node: Element): string => {
        const text = (node.textContent ?? "").trim().replace(/\s+/g, " ");
        const tag = node.tagName.toLowerCase();
        return text ? `${tag}:"${text.slice(0, 40)}"` : tag;
      };

      const pathOf = (node: Element): string => {
        const parts: string[] = [];
        let current: Element | null = node;
        for (let depth = 0; current && depth < 5; depth += 1) {
          const id = current.id ? `#${current.id}` : "";
          const label = current.getAttribute("aria-label");
          parts.unshift(`${current.tagName.toLowerCase()}${id}${label ? `[${label}]` : ""}`);
          current = current.parentElement;
        }
        return parts.join(" > ");
      };

      const visible = (node: Element) => {
        const box = node.getBoundingClientRect();
        if (box.width <= 0 || box.height <= 0) return false;
        const style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.display === "none") return false;
        if (style.opacity === "0") return false;
        // Screen-reader-only clipping spans are not visible composition.
        if (style.clipPath.includes("inset(50%)") || style.clip === "rect(0px, 0px, 0px, 0px)")
          return false;
        return true;
      };

      /** An element that renders its own text rather than merely wrapping children that do. */
      const ownsText = (node: Element) => {
        for (const child of node.childNodes)
          if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim()) return true;
        return false;
      };

      const roots = document.querySelectorAll<HTMLElement>("[data-app-viewport] *, [role='dialog'] *");
      const parents = new Set<Element>();
      for (const node of roots) if (node.children.length >= 2) parents.add(node);

      for (const parent of parents) {
        const style = getComputedStyle(parent);
        const kids = [...parent.children].filter(
          child => visible(child) && (child.textContent ?? "").trim().length > 0,
        );
        if (kids.length < 2) continue;

        for (let i = 0; i < kids.length - 1; i += 1) {
          const a = kids[i]!;
          const b = kids[i + 1]!;
          // Only compare units that actually render text themselves; a wrapper pair is measured at
          // the level where the text lives.
          if (!ownsText(a) && a.querySelectorAll("*").length > 3) continue;
          if (!ownsText(b) && b.querySelectorAll("*").length > 3) continue;

          /*
           * Content edges, not border-box edges. Two table cells always share a border, and two
           * padded buttons in a segmented control always sit 4px apart — in both cases the visible
           * separation is the padding inside them. Measuring border boxes reports those as
           * collisions when nothing is actually touching. What matters is the distance between the
           * *ink*.
           */
          const inset = (node: Element) => {
            const s = getComputedStyle(node);
            return {
              left: parseFloat(s.paddingLeft) + parseFloat(s.borderLeftWidth),
              right: parseFloat(s.paddingRight) + parseFloat(s.borderRightWidth),
              top: parseFloat(s.paddingTop) + parseFloat(s.borderTopWidth),
              bottom: parseFloat(s.paddingBottom) + parseFloat(s.borderBottomWidth),
            };
          };
          /*
           * A wrapper that only holds one padded child — a calendar day cell around its day button,
           * a list item around its card — carries the ink of that child, not its own. Measuring the
           * wrapper reports the 1px grid line between cells as a collision when the visible content
           * is 20px apart. Descend to the element that actually renders.
           */
          const ink = (node: Element): Element => {
            let current = node;
            for (let depth = 0; depth < 3; depth += 1) {
              const kids = [...current.children];
              const ownText = [...current.childNodes].some(
                child => child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim(),
              );
              if (ownText || kids.length !== 1) break;
              current = kids[0]!;
            }
            return current;
          };
          /*
           * Where an element renders text, measure the text itself with a Range. A calendar weekday
           * header is centred in a 1/7 track, so its box abuts its neighbour while the words sit
           * ~140px apart; only the glyph bounds answer "is this touching?".
           */
          const textBox = (node: Element): DOMRect | null => {
            const range = document.createRange();
            let found = false;
            range.selectNodeContents(node);
            for (const child of node.childNodes)
              if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim()) found = true;
            if (!found) return null;
            const box = range.getBoundingClientRect();
            range.detach?.();
            if (box.width <= 0 || box.height <= 0) return null;
            /*
             * A Range reports the full text, ignoring `overflow: hidden`. A line-clamped card
             * description therefore measures several lines taller than it renders and appears to
             * share a line with the metadata stacked beneath it. Clip to what is actually painted.
             */
            const own = node.getBoundingClientRect();
            const top = Math.max(box.top, own.top);
            const bottom = Math.min(box.bottom, own.bottom);
            if (bottom <= top) return null;
            return new DOMRect(box.left, top, box.width, bottom - top);
          };

          const inkA = ink(a);
          const inkB = ink(b);
          const ia = inset(inkA);
          const ib = inset(inkB);
          const textA = textBox(inkA);
          const textB = textBox(inkB);
          const ba = textA ?? inkA.getBoundingClientRect();
          const bb = textB ?? inkB.getBoundingClientRect();
          // A Range already reports the glyph bounds, so padding must not be subtracted again.
          if (textA) { ia.left = 0; ia.right = 0; ia.top = 0; ia.bottom = 0; }
          if (textB) { ib.left = 0; ib.right = 0; ib.top = 0; ib.bottom = 0; }
          const ra = {
            left: ba.left + ia.left,
            right: ba.right - ia.right,
            top: ba.top + ia.top,
            bottom: ba.bottom - ia.bottom,
            height: ba.height - ia.top - ia.bottom,
          };
          const rb = {
            left: bb.left + ib.left,
            right: bb.right - ib.right,
            top: bb.top + ib.top,
            bottom: bb.bottom - ib.bottom,
            height: bb.height - ib.top - ib.bottom,
          };

          // Is a whitespace-only text node sitting between them?
          let literalSpace = false;
          let cursor: ChildNode | null = a.nextSibling;
          while (cursor && cursor !== b) {
            if (cursor.nodeType === Node.TEXT_NODE && /^\s+$/.test(cursor.textContent ?? ""))
              literalSpace = true;
            cursor = cursor.nextSibling;
          }

          const sharesLine =
            Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > Math.min(ra.height, rb.height) * 0.5;

          if (sharesLine) {
            const gap = rb.left - ra.right;
            if (gap < inlineFloor)
              results.push({
                kind: "inline",
                screen: screenName,
                first: describe(a),
                second: describe(b),
                gap: Math.round(gap * 100) / 100,
                literalSpace,
                parentDisplay: style.display,
                parentGap: style.gap || style.columnGap || "normal",
                path: pathOf(parent),
              });
          } else if (rb.top >= ra.bottom - 1) {
            const gap = rb.top - ra.bottom;
            // Stacked semantic siblings touching outright.
            if (gap < 1 && style.display !== "block" && style.display !== "inline")
              results.push({
                kind: "stacked",
                screen: screenName,
                first: describe(a),
                second: describe(b),
                gap: Math.round(gap * 100) / 100,
                literalSpace,
                parentDisplay: style.display,
                parentGap: style.gap || style.rowGap || "normal",
                path: pathOf(parent),
              });
          }
        }
      }

      // Text sitting against a bordered/padded container's content edge.
      for (const node of document.querySelectorAll<HTMLElement>(
        "[data-app-viewport] button, [data-app-viewport] input, [data-app-viewport] select, [role='dialog'] button, [role='dialog'] input, [role='dialog'] select",
      )) {
        if (!visible(node)) continue;
        const style = getComputedStyle(node);
        const hasBorder = parseFloat(style.borderTopWidth) > 0 || style.backgroundColor !== "rgba(0, 0, 0, 0)";
        if (!hasBorder) continue;
        const padX = Math.min(parseFloat(style.paddingLeft), parseFloat(style.paddingRight));
        const padY = Math.min(parseFloat(style.paddingTop), parseFloat(style.paddingBottom));
        /*
         * An icon control sizes itself explicitly and centres a single glyph, so it legitimately
         * carries no padding — the 32px pin button and the 44px assessment trigger are both that
         * shape. Only controls whose text is meant to be read need an inset.
         */
        const text = (node.textContent ?? "").trim();
        const iconControl = text.length <= 2 && node.hasAttribute("aria-label");
        if (text && !iconControl && (padX < edgeFloor || padY < edgeFloor))
          results.push({
            kind: "edge",
            screen: screenName,
            first: describe(node),
            second: `padding ${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
            gap: Math.min(padX, padY),
            literalSpace: false,
            parentDisplay: style.display,
            parentGap: "-",
            path: pathOf(node),
          });
      }

      return results;
    },
    screen,
    INLINE_FLOOR,
    EDGE_FLOOR,
  );
  return found as Collision[];
}

/** Maximizes the real Tauri window and reports the environment that actually resulted. */
const describeViewport = () =>
  browser.execute(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
    devicePixelRatio: window.devicePixelRatio,
    screenWidth: screen.width,
    screenHeight: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
  }));

/**
 * The requested viewport, parsed from `LIFEWEAVE_AUDIT_VIEWPORT` as `WIDTHxHEIGHT`.
 *
 * Absent means canonical mode: maximize the real window, which stays the Task 50 authority.
 */
export function requestedViewport(): { width: number; height: number } | null {
  const raw = process.env.LIFEWEAVE_AUDIT_VIEWPORT;
  if (!raw) return null;
  const [width, height] = raw.split("x").map(Number);
  if (!width || !height) throw new Error(`LIFEWEAVE_AUDIT_VIEWPORT must be WIDTHxHEIGHT, got "${raw}"`);
  return { width, height };
}

/**
 * Put the window into the audited presentation and report what the WebView *actually* measured.
 *
 * Two modes, deliberately:
 *
 * **Canonical** — no requested viewport. Maximize and measure. Unchanged Task 50 behaviour; the
 * measured viewport is the authority and nothing is hard-coded to a size.
 *
 * **Explicit viewport** — a size was requested. The window is set to an *outer* size chosen so the
 * inner viewport lands on the request, because `setWindowRect` sizes the frame and the inner
 * viewport is smaller by the window chrome. The chrome delta is measured from the live window
 * rather than assumed, then the result is verified.
 *
 * The verification is the point. An earlier attempt simply called `setWindowRect` and trusted it;
 * the walk then re-maximized after its fixture reload and silently measured a maximized window
 * while claiming to test 1280×800. This function fails loudly instead.
 */
export type AuditViewportRequest = { width: number; height: number } | null;

/**
 * Enter one measured viewport for a native geometry gate.
 *
 * `task50b` obtains the request from the environment, while the release gate owns a fixed matrix.
 * Both must use the same chrome compensation and achieved-size verification so neither can report
 * a requested outer-window size as though it were the WebView's inner viewport.
 */
export async function enterMeasuredViewport(requested: AuditViewportRequest) {
  if (!requested) {
    await browser.maximizeWindow();
    await browser.pause(500);
    return { mode: "canonical" as const, requested: null, ...(await describeViewport()) };
  }

  // Measure this window's chrome, then aim the outer size so the inner viewport hits the request.
  const before = await describeViewport();
  const chromeX = before.outerWidth - before.innerWidth;
  const chromeY = before.outerHeight - before.innerHeight;

  /*
   * Refuse a viewport this display physically cannot show, *before* attempting the resize.
   *
   * On the measured machine the work area is 1536 × 816, so a requested 1440 × 900 needs a window
   * taller than the desktop. Asking for it does not merely clamp — it killed the WebView mid-run
   * and produced "no such window: target window already closed", which reads like a product crash
   * and is not one. Failing here says what is actually true.
   */
  if (requested.width + chromeX > before.availWidth || requested.height + chromeY > before.availHeight) {
    throw new Error(
      `requested viewport ${requested.width}x${requested.height} does not fit this display: ` +
        `needs ${requested.width + chromeX}x${requested.height + chromeY} of window, ` +
        `work area is ${before.availWidth}x${before.availHeight}. ` +
        `This is an environment limit, not a layout defect — record it as NOT ACHIEVABLE.`,
    );
  }
  await browser.setWindowRect(0, 0, requested.width + chromeX, requested.height + chromeY);
  await browser.pause(600);

  let achieved = await describeViewport();
  // One corrective pass: DPI rounding and OS minimum-size clamping can shift the first attempt.
  const driftX = requested.width - achieved.innerWidth;
  const driftY = requested.height - achieved.innerHeight;
  if (Math.abs(driftX) > 1 || Math.abs(driftY) > 1) {
    await browser.setWindowRect(
      0,
      0,
      requested.width + chromeX + driftX,
      requested.height + chromeY + driftY,
    );
    await browser.pause(600);
    achieved = await describeViewport();
  }

  /*
   * Fail loudly rather than reporting a viewport that was never achieved. 2 px absorbs DPI rounding
   * at devicePixelRatio 1.25 and nothing more; a window the OS refused to make that small — the
   * Tauri minimum is 960 × 640 — trips this instead of quietly producing misleading evidence.
   */
  const offX = Math.abs(achieved.innerWidth - requested.width);
  const offY = Math.abs(achieved.innerHeight - requested.height);
  if (offX > 2 || offY > 2) {
    throw new Error(
      `requested viewport ${requested.width}x${requested.height} was not achieved: ` +
        `measured ${achieved.innerWidth}x${achieved.innerHeight} ` +
        `(off by ${offX}x${offY}; window chrome ${chromeX}x${chromeY})`,
    );
  }

  return { mode: "explicit" as const, requested, ...achieved };
}

export async function enterAuditViewport() {
  return enterMeasuredViewport(requestedViewport());
}

/** Canonical maximize. Retained for callers that always want the maximized presentation. */
export async function maximizeAndDescribe() {
  await browser.maximizeWindow();
  await browser.pause(500);
  return describeViewport();
}

/** Width utilization of the page frame inside the main viewport. */
export async function utilization() {
  return browser.execute(() => {
    const main = document.querySelector("[data-app-viewport]");
    const frame = document.querySelector("[data-page-frame]");
    if (!main || !frame) return null;
    const m = main.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    const style = getComputedStyle(main);
    const innerLeft = m.left + parseFloat(style.paddingLeft);
    const innerRight = m.right - parseFloat(style.paddingRight);
    return {
      pageType: frame.getAttribute("data-page-type"),
      viewportWidth: Math.round(m.width),
      innerWidth: Math.round(innerRight - innerLeft),
      frameWidth: Math.round(f.width),
      leftFree: Math.round((f.left - innerLeft) * 100) / 100,
      rightFree: Math.round((innerRight - f.right) * 100) / 100,
      ratio: Math.round((f.width / (innerRight - innerLeft)) * 1000) / 1000,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewportOverflow: main.scrollWidth - main.clientWidth,
    };
  });
}
