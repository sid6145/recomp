import { test, expect } from '@playwright/test';

// iPhone 14 Pro simulated mobile viewport configuration
test.use({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile Viewport (iPhone 14 Pro) UX/UI Audit & Verification', () => {
  test('1. Verify search input is completely removed from floating bottom nav bar', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const bottomDock = page.locator('aside[aria-label="Floating Navigation Dock"]');
    await expect(bottomDock).toBeVisible();

    // Verify search input is GONE from bottom nav
    const bottomNavInput = bottomDock.locator('input');
    await expect(bottomNavInput).toHaveCount(0);

    // Verify exactly 4 tab buttons exist: Diary, AI Search, Recipes, Goals
    const dockButtons = bottomDock.locator('button');
    await expect(dockButtons).toHaveCount(4);

    // Verify touch target dimensions are >= 44x44px
    const count = await dockButtons.count();
    for (let i = 0; i < count; i++) {
      const box = await dockButtons.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('2. Verify AI Food Search input is relocated to the top of FoodSearchDashboard with mobile ergonomics', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Navigate to Search tab via bottom dock
    const bottomDock = page.locator('aside[aria-label="Floating Navigation Dock"]');
    const searchNavBtn = bottomDock.getByRole('button', { name: 'AI Search' });
    await searchNavBtn.click();

    // Verify main search input is at the top of the search view
    const searchInput = page.getByPlaceholder(/Semantic search/i);
    await expect(searchInput).toBeVisible();

    const box = await searchInput.boundingBox();
    expect(box).not.toBeNull();
    // Input is located near the top of the viewport (within upper 350px)
    expect(box!.y).toBeLessThan(350);

    // Verify 16px font size (text-base) to prevent iOS auto-zoom
    const fontSize = await searchInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);

    // Test typing and clear button ("X")
    await searchInput.fill('Paneer');
    const clearBtn = page.getByRole('button', { name: 'Clear search' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
  });

  test('3. Verify Diary scroll trapping: last item is 100% visible above floating bottom nav', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Switch to search and log an item to ensure entries exist
    const bottomDock = page.locator('aside[aria-label="Floating Navigation Dock"]');
    await bottomDock.getByRole('button', { name: 'AI Search' }).click();

    const searchInput = page.getByPlaceholder(/Semantic search/i);
    await searchInput.fill('sugar');

    const foodCards = page.locator('.group.p-4');
    await expect(foodCards.first()).toBeVisible({ timeout: 15000 });
    await foodCards.first().getByRole('button', { name: /Log Food/i }).click();

    // In bottom sheet, click Log to Diary
    const logBtn = page.getByRole('button', { name: /Log to Diary/i });
    await expect(logBtn).toBeVisible();
    await logBtn.click();

    // Wait for sheet to close and return to diary
    await page.waitForTimeout(1000);
    await bottomDock.getByRole('button', { name: 'Diary' }).click();

    // Scroll to the bottom of the page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    // Get bounding box of the last food item in the diary list
    const loggedEntries = page.locator('.space-y-2 .group');
    const lastEntry = loggedEntries.last();
    await expect(lastEntry).toBeVisible();

    const lastEntryBox = await lastEntry.boundingBox();
    const navBox = await bottomDock.boundingBox();

    expect(lastEntryBox).not.toBeNull();
    expect(navBox).not.toBeNull();

    // The bottom of the last entry must be strictly above or equal to the top of the nav dock
    // or when fully scrolled, the last entry is not obscured behind the dock
    expect(lastEntryBox!.y + lastEntryBox!.height).toBeLessThanOrEqual(navBox!.y + 10);
  });

  test('4. Verify FoodLogBottomSheet slides up completely unobstructed by bottom nav bar', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const bottomDock = page.locator('aside[aria-label="Floating Navigation Dock"]');
    await bottomDock.getByRole('button', { name: 'AI Search' }).click();

    const searchInput = page.getByPlaceholder(/Semantic search/i);
    await searchInput.fill('egg');

    const foodCards = page.locator('.group.p-4');
    await expect(foodCards.first()).toBeVisible({ timeout: 15000 });
    await foodCards.first().getByRole('button', { name: /Log Food/i }).click();

    // Verify FoodLogBottomSheet is visible
    const sheetModal = page.locator('div[role="dialog"][aria-modal="true"]');
    await expect(sheetModal).toBeVisible();

    // Verify Bottom Nav bar is hidden by AnimatePresence while bottom sheet is open
    await expect(bottomDock).toBeHidden();

    // Verify "Log to Diary" button inside bottom sheet is completely visible and accessible
    const logToDiaryBtn = page.getByRole('button', { name: /Log to Diary/i });
    await expect(logToDiaryBtn).toBeVisible();

    const logBtnBox = await logToDiaryBtn.boundingBox();
    expect(logBtnBox).not.toBeNull();
    // Button is inside the viewport (y + height <= 852)
    expect(logBtnBox!.y + logBtnBox!.height).toBeLessThanOrEqual(852);
    // Button meets minimum touch target height
    expect(logBtnBox!.height).toBeGreaterThanOrEqual(44);

    // Close the sheet
    const closeBtn = sheetModal.getByRole('button', { name: 'Close' });
    await closeBtn.click();

    // Verify Bottom Nav bar re-appears smoothly after closing
    await expect(bottomDock).toBeVisible({ timeout: 3000 });
  });

  test('5. Verify no horizontal scroll bleed / wobble exists on mobile', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hasHorizontalOverflow = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      const htmlScrollWidth = document.documentElement.scrollWidth;
      return bodyScrollWidth > docWidth || htmlScrollWidth > docWidth;
    });

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('6. Verify vertical scrolling works freely on mobile viewports without traps', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Scroll down on Diary view
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(200);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);

    // Verify root scroll container properties
    const scrollStyles = await page.evaluate(() => {
      const htmlStyle = window.getComputedStyle(document.documentElement);
      const bodyStyle = window.getComputedStyle(document.body);
      return {
        htmlOverflowY: htmlStyle.overflowY,
        bodyOverflowY: bodyStyle.overflowY,
        userSelect: bodyStyle.userSelect,
      };
    });

    expect(scrollStyles.htmlOverflowY).toBe('auto');
    expect(scrollStyles.bodyOverflowY).toBe('visible');
    expect(scrollStyles.userSelect).not.toBe('none');
  });
});
