/**
 * The single canonical global keyboard shortcut registry (ADR 0039).
 *
 * Key dispatch, the sidebar's advertised chords, and the Keyboard shortcuts dialog all derive from
 * this module. A hard-coded chord or label anywhere else — handler, dialog, or test fixture — is a
 * defect, because that is exactly how a help surface starts lying about what the application does.
 *
 * Nothing here is persisted, remappable, or reachable from the backend.
 */

export type Destination =
  | "today"
  | "calendar"
  | "plans"
  | "life"
  | "settings";

export type ShortcutCommandId =
  | "open-today"
  | "open-calendar"
  | "open-analytics"
  | "open-plans"
  | "open-life"
  | "open-settings"
  | "open-search"
  | "open-shortcut-help";

export type ShortcutCommand = {
  /** Stable command identity. */
  readonly id: ShortcutCommandId;
  /** Action label shown in the shortcut help dialog and used as the control's accessible name. */
  readonly label: string;
  /** Matching metadata: the `KeyboardEvent.key` value, lowercased for single printable keys. */
  readonly key: string;
  /** Display metadata. */
  readonly chord: string;
  /** `aria-keyshortcuts` metadata. */
  readonly ariaKeyShortcuts: string;
  /** The destination this command navigates to, or `null` for non-navigation commands. */
  readonly destination: Destination | null;
};

export type DestinationShortcutCommand = ShortcutCommand & {
  readonly destination: Destination;
};

/**
 * Windows `Control` is the authority. The product ships no macOS build, so there is deliberately no
 * `Meta`/`Cmd` mapping and the chord metadata is derived rather than written out per command.
 */
function chordOf(key: string): Pick<ShortcutCommand, "key" | "chord" | "ariaKeyShortcuts"> {
  const display = key.toUpperCase();
  return { key, chord: `Ctrl+${display}`, ariaKeyShortcuts: `Control+${display}` };
}

/**
 * Primary sidebar destinations. Their historic chords are preserved even though Analytics moved
 * under Settings, so existing muscle memory for Today/Calendar/Plans/Life/Settings does not shift.
 */
export const destinationShortcuts: readonly DestinationShortcutCommand[] = [
  { id: "open-today", label: "Today", destination: "today", ...chordOf("1") },
  { id: "open-calendar", label: "Calendar", destination: "calendar", ...chordOf("2") },
  { id: "open-plans", label: "Plans", destination: "plans", ...chordOf("4") },
  { id: "open-life", label: "Life System", destination: "life", ...chordOf("5") },
  { id: "open-settings", label: "Settings", destination: "settings", ...chordOf("6") },
];

/** Analytics is a Settings subview, but Ctrl+3 remains its direct accelerator. */
export const analyticsShortcut: ShortcutCommand = {
  id: "open-analytics",
  label: "Analytics",
  destination: "settings",
  ...chordOf("3"),
};

export const searchShortcut: ShortcutCommand = {
  id: "open-search",
  label: "Search",
  destination: null,
  ...chordOf("k"),
};

export const shortcutHelpShortcut: ShortcutCommand = {
  id: "open-shortcut-help",
  label: "Keyboard shortcuts",
  destination: null,
  ...chordOf("/"),
};

/** The complete registry, ordered by the familiar Ctrl+1..6 sequence, then global tools. */
export const shortcutCommands: readonly ShortcutCommand[] = [
  destinationShortcuts[0]!,
  destinationShortcuts[1]!,
  analyticsShortcut,
  destinationShortcuts[2]!,
  destinationShortcuts[3]!,
  destinationShortcuts[4]!,
  searchShortcut,
  shortcutHelpShortcut,
];

/**
 * Editable authority. Resolved upward from the event target so a control nested inside an editable
 * surface is protected too. `.ProseMirror` is the Tiptap editor root the Basic Leaf editor mounts.
 */
const EDITABLE_SELECTOR = [
  "input",
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
  ".ProseMirror",
].join(",");

/**
 * Modal authority. The product already marks every modal `role="dialog"` + `aria-modal="true"`
 * because screen readers require it, so reading that pairing is strictly better than introducing a
 * second source of modal truth that could disagree with it.
 */
const OPEN_MODAL_SELECTOR = '[role="dialog"][aria-modal="true"]';

export function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
}

export function hasOpenModal(doc: Document): boolean {
  return doc.querySelector(OPEN_MODAL_SELECTOR) !== null;
}

/** Exact chord match: `Control` alone, never `Alt`, `Shift`, or `Meta`. */
export function matchShortcutChord(event: KeyboardEvent): ShortcutCommand | null {
  if (!event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) return null;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return shortcutCommands.find((command) => command.key === key) ?? null;
}

/**
 * The whole dispatch invariant in one place. Returning `null` means the global layer must do
 * nothing at all — including no `preventDefault()`. Consuming a key while declining to act on it is
 * what would stop `Ctrl+K` inserting a link inside the editor.
 */
export function resolveShortcutCommand(event: KeyboardEvent): ShortcutCommand | null {
  if (event.defaultPrevented || event.isComposing || event.repeat) return null;
  const target = event.target instanceof Element ? event.target : null;
  if (hasOpenModal(target?.ownerDocument ?? globalThis.document)) return null;
  if (isEditableTarget(target)) return null;
  return matchShortcutChord(event);
}
