import { browser, $, expect } from "@wdio/globals";

describe("Foundation native Windows flow", () => {
  it("runs the real record lifecycle, restart persistence, and backup restore", async () => {
    await expect($("h1=Foundation Records")).toBeDisplayed();
    await expect($("text=No records yet. Add one above.")).toBeDisplayed();

    await $("input[aria-label='New record label']").setValue("E2E Alpha");
    await $("button=Add").click();
    await expect($("text=E2E Alpha")).toBeDisplayed();

    await $("button[aria-label='Edit E2E Alpha']").click();
    const edit = $("input[aria-label='Edit record label']");
    await edit.clearValue();
    await edit.setValue("E2E Beta");
    await $("button=Save").click();
    await expect($("text=E2E Beta")).toBeDisplayed();

    await $("button[aria-label='Archive E2E Beta']").click();
    await expect($("ul[aria-label='Archived foundation records']")).toBeDisplayed();
    await $("button[aria-label='Restore E2E Beta']").click();

    await $("button=Backup database").click();
    await expect($("select[aria-label='Backup selection']")).toBeDisplayed();
    await $("input[aria-label='Edit record label']").waitForExist({ reverse: true });
    await $("button[aria-label='Edit E2E Beta']").click();
    const gamma = $("input[aria-label='Edit record label']");
    await gamma.clearValue();
    await gamma.setValue("E2E Gamma");
    await $("button=Save").click();
    await $("button=Restore").click();
    await expect($("text=Restore complete.")).toBeDisplayed();
    await expect($("text=E2E Beta")).toBeDisplayed();
  });
});
