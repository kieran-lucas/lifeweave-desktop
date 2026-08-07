import { $, browser, expect } from "@wdio/globals";
import {
  GRAPH_PARENT,
  GRAPH_SOURCE,
  GRAPH_TARGET,
  connectionSection,
  establishGraphFixtures,
  graphNode,
  openGraph,
  openLifeSystem,
  persistedLifeMode,
} from "../support/lifeGraph";

/**
 * Phase 15 — Life relationship graph explorer.
 *
 * Single phase with no restart companion: the slice persists nothing, so there is no state for a
 * restart to preserve. Non-persistence is proven inside the phase by a webview reload; that is a
 * reload rather than a second process boundary, and the audit records it as such.
 */
describe("Life relationship graph", () => {
  it("explores the active hierarchy and explicit links through accessible UI", async () => {
    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();

    await openLifeSystem();
    await establishGraphFixtures();
    await openGraph();

    // Hierarchy: the branch and its child are both reachable as real buttons.
    await expect(graphNode(GRAPH_PARENT)).toBeDisplayed();
    await expect(graphNode(`${GRAPH_PARENT} Child`)).toBeDisplayed();

    // The drawn surface is decorative and carries no accessible content of its own.
    await expect($("h3=Life graph")).toBeDisplayed();

    // Explicit link: selecting the source must surface the outgoing edge as text.
    await graphNode(GRAPH_SOURCE).click();
    const outgoing = connectionSection("outgoing");
    await expect(outgoing.$("h4=Outgoing links (1)")).toBeDisplayed();
    await expect(
      outgoing.$(`button[aria-label='Outgoing link: ${GRAPH_TARGET}. Select in the graph.']`),
    ).toBeDisplayed();

    // Following it must land on the target and show the reciprocal backlink.
    await outgoing
      .$(`button[aria-label='Outgoing link: ${GRAPH_TARGET}. Select in the graph.']`)
      .click();
    const backlinks = connectionSection("backlinks");
    await expect(backlinks.$("h4=Backlinks (1)")).toBeDisplayed();
    await expect(
      backlinks.$(`button[aria-label='Backlink: ${GRAPH_SOURCE}. Select in the graph.']`),
    ).toBeDisplayed();

    // Hierarchy relationships are text too: the branch names its child.
    await graphNode(GRAPH_PARENT).click();
    await expect(connectionSection("children").$("h4=Children (1)")).toBeDisplayed();
    await expect(
      connectionSection("children").$(
        `button[aria-label='Child: ${GRAPH_PARENT} Child. Select in the graph.']`,
      ),
    ).toBeDisplayed();

    // Handing off to Life leaves the graph and lands in Browse on the chosen node.
    await $(`button=Open ${GRAPH_PARENT} in Life`).click();
    await expect($("h3=Life graph")).not.toExist();
    await expect($(`//h2[normalize-space()="${GRAPH_PARENT}"]`)).toBeDisplayed();

    await expect($("[role='alert']")).not.toExist();
  });

  it("stores nothing: a reload returns Life to its persisted mode, never to the graph", async () => {
    await openGraph();
    await expect($("h3=Life graph")).toBeDisplayed();

    // The persisted mode must still be one of the four Rust-validated values while the graph is open.
    await expect(["browse", "edit", "pinned", "reader"]).toContain(await persistedLifeMode());

    await browser.url("http://tauri.localhost");
    await expect($("h1=Today")).toBeDisplayed();
    await openLifeSystem();

    await expect($("h3=Life graph")).not.toExist();
    await expect($("button=Graph")).toHaveAttribute("aria-pressed", "false");
    await expect($("[role='alert']")).not.toExist();
  });
});
