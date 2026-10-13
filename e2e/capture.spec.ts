/**
 * Regenerates the catalog posters (public/posters) and the README screenshots (docs).
 * Run with `npm run screenshots` after `npm run models` and `npm run build`.
 */
import { writeFile } from "node:fs/promises";
import { test } from "@playwright/test";
import catalog from "../src/catalog/models.json" with { type: "json" };
import { placeInEmulatedRoom, waitForModel } from "./helpers";

test.describe.configure({ mode: "serial" });

for (const { id } of catalog.models) {
  test(`poster for ${id}`, async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`/models/${id}`);
    await waitForModel(page);
    const webp = await page.evaluate(async () => {
      type Viewer = HTMLElement & {
        autoRotate: boolean;
        jumpCameraToGoal(): void;
        toBlob(options: { mimeType: string; qualityArgument: number }): Promise<Blob>;
      };
      const viewer = document.querySelector("model-viewer") as Viewer;
      viewer.autoRotate = false;
      viewer.style.width = viewer.style.height = "720px";
      viewer.jumpCameraToGoal();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const blob = await viewer.toBlob({ mimeType: "image/webp", qualityArgument: 0.85 });
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    });
    await writeFile(`public/posters/${id}.webp`, new Uint8Array(webp));
  });
}

test("README screenshots", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/catalog.png" });

  await page.goto("/models/potted-plant");
  await waitForModel(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "docs/preview.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/catalog-phone.png" });
});

test("README screenshot of the WebXR session in the emulator", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await placeInEmulatedRoom(page, "potted-plant", "Potted plant");
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "docs/webxr-emulated.png" });
});
