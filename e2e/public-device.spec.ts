import { test, expect } from "@playwright/test";

const PUBLIC_URL = process.env.PUBLIC_URL ?? "http://localhost:3001";

test.describe("Public device page", () => {
  test("shows not found for an unknown code", async ({ page }) => {
    await page.goto(`${PUBLIC_URL}/device/INVALID00`);
    await expect(page.getByText("Device Not Found")).toBeVisible();
  });

  test("home page loads", async ({ page }) => {
    await page.goto(PUBLIC_URL);
    await expect(page).toHaveURL(PUBLIC_URL + "/");
    await expect(page.locator("body")).toBeVisible();
  });
});
