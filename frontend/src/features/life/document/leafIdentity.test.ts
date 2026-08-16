import { describe, expect, it } from "vitest";

import { repeatsLeafIdentity } from "./leafIdentity";
import type { BasicLeafNode } from "./schema";

const identity = { title: "Language & Communication", subtitle: "Ngôn ngữ và giao tiếp" };

const docWith = (heading: string, level = 1): BasicLeafNode => ({
  type: "doc",
  content: [
    { type: "heading", attrs: { level }, content: [{ type: "text", text: heading }] },
    { type: "paragraph", content: [{ type: "text", text: "Body" }] },
  ],
});

describe("leaf identity repetition", () => {
  it("matches the leaf name exactly, ignoring case and spacing", () => {
    expect(repeatsLeafIdentity(docWith("  language &   communication "), identity)).toBe(true);
  });

  it("matches the leaf name followed by a second name", () => {
    expect(repeatsLeafIdentity(docWith("Language & Communication — Ngôn ngữ và giao tiếp"), identity)).toBe(true);
    expect(repeatsLeafIdentity(docWith("Language & Communication: Ngôn ngữ"), identity)).toBe(true);
  });

  it("keeps a second name when the header has no secondary name to show in its place", () => {
    expect(repeatsLeafIdentity(docWith("Language & Communication — Ngôn ngữ"), { ...identity, subtitle: "  " })).toBe(false);
    expect(repeatsLeafIdentity(docWith("Language & Communication"), { ...identity, subtitle: "" })).toBe(true);
  });

  it("keeps a heading that only starts with the leaf name", () => {
    expect(repeatsLeafIdentity(docWith("Language & Communication in practice"), identity)).toBe(false);
    expect(repeatsLeafIdentity(docWith("Language & Communication-adjacent notes"), identity)).toBe(false);
  });

  it("only ever considers a leading level-one heading", () => {
    expect(repeatsLeafIdentity(docWith("Language & Communication", 2), identity)).toBe(false);
    expect(repeatsLeafIdentity({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Language & Communication" }] },
      ],
    }, identity)).toBe(false);
  });

  it("does nothing without an identity or a title", () => {
    expect(repeatsLeafIdentity(docWith("Language & Communication"), undefined)).toBe(false);
    expect(repeatsLeafIdentity(docWith("Language & Communication"), { title: " ", subtitle: "x" })).toBe(false);
  });
});
