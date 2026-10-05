import { expect, test, type Page } from "@playwright/test";
import { safeScreenshot, secretFields } from "./safe-screenshot";

// Session U Part 6 (FIX_PLAN D6, FINDINGS Q-SC-05): a visible recovery secret is painted over in a safe screenshot.
/** The share of a PNG's pixels that are the mask colour, and how many colours it has, read back through a canvas. */
const pixels = (page: Page, png: Buffer) => page.evaluate(async b64 => {
  const image = new Image(); image.src = `data:image/png;base64,${b64}`; await image.decode();
  const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data, colours = new Set<number>(); let mask = 0;
  for (let i = 0; i < data.length; i += 4) {
    colours.add((data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!);
    if (data[i]! > 245 && data[i + 1]! < 10 && data[i + 2]! > 245) mask++;
  }
  return { maskShare: mask / (data.length / 4), colours: colours.size };
}, png.toString("base64"));

test("a safe screenshot paints over the recovery secret that a plain one shows", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "One project is enough for a screenshot helper");
  await page.goto("/app/settings");
  await page.getByRole("button", { name: "Prepare encrypted backup", exact: true }).click();
  const field = page.getByLabel("Recovery secret", { exact: true });
  await expect(field).toBeVisible();
  expect(await field.inputValue()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  await field.scrollIntoViewIfNeeded();
  const box = (await field.boundingBox())!;
  // Inset by 2 px so the clip never includes the field's anti-aliased border.
  const clip = { x: box.x + 2, y: box.y + 2, width: box.width - 4, height: box.height - 4 };
  const plain = await pixels(page, await page.screenshot({ clip }));
  const masked = await pixels(page, await safeScreenshot(page, { clip }));
  expect(plain.maskShare, "the plain screenshot shows the field").toBeLessThan(0.5);
  expect(plain.colours, "the plain screenshot shows the secret's text").toBeGreaterThan(2);
  expect(masked.maskShare, "the safe screenshot paints over every pixel of the field").toBe(1);
  // The helper's mask also covers the "I saved the recovery secret." box and the restore form's secret field.
  expect(await secretFields(page).count()).toBeGreaterThanOrEqual(2);
});
