import type { Locator, Page, PageScreenshotOptions } from "@playwright/test";

/**
 * Session U Part 6 (FIX_PLAN D6, FINDINGS Q-SC-05): screenshots paint over every field that holds a recovery secret, so a
 * real one never reaches a review branch by habit. Every such field is labelled "… recovery secret" (the backup, vault,
 * new vault, rotation, conflict and forward-recovery secrets), and so is the "I saved the recovery secret." box.
 */
export const SECRET_MASK_COLOR = "#FF00FF";
export const secretFields = (page: Page): Locator => page.getByLabel(/recovery secret/i);
/** page.screenshot with every recovery-secret field masked (on top of any mask the caller passes). */
export function safeScreenshot(page: Page, options: PageScreenshotOptions = {}): Promise<Buffer> {
  return page.screenshot({ ...options, mask: [...(options.mask ?? []), secretFields(page)], maskColor: SECRET_MASK_COLOR });
}
