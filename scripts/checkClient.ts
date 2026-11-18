import { chromium } from 'playwright';

async function checkClient() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[CLIENT LOG]: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[CLIENT ERR]: ${err.message}`));

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check indexedDB databases and stores
  const result = await page.evaluate(async () => {
    // @ts-ignore
    const { db } = await import('/src/db/db.ts');
    try {
      const foodCount = await db.foods.count();
      const allFoods = await db.foods.toArray();
      return { foodCount, allFoods };
    } catch (e: any) {
      return { error: e.message, stack: e.stack };
    }
  });

  console.log('CLIENT RESULT:', result);
  await browser.close();
}

checkClient().catch(console.error);
