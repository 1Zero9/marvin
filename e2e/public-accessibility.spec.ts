import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "playwright/test";

for (const route of [
  "/signin",
  "/recover",
  "/reset",
  "/setup",
  "/join/not-a-real-invite",
  "/dictionary",
  "/definitely-not-a-marvin-page",
]) {
  test(`${route} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("desktop and mobile navigation landmarks have distinct names", async ({ page }) => {
  await page.goto("/dictionary");
  await expect(page.getByRole("navigation", { name: "Desktop navigation" })).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "Desktop navigation" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toHaveCount(1);
});

test("offline navigation shows a recovery page without caching private content", async ({ context, page }) => {
  await page.goto("/signin");
  await page.waitForTimeout(250);
  await page.evaluate(async () => { await navigator.serviceWorker.register("/sw.js"); });
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  try {
    const response = await page.goto("/cook", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(503);
    await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible();
    await expect(page.getByText("Private household pages are never stored for offline use.")).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
