import { chromium } from 'playwright';

async function diagnoseLive() {
  console.log('=== STARTING DEEP TELEMETRY DIAGNOSTIC ===');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]: ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.error(`[UNCAUGHT PAGE ERROR]: ${err.message}\n${err.stack}`);
  });

  console.log('Navigating to http://127.0.0.1:5173...');
  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Switch to search tab
  console.log('Switching to AI Food Search tab...');
  const searchTab = page.getByRole('button', { name: /AI Food Search/i });
  await searchTab.click();
  await page.waitForTimeout(1500);

  // Type a query: "Dal"
  console.log('Typing search query: "Dal"...');
  const input = page.getByPlaceholder(/Semantic search/i);
  await input.fill('Dal');

  // Wait 10 seconds to observe worker messages, errors, indexing, etc.
  console.log('Waiting 10s for search execution and telemetry...');
  await page.waitForTimeout(10000);

  // Check what's rendered
  const items = await page.locator('.group.p-4').all();
  console.log(`Total displayed items: ${items.length}`);
  for (let i = 0; i < items.length; i++) {
    const text = await items[i].locator('h4').textContent();
    console.log(`- Item ${i + 1}: ${text?.trim()}`);
  }

  // Type another query: "cottage cheese"
  console.log('Typing search query: "cottage cheese"...');
  await input.fill('cottage cheese');
  await page.waitForTimeout(5000);

  const items2 = await page.locator('.group.p-4').all();
  console.log(`Total displayed items for 'cottage cheese': ${items2.length}`);
  for (let i = 0; i < items2.length; i++) {
    const text = await items2[i].locator('h4').textContent();
    console.log(`- Item ${i + 1}: ${text?.trim()}`);
  }

  await browser.close();
  console.log('=== DIAGNOSTIC FINISHED ===');
}

diagnoseLive().catch(console.error);
