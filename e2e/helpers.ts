import { buildSync } from "esbuild";
import { expect, type Page } from "@playwright/test";

/** Waits until <model-viewer> has fetched and rendered its model. */
export async function waitForModel(page: Page): Promise<void> {
  const viewer = page.getByTestId("model-preview");
  await expect(viewer).toBeVisible();
  await page.waitForFunction(
    () => (document.querySelector("model-viewer") as (HTMLElement & { loaded?: boolean }) | null)?.loaded === true,
    undefined,
    { timeout: 60_000 },
  );
}

/**
 * IWER (Meta's WebXR emulator) as a page init script: a Quest 3 standing in a scanned
 * office, so hit-tests have real surfaces to land on.
 */
export const xrEmulator = buildSync({
  stdin: {
    contents: `
      import { XRDevice, metaQuest3 } from "iwer";
      import { SyntheticEnvironmentModule } from "@iwer/sem";
      import room from "@iwer/sem/captures/office_small.json";
      const device = new XRDevice(metaQuest3);
      device.installRuntime({ forceInstall: true });
      device.installSEM(SyntheticEnvironmentModule);
      device.sem.loadEnvironment(room);
      // Look 40 degrees down, the way you hold a phone towards a table.
      const pitch = (-40 * Math.PI) / 180;
      device.quaternion.set(Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2));
      window.__xrDevice = device;
    `,
    resolveDir: process.cwd(),
    loader: "js",
  },
  bundle: true,
  format: "iife",
  platform: "browser",
  write: false,
  logLevel: "silent",
}).outputFiles[0].text;

/** Starts the AR session on a model page and places the model with a controller select. */
export async function placeInEmulatedRoom(page: Page, id: string, name: string): Promise<void> {
  await page.addInitScript({ content: xrEmulator });
  await page.goto(`/models/${id}`);
  const button = page.getByTestId("ar-button");
  await expect(button).toHaveAttribute("data-ar-path", "webxr");
  await button.click();

  const status = page.getByTestId("ar-status");
  await expect(status).toContainText(`Tap to place the ${name.toLowerCase()}`, { timeout: 60_000 });

  // A trigger press is an XR "select", like a tap on a phone without a DOM overlay.
  await page.evaluate(async () => {
    type Device = { controllers: { right: { updateButtonValue(id: string, value: number): void } } };
    const right = (window as unknown as { __xrDevice: Device }).__xrDevice.controllers.right;
    right.updateButtonValue("trigger", 1);
    await new Promise((resolve) => setTimeout(resolve, 200));
    right.updateButtonValue("trigger", 0);
  });
  await expect(status).toContainText("Drag to move");
}
