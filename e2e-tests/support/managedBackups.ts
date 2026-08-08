import { $, browser, expect } from "@wdio/globals";

export const backupRow = (backupId: string) => $(`tr[data-backup-id='${backupId}']`);

export async function createManagedBackup(): Promise<string> {
  await $("button=Create backup").click();
  const success = $("//p[@aria-live='polite' and contains(normalize-space(),'Backup created at')]");
  const failure = $("section[aria-labelledby='backup-settings-heading'] [role='alert']");
  await browser.waitUntil(
    async () => (await success.isExisting()) || (await failure.isExisting()),
    { timeout: 60_000, timeoutMsg: "backup creation produced neither success nor failure state" },
  );
  if (await failure.isExisting()) {
    throw new Error(`backup creation failed: ${await failure.getText()}`);
  }
  await expect(success).toBeDisplayed();
  // Scoped to the backup section on purpose. Settings renders Tag settings — which owns up to
  // three tables — before Backup & Restore, so an unscoped `table tbody tr` reads the first tag
  // row instead of the fresh backup once any tag exists.
  const first = $("section[aria-labelledby='backup-settings-heading'] table tbody tr");
  await expect(first).toBeDisplayed();
  const backupId = await first.getAttribute("data-backup-id");
  if (!backupId) throw new Error("fresh managed backup row has no opaque identity");
  return backupId;
}

export async function restoreManagedBackup(backupId: string): Promise<void> {
  const row = backupRow(backupId);
  await expect(row).toBeDisplayed();
  await row.$("button=Restore").click();
  const dialog = $("[role='dialog'][aria-modal='true']");
  await expect(dialog).toBeDisplayed();
  await dialog.$("button=Restore backup").click();
  await expect($("//p[@aria-live='polite' and normalize-space()='Restore complete.']")).toBeDisplayed();
}
