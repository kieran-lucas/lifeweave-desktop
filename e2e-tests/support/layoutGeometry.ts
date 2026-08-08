import { browser, expect } from "@wdio/globals";

/**
 * Task 50 geometry support.
 *
 * This is test support only. Lifeweave ships no production layout-measurement framework: every
 * assertion below reads the real WebView box model through one `browser.execute` round trip and
 * throws in the test process, never in the app.
 *
 * Why real-browser measurement at all: jsdom reports every rectangle as zero, so a frontend unit
 * test can prove which class an element carries but can never prove that two fields stopped
 * overlapping. Layout invariants therefore live here.
 */

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type Overflow = {
  scrollWidth: number;
  clientWidth: number;
  /** Positive means the element scrolls sideways. */
  delta: number;
};

/** Stable layout hooks emitted by the shared layout primitives. */
export const VIEWPORT = "[data-app-viewport]";
export const PAGE_FRAME = "[data-page-frame]";
export const DIALOG_SURFACE = "[data-dialog-surface]";

/**
 * One CSS pixel of slack. Browsers report fractional layout, and a page whose content is one
 * subpixel wider than its box is not the defect Task 50 is hunting.
 */
const TOLERANCE = 1;

function missing(selector: string): never {
  throw new Error(`layout geometry: no element matched ${selector}`);
}

export async function rect(selector: string): Promise<Rect> {
  const value = await browser.execute((css: string) => {
    const node = document.querySelector(css);
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
    };
  }, selector);
  return value ?? missing(selector);
}

export async function overflow(selector: string): Promise<Overflow> {
  const value = await browser.execute((css: string) => {
    const node =
      css === ":root" ? document.documentElement : document.querySelector(css);
    if (!node) return null;
    return {
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      delta: node.scrollWidth - node.clientWidth,
    };
  }, selector);
  return value ?? missing(selector);
}

/** `scrollWidth <= clientWidth + 1` — the §10 ordinary-screen invariant. */
export async function assertNoHorizontalOverflow(selector: string, label = selector) {
  const measured = await overflow(selector);
  if (measured.delta > TOLERANCE)
    throw new Error(
      `${label} scrolls horizontally: scrollWidth ${measured.scrollWidth} > clientWidth ${measured.clientWidth}`,
    );
  return measured;
}

/** The document root, the main viewport, and the page frame must all be horizontally stable. */
export async function assertPageHorizontallyStable(label: string) {
  const root = await assertNoHorizontalOverflow(":root", `${label} document root`);
  const viewport = await assertNoHorizontalOverflow(VIEWPORT, `${label} MainViewport`);
  const frame = await assertNoHorizontalOverflow(PAGE_FRAME, `${label} PageFrame`);
  return { root, viewport, frame };
}

export async function assertContained(childSelector: string, parentSelector: string) {
  const child = await rect(childSelector);
  const parent = await rect(parentSelector);
  const breaches: string[] = [];
  if (child.left < parent.left - TOLERANCE)
    breaches.push(`left ${child.left} < ${parent.left}`);
  if (child.right > parent.right + TOLERANCE)
    breaches.push(`right ${child.right} > ${parent.right}`);
  if (child.top < parent.top - TOLERANCE) breaches.push(`top ${child.top} < ${parent.top}`);
  if (child.bottom > parent.bottom + TOLERANCE)
    breaches.push(`bottom ${child.bottom} > ${parent.bottom}`);
  if (breaches.length)
    throw new Error(
      `${childSelector} escapes ${parentSelector}: ${breaches.join(", ")}`,
    );
  return { child, parent };
}

/** The visual viewport, used as the containment parent for modal surfaces. */
export async function viewportRect(): Promise<Rect> {
  return browser.execute(() => ({
    left: 0,
    top: 0,
    right: document.documentElement.clientWidth,
    bottom: document.documentElement.clientHeight,
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }));
}

export async function assertWithinViewport(selector: string) {
  const box = await rect(selector);
  const view = await viewportRect();
  const breaches: string[] = [];
  if (box.left < view.left - TOLERANCE) breaches.push(`left ${box.left}`);
  if (box.top < view.top - TOLERANCE) breaches.push(`top ${box.top}`);
  if (box.right > view.right + TOLERANCE)
    breaches.push(`right ${box.right} > ${view.right}`);
  if (box.bottom > view.bottom + TOLERANCE)
    breaches.push(`bottom ${box.bottom} > ${view.bottom}`);
  if (breaches.length)
    throw new Error(`${selector} leaves the viewport: ${breaches.join(", ")}`);
  return { box, view };
}

/**
 * §7.3 — a capped frame must sit optically centred inside the main viewport's content box, not
 * inside the whole window. Free space is measured against the viewport's padding box so the shared
 * gutter counts as content, exactly as the layout authority intends.
 */
