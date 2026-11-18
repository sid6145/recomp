import { test, expect } from '@playwright/test';

test.describe('E2E Composite Recipe Builder Flow', () => {
  test('Create custom composite recipe, aggregate macros, and save to Dexie', async ({
    page,
  }) => {
    // 1. Navigate to application
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 2. Click Recipe Builder tab
    const recipeTab = page.getByRole('button', { name: /Recipe Builder/i });
    await expect(recipeTab).toBeVisible();
    await recipeTab.click();

    // Verify Recipe Builder view is mounted
    await expect(page.getByText('Composite Recipe Builder')).toBeVisible();

    // 3. Name the custom recipe
    const nameInput = page.getByPlaceholder(/e\.g\. Khichdi with Ghee/i);
    await nameInput.fill('Homemade Dal Rice');

    // 4. Search and add an ingredient
    const ingredientSearch = page.getByPlaceholder(/Search ingredient/i);
    await ingredientSearch.fill('rice');

    // Wait for search dropdown
    const firstOption = page.locator('.p-2\\.5.rounded-xl.hover\\:bg-zinc-800\\/80').first();
    await expect(firstOption).toBeVisible({ timeout: 30000 });
    await firstOption.click();

    // Verify ingredient is in the list
    await expect(page.getByText(/Recipe Ingredients \(1\)/i)).toBeVisible();

    // 5. Check live aggregated macro readout has positive calories
    const totalKcal = page.locator('.text-3xl.sm\\:text-4xl.font-black.text-amber-400');
    await expect(totalKcal).not.toHaveText('0');

    // 6. Click "Save as Custom Dish"
    const saveButton = page.getByRole('button', { name: /Save as Custom Dish/i });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 7. Verify save success feedback
    await expect(page.getByText(/Saved to Custom Dishes/i)).toBeVisible();

    // 8. After timeout, navigates back to Daily Diary
    await expect(
      page.getByRole('heading', { name: /Daily Calorie Diary/i })
    ).toBeVisible({ timeout: 5000 });
  });
});
