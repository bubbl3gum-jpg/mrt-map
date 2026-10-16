import { chromium } from "playwright";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
const base = process.env.MRT_DEMO_URL ?? "http://127.0.0.1:5173";
const network = JSON.parse(
  readFileSync("src/data/official-network.json", "utf8"),
);
const browser = await chromium.launch({
  executablePath:
    process.env.MRT_BROWSER_PATH ??
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [],
  checks = [];
const close = (a, b, tolerance = 1) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
async function geometry(page) {
  return page.getByTestId("map-transform").evaluate((el) => {
    const m = el.getScreenCTM();
    return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
  });
}
function world(m, p) {
  return { x: (p.x - m.e) / m.a, y: (p.y - m.f) / m.d };
}
function screen(m, p) {
  return { x: p.x * m.a + m.e, y: p.y * m.d + m.f };
}
async function settled(page) {
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
}
async function mapBox(page) {
  const svg = page.locator('svg[aria-label="Interactive MRT station network"]');
  await svg.scrollIntoViewIfNeeded();
  return svg.boundingBox();
}
const marker = (page, id) =>
  page.locator(`[data-station-id="${id}"] .station-hit`);
const saved = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("hustlen-mrt-demo-v1")));
async function reset(page) {
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await settled(page);
  const m = await geometry(page),
    r = await mapBox(page);
  assert.ok(Object.values(m).every(Number.isFinite));
  for (const p of Object.values(network.layout)) {
    const s = screen(m, p);
    assert.ok(
      s.x >= r.x && s.x <= r.x + r.width && s.y >= r.y && s.y <= r.y + r.height,
      "Fit includes every station",
    );
  }
  return m;
}
async function pan(page, start, delta) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + delta.x, start.y + delta.y, { steps: 8 });
  await page.mouse.up();
  await settled(page);
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("heading", { name: "Taipei MRT network" }).waitFor();
  await mapBox(page);
  let before = await reset(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await settled(page);
  let after = await geometry(page);
  assert.ok(after.a > before.a * 1.2);
  const p0 = network.layout["taipei-main"],
    p1 = network.layout["zhongshan"];
  const separation = (m) =>
    Math.hypot(
      screen(m, p0).x - screen(m, p1).x,
      screen(m, p0).y - screen(m, p1).y,
    );
  assert.ok(separation(after) > separation(before) * 1.2);
  checks.push("Plus changes rendered scale and station separation");
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await settled(page);
  assert.ok((await geometry(page)).a < after.a);
  checks.push("Minus decreases rendered scale");
  for (const ctrl of [false, true]) {
    await reset(page);
    const r = await mapBox(page),
      anchor = { x: r.x + r.width * 0.64, y: r.y + r.height * 0.46 };
    before = await geometry(page);
    const under = world(before, anchor);
    await page.mouse.move(anchor.x, anchor.y);
    if (ctrl) await page.keyboard.down("Control");
    await page.mouse.wheel(0, -100);
    if (ctrl) await page.keyboard.up("Control");
    await page.waitForTimeout(150);
    after = await geometry(page);
    assert.ok(after.a > before.a);
    const kept = screen(after, under);
    close(kept.x, anchor.x);
    close(kept.y, anchor.y);
    checks.push(
      ctrl
        ? "Ctrl-wheel trackpad-style input anchors rendered point"
        : "Ordinary mouse wheel anchors rendered point",
    );
  }
  // A drag beginning on a station must move the camera, not select that station.
  await reset(page);
  const hit = await marker(page, "taipei-main").boundingBox();
  before = await geometry(page);
  await pan(
    page,
    { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 },
    { x: 45, y: 30 },
  );
  after = await geometry(page);
  close(after.e - before.e, 45);
  close(after.f - before.f, 30);
  assert.deepEqual((await saved(page)).available, []);
  checks.push("Station-origin drag pans finite geometry without selection");
  const r = await mapBox(page),
    center = { x: r.x + r.width / 2, y: r.y + r.height / 2 },
    under = world(after, center);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await settled(page);
  after = await geometry(page);
  const kept = screen(after, under);
  close(kept.x, center.x);
  close(kept.y, center.y);
  checks.push("Button zoom preserves panned viewport center");
  await page.getByRole("textbox", { name: "Search stations" }).fill("BL12");
  await page.locator(".search-results button").click();
  await settled(page);
  const r2 = await mapBox(page);
  const centered = screen(await geometry(page), network.layout["taipei-main"]);
  close(centered.x, r2.x + r2.width / 2);
  close(centered.y, r2.y + r2.height / 2);
  assert.ok((await page.locator(".map-label-en").count()) > 0);
  before = await geometry(page);
  await pan(page, { x: r2.x + 30, y: r2.y + 90 }, { x: 40, y: 25 });
  assert.notEqual((await geometry(page)).e, before.e);
  await marker(page, "taipei-main").click();
  assert.deepEqual((await saved(page)).available, ["taipei-main"]);
  checks.push(
    "Search after navigation centers station; zoomed pan and station click work",
  );
  before = await geometry(page);
  await page
    .getByRole("button", { name: "Borrower mode", exact: true })
    .click();
  await settled(page);
  assert.deepEqual(await geometry(page), before);
  await marker(page, "taipei-main").click();
  assert.equal((await saved(page)).choice, "taipei-main");
  await page.getByRole("button", { name: /Confirm handoff station/ }).click();
  await page.getByRole("status").waitFor();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  assert.ok((await geometry(page)).a >= before.a);
  checks.push(
    "Borrower mode preserves camera and approved selection/confirmation",
  );
  await reset(page);
  for (
    let i = 0;
    i < 16 &&
    !(await page
      .getByRole("button", { name: "Zoom in", exact: true })
      .isDisabled());
    i++
  )
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Zoom in", exact: true })
      .isDisabled(),
    true,
  );
  for (
    let i = 0;
    i < 20 &&
    !(await page
      .getByRole("button", { name: "Zoom out", exact: true })
      .isDisabled());
    i++
  )
    await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Zoom out", exact: true })
      .isDisabled(),
    true,
  );
  await reset(page);
  checks.push(
    "Zoom controls disable at both limits; Reset fits all 120 locations",
  );
  const transform = () =>
    page.getByTestId("map-transform").getAttribute("transform");
  await page.evaluate(() => window.scrollTo(0, 0));
  const outside = await transform();
  await page.mouse.move(30, 30);
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(150);
  assert.equal(await transform(), outside);
  assert.ok((await page.evaluate(() => scrollY)) > 0);
  await page.getByRole("textbox", { name: "Search stations" }).fill("R01");
  assert.equal(await transform(), outside);
  checks.push("Outside-map wheel scrolls the page; typing does not zoom");
  // Safari compatibility events are synthetic coverage, not a native Mac/Safari claim.
  await reset(page);
  before = await geometry(page);
  await page
    .locator('svg[aria-label="Interactive MRT station network"]')
    .evaluate((el) => {
      for (const [type, scale] of [
        ["gesturestart", 1],
        ["gesturechange", 1.5],
        ["gestureend", 1.5],
      ]) {
        const e = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(e, "scale", { value: scale });
        el.dispatchEvent(e);
      }
    });
  await settled(page);
  assert.ok((await geometry(page)).a > before.a * 1.4);
  checks.push("Synthetic Safari gesture compatibility changes rendered scale");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await context.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto(base);
  await mobile.getByRole("heading", { name: "Taipei MRT network" }).waitFor();
  await reset(mobile);
  const cdp = await context.newCDPSession(mobile),
    mr = await mapBox(mobile),
    mid = { x: mr.x + mr.width / 2, y: mr.y + mr.height / 2 };
  before = await geometry(mobile);
  const at = world(before, mid);
  const touches = (d, dx = 0, dy = 0) => [
    { x: mid.x - d + dx, y: mid.y + dy, id: 1 },
    { x: mid.x + d + dx, y: mid.y + dy, id: 2 },
  ];
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: touches(30),
  });
  for (let d = 36; d <= 72; d += 6)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: touches(d),
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await settled(mobile);
  after = await geometry(mobile);
  assert.ok(after.a > before.a * 1.8);
  const pin = screen(after, at);
  close(pin.x, mid.x, 2);
  close(pin.y, mid.y, 2);
  assert.deepEqual((await saved(mobile)).available, []);
  checks.push(
    "390px real CDP two-touch pinch zooms around gesture center without selection",
  );
  const dragStart = { x: mid.x, y: mid.y };
  before = await geometry(mobile);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...dragStart, id: 3 }],
  });
  for (let t = 1; t <= 6; t++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: dragStart.x + t * 6, y: dragStart.y + t * 5, id: 3 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await settled(mobile);
  after = await geometry(mobile);
  close(after.e - before.e, 36, 2);
  close(after.f - before.f, 30, 2);
  assert.deepEqual((await saved(mobile)).available, []);
  checks.push("390px one-finger touch drag pans finite rendered geometry");
  await reset(mobile);
  before = await geometry(mobile);
  await mobile.getByRole("button", { name: "Zoom in", exact: true }).tap();
  await settled(mobile);
  assert.ok((await geometry(mobile)).a > before.a);
  await mobile.getByRole("button", { name: "Zoom out", exact: true }).tap();
  await reset(mobile);
  for (const label of ["Zoom in", "Zoom out", "Reset map view"]) {
    const box = await mobile
      .getByRole("button", { name: label, exact: true })
      .boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44);
  }
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  checks.push("390px touch controls have 44px targets, work and fit network");
  await marker(mobile, "taipei-main").tap();
  assert.deepEqual((await saved(mobile)).available, ["taipei-main"]);
  await mobile.getByRole("button", { name: "Borrower mode", exact: true }).tap();
  await marker(mobile, "taipei-main").tap();
  assert.equal((await saved(mobile)).choice, "taipei-main");
  checks.push("390px native touch taps select an Owner station and approved Borrower choice");
  assert.deepEqual(errors, []);
  mkdirSync("docs", { recursive: true });
  const report = {
    runAt: new Date().toISOString(),
    base,
    checks,
    browserErrors: errors,
    limitations: [
      "Native macOS trackpad hardware and Safari were not tested; Ctrl-wheel, CDP touch and synthetic gesture events are distinct automated coverage.",
    ],
  };
  writeFileSync(
    "docs/navigation-validation.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
