import type { BasicLeafNode } from "./schema";
import { extractHeadingText } from "./outline";

/** The identity the Leaf header already draws above the document. */
export type LeafIdentity = { title: string; subtitle: string };

/** Separators an authored title line uses before a translation or second name. */
const IDENTITY_SEPARATOR = /^ ?[—–:·|-] \S/;

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

/**
 * True when the document opens with an authored `#` heading that only restates the Leaf's identity.
 *
 * Markdown imported from elsewhere usually starts with the same title the Leaf carries, so the
 * Reader would otherwise print that name twice. The heading is authored content: it is never
 * rewritten or deleted — Edit, export and the stored document all still contain it — the Reader
 * simply stops drawing a line the header above it already shows.
 *
 * The match is deliberately narrow. Either the heading is exactly the Leaf name, or it is the Leaf
 * name followed by a separator and a second name, and the header has a secondary name of its own to
 * show in its place. Anything else is ordinary content and is rendered.
 */
export function repeatsLeafIdentity(document: BasicLeafNode, identity: LeafIdentity | undefined): boolean {
  if (!identity) return false;
  const first = document.content?.[0];
  if (!first || first.type !== "heading" || Number(first.attrs?.level ?? 2) !== 1) return false;

  const title = normalize(identity.title);
  if (!title) return false;
  const heading = normalize(extractHeadingText(first));
  if (!heading.startsWith(title)) return false;

  const rest = heading.slice(title.length);
  if (rest.length === 0) return true;
  return IDENTITY_SEPARATOR.test(rest) && normalize(identity.subtitle).length > 0;
}
