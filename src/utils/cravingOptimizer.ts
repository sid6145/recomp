import type { CalculatedMacros } from '../db/db';

export interface CravingFoodInput {
  foodId?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingUnit?: string;
  servingWeightInGrams?: number;
  quantity?: number;
}

export interface MealItem {
  foodId: string;
  foodName: string;
  unit: string;
  servingWeightInGrams: number;
  originalQuantity: number;
  adjustedQuantity: number;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatsPerUnit: number;
  originalCalories: number;
  adjustedCalories: number;
  originalMacros: CalculatedMacros;
  adjustedMacros: CalculatedMacros;
  status: 'kept' | 'reduced' | 'skipped';
  changeNote: string;
  isProteinAnchor?: boolean;
}

export interface MealSnapshot {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  items: MealItem[];
}

export interface CravingAdjustmentResult {
  craving: CravingFoodInput;
  initialRemainingCalories: number;
  pendingCaloriesAfterCraving: number;
  pendingMealName: string;
  isExceedingDailyBudget: boolean;
  overshootCalories: number;
  baselineMeal: MealSnapshot;
  adjustedMeal: MealSnapshot;
  /** Backward compatibility aliases for existing dinner code & tests */
  baselineDinner: MealSnapshot;
  adjustedDinner: MealSnapshot;
  macroDeltas: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  retainedProteinPercentage: number;
  explanation: string[];
  isWithinBudget: boolean;
}

/**
 * Standard fallback dinner meal when the user has no prior history in IndexedDB.
 * Example baseline: 3 Chapati + 1 Bowl Paneer Curry + 1 Cup Steamed Rice = Exactly 800 kcal, ~32g protein.
 */
export const DEFAULT_HABITUAL_DINNER: MealItem[] = [
  {
    foodId: 'default_chapati',
    foodName: 'Whole Wheat Chapati / Roti',
    unit: 'piece',
    servingWeightInGrams: 35,
    originalQuantity: 3,
    adjustedQuantity: 3,
    caloriesPerUnit: 70,
    proteinPerUnit: 2.6,
    carbsPerUnit: 14.5,
    fatsPerUnit: 0.5,
    originalCalories: 210,
    adjustedCalories: 210,
    originalMacros: { calories: 210, protein: 7.8, carbs: 43.5, fats: 1.5 },
    adjustedMacros: { calories: 210, protein: 7.8, carbs: 43.5, fats: 1.5 },
    status: 'kept',
    changeNote: 'Kept',
    isProteinAnchor: false,
  },
  {
    foodId: 'default_paneer',
    foodName: 'Paneer Gravy / Cottage Cheese',
    unit: 'bowl (150g)',
    servingWeightInGrams: 150,
    originalQuantity: 1,
    adjustedQuantity: 1,
    caloriesPerUnit: 300,
    proteinPerUnit: 20.0,
    carbsPerUnit: 8.0,
    fatsPerUnit: 21.0,
    originalCalories: 300,
    adjustedCalories: 300,
    originalMacros: { calories: 300, protein: 20.0, carbs: 8.0, fats: 21.0 },
    adjustedMacros: { calories: 300, protein: 20.0, carbs: 8.0, fats: 21.0 },
    status: 'kept',
    changeNote: 'Kept (Primary Protein Anchor)',
    isProteinAnchor: true,
  },
  {
    foodId: 'default_rice',
    foodName: 'Steamed White Rice',
    unit: 'cup (180g)',
    servingWeightInGrams: 180,
    originalQuantity: 1,
    adjustedQuantity: 1,
    caloriesPerUnit: 290,
    proteinPerUnit: 4.2,
    carbsPerUnit: 64.0,
    fatsPerUnit: 0.6,
    originalCalories: 290,
    adjustedCalories: 290,
    originalMacros: { calories: 290, protein: 4.2, carbs: 64.0, fats: 0.6 },
    adjustedMacros: { calories: 290, protein: 4.2, carbs: 64.0, fats: 0.6 },
    status: 'kept',
    changeNote: 'Kept',
    isProteinAnchor: false,
  },
];

