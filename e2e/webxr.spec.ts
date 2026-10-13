/**
 * Runs the real WebXR session code in desktop Chromium on top of IWER, Meta's WebXR
 * emulator, in a scanned office. It proves the session starts, hit-tests a surface, places
 * the model on select and saves a photo. The emulator has no DOM overlay, touch screen or
 * camera image, so those parts still need a phone.
 */
import { expect, test } from "@playwright/test";
import { placeInEmulatedRoom } from "./helpers";

test("places the model in an emulated room and saves a photo", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await placeInEmulatedRoom(page, "toy-robot", "Toy robot");
  await expect(page.getByText("Size 100%")).toBeVisible();

  // The emulator draws its canvas over the page, so the overlay buttons get synthetic clicks.
  await page.getByRole("button", { name: "Take a photo" }).dispatchEvent("click");
  await expect(page.getByText("1 saved")).toBeVisible();

  await page.getByRole("button", { name: "Done" }).dispatchEvent("click");
  const photo = page.getByRole("img", { name: "AR photo of the Toy robot" });
  await expect(photo).toBeVisible();

  // No camera image in the emulator, so the photo is the robot on transparency: some pixels must be drawn.
  const drawn = await photo.evaluate((img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(img, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let opaque = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) opaque++;
    return opaque / (canvas.width * canvas.height);
  });
  expect(drawn).toBeGreaterThan(0.001);
  expect(drawn).toBeLessThan(0.9);
  expect(errors).toEqual([]);
});
