import { expect, test } from "playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeAll(() => {
  if (process.env.E2E_DATABASE_CONFIRMED !== "1") {
    throw new Error("End-to-end tests require an explicitly confirmed disposable database.");
  }
});

const owner = {
  email: "release-smoke@marvin.test",
  displayName: "Release Smoke",
  password: "correct-horse-battery-staple",
  householdName: "Release Kitchen",
};

test("critical workflow and every page survive the mobile release pass", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  const request = page.request;
  let accountCreated = false;
  const setup = await request.post("/api/auth/setup", { data: owner });
  expect(setup.status()).toBe(201);
  accountCreated = true;

  try {
    const signout = await request.post("/api/auth/signout");
    expect(signout.ok()).toBeTruthy();

    const signin = await request.post("/api/auth/signin", {
      data: { email: owner.email, password: owner.password },
    });
    expect(signin.ok()).toBeTruthy();

    const createBook = await request.post("/api/books", {
      data: { title: "Smoke Test Cookbook", author: "Marvin", visibility: "household" },
    });
    expect(createBook.status()).toBe(201);
    const book = await createBook.json() as { id: string };

    const createRecipe = await request.post("/api/recipes", {
      data: {
        title: "Smoke Test Supper",
        source: "book",
        bookId: book.id,
        pageRef: 42,
        ingredients: "200 g tomatoes\n1 onion",
        instructions: "Cook gently until ready.",
        tags: ["smoke-test"],
        links: [],
        visibility: "household",
      },
    });
    expect(createRecipe.status()).toBe(201);
    const recipe = await createRecipe.json() as { id: string };

    const log = await request.post("/api/logs/quick", {
      data: { recipeId: recipe.id, rating: 4, notes: "Release smoke meal", countsAsCooked: true },
    });
    expect(log.status()).toBe(201);

    const share = await request.post(`/api/recipes/${recipe.id}/share`);
    expect(share.ok()).toBeTruthy();
    const sharePath = new URL((await share.json() as { url: string }).url).pathname;
    const invite = await request.post("/api/invites", { data: { email: "mobile-invite@marvin.test" } });
    expect(invite.status()).toBe(201);
    const invitePath = new URL((await invite.json() as { invite: { url: string } }).invite.url).pathname;

    const mobileRoutes = [
      "/", "/cook", "/cook?q=tomato", "/decide", "/recipes", "/recipes?source=book",
      "/recipes/add", `/recipes/${recipe.id}`, `/recipes/${recipe.id}/log`, "/books", "/books/add",
      `/books/${book.id}`, `/books/${book.id}?q=tomato`, `/books/${book.id}/index`, "/log", "/log?q=Smoke",
      "/log/add", "/moments", "/plan", "/shopping", "/snap", "/health", "/health/weight",
      "/health/alcohol", "/health/workouts", "/health/checklist", "/health/rating", "/reflection",
      "/household", "/account", "/admin", "/dictionary", "/signin", "/recover", "/reset", "/setup",
      invitePath, sharePath,
    ];

    await page.setViewportSize({ width: 390, height: 844 });
    const accessibilityFailures: Array<{ route: string; violations: unknown[] }> = [];
    for (const route of mobileRoutes) {
      await test.step(`mobile route ${route}`, async () => {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.status(), `${route} should render successfully`).toBeLessThan(400);
        await expect(page.locator("main"), `${route} should expose a main landmark`).toBeVisible();
        await expect(page.locator("h1"), `${route} should have one page heading`).toHaveCount(1);
        await expect(page.locator("h1")).toBeVisible();
        const viewport = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        expect(viewport.scrollWidth, `${route} should not overflow horizontally`).toBeLessThanOrEqual(viewport.clientWidth + 1);
        const accessibility = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        if (accessibility.violations.length > 0) {
          accessibilityFailures.push({ route, violations: accessibility.violations });
        }
      });
    }
    expect(accessibilityFailures, JSON.stringify(accessibilityFailures, null, 2)).toEqual([]);

    await page.goto("/cook");
    await expect(page.getByRole("heading", { name: /What are we making/ })).toBeVisible();
    const searchbox = page.getByRole("searchbox", { name: "Search recipes, ingredients, and cookbooks" });
    const searchButton = page.getByRole("button", { name: "Search" });
    await expect(searchbox).toHaveCount(1);
    await expect(searchButton).toHaveCount(1);
    await expect(searchButton.locator("svg")).toHaveCount(1);
    const searchAppearance = await searchbox.evaluate((input) => {
      const inputStyle = getComputedStyle(input);
      const container = input.parentElement;
      if (!container) throw new Error("Search input is missing its container");
      const containerStyle = getComputedStyle(container);
      const bounds = container.getBoundingClientRect();
      return {
        inputBorderWidth: inputStyle.borderTopWidth,
        inputBackground: inputStyle.backgroundColor,
        containerBorderWidth: containerStyle.borderTopWidth,
        containerHeight: bounds.height,
        containerTop: bounds.top,
      };
    });
    expect(searchAppearance).toMatchObject({
      inputBorderWidth: "0px",
      inputBackground: "rgba(0, 0, 0, 0)",
      containerBorderWidth: "1px",
    });
    expect(searchAppearance.containerHeight).toBeGreaterThanOrEqual(56);
    expect(searchAppearance.containerTop).toBeGreaterThan(100);

    const books = await request.get("/api/books");
    expect(books.ok()).toBeTruthy();
    expect(await books.json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: book.id, title: "Smoke Test Cookbook" }),
    ]));

    const readiness = await request.get("/api/health/ready");
    expect(readiness.ok()).toBeTruthy();
    expect(await readiness.json()).toEqual({ status: "ready", checks: { configuration: true, database: true } });
  } finally {
    if (accountCreated) {
      const cleanup = await request.delete("/api/account", {
        data: { confirmation: "DELETE MY ACCOUNT", password: owner.password },
      });
      expect(cleanup.ok()).toBeTruthy();
    }
  }
});