/**
 * Standard fallback lunch meal when craving occurs in the morning / mid-day.
 * Example baseline: 2 Chapati + 1 Bowl Dal Tadka + 1 Cup Steamed Rice + Salad = 650 kcal, ~24g protein.
 */
export const DEFAULT_HABITUAL_LUNCH: MealItem[] = [
  {
    foodId: 'default_lunch_chapati',
    foodName: 'Whole Wheat Chapati / Roti',
    unit: 'piece',
    servingWeightInGrams: 35,
    originalQuantity: 2,
    adjustedQuantity: 2,
    caloriesPerUnit: 70,
    proteinPerUnit: 2.6,
    carbsPerUnit: 14.5,
    fatsPerUnit: 0.5,
    originalCalories: 140,
    adjustedCalories: 140,
    originalMacros: { calories: 140, protein: 5.2, carbs: 29.0, fats: 1.0 },
    adjustedMacros: { calories: 140, protein: 5.2, carbs: 29.0, fats: 1.0 },
    status: 'kept',
    changeNote: 'Kept',
    isProteinAnchor: false,
  },
  {
    foodId: 'default_lunch_dal',
    foodName: 'Yellow Dal Tadka / Lentils',
    unit: 'bowl (180g)',
    servingWeightInGrams: 180,
    originalQuantity: 1,
    adjustedQuantity: 1,
    caloriesPerUnit: 180,
    proteinPerUnit: 12.0,
    carbsPerUnit: 26.0,
    fatsPerUnit: 3.5,
    originalCalories: 180,
    adjustedCalories: 180,
    originalMacros: { calories: 180, protein: 12.0, carbs: 26.0, fats: 3.5 },
    adjustedMacros: { calories: 180, protein: 12.0, carbs: 26.0, fats: 3.5 },
    status: 'kept',
    changeNote: 'Kept (Primary Protein Anchor)',
    isProteinAnchor: true,
  },
  {
    foodId: 'default_lunch_rice',
    foodName: 'Steamed White Rice',
    unit: 'cup (140g)',
    servingWeightInGrams: 140,
    originalQuantity: 1,
    adjustedQuantity: 1,
    caloriesPerUnit: 200,
    proteinPerUnit: 3.5,
    carbsPerUnit: 44.0,
    fatsPerUnit: 0.5,
    originalCalories: 200,
    adjustedCalories: 200,
    originalMacros: { calories: 200, protein: 3.5, carbs: 44.0, fats: 0.5 },
    adjustedMacros: { calories: 200, protein: 3.5, carbs: 44.0, fats: 0.5 },
    status: 'kept',
    changeNote: 'Kept',
    isProteinAnchor: false,
  },
  {
    foodId: 'default_lunch_salad',
    foodName: 'Mixed Cucumber & Tomato Salad',
    unit: 'bowl (120g)',
    servingWeightInGrams: 120,
    originalQuantity: 1,
    adjustedQuantity: 1,
    caloriesPerUnit: 130,
    proteinPerUnit: 3.0,
    carbsPerUnit: 16.0,
    fatsPerUnit: 6.0,
    originalCalories: 130,
    adjustedCalories: 130,
    originalMacros: { calories: 130, protein: 3.0, carbs: 16.0, fats: 6.0 },
    adjustedMacros: { calories: 130, protein: 3.0, carbs: 16.0, fats: 6.0 },
    status: 'kept',
    changeNote: 'Kept',
    isProteinAnchor: false,
  },
];

/**
 * Standard fallback breakfast meal for late-night / early-morning cravings.
 */
export const DEFAULT_HABITUAL_BREAKFAST: MealItem[] = [
  {
    foodId: 'default_bf_oats',
    foodName: 'Oats with Milk, Nuts & Honey',
    unit: 'bowl (250g)',
    servingWeightInGrams: 250,
    originalQuantity: 1,
    adjustedQuantity: 1,
    caloriesPerUnit: 380,
    proteinPerUnit: 16.0,
    carbsPerUnit: 54.0,
    fatsPerUnit: 11.0,
    originalCalories: 380,
    adjustedCalories: 380,
    originalMacros: { calories: 380, protein: 16.0, carbs: 54.0, fats: 11.0 },
    adjustedMacros: { calories: 380, protein: 16.0, carbs: 54.0, fats: 11.0 },
    status: 'kept',
    changeNote: 'Kept',
    isProteinAnchor: true,
  },
];

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export interface PendingMealContext {
  mealSlot: MealSlot;
  displayName: string;
  windowStartHour: number;
  windowEndHour: number;
  defaultTemplate: MealItem[];
}

