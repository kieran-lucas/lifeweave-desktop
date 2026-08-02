import { $, expect } from "@wdio/globals";

describe("Phase 3 — restored persistence", () => {
  it("shows restored data after a fresh native relaunch", async () => {
    await expect($("h1=Foundation Records")).toBeDisplayed();
    await expect($("text=E2E Beta")).toBeDisplayed();
    await expect($("text=E2E Gamma")).not.toExist();
  });
});