export async function assertCentered(
  frameSelector = PAGE_FRAME,
  viewportSelector = VIEWPORT,
  tolerance = 2,
) {
  const measured = await browser.execute(
    (frameCss: string, viewportCss: string) => {
      const frame = document.querySelector(frameCss);
      const viewport = document.querySelector(viewportCss);
      if (!frame || !viewport) return null;
      const frameBox = frame.getBoundingClientRect();
      const viewportBox = viewport.getBoundingClientRect();
      const style = getComputedStyle(viewport);
      const innerLeft = viewportBox.left + parseFloat(style.paddingLeft);
      const innerRight = viewportBox.right - parseFloat(style.paddingRight);
      return {
        leftFree: frameBox.left - innerLeft,
        rightFree: innerRight - frameBox.right,
        frameWidth: frameBox.width,
        innerWidth: innerRight - innerLeft,
      };
    },
    frameSelector,
    viewportSelector,
  );
  if (!measured) return missing(`${frameSelector} / ${viewportSelector}`);
  const imbalance = Math.abs(measured.leftFree - measured.rightFree);
  if (imbalance > tolerance)
    throw new Error(
      `${frameSelector} is off centre by ${imbalance.toFixed(2)}px (left ${measured.leftFree.toFixed(2)}, right ${measured.rightFree.toFixed(2)})`,
    );
  return { ...measured, imbalance };
}

export type LabelledRect = { label: string; rect: Rect };

/**
 * Collects every visible interactive control inside a container, with a human label taken from the
 * accessible name, the associated `<label>`, or the tag/type pair. Controls nested inside another
 * collected control are dropped so parent/child containment never reads as a collision.
 */
export async function controlRects(containerSelector: string): Promise<LabelledRect[]> {
  const value = await browser.execute((css: string) => {
    const container = document.querySelector(css);
    if (!container) return null;
    const nodes = [
      ...container.querySelectorAll<HTMLElement>(
        "input:not([type='hidden']), select, textarea, button, [role='combobox'], [role='listbox']",
      ),
    ].filter(node => {
      const box = node.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return false;
      const style = getComputedStyle(node);
      return style.visibility !== "hidden" && style.display !== "none";
    });
    const outer = nodes.filter(
      node => !nodes.some(other => other !== node && other.contains(node)),
    );
    return outer.map(node => {
      const box = node.getBoundingClientRect();
      const described =
        node.getAttribute("aria-label") ??
        node.closest("label")?.textContent?.trim() ??
        (node.id
          ? (document.querySelector(`label[for='${node.id}']`)?.textContent?.trim() ?? "")
          : "") ??
        "";
      const label =
        described ||
        node.textContent?.trim() ||
        `${node.tagName.toLowerCase()}${node.getAttribute("type") ? `[${node.getAttribute("type")}]` : ""}`;
      return {
        label: label.slice(0, 60),
        rect: {
          left: box.left,
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        },
      };
    });
  }, containerSelector);
  return value ?? missing(containerSelector);
}

function intersects(a: Rect, b: Rect) {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return overlapX > TOLERANCE && overlapY > TOLERANCE;
}

/** §11.3 — no two sibling controls may share screen space. */
export function assertNoOverlap(controls: LabelledRect[], label: string) {
  const collisions: string[] = [];
  for (let i = 0; i < controls.length; i += 1)
    for (let j = i + 1; j < controls.length; j += 1)
      if (intersects(controls[i]!.rect, controls[j]!.rect))
        collisions.push(`"${controls[i]!.label}" overlaps "${controls[j]!.label}"`);
  if (collisions.length)
    throw new Error(`${label} has overlapping controls: ${collisions.join("; ")}`);
  expect(controls.length).toBeGreaterThan(0);
  return controls.length;
}

/**
 * §27.6 — a workspace may scroll sideways inside its own viewport, but must not move the page.
 * Proves the local region actually owns overflow rather than merely hiding it.
 */
export async function assertLocalScrollOwnership(
  localSelector: string,
  label = localSelector,
) {
  const local = await browser.execute((css: string) => {
    const node = document.querySelector(css);
    if (!node) return null;
    return {
      overflowX: getComputedStyle(node).overflowX,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    };
  }, localSelector);
  if (!local) return missing(localSelector);
  if (local.overflowX !== "auto" && local.overflowX !== "scroll")
    throw new Error(
      `${label} does not own its horizontal overflow (overflow-x: ${local.overflowX})`,
    );
  await assertNoHorizontalOverflow(VIEWPORT, `${label} MainViewport`);
  await assertNoHorizontalOverflow(":root", `${label} document root`);
  return local;
}

/**
 * Resizes the native window and reports the inner viewport that actually resulted. The requested
 * size is the outer window, so the recorded evidence must be the measured inner size, never the
 * requested one.
 */
export async function useViewport(width: number, height: number) {
  await browser.setWindowSize(width, height);
  // One frame for the WebView to re-layout before anything is measured.
  await browser.pause(250);
  return browser.execute(() => ({
    innerWidth: document.documentElement.clientWidth,
    innerHeight: document.documentElement.clientHeight,
  }));
}

export const VIEWPORT_MATRIX: Array<[number, number]> = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
];
