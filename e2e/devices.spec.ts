/**
 * Desktop Chromium pretending to be a phone. Quick Look and Scene Viewer themselves only
 * exist on real devices, so these tests stop at the hand-off: the USDZ file Safari would
 * receive, and the intent Android would receive.
 */
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import catalog from "../src/catalog/models.json" with { type: "json" };

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";

test.describe("iPhone", () => {
  test.use({ userAgent: IPHONE_UA, viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    // Safari answers true for rel="ar"; Chromium does not know Quick Look.
    await page.addInitScript(() => {
      const supports = DOMTokenList.prototype.supports;
      DOMTokenList.prototype.supports = function (token: string) {
        return token === "ar" || supports.call(this, token);
      };
    });
  });

  for (const { id } of catalog.models) {
    test(`${id} is converted to a USDZ and handed to Quick Look`, async ({ page }) => {
      await page.goto(`/models/${id}`);
      const button = page.getByTestId("ar-button");
      await expect(button).toHaveAttribute("data-ar-path", "quick-look");
      await expect(button).toBeEnabled({ timeout: 90_000 });

      const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
      expect(download.suggestedFilename()).toBe("model.usdz");
      const bytes = await readFile(await download.path());
      // USDZ is an uncompressed zip whose first entry is the USD scene.
      expect(bytes.subarray(0, 2).toString()).toBe("PK");
      expect(bytes.subarray(30, 30 + bytes.readUInt16LE(26)).toString()).toMatch(/\.usda$/);
    });
  }
});

test.describe("Android without WebXR", () => {
  test.use({ userAgent: ANDROID_UA, viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

  test("falls back to Scene Viewer and explains why it needs HTTPS locally", async ({ page }) => {
    await page.goto("/models/toy-car");
    const button = page.getByTestId("ar-button");
    await expect(button).toHaveAttribute("data-ar-path", "scene-viewer");
    await button.click();
    await expect(page.getByText(/needs this page served over HTTPS/)).toBeVisible();
  });
});
