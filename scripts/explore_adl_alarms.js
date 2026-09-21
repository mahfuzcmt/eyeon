/**
 * ADL Moto Viewer recon — alarm / notification screens.
 *
 * Captures everything alarm-related in the ADL demo account so EyeOn's
 * notification system can be matched screen for screen:
 *   - the bell / message icon dropdown
 *   - Manage → every tab (alarm / event settings live there)
 *   - user menu → System Configuration (alarm popup / sound settings)
 *   - any page or dialog whose text mentions alarm / alert / notification
 *
 * Run from the repo root:   node scripts/explore_adl_alarms.js
 * Optional env: ADL_USER, ADL_PASSWORD, ADL_HEADED=1 (watch the browser).
 * Output: docs/adl_screenshots/alarm_*.png + docs/adl_screenshots/alarm_recon.json
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "../docs/adl_screenshots");
const USER = process.env.ADL_USER || "modina123";
const PASS = process.env.ADL_PASSWORD || "M1234567";

const notes = { steps: [], texts: {} };
let shot = 0;
const snap = async (page, name) => {
  shot += 1;
  const file = `alarm_${String(shot).padStart(2, "0")}_${name}.png`;
  await page.screenshot({ path: path.join(OUT, file) });
  notes.steps.push(file);
  console.log("📸", file);
};
const killTour = async (page) => {
  // The onboarding popover ("The latest entry in the system configuration … Skip(1/3)")
  // intercepts clicks until skipped; remove it and any masks outright.
  await page.getByText(/^Skip/).first().click({ timeout: 1500 }).catch(() => {});
  await page.evaluate(() => {
    document
      .querySelectorAll('.ant-tour, .ant-tour-mask, [class*="tour"], .ant-modal-mask, .ant-popover, .ant-dropdown')
      .forEach((e) => e.remove());
  });
  await page.mouse.move(800, 600);
};
const dumpText = async (page, key, selector) => {
  const t = await page.$$eval(selector, (els) => els.map((e) => e.innerText.trim()).filter(Boolean).join("\n---\n")).catch(() => "");
  if (t) notes.texts[key] = t.slice(0, 6000);
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: !process.env.ADL_HEADED, slowMo: process.env.ADL_HEADED ? 300 : 0 });
  const page = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "en-US" }).then((c) => c.newPage());

  console.log("→ login");
  await page.goto("https://pro.adlmotoviewer.cloud/", { waitUntil: "networkidle", timeout: 90000 });
  await page.fill('input[name="username"], input[type="text"]', USER);
  await page.fill('input[type="password"]', PASS);
  await page.press('input[type="password"]', "Enter");
  await page.waitForTimeout(8000);
  await killTour(page);
  notes.urlAfterLogin = page.url();
  await snap(page, "monitor");

  // 1. Every hash route the SPA exposes (sidebar + submenus)
  const links = await page.$$eval('a[href*="#/"]', (as) =>
    [...new Set(as.map((a) => a.getAttribute("href") + " :: " + a.innerText.trim().replace(/\s+/g, " ")))]);
  notes.links = links;
  console.log("links:", links.length);

  // 2. Bottom-right bell / "unread messages" → the alarm message center
  console.log("→ message center");
  const unread = page.getByText(/unread message/i).first();
  if (await unread.count()) {
    notes.texts.unreadToast = await unread.innerText();
    await unread.click({ timeout: 4000 }).catch(() => {});
  } else {
    // the orange round button bottom-right
    const btn = page.locator('button, div').filter({ has: page.locator('[class*="bell"], [class*="notice"]') }).last();
    await btn.click({ timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(2500);
  await snap(page, "message_center");
  await dumpText(page, "messageCenter", ".ant-drawer, .ant-modal, .ant-popover, .ant-dropdown, .ant-list, .ant-table");
  const mcTabs = await page.$$eval('.ant-drawer .ant-tabs-tab, .ant-modal .ant-tabs-tab, .ant-drawer [role="tab"], .ant-modal [role="tab"]',
    (els) => [...new Set(els.map((e) => e.innerText.trim()).filter(Boolean))]);
  notes.messageCenterTabs = mcTabs;
  for (const label of mcTabs.slice(0, 8)) {
    await page.locator('.ant-drawer .ant-tabs-tab, .ant-modal .ant-tabs-tab', { hasText: label }).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(page, "message_center_" + label.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await dumpText(page, "messageCenter:" + label, ".ant-drawer, .ant-modal");
  }
  // any settings gear inside the message center
  const gear = page.locator('.ant-drawer [class*="setting"], .ant-modal [class*="setting"], .ant-drawer .anticon-setting, .ant-modal .anticon-setting').first();
  if (await gear.count()) {
    await gear.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(page, "message_center_settings");
    await dumpText(page, "messageCenterSettings", ".ant-drawer, .ant-modal");
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // 3. Sidebar sections by clicking the rail item itself, then every submenu / tab
  const section = async (label) => {
    console.log("→", label);
    await killTour(page);
    const rail = page.locator('aside, [class*="sider"], [class*="menu"]').locator(`text=${label}`).first();
    await rail.click({ timeout: 5000 }).catch(async () => page.getByText(label, { exact: true }).first().click({ timeout: 5000 }).catch(() => {}));
    await page.waitForTimeout(3000);
    await killTour(page);
    notes["url:" + label] = page.url();
    await snap(page, label.toLowerCase());
    const items = await page.$$eval('.ant-menu-item, .ant-menu-submenu-title, .ant-tabs-tab, [role="tab"], [role="menuitem"]',
      (els) => [...new Set(els.map((e) => e.innerText.trim()).filter((t) => t && t.length < 40))]);
    notes["items:" + label] = items;
    console.log(label, "items:", items.join(" | "));
    return items;
  };
  const manageItems = await section("Manage");
  for (const label of manageItems.filter((l) => !/^(All|Online|Offline|Inactive)\(/.test(l)).slice(0, 14)) {
    await page.locator('.ant-menu-item, .ant-menu-submenu-title, .ant-tabs-tab, [role="tab"], [role="menuitem"]', { hasText: label }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(2200);
    await killTour(page);
    notes["url:Manage/" + label] = page.url();
    await snap(page, "manage_" + label.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await dumpText(page, "manage:" + label, ".ant-table, .ant-form, .ant-tabs-tabpane-active, .ant-card, main");
  }
  const statItems = await section("Statistics");
  for (const label of statItems.filter((l) => !/^(All|Online|Offline|Inactive)\(/.test(l)).slice(0, 14)) {
    await page.locator('.ant-menu-item, .ant-menu-submenu-title, .ant-tabs-tab, [role="tab"], [role="menuitem"]', { hasText: label }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(2200);
    await killTour(page);
    notes["url:Statistics/" + label] = page.url();
    await snap(page, "statistics_" + label.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await dumpText(page, "statistics:" + label, ".ant-table, .ant-form, .ant-tabs-tabpane-active, .ant-card, main");
  }

  // 4. User menu → System Configuration
  console.log("→ system configuration");
  await page.locator(`text=${USER}`).last().hover().catch(() => {});
  await page.waitForTimeout(1200);
  await snap(page, "user_menu");
  await page.getByText("System Configuration", { exact: false }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await killTour(page);
  await snap(page, "system_configuration");
  await dumpText(page, "systemConfiguration", ".ant-modal, .ant-drawer, .ant-form, main");
  const cfgTabs = await page.$$eval('.ant-modal .ant-tabs-tab, .ant-drawer .ant-tabs-tab, .ant-modal .ant-menu-item', (els) => [...new Set(els.map((e) => e.innerText.trim()).filter(Boolean))]);
  notes.systemConfigTabs = cfgTabs;
  for (const label of cfgTabs.slice(0, 10)) {
    await page.locator('.ant-modal .ant-tabs-tab, .ant-drawer .ant-tabs-tab, .ant-modal .ant-menu-item', { hasText: label }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(page, "sysconfig_" + label.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await dumpText(page, "sysconfig:" + label, ".ant-modal, .ant-drawer");
  }
  await page.keyboard.press("Escape");

  // 5. Vehicle popup → any alarm-ish action (e.g. "Alarm", "Event", "Note")
  console.log("→ vehicle popup");
  await page.getByText("Monitor", { exact: true }).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await killTour(page);
  const firstVehicle = page.locator(".ant-checkbox-wrapper").nth(1);
  await firstVehicle.locator("xpath=..").click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await snap(page, "vehicle_popup");
  await dumpText(page, "vehiclePopup", ".leaflet-popup, .gm-style-iw, [class*='popup'], [class*='infowindow']");
  notes.popupActions = await page.$$eval("[class*='popup'] [title], [class*='infowindow'] [title], .gm-style-iw [title]",
    (els) => els.map((e) => e.getAttribute("title")).filter(Boolean));
  console.log("popup action titles:", notes.popupActions.join(" | "));

  fs.writeFileSync(path.join(OUT, "alarm_recon.json"), JSON.stringify(notes, null, 2));
  console.log("\n✅ done —", shot, "screenshots in docs/adl_screenshots, text in alarm_recon.json");
  await browser.close();
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
