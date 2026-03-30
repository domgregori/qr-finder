import { test, expect } from "@playwright/test";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:3000";

test.describe("Admin login", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/dashboard`);
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows login form", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.locator('input[type="email"]').fill("wrong@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });
});
