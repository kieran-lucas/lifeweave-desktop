import { afterEach, describe, expect, it } from "vitest";

import {
  destinationShortcuts,
  resolveShortcutCommand,
  shortcutCommands,
  type ShortcutCommand,
} from "./keyboardShortcuts";

/**
 * The whole suppression matrix is provable here because `resolveShortcutCommand` is the single
 * dispatch authority. `App.test.tsx` proves integration and does not restate these cases.
 *
 * The locked map is asserted behaviourally — by driving key events and naming the command that
 * comes back — rather than by copying the registry into a second literal table, which would defeat
 * the point of having one authority.
 */

type Fired = { command: ShortcutCommand | null; consumed: boolean };

function fire(
  target: EventTarget,
  init: KeyboardEventInit,
  options: { alreadyHandled?: boolean } = {},
): Fired {
  const seen: Array<ShortcutCommand | null> = [];
  const handled = (event: Event) => event.preventDefault();
  const listener = (event: Event) =>
    seen.push(resolveShortcutCommand(event as KeyboardEvent));
  if (options.alreadyHandled) window.addEventListener("keydown", handled, true);
  window.addEventListener("keydown", listener);
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  window.removeEventListener("keydown", listener);
  if (options.alreadyHandled) window.removeEventListener("keydown", handled, true);
  expect(seen).toHaveLength(1);
  return { command: seen[0] ?? null, consumed: event.defaultPrevented };
}

function mount(tag: string, attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("global shortcut registry", () => {
  it("locks exactly eight commands with unique ids, chords, and labels", () => {
    expect(shortcutCommands).toHaveLength(8);
    expect(new Set(shortcutCommands.map((c) => c.id)).size).toBe(8);
    expect(new Set(shortcutCommands.map((c) => c.key)).size).toBe(8);
    expect(new Set(shortcutCommands.map((c) => c.chord)).size).toBe(8);
    expect(new Set(shortcutCommands.map((c) => c.label)).size).toBe(8);
  });

  it("derives every displayed chord from the matching metadata", () => {
    for (const command of shortcutCommands) {
      expect(command.chord).toBe(`Ctrl+${command.key.toUpperCase()}`);
      expect(command.ariaKeyShortcuts).toBe(`Control+${command.key.toUpperCase()}`);
    }
  });

  it.each([
    ["1", "open-today", "today"],
    ["2", "open-calendar", "calendar"],
    ["3", "open-analytics", "analytics"],
    ["4", "open-plans", "plans"],
    ["5", "open-life", "life"],
    ["6", "open-settings", "settings"],
    ["k", "open-search", null],
    ["/", "open-shortcut-help", null],
  ])("maps Ctrl+%s to %s", (key, id, destination) => {
    const { command } = fire(document.body, { key, ctrlKey: true });
    expect(command?.id).toBe(id);
    expect(command?.destination).toBe(destination);
  });

  it("orders the six destination commands as the sidebar does", () => {
    expect(destinationShortcuts.map((c) => c.destination)).toEqual([
      "today",
      "calendar",
      "analytics",
      "plans",
      "life",
      "settings",
    ]);
  });

  it.each([
    ["a chord already handled downstream", { key: "k", ctrlKey: true }, { alreadyHandled: true }],
    ["an IME composition", { key: "k", ctrlKey: true, isComposing: true }, {}],
    ["an auto-repeating key", { key: "k", ctrlKey: true, repeat: true }, {}],
    ["an unmapped Control chord", { key: "x", ctrlKey: true }, {}],
    ["an unmapped digit", { key: "7", ctrlKey: true }, {}],
    ["a bare key", { key: "k" }, {}],
    ["a Meta chord", { key: "k", metaKey: true }, {}],
    ["a Control+Meta chord", { key: "k", ctrlKey: true, metaKey: true }, {}],
    ["a Control+Alt chord", { key: "k", ctrlKey: true, altKey: true }, {}],
    ["a Control+Shift chord", { key: "k", ctrlKey: true, shiftKey: true }, {}],
  ])("ignores %s", (_label, init, options) => {
    const { command } = fire(document.body, init, options);
    expect(command).toBeNull();
  });

  it.each([
    ["a text input", "input", {}],
    ["a textarea", "textarea", {}],
    ["a select", "select", {}],
    ["a contenteditable region", "div", { contenteditable: "true" }],
    ["an ARIA textbox", "div", { role: "textbox", tabindex: "0" }],
    ["the rich-text editor root", "div", { class: "ProseMirror", contenteditable: "true" }],
  ])("leaves Ctrl+K to %s", (_label, tag, attributes) => {
    const editable = mount(tag, attributes);
    const { command, consumed } = fire(editable, { key: "k", ctrlKey: true });
    expect(command).toBeNull();
    // Suppression must leave the event completely untouched, or the editor would lose the key
    // without the global layer doing anything with it.
    expect(consumed).toBe(false);
  });

  it("leaves a chord to a control nested inside an editable surface", () => {
    const editor = mount("div", { class: "ProseMirror", contenteditable: "true" });
    const nested = editor.appendChild(document.createElement("button"));
    const { command } = fire(nested, { key: "k", ctrlKey: true });
    expect(command).toBeNull();
  });

  it("yields the keyboard to an open modal", () => {
    mount("div", { role: "dialog", "aria-modal": "true" });
    for (const key of ["1", "k", "/"]) {
      const { command, consumed } = fire(document.body, { key, ctrlKey: true });
      expect(command).toBeNull();
      expect(consumed).toBe(false);
    }
  });

  it("resolves an accepted chord to exactly one command", () => {
    const { command } = fire(document.body, { key: "3", ctrlKey: true });
    expect(command).toBe(destinationShortcuts[2]);
  });
});
