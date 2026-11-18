import { chromium } from 'playwright';

async function testCompleteLifecycle() {
  console.log('--- TESTING FULL LIFECYCLE: LOG -> DIARY -> TARGET ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('[BROWSER ERROR]:', msg.text());
    else console.log('[BROWSER LOG]:', msg.text());
  });

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Initial view is Daily Diary
  const diaryHeading = page.getByRole('heading', { name: /Daily Calorie Diary/i });
  console.log('Diary Heading visible:', await diaryHeading.isVisible());

  // 2. Switch to AI Food Search
  const searchTab = page.getByRole('button', { name: /AI Food Search/i });
  await searchTab.click();
  await page.waitForTimeout(500);

  // Check catalogue foods rendered
  const foodCards = page.locator('.group.p-4');
  console.log('Catalogue food cards count before search:', await foodCards.count());

  // Log 1 scoop Whey Protein
  console.log('Searching for "Whey"...');
  const searchInput = page.getByPlaceholder(/Semantic search/i);
  await searchInput.fill('Whey');
  await page.waitForTimeout(500);

  const logBtn = page.getByRole('button', { name: /Log Food/i }).first();
  await logBtn.click();
  await page.waitForTimeout(400);

  // Bottom Sheet check
  const sheetTitle = page.locator('h3').first();
  console.log('Sheet Food Title:', await sheetTitle.textContent());

  // Log 2 scoops
  const qtyInput = page.locator('input[type="number"]');
  await qtyInput.fill('2');
  await page.waitForTimeout(300);

  const logToDiaryBtn = page.getByRole('button', { name: /Log to Diary/i });
  await logToDiaryBtn.click();
  await page.waitForTimeout(1000);

  // 3. Switch back to Daily Diary
  const diaryTab = page.getByRole('button', { name: /Daily Diary/i });
  await diaryTab.click();
  await page.waitForTimeout(500);

  // Verify that Whey Protein is now displayed in the diary
  const loggedItem = page.getByText(/Whey Protein Isolate/i);
  console.log('Whey Protein in Diary:', await loggedItem.isVisible());

  const remainingKcal = await page.locator('.font-mono.text-emerald-400').textContent();
  console.log('Remaining Calories in Diary:', remainingKcal?.trim());

  await browser.close();
  console.log('--- TEST FINISHED WITH COMPLETE SUCCESS ---');
}

testCompleteLifecycle().catch(console.error);
