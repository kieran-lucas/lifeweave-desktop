import { afterEach, describe, expect, it, vi } from "vitest";

import { scrollSettingsSection } from "./App";

describe("scrollSettingsSection", () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it("scrolls the app viewport to the requested Settings section", () => {
    const viewport = document.createElement("main");
    viewport.dataset.appViewport = "";
    const section = document.createElement("section");
    section.id = "settings-backup";
    viewport.append(section);
    document.body.append(viewport);

    Object.defineProperty(viewport, "scrollTop", { value: 40, writable: true });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ top: 10 } as DOMRect);
    vi.spyOn(section, "getBoundingClientRect").mockReturnValue({ top: 210 } as DOMRect);
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;

    scrollSettingsSection("settings-backup");

    expect(scrollTo).toHaveBeenCalledWith({ top: 240, behavior: "auto" });
  });

  it("honors a section click made before lazy Settings content mounts", () => {
    const viewport = document.createElement("main");
    viewport.dataset.appViewport = "";
    document.body.append(viewport);
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const scrollTo = vi.fn();
    viewport.scrollTo = scrollTo;

    scrollSettingsSection("settings-backup");
    expect(callbacks).toHaveLength(1);

    const section = document.createElement("section");
    section.id = "settings-backup";
    viewport.append(section);
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ top: 0 } as DOMRect);
    vi.spyOn(section, "getBoundingClientRect").mockReturnValue({ top: 320 } as DOMRect);
    callbacks.shift()?.(0);

    expect(scrollTo).toHaveBeenCalledWith({ top: 320, behavior: "auto" });
  });
});
