import { chromium } from 'playwright';

async function diagnose() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[PAGEERROR] ${err.message}`));

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check Dexie items in browser context
  const dexieReport = await page.evaluate(async () => {
    // @ts-ignore
    const { db } = await import('/src/db/db.ts');
    const foodCount = await db.foods.count();
    const foods = await db.foods.limit(3).toArray();
    const logCount = await db.logs.count();
    const logs = await db.logs.toArray();
    const profile = await db.profile.toArray();
    return { foodCount, sampleFoods: foods, logCount, logs, profile };
  });

  console.log('--- DEXIE REPORT ---');
  console.log(JSON.stringify(dexieReport, null, 2));

  console.log('--- BROWSER LOGS ---');
  console.log(logs.join('\n'));

  await browser.close();
}

diagnose().catch(console.error);
