import { db, type FoodItem, type ConsumptionLog } from './db';
import {
  type CravingFoodInput,
  type MealItem,
  type CravingAdjustmentResult,
  DEFAULT_HABITUAL_DINNER,
  detectPendingMealContext,
  optimizeMealForCraving,
} from '../utils/cravingOptimizer';

/**
 * Persists a manually entered craving food item into Dexie's customFoods table.
 * Normalizes values so the item can be searched via text/semantic search in future sessions.
 */
export async function ingestManualCravingFood(craving: CravingFoodInput): Promise<FoodItem> {
  const servingWeight = craving.servingWeightInGrams || 100;
  const multiplier = servingWeight > 0 ? 100 / servingWeight : 1;

  const baseMacrosPer100g = {
    calories: Math.round(craving.calories * multiplier),
    protein: Math.round(craving.protein * multiplier * 10) / 10,
    carbs: Math.round(craving.carbs * multiplier * 10) / 10,
    fats: Math.round(craving.fats * multiplier * 10) / 10,
  };

  const unit = craving.servingUnit || 'portion';
  const foodItem: FoodItem = {
    id: craving.foodId || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: craving.name.trim(),
    category: 'Cravings & Desserts',
    baseMacrosPer100g,
    servings: [
      {
        unit,
        weightInGrams: servingWeight,
      },
      {
        unit: '100g',
        weightInGrams: 100,
      },
    ],
    calories: craving.calories,
    protein: craving.protein,
    carbs: craving.carbs,
    fats: craving.fats,
    servingSize: `1 ${unit} (${servingWeight}g)`,
  };

  await db.customFoods.put(foodItem);
  console.log(`[CravingManager] Successfully ingested manual food into db.customFoods: ${foodItem.name}`);
  return foodItem;
}

/**
 * Extracts the user's habitual pending meal pattern based on the time of day
 * (e.g. Lunch if morning, Dinner if afternoon/evening) from the past 7 days of logs.
 */
export async function fetchPastWeekPendingMealPattern(
  referenceDate: Date = new Date()
): Promise<{ items: MealItem[]; pendingMealName: string }> {
  const context = detectPendingMealContext(referenceDate);

  try {
    const sevenDaysAgo = new Date(referenceDate);
    sevenDaysAgo.setDate(referenceDate.getDate() - 7);
    const minDateStr = sevenDaysAgo.toISOString().split('T')[0];
    const maxDateStr = referenceDate.toISOString().split('T')[0];

    const logs = await db.logs
      .where('date')
      .between(minDateStr, maxDateStr, true, true)
      .toArray();

    if (!logs || logs.length === 0) {
      return { items: context.defaultTemplate, pendingMealName: context.displayName };
    }

    // Filter logs matching the target meal's time of day window
    const slotLogs = logs.filter((log) => {
      const date = new Date(log.timestamp || `${log.date}T12:00:00`);
      const hour = date.getHours();
      return hour >= context.windowStartHour && hour <= context.windowEndHour;
    });

    if (slotLogs.length === 0) {
      // Fallback: Check if there are any logs on the most recent day
      const latestDate = logs.reduce((latest, l) => (l.date > latest ? l.date : latest), logs[0].date);
      const latestDayLogs = logs.filter((l) => l.date === latestDate);
      if (latestDayLogs.length > 0) {
        return {
          items: convertLogsToMealItems(latestDayLogs),
          pendingMealName: context.displayName,
        };
      }
      return { items: context.defaultTemplate, pendingMealName: context.displayName };
    }

    // Group logs by foodId to aggregate habitual meal items
    const foodMap = new Map<string, { count: number; totalQty: number; latestLog: ConsumptionLog }>();
    for (const log of slotLogs) {
      const existing = foodMap.get(log.foodId);
      if (!existing) {
        foodMap.set(log.foodId, { count: 1, totalQty: log.quantity, latestLog: log });
      } else {
        existing.count += 1;
        existing.totalQty += log.quantity;
      }
    }

    // Average the quantities and construct MealItem array
    const mealItems: MealItem[] = [];
    for (const [foodId, data] of foodMap.entries()) {
      const avgQty = Math.max(1, Math.round(data.totalQty / data.count));
      const log = data.latestLog;
      const unitCals = log.quantity > 0 ? Math.round(log.totalCalories / log.quantity) : log.totalCalories;
      const unitP = log.quantity > 0 ? Math.round(((log.calculatedMacros?.protein || 0) / log.quantity) * 10) / 10 : (log.calculatedMacros?.protein || 0);
      const unitC = log.quantity > 0 ? Math.round(((log.calculatedMacros?.carbs || 0) / log.quantity) * 10) / 10 : (log.calculatedMacros?.carbs || 0);
      const unitF = log.quantity > 0 ? Math.round(((log.calculatedMacros?.fats || 0) / log.quantity) * 10) / 10 : (log.calculatedMacros?.fats || 0);

      // Determine if item is a protein anchor
      const isProteinAnchor = (unitP / (unitC + 1.2 * unitF + 0.1)) > 0.3 || log.foodName.toLowerCase().includes('paneer') || log.foodName.toLowerCase().includes('chicken') || log.foodName.toLowerCase().includes('egg') || log.foodName.toLowerCase().includes('tofu') || log.foodName.toLowerCase().includes('dal');

      const originalCalories = unitCals * avgQty;
      const originalMacros = {
        calories: originalCalories,
        protein: Math.round(unitP * avgQty * 10) / 10,
        carbs: Math.round(unitC * avgQty * 10) / 10,
        fats: Math.round(unitF * avgQty * 10) / 10,
      };

      mealItems.push({
        foodId,
        foodName: log.foodName,
        unit: log.selectedUnit || 'serving',
        servingWeightInGrams: 100,
        originalQuantity: avgQty,
        adjustedQuantity: avgQty,
        caloriesPerUnit: unitCals,
        proteinPerUnit: unitP,
        carbsPerUnit: unitC,
        fatsPerUnit: unitF,
        originalCalories,
        adjustedCalories: originalCalories,
        originalMacros,
        adjustedMacros: { ...originalMacros },
        status: 'kept',
        changeNote: 'Kept',
        isProteinAnchor,
      });
    }

    return {
      items: mealItems.length > 0 ? mealItems : context.defaultTemplate,
      pendingMealName: context.displayName,
    };
  } catch (error) {
    console.error('[CravingManager] Error analyzing past pending meal pattern:', error);
    return { items: context.defaultTemplate, pendingMealName: context.displayName };
  }
}

