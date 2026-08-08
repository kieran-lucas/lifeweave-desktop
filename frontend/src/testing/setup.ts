import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

/*
 * Testing Library's default 1000ms `findBy`/`waitFor` window is comfortable when a file runs alone
 * and loses under full-suite thread contention, where the heaviest files run at roughly twice their
 * solo duration. Several screens populate comboboxes and panels from TanStack Query reads that
 * resolve a tick after first paint, so the default made those suites depend on machine load.
 *
 * This widens the *wait*, never an assertion: the same element must still appear with the same
 * accessible name, and a genuinely missing element still fails — just later. It is kept well under
 * the vitest per-test budget so a real miss still reports "unable to find" rather than being killed
 * as a timeout with no detail.
 */
configure({ asyncUtilTimeout: 3_000 });

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = TestResizeObserver;
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
}

afterEach(() => {
  cleanup();
});
