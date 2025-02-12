import { test, expect } from "playwright-test-coverage";

test("home page", async ({ page }) => {
  await page.goto("/");

  expect(await page.title()).toBe("JWT Pizza");
});

test("register, view about, logout", async ({ page }) => {
  await page.route("*/**/api/auth", async (route) => {
    if (route.request().method() === "POST") {
      const registerReq = { name: "Reggy", email: "r@jwt.com", password: "r" };
      const registerRes = {
        user: { id: 6, name: "Reggy", email: "r@jwt.com", roles: [{ role: "diner" }] },
        token: "abcdefg",
      };
      expect(route.request().postDataJSON()).toMatchObject(registerReq);
      await route.fulfill({ json: registerRes });
    } else if (route.request().method() === "DELETE") {
      const logoutRes = { message: "logout successful" };
      // await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ json: logoutRes });
    } else {
      expect(false).toBe(true);
    }
  });

  await page.goto("/");

  await page.getByRole("link", { name: "Register" }).click();

  await page.getByRole("textbox", { name: "Full name" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("Reggy");

  await page.getByRole("textbox", { name: "Email address" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("r@jwt.com");

  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("r");

  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByLabel("Global")).toContainText("R");

  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("main")).toContainText("The secret sauce");

  await page.getByRole("link", { name: "Logout" }).click();
  // await expect(page.getByText("Logging out")).toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
});

test("purchase with login", async ({ page }) => {
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      { id: 1, title: "Veggie", image: "pizza1.png", price: 0.0038, description: "A garden of delight" },
      { id: 2, title: "Pepperoni", image: "pizza2.png", price: 0.0042, description: "Spicy treat" },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  await page.route("*/**/api/franchise", async (route) => {
    const franchiseRes = [
      {
        id: 2,
        name: "LotaPizza",
        stores: [
          { id: 4, name: "Lehi" },
          { id: 5, name: "Springville" },
          { id: 6, name: "American Fork" },
        ],
      },
      { id: 3, name: "PizzaCorp", stores: [{ id: 7, name: "Spanish Fork" }] },
      { id: 4, name: "topSpot", stores: [] },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  await page.route("*/**/api/auth", async (route) => {
    const loginReq = { email: "d@jwt.com", password: "a" };
    const loginRes = {
      user: { id: 3, name: "Kai Chen", email: "d@jwt.com", roles: [{ role: "diner" }] },
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("*/**/api/order", async (route) => {
    const orderReq = {
      items: [
        { menuId: 1, description: "Veggie", price: 0.0038 },
        { menuId: 2, description: "Pepperoni", price: 0.0042 },
      ],
      storeId: "4",
      franchiseId: 2,
    };
    const orderRes = {
      order: {
        items: [
          { menuId: 1, description: "Veggie", price: 0.0038 },
          { menuId: 2, description: "Pepperoni", price: 0.0042 },
        ],
        storeId: "4",
        franchiseId: 2,
        id: 23,
      },
      jwt: "eyJpYXQ",
    };
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({ json: orderRes });
  });

  await page.goto("/");

  // Go to order page
  await page.getByRole("button", { name: "Order now" }).click();

  // Create order
  await expect(page.locator("h2")).toContainText("Awesome is a click away");
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Veggie A" }).click();
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await expect(page.locator("form")).toContainText("Selected pizzas: 2");
  await page.getByRole("button", { name: "Checkout" }).click();

  // Login
  await page.getByPlaceholder("Email address").click();
  await page.getByPlaceholder("Email address").fill("d@jwt.com");
  await page.getByPlaceholder("Email address").press("Tab");
  await page.getByPlaceholder("Password").fill("a");
  await page.getByRole("button", { name: "Login" }).click();

  // Pay
  await expect(page.getByRole("main")).toContainText("Send me those 2 pizzas right now!");
  await expect(page.locator("tbody")).toContainText("Veggie");
  await expect(page.locator("tbody")).toContainText("Pepperoni");
  await expect(page.locator("tfoot")).toContainText("0.008 ₿");
  await page.getByRole("button", { name: "Pay now" }).click();

  // Check balance
  await expect(page.getByText("0.008")).toBeVisible();
});

test("admin", async ({ page }) => {
  await page.route("*/**/api/auth", async (route) => {
    const loginReq = {
      email: "a@jwt.com",
      password: "admin",
    };
    const loginRes = {
      user: { id: 1, name: "常用名字", email: "a@jwt.com", roles: [{ role: "admin" }] },
      token: "abobby123",
    };
    expect(route.request().method()).toBe("PUT");
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });

  await page.route("*/**/api/franchise", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: [
          {
            id: 1,
            name: "My new cool franchise",
            admins: [{ id: 1, name: "常用名字", email: "a@jwt.com" }],
            stores: [{ id: 1, name: "The cool store", totalRevenue: 0 }],
          },
        ],
      });
    } else if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({
        stores: [],
        id: "",
        name: "My new cool franchise",
        admins: [{ email: "a@jwt.com" }],
      });
      await route.fulfill({
        json: {
          stores: [],
          id: 1,
          name: "My new cool franchise",
          admins: [{ email: "a@jwt.com", id: 1, name: "常用名字" }],
        },
      });
    }
  });

  await page.route("*/**/api/franchise/1", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: [
          {
            id: 1,
            name: "My new cool franchise",
            admins: [{ id: 1, name: "常用名字", email: "a@jwt.com" }],
            stores: [{ id: 1, name: "The cool store", totalRevenue: 0 }],
          },
        ],
      });
    } else if (route.request().method() === "DELETE") {
      await route.fulfill({ json: { message: "franchise deleted" } });
    }
  });

  await page.route("*/**/api/franchise/1/store", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toMatchObject({
      id: "",
      name: "The cool store",
    });
    await route.fulfill({
      json: { id: 1, name: "The cool store", franchiseId: 1 },
    });
  });

  await page.route("*/**/api/franchise/1/store/1", async (route) => {
    expect(route.request().method()).toBe("DELETE");
    await route.fulfill({ json: { message: "store deleted" } });
  });

  await page.goto("/");

  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page.getByRole("heading")).toContainText("Mama Ricci's kitchen");
  await page.getByRole("button", { name: "Add Franchise" }).click();
  await expect(page.getByRole("heading")).toContainText("Create franchise");
  await page.getByRole("textbox", { name: "franchise name" }).click();
  await page.getByRole("textbox", { name: "franchise name" }).fill("My new cool franchise");
  await page.getByRole("textbox", { name: "franchisee admin email" }).click();
  await page.getByRole("textbox", { name: "franchisee admin email" }).fill("a@jwt.com");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByRole("heading")).toContainText("Mama Ricci's kitchen");
  await expect(page.locator("tbody")).toContainText("My new cool franchise");
  await expect(page.locator("tbody")).toContainText("常用名字");
  await expect(page.getByTestId("close-franchise")).toBeVisible();

  await page.getByRole("link", { name: "Franchise" }).click();
  await page.getByRole("button", { name: "Create store" }).click();
  await page.getByRole("textbox", { name: "store name" }).click();
  await page.getByRole("textbox", { name: "store name" }).fill("The cool store");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.locator("tbody")).toContainText("The cool store");
  await expect(page.locator("tbody")).toContainText("0 ₿");
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading")).toContainText("Sorry to see you go");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByTestId("close-franchise").click();
  await expect(page.getByRole("heading")).toContainText("Sorry to see you go");
  await page.getByRole("button", { name: "Close" }).click();
});
