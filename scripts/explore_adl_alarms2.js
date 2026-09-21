/**
 * ADL recon pass 2 — alarm specifics: message center, full Alarm Configuration
 * page, Statistics → Alarm Information pages, Manage → push / mailbox / alarm-name
 * / expiration / event pages. Output: docs/adl_screenshots/alarm2_*.png + alarm2_recon.json
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../docs/adl_screenshots");
const USER = process.env.ADL_USER || "modina123";
const PASS = process.env.ADL_PASSWORD || "M1234567";
const notes = { texts: {} };
let n = 0;
const snap = async (page, name, full = false) => {
  n += 1;
  const f = `alarm2_${String(n).padStart(2, "0")}_${name}.png`;
  await page.screenshot({ path: path.join(OUT, f), fullPage: full });
  console.log("📸", f);
};
const killTour = async (page) => {
  await page.getByText(/^Skip/).first().click({ timeout: 1000 }).catch(() => {});
  await page.getByRole("button", { name: "OK" }).first().click({ timeout: 800 }).catch(() => {});
  await page.evaluate(() => document.querySelectorAll('.ant-tour, .ant-tour-mask, [class*="tour"], .ant-modal-mask, .ant-popover').forEach((e) => e.remove()));
};
const text = async (page, key, sel) => {
  const t = await page.$$eval(sel, (els) => els.map((e) => e.innerText.trim()).filter(Boolean).join("\n---\n")).catch(() => "");
  notes.texts[key] = t.slice(0, 12000);
};
const clickItem = async (page, label) => {
  await page.locator('.ant-menu-item, .ant-menu-submenu-title, li, a, span', { hasText: new RegExp("^\\s*" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$") }).first().click({ timeout: 4000 }).catch((e) => console.log("  (no click)", label, e.message.split("\n")[0]));
  await page.waitForTimeout(2200);
  await killTour(page);
};

(async () => {
  const browser = await chromium.launch({ headless: !process.env.ADL_HEADED });
  const page = await browser.newContext({ viewport: { width: 1600, height: 1000 }, locale: "en-US" }).then((c) => c.newPage());
  await page.goto("https://pro.adlmotoviewer.cloud/", { waitUntil: "networkidle", timeout: 90000 });
  await page.fill('input[name="username"], input[type="text"]', USER);
  await page.fill('input[type="password"]', PASS);
  await page.press('input[type="password"]', "Enter");
  await page.waitForTimeout(8000);
  await killTour(page);

  // A. message center: the round bell button bottom-right
  console.log("→ message center");
  const bellBtn = page.locator('.anticon-bell, [class*="bell"]').last();
  await bellBtn.click({ timeout: 4000, force: true }).catch((e) => console.log("bell click failed", e.message.split("\n")[0]));
  await page.waitForTimeout(2500);
  await snap(page, "message_center");
  await text(page, "messageCenter", ".ant-drawer, .ant-modal, .ant-popover, .ant-dropdown, [class*='message'], [class*='notice']");
  notes.messageCenterTabs = await page.$$eval('.ant-drawer .ant-tabs-tab, .ant-modal .ant-tabs-tab, .ant-drawer [role="tab"], .ant-modal [role="tab"], .ant-drawer .ant-radio-button-wrapper, .ant-modal .ant-radio-button-wrapper', (els) => els.map((e) => e.innerText.trim()));
  console.log("message center tabs:", notes.messageCenterTabs.join(" | "));
  for (const t of notes.messageCenterTabs.slice(0, 6)) {
    await page.locator('.ant-drawer, .ant-modal').locator(`text=${t}`).first().click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(1500);
    await snap(page, "message_center_" + t.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await text(page, "messageCenter:" + t, ".ant-drawer, .ant-modal");
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  // B. System Configuration → Alarm Configuration, full page
  console.log("→ alarm configuration");
  await page.locator(`text=${USER}`).last().hover().catch(() => {});
  await page.waitForTimeout(1000);
  await page.getByText("System Configuration").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await killTour(page);
  await clickItem(page, "Alarm Configuration");
  await text(page, "alarmConfiguration", "main, .ant-layout-content, .ant-form, [class*='content']");
  await snap(page, "alarm_config_top");
  for (let i = 1; i <= 3; i++) {
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(600);
    await snap(page, "alarm_config_scroll" + i);
  }
  for (const item of ["Device Information Configuration", "Mileage maintenance", "Internationalization Configuration"]) {
    await clickItem(page, item);
    await snap(page, "sysconfig_" + item.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await text(page, "sysconfig:" + item, "main, .ant-layout-content, .ant-form");
  }

  // C. Statistics → Alarm Information → Alarm Overview (and siblings)
  console.log("→ statistics alarm");
  await page.getByText("Statistics", { exact: true }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await killTour(page);
  await clickItem(page, "Alarm Information");
  const alarmSubs = await page.$$eval('.ant-menu-item', (els) => els.map((e) => e.innerText.trim()).filter((t) => /alarm/i.test(t)));
  console.log("alarm info subitems:", alarmSubs.join(" | "));
  for (const s of alarmSubs.slice(0, 4)) {
    await clickItem(page, s);
    await snap(page, "stat_" + s.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await text(page, "stat:" + s, "main, .ant-layout-content, .ant-table, .ant-form");
  }
  await clickItem(page, "Travel Report");
  await clickItem(page, "Offline Report");
  await snap(page, "stat_offline_report");
  await clickItem(page, "ACC Overview");
  await clickItem(page, "Idling Report");
  await snap(page, "stat_idling_report");
  await clickItem(page, "Driver Behavior Report");
  await clickItem(page, "Overview of Driving Behavior");
  await snap(page, "stat_driving_behavior_overview");
  await text(page, "stat:drivingBehavior", "main, .ant-layout-content");

  // D. Manage → push / mailbox / alarm-name / expiration / event
  console.log("→ manage alarm pages");
  await page.getByText("Manage", { exact: true }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await killTour(page);
  for (const item of ["Mailbox Push", "Alarm Name Customization", "Device Expiration Reminder", "Share Link"]) {
    await clickItem(page, item);
    await snap(page, "manage_" + item.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await text(page, "manage:" + item, "main, .ant-layout-content, .ant-table, .ant-form");
  }
  await clickItem(page, "Push Management");
  for (const item of ["Push List", "Push Log"]) {
    await clickItem(page, item);
    await snap(page, "manage_" + item.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
    await text(page, "manage:" + item, "main, .ant-layout-content, .ant-table, .ant-form");
  }
  await clickItem(page, "Event");
  const eventSubs = await page.$$eval('.ant-menu-item', (els) => els.map((e) => e.innerText.trim()));
  notes.eventSubs = eventSubs;
  await snap(page, "manage_event");
  for (const item of ["Command Task", "Service Management"]) {
    await clickItem(page, item);
    await snap(page, "manage_" + item.replace(/[^a-z0-9]+/gi, "_").toLowerCase());
  }
  notes.manageMenuAll = await page.$$eval('.ant-menu-item, .ant-menu-submenu-title', (els) => els.map((e) => e.innerText.trim()).filter(Boolean));

  fs.writeFileSync(path.join(OUT, "alarm2_recon.json"), JSON.stringify(notes, null, 2));
  console.log("✅ done", n, "screenshots");
  await browser.close();
})().catch((e) => { console.error("❌", e.message); process.exit(1); });
