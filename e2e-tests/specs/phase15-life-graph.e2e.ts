import { $, browser, expect } from "@wdio/globals";
import {
  GRAPH_EMPTY,
  GRAPH_PARENT,
  GRAPH_SECOND,
  GRAPH_SOURCE,
  GRAPH_TARGET,
  connectionSection,
  establishGraphFixtures,
  graphOptionLabels,
  openGraph,
  openLifeSystem,
  persistedLifeMode,
  selectGraphNode,
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

    // The semantic selector is the accessibility authority and states each node's kind in words,
    // which is the document authority surfacing through the UI.
    const labels = await graphOptionLabels();
    expect(labels.some(label => label.includes(`${GRAPH_PARENT} (Branch)`))).toBe(true);
    expect(labels.some(label => label.includes(`${GRAPH_SOURCE} (Basic Leaf)`))).toBe(true);
    expect(labels.some(label => label.includes(`${GRAPH_EMPTY} (Empty leaf)`))).toBe(true);

    // Explicit links: selecting the source surfaces both outgoing edges as text.
    await selectGraphNode(GRAPH_SOURCE);
    const outgoing = connectionSection("outgoing");
    await expect(outgoing.$("h4=Outgoing links (2)")).toBeDisplayed();
    await expect(
      outgoing.$(
        `button[aria-label='Outgoing link, Available: ${GRAPH_TARGET}. Select in the graph.']`,
      ),
    ).toBeDisplayed();

    // Following one lands on the target and shows the reciprocal backlink.
    await outgoing
      .$(`button[aria-label='Outgoing link, Available: ${GRAPH_TARGET}. Select in the graph.']`)
      .click();
    const backlinks = connectionSection("backlinks");
    await expect(backlinks.$("h4=Backlinks (1)")).toBeDisplayed();
    await expect(
      backlinks.$(`button[aria-label='Backlink, Available: ${GRAPH_SOURCE}. Select in the graph.']`),
    ).toBeDisplayed();

    // Hierarchy relationships are text too: the branch names its child.
    await selectGraphNode(GRAPH_PARENT);
    await expect(connectionSection("children").$("h4=Children (1)")).toBeDisplayed();
    await expect(
      connectionSection("children").$(
        `button[aria-label='Child: ${GRAPH_PARENT} Child. Select in the graph.']`,
      ),
    ).toBeDisplayed();

    await expect($("[role='alert']")).not.toExist();
  });

  it("lists every explicit link exactly once without iterating nodes", async () => {
    await openGraph();
    const links = $("section[aria-labelledby='life-graph-all-links-heading']");
    await expect(links).toBeDisplayed();

    // Both fixture edges are present, once each, with availability — no node selection required.
    // WebdriverIO's element-array `map` resolves to a promise, so read the rows sequentially.
    const rows = await links.$$("tbody tr");
    const text: string[] = [];
    for (const row of rows) text.push(await row.getText());
    const matching = (title: string) =>
      text.filter(row => row.includes(GRAPH_SOURCE) && row.includes(title));
    expect(matching(GRAPH_TARGET)).toHaveLength(1);
    expect(matching(GRAPH_SECOND)).toHaveLength(1);
    expect(text.every(row => row.includes("Available"))).toBe(true);
  });

  it("opens a documented leaf in the Reader and a branch in Browse", async () => {
    await openGraph();
    await selectGraphNode(GRAPH_SOURCE);
    await $(`button=Open ${GRAPH_SOURCE} in Life Reader`).click();

    // A documented leaf reaches the Reader, resolved by exact stable ID.
    const reader = $("section[aria-labelledby='life-reader-title']");
    await expect(reader).toBeDisplayed();
    await expect(reader.$(`h1=${GRAPH_SOURCE}`)).toBeDisplayed();

    // A branch offers Browse instead, and never opens the Reader.
    await openGraph();
    await selectGraphNode(GRAPH_PARENT);
    await $(`button=Open ${GRAPH_PARENT} in Life Browse`).click();
    await expect($("h3=Life graph")).not.toExist();
    await expect($("section[aria-labelledby='life-reader-title']")).not.toExist();
    await expect($(`//h2[normalize-space()="${GRAPH_PARENT}"]`)).toBeDisplayed();

    // An undocumented leaf also offers Browse, never the Reader.
    await openGraph();
    await selectGraphNode(GRAPH_EMPTY);
    await expect($(`button=Open ${GRAPH_EMPTY} in Life Browse`)).toBeDisplayed();
    await expect($(`button=Open ${GRAPH_EMPTY} in Life Reader`)).not.toExist();

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
