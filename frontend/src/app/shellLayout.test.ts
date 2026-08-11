import { describe, expect, it } from "vitest";

import { compactShellQuery, sidebarIsCollapsed } from "./shellLayout";

describe("desktop shell layout", () => {
  it("reuses the approved compact-shell breakpoint", () => {
    expect(compactShellQuery).toBe("(max-width: 1180px)");
  });

  it("protects the workspace in a compact window", () => {
    expect(
      sidebarIsCollapsed({
        compactViewport: true,
        lifeAutoCollapsed: false,
        taskSidebarMode: "expanded",
      }),
    ).toBe(true);
  });

  it("preserves explicit and Life-specific collapse while allowing a wide expanded shell", () => {
    expect(
      sidebarIsCollapsed({
        compactViewport: false,
        lifeAutoCollapsed: false,
        taskSidebarMode: "expanded",
      }),
    ).toBe(false);
    expect(
      sidebarIsCollapsed({
        compactViewport: false,
        lifeAutoCollapsed: true,
        taskSidebarMode: "expanded",
      }),
    ).toBe(true);
    expect(
      sidebarIsCollapsed({
        compactViewport: false,
        lifeAutoCollapsed: false,
        taskSidebarMode: "collapsed",
      }),
    ).toBe(true);
  });
});