/**
 * Dynamically detects the upcoming pending meal based on the time of day.
 * - 04:00 - 11:59 -> Lunch (window: 11:00 - 16:00)
 * - 12:00 - 23:59 -> Dinner (window: 17:00 - 23:59)
 * - 00:00 - 03:59 -> Breakfast (window: 06:00 - 11:00)
 */
export function detectPendingMealContext(currentDate: Date = new Date()): PendingMealContext {
  const hour = currentDate.getHours();

  if (hour >= 4 && hour < 12) {
    return {
      mealSlot: 'lunch',
      displayName: 'Lunch',
      windowStartHour: 11,
      windowEndHour: 16,
      defaultTemplate: DEFAULT_HABITUAL_LUNCH,
    };
  }

  if (hour >= 12 && hour < 24) {
    return {
      mealSlot: 'dinner',
      displayName: 'Dinner',
      windowStartHour: 17,
      windowEndHour: 24,
      defaultTemplate: DEFAULT_HABITUAL_DINNER,
    };
  }

  return {
    mealSlot: 'breakfast',
    displayName: 'Breakfast',
    windowStartHour: 6,
    windowEndHour: 11,
    defaultTemplate: DEFAULT_HABITUAL_BREAKFAST,
  };
}

/**
 * Calculates nutrient density ratio to prioritize items for reduction or retention.
 * R = Protein / (Carbs + 1.2 * Fats + 0.1)
 * Higher R = Rich protein source (e.g. paneer, chicken, dal) -> Preserve!
 * Lower R = Carb/fat dense filler (e.g. white rice, sugary sauces) -> Reduce/Skip first!
 */
export function calculateNutrientDensityRatio(item: MealItem): number {
  const p = Math.max(0, item.proteinPerUnit);
  const c = Math.max(0, item.carbsPerUnit);
  const f = Math.max(0, item.fatsPerUnit);
  return p / (c + 1.2 * f + 0.1);
}

/**
 * Deterministic multi-objective optimization for meal rebalancing.
 * Works for any pending meal (Lunch, Dinner, Breakfast) at any hour of the day.
 */
