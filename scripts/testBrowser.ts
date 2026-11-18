import { chromium } from 'playwright';

async function testDynamicPortions() {
  console.log('--- STARTING COMPREHENSIVE BROWSER TEST ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const errors: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.error('[BROWSER ERROR]:', text);
    } else {
      console.log(`[BROWSER LOG]:`, text);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
    console.error('[PAGE ERROR]:', err.message);
  });

  await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('Page loaded successfully.');

  // 1. Verify Search input is active
  const searchInput = page.getByPlaceholder(/Semantic search/i);
  await searchInput.waitFor({ state: 'visible', timeout: 8000 });

  // 2. Search for "Dal"
  console.log('Searching for "Dal"...');
  await searchInput.fill('Dal');
  await page.waitForTimeout(1000);

  // Click on "Log Food" button on the first result
  const logFoodButtons = page.getByRole('button', { name: /Log Food/i });
  const buttonCount = await logFoodButtons.count();
  console.log(`Found ${buttonCount} "Log Food" buttons.`);

  if (buttonCount > 0) {
    console.log('Opening FoodLogBottomSheet for first item...');
    await logFoodButtons.first().click();
    await page.waitForTimeout(500);

    // 3. Check Bottom Sheet
    const sheetTitle = page.locator('h3').first();
    console.log('Bottom Sheet Food Title:', await sheetTitle.textContent());

    // Check serving select
    const unitSelect = page.locator('select');
    await unitSelect.waitFor({ state: 'visible' });
    const selectedUnitVal = await unitSelect.inputValue();
    console.log('Initial Selected Unit:', selectedUnitVal);

    // Read calculated calories (targeting the large 3xl readout inside modal)
    const kcalReadout = page.locator('.text-3xl.font-black.text-amber-400');
    console.log('Initial Calories for 1 serving:', await kcalReadout.textContent());

    // Change quantity to 2
    console.log('Changing quantity to 2...');
    const quantityInput = page.locator('input[type="number"]');
    await quantityInput.fill('2');
    await page.waitForTimeout(300);
    console.log('Calories for 2 servings (expected ~390 for Dal Makhani):', await kcalReadout.textContent());

    // Change unit to 'bowl (large)'
    console.log('Changing unit to bowl (large)...');
    try {
      await unitSelect.selectOption({ label: /bowl/i });
      await page.waitForTimeout(300);
      console.log('Calories for 2 large bowls (expected ~650 kcal):', await kcalReadout.textContent());
    } catch {
      console.log('Bowl option not available for this item');
    }

    // Click "Log to Diary"
    const logToDiaryBtn = page.getByRole('button', { name: /Log to Diary/i });
    console.log('Clicking "Log to Diary"...');
    await logToDiaryBtn.click();
    await page.waitForTimeout(1000);
  }

  // 4. Test Goal & Target Engine tab
  console.log('Switching to Goal & Target Engine tab...');
  const goalTab = page.getByRole('button', { name: /Goal & Target Engine/i });
  await goalTab.click();
  await page.waitForTimeout(500);

  const goalHeadline = page.getByRole('heading', { name: /Weight Goal Engine/i });
  console.log('Goal Headline visible:', await goalHeadline.isVisible());

  // Check errors
  console.log('--- ERROR AUDIT ---');
  console.log('Total console errors:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }

  await browser.close();
  console.log('--- TEST FINISHED SUCCESSFULLY ---');
}

testDynamicPortions().catch((err) => {
  console.error('Test script failed:', err);
  process.exit(1);
});
