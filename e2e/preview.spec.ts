import { expect, test } from "@playwright/test";
import { waitForModel } from "./helpers";

test("the catalog lists every model with its real size", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Potted plant",
    "Toy car",
    "Wooden lantern",
    "Toy robot",
  ]);
  await expect(page.getByText("45.8 × 55 × 43 cm")).toBeVisible();
  await expect(page.getByTestId("device-badge")).toContainText("3D preview only");
});

test("a desktop browser gets the 3D preview, not an AR button that cannot work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/models/toy-robot");
  await waitForModel(page);

  const button = page.getByTestId("ar-button");
  await expect(button).toHaveAttribute("data-ar-path", "preview");
  await expect(button).toBeDisabled();
  await expect(page.getByRole("row", { name: /Height/ })).toContainText("32 cm");
  await expect(page.getByRole("row", { name: /Height/ })).toContainText("1 ft 1 in");
  expect(errors).toEqual([]);
});
