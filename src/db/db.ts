import Dexie, { type EntityTable } from 'dexie';

export interface BaseMacros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ServingOption {
  unit: string;
  weightInGrams: number;
}

export interface FoodItem {
  id?: number | string; // Handle both auto-increment and string IDs
  name: string;
  category?: string;
  baseMacrosPer100g: BaseMacros;
  servings: Array<{ unit: string; weightInGrams: number }>;
  embedding_vector?: Float32Array | number[];
  /** Optional fields for backward compatibility */
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  servingSize?: string;
}

export interface RecipeIngredient {
  foodId: string;
  foodName: string;
  unit: string;
  quantity: number;
  weightInGrams: number;
  calculatedMacros: CalculatedMacros;
}

export interface RecipeItem {
  id?: number;
  name: string;
  ingredients: RecipeIngredient[];
  totalWeightInGrams: number;
  baseMacrosPer100g: BaseMacros;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
  servings: ServingOption[];
  createdAt: number;
  /** Multi-dimensional embedding vector for client-side semantic neural search */
  embedding_vector?: number[];
}

export interface CalculatedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface ConsumptionLog {
  id?: number;
  date: string; // ISO format YYYY-MM-DD
  foodId: string;
  foodName: string;
  selectedUnit: string;
  quantity: number;
  calculatedMacros: CalculatedMacros;
  totalCalories: number;
  timestamp: number;
}

export interface UserProfileRecord {
  id: 1; // Singleton row constraint
  gender: 'M' | 'F';
  age: number;
  heightCm: number;
  weightKg: number;
  activityMultiplier: number;
  weeklyLossKg: number;
  dailyCaloricTarget: number;
  updatedAt?: number;
}

export class InterventionDatabase extends Dexie {
  foods!: EntityTable<FoodItem, 'id'>;
  customFoods!: EntityTable<FoodItem, 'id'>;
  recipes!: EntityTable<RecipeItem, 'id'>;
  logs!: EntityTable<ConsumptionLog, 'id'>;
  profile!: EntityTable<UserProfileRecord, 'id'>;

  constructor() {
    super('InterventionDB');

    // Version 3: Added recipes table for HealthifyMe composite dishes
    this.version(3).stores({
      foods: 'id, name, *embedding_vector',
      recipes: '++id, name, totalWeightInGrams, *embedding_vector',
      logs: '++id, date, foodId, timestamp',
      profile: 'id, gender, age, heightCm, weightKg, activityMultiplier, weeklyLossKg, dailyCaloricTarget',
    });

    // Version 4: Added customFoods table for Open Food Facts & user branded items
    this.version(4).stores({
      foods: 'id, name, *embedding_vector',
      customFoods: 'id, name, *embedding_vector',
      recipes: '++id, name, totalWeightInGrams, *embedding_vector',
      logs: '++id, date, foodId, timestamp',
      profile: 'id, gender, age, heightCm, weightKg, activityMultiplier, weeklyLossKg, dailyCaloricTarget',
    });
  }
}

export const db = new InterventionDatabase();