export function optimizeMealForCraving(
  baselineItems: MealItem[],
  targetMealBudget: number,
  craving: CravingFoodInput,
  pendingMealName: string = 'Dinner',
  currentRemainingBudget?: number
): CravingAdjustmentResult {
  const deepClonedItems: MealItem[] = baselineItems.map((item) => {
    const origCal = item.caloriesPerUnit * item.originalQuantity;
    const origP = roundTo1Dec(item.proteinPerUnit * item.originalQuantity);
    const origC = roundTo1Dec(item.carbsPerUnit * item.originalQuantity);
    const origF = roundTo1Dec(item.fatsPerUnit * item.originalQuantity);

    return {
      ...item,
      adjustedQuantity: item.originalQuantity,
      originalCalories: origCal,
      adjustedCalories: origCal,
      originalMacros: { calories: origCal, protein: origP, carbs: origC, fats: origF },
      adjustedMacros: { calories: origCal, protein: origP, carbs: origC, fats: origF },
      status: 'kept',
      changeNote: 'Kept',
    };
  });

  const baselineCalories = deepClonedItems.reduce((acc, i) => acc + i.originalCalories, 0);
  const baselineProtein = roundTo1Dec(deepClonedItems.reduce((acc, i) => acc + i.originalMacros.protein, 0));
  const baselineCarbs = roundTo1Dec(deepClonedItems.reduce((acc, i) => acc + i.originalMacros.carbs, 0));
  const baselineFats = roundTo1Dec(deepClonedItems.reduce((acc, i) => acc + i.originalMacros.fats, 0));

  const explanation: string[] = [];
  const initialRemaining = currentRemainingBudget !== undefined
    ? currentRemainingBudget
    : targetMealBudget + craving.calories;
  const isExceedingDailyBudget = craving.calories > initialRemaining;
  const overshootCalories = Math.max(0, craving.calories - initialRemaining);

  // If the craving alone exceeds the entire remaining daily calorie budget
  if (isExceedingDailyBudget) {
    explanation.push(
      `⚠️ Craving exceeds your remaining daily budget by ${overshootCalories} kcal (${craving.calories} kcal craving vs ${initialRemaining} kcal remaining). Suggesting SOS Craving pause to evaluate urge.`
    );
  }

  // If target budget is higher or equal to baseline meal, no reduction required
  if (targetMealBudget >= baselineCalories) {
    explanation.push(
      `Your remaining calorie budget of ${targetMealBudget} kcal comfortably accommodates your typical ${pendingMealName.toLowerCase()} (${baselineCalories} kcal) alongside the ${craving.name} (${craving.calories} kcal).`
    );

    const snapshot: MealSnapshot = {
      calories: baselineCalories,
      protein: baselineProtein,
      carbs: baselineCarbs,
      fats: baselineFats,
      items: deepClonedItems,
    };

    return {
      craving,
      initialRemainingCalories: initialRemaining,
      pendingCaloriesAfterCraving: targetMealBudget,
      pendingMealName,
      isExceedingDailyBudget,
      overshootCalories,
      baselineMeal: snapshot,
      adjustedMeal: snapshot,
      baselineDinner: snapshot,
      adjustedDinner: snapshot,
      macroDeltas: { calories: 0, protein: 0, carbs: 0, fats: 0 },
      retainedProteinPercentage: 100,
      explanation,
      isWithinBudget: true,
    };
  }

  // Deficit to eliminate from pending meal
  const requiredDeficit = baselineCalories - targetMealBudget;
  explanation.push(
    `Craving fulfilled: ${craving.name} consumed ${craving.calories} kcal. Pending ${pendingMealName.toLowerCase()} budget adjusted from ${baselineCalories} kcal to ${targetMealBudget} kcal (-${requiredDeficit} kcal).`
  );

  // Score and rank items by nutrient density ratio ascending (lowest protein density candidate for cut)
  const rankedItems = [...deepClonedItems].sort((a, b) => {
    if (a.isProteinAnchor && !b.isProteinAnchor) return 1;
    if (!a.isProteinAnchor && b.isProteinAnchor) return -1;
    return calculateNutrientDensityRatio(a) - calculateNutrientDensityRatio(b);
  });

  let currentTotalCal = baselineCalories;
  const tolerance = 25; // acceptable calorie cushion

  // Discrete reduction passes:
  // Pass 1: Try skipping single-portion carb filler items with low protein density (e.g. rice, naan, desserts)
  for (const item of rankedItems) {
    if (currentTotalCal <= targetMealBudget + tolerance) break;
    if (item.isProteinAnchor || item.originalQuantity > 1) continue;

    const calSaving = item.adjustedCalories;
    if (calSaving <= 0) continue;

    item.adjustedQuantity = 0;
    item.adjustedCalories = 0;
    item.adjustedMacros = { calories: 0, protein: 0, carbs: 0, fats: 0 };
    item.status = 'skipped';
    item.changeNote = `Skipped completely (-${calSaving} kcal, preserved protein dishes)`;
    currentTotalCal -= calSaving;

    explanation.push(
      `Skipped ${item.foodName} (-${calSaving} kcal, -${item.originalMacros.carbs}g carbs) to offset craving carbs.`
    );
  }

  // Pass 2: If still above budget, reduce multi-unit staple items (e.g. rotis from 3 to 2 or 1)
  if (currentTotalCal > targetMealBudget + tolerance) {
    for (const item of rankedItems) {
      if (currentTotalCal <= targetMealBudget + tolerance) break;
      if (item.isProteinAnchor || item.status === 'skipped') continue;

      while (item.adjustedQuantity > 1 && currentTotalCal > targetMealBudget + tolerance) {
        item.adjustedQuantity -= 1;
        const newCal = item.caloriesPerUnit * item.adjustedQuantity;
        const saved = item.adjustedCalories - newCal;
        item.adjustedCalories = newCal;
        item.adjustedMacros = {
          calories: newCal,
          protein: roundTo1Dec(item.proteinPerUnit * item.adjustedQuantity),
          carbs: roundTo1Dec(item.carbsPerUnit * item.adjustedQuantity),
          fats: roundTo1Dec(item.fatsPerUnit * item.adjustedQuantity),
        };
        item.status = 'reduced';
        item.changeNote = `Reduced portion to ${item.adjustedQuantity} ${item.unit} (-${saved} kcal)`;
        currentTotalCal -= saved;
        explanation.push(
          `Reduced ${item.foodName} to ${item.adjustedQuantity} ${item.unit} (-${saved} kcal).`
        );
      }
    }
  }

  // Pass 3: If still over budget, proportionally reduce protein anchor as a last resort
  if (currentTotalCal > targetMealBudget + tolerance) {
    for (const item of rankedItems) {
      if (currentTotalCal <= targetMealBudget + tolerance) break;
      if (item.isProteinAnchor && item.adjustedQuantity > 0.5) {
        const newQty = roundTo1Dec(item.adjustedQuantity * 0.75);
        const newCal = Math.round(item.caloriesPerUnit * newQty);
        const saved = item.adjustedCalories - newCal;
        item.adjustedQuantity = newQty;
        item.adjustedCalories = newCal;
        item.adjustedMacros = {
          calories: newCal,
          protein: roundTo1Dec(item.proteinPerUnit * newQty),
          carbs: roundTo1Dec(item.carbsPerUnit * newQty),
          fats: roundTo1Dec(item.fatsPerUnit * newQty),
        };
        item.status = 'reduced';
        item.changeNote = `Portion reduced to ${newQty} ${item.unit} (-${saved} kcal) as last resort`;
        currentTotalCal -= saved;
        explanation.push(
          `Portion-controlled ${item.foodName} to ${newQty} ${item.unit} (-${saved} kcal) to meet strict ceiling.`
        );
      }
    }
  }

  // Compute final totals
  const finalCalories = deepClonedItems.reduce((acc, i) => acc + i.adjustedCalories, 0);
  const finalProtein = roundTo1Dec(deepClonedItems.reduce((acc, i) => acc + i.adjustedMacros.protein, 0));
  const finalCarbs = roundTo1Dec(deepClonedItems.reduce((acc, i) => acc + i.adjustedMacros.carbs, 0));
  const finalFats = roundTo1Dec(deepClonedItems.reduce((acc, i) => acc + i.adjustedMacros.fats, 0));

  const retainedProteinPercentage = baselineProtein > 0 ? Math.round((finalProtein / baselineProtein) * 100) : 100;

  explanation.push(
    `Retained ${retainedProteinPercentage}% of ${pendingMealName.toLowerCase()} protein (${finalProtein}g of ${baselineProtein}g) while cutting ${baselineCalories - finalCalories} kcal.`
  );

  const baselineSnapshot: MealSnapshot = {
    calories: baselineCalories,
    protein: baselineProtein,
    carbs: baselineCarbs,
    fats: baselineFats,
    items: deepClonedItems.map((item) => ({
      ...item,
      status: 'kept',
    })),
  };

  const adjustedSnapshot: MealSnapshot = {
    calories: finalCalories,
    protein: finalProtein,
    carbs: finalCarbs,
    fats: finalFats,
    items: deepClonedItems,
  };

  return {
    craving,
    initialRemainingCalories: initialRemaining,
    pendingCaloriesAfterCraving: targetMealBudget,
    pendingMealName,
    isExceedingDailyBudget,
    overshootCalories,
    baselineMeal: baselineSnapshot,
    adjustedMeal: adjustedSnapshot,
    baselineDinner: baselineSnapshot,
    adjustedDinner: adjustedSnapshot,
    macroDeltas: {
      calories: finalCalories - baselineCalories,
      protein: roundTo1Dec(finalProtein - baselineProtein),
      carbs: roundTo1Dec(finalCarbs - baselineCarbs),
      fats: roundTo1Dec(finalFats - baselineFats),
    },
    retainedProteinPercentage,
    explanation,
    isWithinBudget: finalCalories <= targetMealBudget + 25,
  };
}

function roundTo1Dec(val: number): number {
  return Math.round(val * 10) / 10;
}
