/**
 * Thermodynamic and Metabolic Calculations
 * Mifflin-St Jeor formulation and caloric expenditure equations.
 */

export type Gender = 'M' | 'F';

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 * 
 * Formula:
 * - Men:   (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
 * - Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
 */
export function calculateBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'M' ? base + 5 : base - 161;
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 * Multiplies BMR by the physical activity factor.
 */
export function calculateTDEE(bmr: number, activityLevel: number): number {
  return bmr * activityLevel;
}

/**
 * Calculates daily caloric target given TDEE and targeted weekly weight loss.
 * 
 * Biological premise:
 * - 1 kg of adipose tissue equates to ~7700 kcal.
 * - Daily caloric deficit = (weeklyLossKg * 7700) / 7.
 * 
 * Safety constraint:
 * - Enforces Math.max(calculatedTarget, 1200) to prevent metabolic crash and malnutrition.
 */
export function calculateDailyTarget(tdee: number, weeklyLossKg: number): number {
  const dailyDeficit = (weeklyLossKg * 7700) / 7;
  const calculatedTarget = Math.round(tdee - dailyDeficit);
  return Math.max(calculatedTarget, 1200);
}