/**
 * Backward compatibility wrapper for dinner pattern queries.
 */
export async function fetchPastWeekDinnerPattern(referenceDate: Date = new Date()): Promise<MealItem[]> {
  const result = await fetchPastWeekPendingMealPattern(referenceDate);
  return result.items.length > 0 ? result.items : DEFAULT_HABITUAL_DINNER;
}

function convertLogsToMealItems(logs: ConsumptionLog[]): MealItem[] {
  return logs.map((log) => {
    const qty = Math.max(1, log.quantity || 1);
    const unitCals = Math.round(log.totalCalories / qty);
    const unitP = Math.round(((log.calculatedMacros?.protein || 0) / qty) * 10) / 10;
    const unitC = Math.round(((log.calculatedMacros?.carbs || 0) / qty) * 10) / 10;
    const unitF = Math.round(((log.calculatedMacros?.fats || 0) / qty) * 10) / 10;

    const isProteinAnchor = (unitP / (unitC + 1.2 * unitF + 0.1)) > 0.3;

    return {
      foodId: log.foodId,
      foodName: log.foodName,
      unit: log.selectedUnit || 'serving',
      servingWeightInGrams: 100,
      originalQuantity: qty,
      adjustedQuantity: qty,
      caloriesPerUnit: unitCals,
      proteinPerUnit: unitP,
      carbsPerUnit: unitC,
      fatsPerUnit: unitF,
      originalCalories: log.totalCalories,
      adjustedCalories: log.totalCalories,
      originalMacros: log.calculatedMacros || { calories: log.totalCalories, protein: 0, carbs: 0, fats: 0 },
      adjustedMacros: log.calculatedMacros || { calories: log.totalCalories, protein: 0, carbs: 0, fats: 0 },
      status: 'kept',
      changeNote: 'Kept',
      isProteinAnchor,
    };
  });
}

/**
 * End-to-end deterministic recalculation and meal adjustment workflow across any time of day.
 */
export async function calculateCravingRebalance(
  craving: CravingFoodInput,
  currentRemainingCalories: number,
  saveToDbIfManual: boolean = true,
  referenceDate: Date = new Date()
): Promise<CravingAdjustmentResult> {
  // 1. Ingest manual food if requested
  if (saveToDbIfManual && !craving.foodId) {
    const saved = await ingestManualCravingFood(craving);
    craving.foodId = String(saved.id);
  }

  // 2. Compute pending calorie budget after craving is satisfied (min 0)
  const pendingMealBudget = Math.max(0, currentRemainingCalories - craving.calories);

  // 3. Dynamically retrieve past 7-day pattern for the upcoming meal (Lunch, Dinner, etc.)
  const { items: baselineItems, pendingMealName } = await fetchPastWeekPendingMealPattern(referenceDate);

  // 4. Run deterministic macro-aware optimization
  return optimizeMealForCraving(
    baselineItems,
    pendingMealBudget,
    craving,
    pendingMealName,
    currentRemainingCalories
  );
}
