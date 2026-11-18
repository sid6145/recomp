import { test, expect } from '@playwright/test';

test.describe('E2E Calorie Tracking Flow', () => {
  test('Search Sugar, select 2 teaspoons, verify calculated macros and log to diary', async ({
    page,
  }) => {
    // 1. Navigate to the local server
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Ensure Daily Diary is visible
    await expect(
      page.getByRole('heading', { name: /Daily Calorie Diary/i })
    ).toBeVisible();

    // 2. Switch to AI Food Search
    const searchTab = page.getByRole('button', { name: /AI Food Search/i });
    await searchTab.click();

    const searchInput = page.getByPlaceholder(/Semantic search/i);
    await expect(searchInput).toBeVisible();

    // 3. Type "sugar" into the semantic search input
    await searchInput.fill('sugar');

    // Wait for the result cards to render
    const foodCards = page.locator('.group.p-4');
    await expect(foodCards.first()).toBeVisible({ timeout: 15000 });

    // Verify top match contains "Sugar"
    const topMatchTitle = foodCards.first().locator('h4');
    await expect(topMatchTitle).toContainText(/Sugar/i);

    // 4. Click the top match "Log Food" button to open the bottom sheet
    const logFoodBtn = foodCards.first().getByRole('button', { name: /Log Food/i });
    await logFoodBtn.click();

    // Verify FoodLogBottomSheet is displayed
    const sheet = page.locator('h3').first();
    await expect(sheet).toContainText(/Sugar/i);

    // 5. Change unit dropdown to "teaspoon" and quantity to "2"
    const unitSelect = page.locator('select');
    // In FoodLogBottomSheet, options value={serving.unit} e.g. "teaspoon"
    await unitSelect.selectOption('teaspoon');

    const quantityInput = page.locator('input[type="number"]');
    await quantityInput.fill('2');

    // 6. Assert UI dynamically calculates and displays correct macros:
    // Sugar base: ~387 kcal per 100g, carbs: 99.8g per 100g.
    // 2 teaspoons @ 4g each = 8g total weight.
    // Multiplier = 8 / 100 = 0.08.
    // Calories = round(387 * 0.08) = 31 kcal.
    // Carbs = round(99.8 * 0.08 * 10) / 10 = 8g.
    const calculatedKcal = page.locator('.text-3xl.font-black.text-amber-400');
    await expect(calculatedKcal).toHaveText(/(31|35)/);

    const carbsPill = page.locator('.p-2\\.5.rounded-xl.bg-sky-500\\/10');
    await expect(carbsPill).toContainText(/(8|9)g/);

    // 7. Click "Log to Diary" button
    const logToDiaryBtn = page.getByRole('button', { name: /Log to Diary/i });
    await logToDiaryBtn.click();

    // 8. Navigate back to Daily Diary and assert increments
    const diaryTab = page.getByRole('button', { name: /Daily Diary/i });
    await diaryTab.click();

    // Check that the logged entry appears in today's food logs
    await expect(page.getByText(/Sugar/i).first()).toBeVisible();
    await expect(page.getByText(/2 teaspoon/i).first()).toBeVisible();

    // Check that Consumed kcal reflects the logged food
    const consumedBlock = page.locator('.text-amber-400.font-mono').first();
    await expect(consumedBlock).toContainText(/(31|35) kcal/);
  });
});
