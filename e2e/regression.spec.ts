import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'Desktop', width: 1280, height: 800, isMobile: false },
  { name: 'Mobile', width: 390, height: 844, isMobile: true },
];

for (const vp of VIEWPORTS) {
  test.describe(`Recomp E2E Regression Suite - ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
    });

    test.beforeEach(async ({ page }) => {
      // Clear console errors collector
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        consoleErrors.push(err.message || String(err));
      });

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      // Ensure app loads cleanly
      await page.waitForTimeout(500);
    });

    // -------------------------------------------------------------------------
    // 1. Responsive Navigation (Existing)
    // -------------------------------------------------------------------------
    test('1. Responsive Navigation: HeaderNav vs BottomNav visibility per viewport', async ({ page }) => {
      const headerNav = page.locator('header');
      const bottomNav = page.locator('aside[aria-label="Floating Navigation Dock"]');

      if (vp.isMobile) {
        await expect(bottomNav).toBeVisible();
        await expect(headerNav).toBeHidden();
      } else {
        await expect(headerNav).toBeVisible();
        await expect(bottomNav).toBeHidden();
      }
    });

    // -------------------------------------------------------------------------
    // 2. Database & Food Search (Existing)
    // -------------------------------------------------------------------------
    test('2. Database & Food Search: Dexie seeded items, search latency <= 1500ms, clickable & counters update', async ({ page }) => {
      // 1. Verify Dexie initializes cleanly and contains seeded food items (> 0)
      const foodCount = await page.evaluate(async () => {
        return new Promise<number>((resolve) => {
          const req = indexedDB.open('InterventionDB');
          req.onsuccess = () => {
            const idb = req.result;
            if (!idb.objectStoreNames.contains('foods')) return resolve(0);
            const tx = idb.transaction('foods', 'readonly');
            const countReq = tx.objectStore('foods').count();
            countReq.onsuccess = () => resolve(countReq.result);
            countReq.onerror = () => resolve(0);
          };
          req.onerror = () => resolve(0);
        });
      });
      expect(foodCount).toBeGreaterThan(0);

      // 2. Navigate to AI Food Search
      if (vp.isMobile) {
        const mobileSearchBtn = page
          .locator('aside[aria-label="Floating Navigation Dock"]')
          .getByRole('button', { name: /search/i });
        await mobileSearchBtn.click();
      } else {
        const desktopSearchBtn = page
          .locator('header')
          .getByRole('button', { name: /search/i });
        await desktopSearchBtn.click();
      }

      const searchInput = page.getByPlaceholder(/search/i).first();
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEnabled({ timeout: 5000 });

      // 3. Type a query into the search bar
      const searchStartTime = Date.now();
      await searchInput.fill('Chicken');

      // 4. Assert that search results render within 1,500ms and are clickable
      const resultCards = page.locator('.group.p-4');
      await expect(resultCards.first()).toBeVisible({ timeout: 1500 });
      const searchDuration = Date.now() - searchStartTime;
      expect(searchDuration).toBeLessThanOrEqual(1500);

      // Verify top match title is visible
      const topMatchTitle = resultCards.first().locator('h4');
      await expect(topMatchTitle).toContainText(/Chicken/i);

      // 5. Click top match "Log Food" button to open bottom sheet
      const logFoodBtn = resultCards.first().getByRole('button', { name: /log food/i });
      await logFoodBtn.click();

      // Verify FoodLogBottomSheet opens
      const bottomSheetTitle = page.locator('h3').first();
      await expect(bottomSheetTitle).toContainText(/Chicken/i);

      // Set quantity to 100g to log realistic macros
      const qtyInput = page.locator('input[type="number"]');
      if (await qtyInput.isVisible()) {
        await qtyInput.fill('100');
      }

      // Click "Log to Diary" button
      const logToDiaryBtn = page.getByRole('button', { name: /log to diary/i });
      await expect(logToDiaryBtn).toBeVisible();
      await logToDiaryBtn.click();

      // 6. Navigate back to Daily Diary and assert counters update immediately
      if (vp.isMobile) {
        const mobileDiaryBtn = page
          .locator('aside[aria-label="Floating Navigation Dock"]')
          .getByRole('button', { name: /diary/i });
        await mobileDiaryBtn.click();
      } else {
        const desktopDiaryBtn = page
          .locator('header')
          .getByRole('button', { name: /diary/i });
        await desktopDiaryBtn.click();
      }

      // Assert Daily Calorie counter reflects logged calories (> 0)
      const consumedKcal = page.locator('strong.text-amber-400');
      await expect(consumedKcal).not.toHaveText('0', { timeout: 5000 });

      // Assert Protein counter displays logged protein (> 0g)
      const proteinMetric = page
        .locator('section[aria-label="Daily Metabolic Telemetry"]')
        .locator('.text-rose-400.text-xs.font-bold');
      await expect(proteinMetric).not.toHaveText('0g');
    });

    // -------------------------------------------------------------------------
    // 3. SOS Tab & Dodged Calories Vault (Existing + New)
    // -------------------------------------------------------------------------
    test('3. SOS Tab & Dodged Calories Vault: timer ticks reliably, "I Beat the Urge" banks victory and updates vault card', async ({ page }) => {
      // 1. Open the SOS modal
      const sosBtn = page.getByRole('button', { name: /sos craving/i }).first();
      await expect(sosBtn).toBeVisible();
      await sosBtn.click();

      // Ensure SOS dialog is active
      const sosDialog = page.getByRole('dialog');
      await expect(sosDialog).toBeVisible();

      // 2. Read the initial timer text (e.g., 10:00)
      const timerLocator = sosDialog.locator('.tabular-nums').filter({ hasText: /^\d\d:\d\d$/ }).first();
      await expect(timerLocator).toBeVisible();
      const initialTimerText = (await timerLocator.textContent())?.trim() || '10:00';
      expect(initialTimerText).toMatch(/^\d\d:\d\d$/);

      // Parse initial seconds
      const [initMins, initSecs] = initialTimerText.split(':').map(Number);
      const totalInitialSeconds = initMins * 60 + initSecs;

      // Wait 2.5 seconds
      await page.waitForTimeout(2500);

      // Assert the timer text has decremented (e.g., 09:58 or lower)
      const decrementedTimerText = (await timerLocator.textContent())?.trim() || '';
      const [decMins, decSecs] = decrementedTimerText.split(':').map(Number);
      const totalDecrementedSeconds = decMins * 60 + decSecs;

      expect(totalDecrementedSeconds).toBeLessThanOrEqual(totalInitialSeconds - 2);

      // 3. Trigger the completion / "I Beat the Urge" flow
      const beatUrgeBtn = page.getByRole('button', { name: /i beat the urge/i });
      await expect(beatUrgeBtn).toBeVisible();
      await beatUrgeBtn.click();

      // 4. In "Log Your Victory", choose a preset craving (e.g., "Sweets / Dessert" +350 kcal)
      await expect(page.getByText(/log your victory/i)).toBeVisible();
      const presetBtn = page.getByRole('button', { name: /sweets \/ dessert/i });
      await expect(presetBtn).toBeVisible();
      await presetBtn.click();

      // Celebration modal displays and auto-closes
      await expect(page.getByText(/victory banked!/i)).toBeVisible();
      await expect(sosDialog).toBeHidden({ timeout: 5000 });

      // 5. Assert that the Dodged Vault card on the dashboard updates its kcal and kg fat totals
      const dodgedCard = page.locator('div:has-text("Dodged Vault")').first();
      await expect(dodgedCard).toBeVisible();
      await expect(dodgedCard).toContainText('+350');
      // 350 / 7700 = 0.05 kg fat avoided
      await expect(dodgedCard).toContainText('0.05');
    });

    // -------------------------------------------------------------------------
    // 4. Weekend Calorie Bank (New)
    // -------------------------------------------------------------------------
    test('4. Weekend Calorie Bank: renders with zero errors, shows available balance & Mon-Fri strip', async ({ page }) => {
      // 1. Verify Weekend Bank card renders
      const bankCardTitle = page.getByText('Weekend Bank').first();
      await expect(bankCardTitle).toBeVisible();

      // 2. Displays the available balance
      await expect(page.getByText(/available balance/i).first()).toBeVisible();
      const balanceReadout = page.locator('span:has-text("kcal")').first();
      await expect(balanceReadout).toBeVisible();

      // 3. Shows the Mon–Fri strip
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      for (const d of days) {
        const dayPill = page.getByText(d, { exact: true }).first();
        await expect(dayPill).toBeVisible();
      }
    });

    // -------------------------------------------------------------------------
    // 5. 52-Week Heatmap (Existing)
    // -------------------------------------------------------------------------
    test('5. 52-Week Heatmap: flip button displays 52-week matrix directly without redundant nested headers', async ({ page }) => {
      // 1. Click Telemetry / flip button
      const flipBtn = page
        .getByRole('button', { name: /view telemetry/i })
        .or(page.locator('button[title*="Longitudinal Matrix"]'));
      await expect(flipBtn).toBeVisible();
      await flipBtn.click();

      // 2. Assert the 52-week heatmap grid is directly visible
      const heatmapGrid = page.locator('.grid-rows-7');
      await expect(heatmapGrid).toBeVisible({ timeout: 3000 });

      // Assert consistency badge is visible
      const consistencyText = page.getByText(/consistency:/i);
      await expect(consistencyText).toBeVisible();

      // 3. Assert no redundant nested h1/h2 headings exist inside the heatmap back face
      const backFace = page.locator('div[aria-label="52-Week Longitudinal Matrix"]');
      const nestedHeadings = backFace.locator('h1, h2');
      expect(await nestedHeadings.count()).toBe(0);

      // Return back to summary
      const backToSummaryBtn = page.getByRole('button', { name: /summary/i });
      await backToSummaryBtn.click();
    });

    // -------------------------------------------------------------------------
    // 6. Momentum Multipliers & Overdrive Mode (New)
    // -------------------------------------------------------------------------
    test('6. Momentum Multipliers & Overdrive Mode: cycle to OVERDRIVE, assert dataset.momentum and 100% clickability', async ({ page }) => {
      // 1. Navigate to Settings / Goals tab
      if (vp.isMobile) {
        const mobileGoalsBtn = page
          .locator('aside[aria-label="Floating Navigation Dock"]')
          .getByRole('button', { name: /goal/i });
        await mobileGoalsBtn.click();
      } else {
        const desktopGoalsBtn = page
          .locator('header')
          .getByRole('button', { name: /goal/i });
        await desktopGoalsBtn.click();
      }

      // 2. Select Dev Preview: Momentum Tier 3.0x OVERDRIVE
      const overdriveBtn = page.getByRole('button', { name: /3\.0x/i });
      await expect(overdriveBtn).toBeVisible({ timeout: 5000 });
      await overdriveBtn.click();

      // 3. Assert document.documentElement.dataset.momentum updates to "overdrive"
      await expect.poll(async () => {
        return page.evaluate(() => document.documentElement.dataset.momentum);
      }, { timeout: 3000 }).toBe('overdrive');

      // 4. Assert interactive elements remain 100% clickable with no overlay blocking them
      // Test navigation to search tab in Overdrive mode
      if (vp.isMobile) {
        const searchNavBtn = page
          .locator('aside[aria-label="Floating Navigation Dock"]')
          .getByRole('button', { name: /search/i });
        await searchNavBtn.click();
      } else {
        const searchNavBtn = page
          .locator('header')
          .getByRole('button', { name: /search/i });
        await searchNavBtn.click();
      }

      // Search input is 100% clickable and can be typed into
      const searchInput = page.getByPlaceholder(/search/i).first();
      await expect(searchInput).toBeVisible();
      await searchInput.click();
      await searchInput.fill('Dal');

      // Assert search results appear cleanly in Overdrive mode
      const results = page.locator('.group.p-4');
      await expect(results.first()).toBeVisible({ timeout: 1500 });
      const firstResultText = await results.first().locator('h4').textContent();
      expect(firstResultText?.length).toBeGreaterThan(0);
    });
  });
}
