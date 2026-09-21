/**
 * ADL Moto Viewer Explorer Script
 * Uses Playwright to login and capture UI screenshots
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '../docs/adl_screenshots');

async function main() {
  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({
    headless: false,  // Show browser for debugging
    slowMo: 500       // Slow down actions
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US'
  });

  const page = await context.newPage();

  try {
    // 1. Navigate to login page
    console.log('📍 Navigating to ADL Moto Viewer...');
    await page.goto('https://pro.adlmotoviewer.cloud/', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_login_page.png'), fullPage: true });
    console.log('✅ Captured: Login page');

    // 2. Analyze login form
    console.log('\n📋 Analyzing login form...');
    const inputs = await page.$$eval('input', els => els.map(el => ({
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      className: el.className
    })));
    console.log('Found inputs:', JSON.stringify(inputs, null, 2));

    // 3. Fill login credentials
    console.log('\n🔐 Filling login credentials...');

    // Try different username selectors
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="user"]',
      'input[name="account"]',
      'input[type="text"]:not([name="password"])',
      'input[placeholder*="user" i]',
      'input[placeholder*="account" i]',
      'input[placeholder*="name" i]'
    ];

    for (const sel of usernameSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.fill('modina123');
          console.log(`  ✓ Filled username using: ${sel}`);
          break;
        }
      } catch (e) {}
    }

    // Fill password
    await page.fill('input[type="password"]', 'M1234567');
    console.log('  ✓ Filled password');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_login_filled.png'), fullPage: true });
    console.log('✅ Captured: Filled login form');

    // 4. Click login button using Playwright's robust click
    console.log('\n🔑 Clicking login...');

    // Wait for the login button to be visible and click it
    try {
      // Try clicking with text matching first (most reliable)
      await page.click('button:has-text("Log in")', { timeout: 5000 });
      console.log('  ✓ Clicked login button');
    } catch (e1) {
      console.log('  ⚠ "Log in" text selector failed, trying alternatives...');
      try {
        await page.click('button.ant-btn-primary', { timeout: 5000 });
        console.log('  ✓ Clicked primary button');
      } catch (e2) {
        console.log('  ⚠ Primary button failed, trying form submit...');
        try {
          await page.click('button[type="submit"]', { timeout: 5000 });
          console.log('  ✓ Clicked submit button');
        } catch (e3) {
          // Last resort: press Enter in password field
          console.log('  ⚠ Button clicks failed, pressing Enter...');
          await page.press('input[type="password"]', 'Enter');
          console.log('  ✓ Pressed Enter key');
        }
      }
    }

    // 5. Wait for dashboard to load
    console.log('\n⏳ Waiting for dashboard...');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    console.log(`  Current URL: ${currentUrl}`);

    // Dismiss any guide/tour modal if present
    try {
      const skipBtn = await page.$('text=Skip');
      if (skipBtn) {
        await skipBtn.click();
        console.log('  ✓ Dismissed guide modal');
        await page.waitForTimeout(1000);
      }
    } catch (e) {}

    // Try clicking outside modal or pressing Escape
    try {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } catch (e) {}

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_dashboard.png'), fullPage: true });
    console.log('✅ Captured: Dashboard');

    // 6. Explore the UI elements
    console.log('\n🔍 Analyzing dashboard structure...');

    // Get navigation links
    const navLinks = await page.$$eval('nav a, .sidebar a, .menu a, [class*="nav"] a', els =>
      els.slice(0, 30).map(el => ({
        text: el.innerText.trim(),
        href: el.href,
        class: el.className
      })).filter(l => l.text)
    );
    console.log('Navigation links:', JSON.stringify(navLinks, null, 2));

    // Get sidebar content
    const sidebarContent = await page.$$eval('.sidebar, [class*="sidebar"], .left-panel, [class*="left"]', els =>
      els.map(el => el.innerText.substring(0, 500))
    );
    if (sidebarContent.length > 0) {
      console.log('\nSidebar content preview:', sidebarContent[0]);
    }

    // 7. Take map screenshot if visible
    const mapElement = await page.$('canvas, .map, [class*="map"], #map');
    if (mapElement) {
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_map_view.png') });
      console.log('✅ Captured: Map view');
    }

    // 8. Look for vehicle list
    const vehicleList = await page.$$('[class*="vehicle"], [class*="device"], [class*="object"], .list-item');
    console.log(`\nFound ${vehicleList.length} vehicle/device items`);

    // 9. Try to click on a vehicle if available
    if (vehicleList.length > 0) {
      await vehicleList[0].click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_vehicle_detail.png'), fullPage: true });
      console.log('✅ Captured: Vehicle detail');
    }

    // 10. Get color scheme from CSS
    console.log('\n🎨 Extracting color scheme...');
    const colors = await page.evaluate(() => {
      const styles = getComputedStyle(document.body);
      const allElements = document.querySelectorAll('*');
      const colorSet = new Set();

      allElements.forEach(el => {
        const style = getComputedStyle(el);
        if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          colorSet.add(style.backgroundColor);
        }
        if (style.color) {
          colorSet.add(style.color);
        }
      });

      return Array.from(colorSet).slice(0, 20);
    });
    console.log('Detected colors:', colors);

    // 11. Capture ADL sidebar navigation pages
    console.log('\n📸 Capturing sidebar pages...');

    // ADL uses a vertical sidebar with icons
    const sidebarPages = [
      { text: 'Statistics', name: 'statistics' },
      { text: 'Manage', name: 'manage' },
      { text: 'Customer', name: 'customer' }
    ];

    for (const pageInfo of sidebarPages) {
      try {
        // Try clicking sidebar item by text
        await page.click(`text=${pageInfo.text}`, { timeout: 3000 });
        await page.waitForTimeout(3000);
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `06_${pageInfo.name}.png`),
          fullPage: true
        });
        console.log(`✅ Captured: ${pageInfo.name}`);
      } catch (e) {
        console.log(`  ⚠ Could not capture ${pageInfo.name}: ${e.message.substring(0, 50)}`);
      }
    }

    // Click back to Monitor to capture clean dashboard
    try {
      await page.click('text=Monitor', { timeout: 3000 });
      await page.waitForTimeout(2000);
    } catch (e) {}

    // 12. Capture vehicle popup actions
    console.log('\n📸 Capturing vehicle actions...');

    // Try to capture route history/playback
    try {
      // Click first vehicle in list
      const vehicles = await page.$$('[class*="vehicle"], [class*="device"], .ant-list-item');
      if (vehicles.length > 0) {
        await vehicles[0].click({ force: true });
        await page.waitForTimeout(2000);

        // Look for history/playback icon in popup
        const historyBtn = await page.$('[class*="history"], [title*="History"], svg[class*="history"]');
        if (historyBtn) {
          await historyBtn.click({ force: true });
          await page.waitForTimeout(3000);
          await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, '07_route_history.png'),
            fullPage: true
          });
          console.log('✅ Captured: route history');
        }
      }
    } catch (e) {
      console.log(`  ⚠ Could not capture vehicle actions: ${e.message.substring(0, 50)}`);
    }

    console.log('\n✨ Exploration complete!');
    console.log(`Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png'), fullPage: true });
  } finally {
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

main().catch(console.error);
