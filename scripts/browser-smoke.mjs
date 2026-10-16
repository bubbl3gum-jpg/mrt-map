import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const network = JSON.parse(
  readFileSync("src/data/official-network.json", "utf8"),
);
const base = process.env.MRT_DEMO_URL ?? "http://127.0.0.1:5173";
const executablePath =
  process.env.MRT_BROWSER_PATH ??
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("heading", { name: "Taipei MRT network" }).waitFor();
  const key = "hustlen-mrt-demo-v1";
  const read = () =>
    page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
  const marker = (id) => page.locator(`[data-station-id="${id}"] .station-hit`);
  const reset = async () => {
    const controls = page.getByRole("button", { name: /Playground controls/ });
    if ((await controls.getAttribute("aria-expanded")) !== "true")
      await controls.click();
    await page
      .getByRole("button", { name: "Reset application", exact: true })
      .click();
    await controls.click();
  };
  await reset();
  assert.equal(await page.locator("[data-station-id]").count(), 120);
  // Actual pointer clicks exercise SVG hit regions for EVERY station in the fitted desktop overview.
  for (const s of network.stations) {
    await marker(s.id).click();
    assert.ok(
      (await read()).available.includes(s.id),
      `Owner pointer hit ${s.id}`,
    );
  }
  assert.equal((await read()).available.length, 120);
  await page.reload();
  await page
    .getByRole("button", { name: "Borrower mode", exact: true })
    .waitFor();
  assert.equal((await read()).available.length, 120);
  // Every approved location can also be the single borrower choice.
  await page
    .getByRole("button", { name: "Borrower mode", exact: true })
    .click();
  for (const s of network.stations) {
    await marker(s.id).click();
    assert.equal((await read()).choice, s.id);
    assert.equal(await page.locator('[aria-pressed="true"]').count(), 1);
  }
  await reset();
  await marker("taipei-main").click();
  await page
    .getByRole("button", { name: "Borrower mode", exact: true })
    .click();
  {
    const r = await marker("dongmen").boundingBox();
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  }
  assert.equal((await read()).choice, null);
  assert.equal(
    await page
      .getByRole("button", { name: /Confirm handoff station/ })
      .isDisabled(),
    true,
  );
  await marker("taipei-main").click();
  await page.getByRole("button", { name: /Confirm handoff station/ }).click();
  await page.getByRole("status").waitFor();
  // Seed ALL v1 IDs from the preserved mapping and check refresh compatibility.
  const legacy = Object.values(
    JSON.parse(readFileSync("data-sources/physical-identities.json", "utf8")),
  ).filter((id) => !id.startsWith("taipei-mrt:"));
  assert.equal(legacy.length, 26);
  await page.evaluate(
    ({ key, legacy }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          available: legacy,
          choice: "taipei-main",
          mode: "borrower",
        }),
      ),
    { key, legacy },
  );
  await page.reload();
  await page.getByRole("button", { name: "Owner mode", exact: true }).waitFor();
  assert.deepEqual((await read()).available, legacy);
  assert.equal((await read()).choice, "taipei-main");
  await reset();
  await marker("taipei-main").click();
  await marker("zhongshan").click();
  await marker("daan").click();
  mkdirSync("docs/screenshots", { recursive: true });
  await page.screenshot({
    path: "docs/screenshots/desktop.png",
    fullPage: true,
  });
  await page.getByRole("textbox", { name: "Search stations" }).fill("R01");
  await page.locator(".search-results button").click();
  await page.waitForTimeout(150);
  assert.equal(
    await page
      .locator(".map-tools")
      .innerText()
      .then((t) => t.includes("320%")),
    true,
  );
  await page.screenshot({
    path: "docs/screenshots/desktop-detail.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset map view" }).click();
  // Pan in SVG screen coordinates and reset.
  const transform = () =>
    page.getByTestId("map-transform").getAttribute("transform");
  const before = await transform();
  const box = await page.locator(".map-stage").boundingBox();
  await page.mouse.move(box.x + 20, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + 65, box.y + box.height * 0.5 + 35);
  await page.mouse.up();
  assert.notEqual(await transform(), before);
  await page.getByRole("button", { name: "Reset map view" }).click();
  assert.equal(await transform(), before);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Reset map view" }).click();
  await page.screenshot({
    path: "docs/screenshots/mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await reset();
  // Dense mobile overview must keep every station's marker independently clickable as well.
  for (const s of network.stations) {
    await marker(s.id).click();
    assert.ok(
      (await read()).available.includes(s.id),
      `Mobile pointer hit ${s.id}`,
    );
  }
  assert.equal((await read()).available.length, 120);
  await page.reload();
  await page
    .getByRole("button", { name: "Borrower mode", exact: true })
    .waitFor();
  assert.equal((await read()).available.length, 120);
  await page
    .getByRole("button", { name: "Borrower mode", exact: true })
    .click();
  await marker("circular-banqiao").click();
  await page.getByRole("button", { name: /Confirm handoff station/ }).click();
  await page.getByRole("status").waitFor();
  assert.equal((await read()).choice, "circular-banqiao");
  assert.equal(
    await page
      .locator('[data-station-id="banqiao"]')
      .getAttribute("aria-pressed"),
    "false",
  );
  assert.deepEqual(errors, []);
  const report = {
    desktopOwnerPointerSelections: 120,
    desktopBorrowerPointerChoices: 120,
    mobileOwnerPointerSelections: 120,
    legacyIdsRetained: 26,
    refreshPersistence: true,
    unavailableBorrowerBlocked: true,
    simulatedConfirmation: true,
    searchFocus: true,
    panReset: true,
    mobileOverflow: false,
    browserErrors: errors,
  };
  writeFileSync(
    "docs/browser-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} catch(error){
  const pages=browser.contexts().flatMap(c=>c.pages());
  for(const page of pages){await page.screenshot({path:".local/browser-failure.png",fullPage:true}).catch(()=>{});console.error("Failure state",await page.evaluate(()=>({url:location.href,state:localStorage.getItem("hustlen-mrt-demo-v1")})).catch(()=>"unavailable"));}
  throw error;
} finally {
  await browser.close();
}
