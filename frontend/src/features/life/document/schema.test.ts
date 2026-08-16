import { describe, expect, it } from "vitest";
import { EMPTY_DOCUMENT, parseDocument, safeLink } from "./schema";

describe("Basic Leaf adapters", () => {
  it("parses the versioned Core root", () => expect(parseDocument(JSON.stringify(EMPTY_DOCUMENT)).type).toBe("doc"));
  it("rejects a non-document root", () => expect(() => parseDocument('{"type":"scene"}')).toThrow(/root/));
  it("permits only safe external link schemes", () => { expect(safeLink("https://example.com")).toBeTruthy(); expect(safeLink("mailto:a@example.com")).toBeTruthy(); expect(safeLink("javascript:alert(1)")).toBeUndefined(); });
});
