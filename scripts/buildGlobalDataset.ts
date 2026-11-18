import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import csv from 'csv-parser';

const require = createRequire(import.meta.url);

// ============================================================================
// 1. Strict TypeScript Interfaces for Raw Schemas & Normalized Entities
// ============================================================================

/**
 * Raw entry structure from the ifct2017 npm package compositions corpus.
 */
export interface RawIFCTComposition {
  code: string;
  name: string;
  grup?: string;
  enerc?: number; // Energy in kJ
  protcnt?: number; // Protein in g
  choavldf?: number; // Available Carbohydrate in g
  fatce?: number; // Crude Fat in g
  fibtg?: number; // Total Dietary Fibre in g
}

/**
 * Raw CSV row structure from the Indian Nutrient Databank (INDB) / Kaggle cooked foods dataset.
 */
export interface RawINDBCsvRow {
  'Dish Name'?: string;
  'dish_name'?: string;
  'name'?: string;
  'Dish'?: string;
  'Food Item'?: string;
  'Calories'?: string | number;
  'Energy'?: string | number;
  'energy_kcal'?: string | number;
  'Protein'?: string | number;
  'protein'?: string | number;
  'Protein (g)'?: string | number;
  'Fats'?: string | number;
  'Fat'?: string | number;
  'fats'?: string | number;
  'Total Fat'?: string | number;
  'Carbs'?: string | number;
  'Carbohydrates'?: string | number;
  'Carbs per 100g'?: string | number;
  'carbs'?: string | number;
  'Carbohydrate (g)'?: string | number;
  [key: string]: any;
}

/**
 * USDA FoodData Central raw nutrient item.
 */
export interface RawUSDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber?: string;
  unitName?: string;
  value: number;
}

/**
 * USDA FoodData Central raw food item from Foundation Foods / SR Legacy.
 */
export interface RawUSDAFood {
  fdcId: number;
  description: string;
  dataType?: string;
  foodNutrients: RawUSDANutrient[];
  publicationDate?: string;
  ndbNumber?: string;
  foodCode?: string;
}

/**
 * USDA FoodData Central API search response envelope.
 */
export interface RawUSDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: RawUSDAFood[];
}

/**
 * Standard dynamic serving measurement option.
 */
export interface ServingOption {
  unit: string;
  weightInGrams: number;
}

/**
 * Normalized 4-macro profile standardized per 100 grams.
 */
export interface BaseMacros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

/**
 * Strict unified schema stored in Dexie and consumed by the offline PWA.
 */
export interface GlobalFoodItem {
  id: string;
  name: string;
  origin: 'IFCT' | 'INDB' | 'USDA';
  baseMacrosPer100g: BaseMacros;
  servings: ServingOption[];
  // Direct top-level fields for fast indexing and backwards compatibility
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize?: string;
}

export interface ETLSummary {
  ifctCount: number;
  indbCount: number;
  usdaCount: number;
  totalRaw: number;
  totalNormalized: number;
  deduplicatedCount: number;
  outputFileSizeMB: number;
}

// ============================================================================
// 2. The Smart Unit Generator (Text-Analysis Culinary Serving Engine)
// ============================================================================

/**
 * Dynamic serving size generator based on granular lexical analysis of the food name.
 * Adheres strictly to the physical density and culinary units specification:
 * - Sugars / Salts / Spices / Powders / Oils: teaspoon (4.5g), tablespoon (15g)
 * - Cereals / Dals / Curries / Soups: katori (150g), bowl (250g)
 * - Breads / Rotis / Eggs / Apples: piece (50g)
 * - Liquids (milk, juices, beverages): ml (1g), cup (240g)
 * - Mandatory universal units: gram (1g) and 100g (100g)
 */
export function generateSmartUnits(foodName: string): ServingOption[] {
  const servings: ServingOption[] = [
    { unit: 'gram', weightInGrams: 1 },
    { unit: '100g', weightInGrams: 100 },
  ];

  const lower = foodName.toLowerCase();

  // 1. Sugars, salts, spices, powders, oils
  const isPantryStaple =
    lower.includes('sugar') ||
    lower.includes('salt') ||
    lower.includes('spice') ||
    lower.includes('powder') ||
    lower.includes('oil') ||
    lower.includes('ghee') ||
    lower.includes('masala') ||
    lower.includes('pepper') ||
    lower.includes('jaggery');

  if (isPantryStaple) {
    servings.push({ unit: 'teaspoon', weightInGrams: 4.5 });
    servings.push({ unit: 'tablespoon', weightInGrams: 15 });
  }

  // 2. Cereals, dals, curries, soups
  const isCerealOrCurry =
    lower.includes('rice') ||
    lower.includes('dal') ||
    lower.includes('curry') ||
    lower.includes('soup') ||
    lower.includes('khichdi') ||
    lower.includes('sambar') ||
    lower.includes('rasam') ||
    lower.includes('korma') ||
    lower.includes('biryani') ||
    lower.includes('pulao');

  if (isCerealOrCurry) {
    servings.push({ unit: 'katori', weightInGrams: 150 });
    servings.push({ unit: 'bowl', weightInGrams: 250 });
  }

  // 3. Breads, rotis, eggs, apples & single-serve produce
  const isSinglePiece =
    lower.includes('bread') ||
    lower.includes('roti') ||
    lower.includes('chapati') ||
    lower.includes('naan') ||
    lower.includes('paratha') ||
    lower.includes('egg') ||
    lower.includes('apple') ||
    lower.includes('banana') ||
    lower.includes('orange') ||
    lower.includes('idli') ||
    lower.includes('vada') ||
    lower.includes('samosa');

  if (isSinglePiece) {
    servings.push({ unit: 'piece', weightInGrams: 50 });
  }

  // 4. Liquids / Beverages
  const isBeverage =
    lower.includes('milk') ||
    /\btea\b/i.test(lower) ||
    lower.includes('coffee') ||
    lower.includes('juice') ||
    lower.includes('lassi') ||
    /\bwater\b/i.test(lower);

  if (isBeverage && !lower.includes('watermelon') && !lower.includes('water melon')) {
    servings.push({ unit: 'ml', weightInGrams: 1 });
    servings.push({ unit: 'cup', weightInGrams: 240 });
  }

  // Deduplicate units preserving priority
  const seenUnits = new Set<string>();
  const uniqueServings: ServingOption[] = [];
  for (const s of servings) {
    if (!seenUnits.has(s.unit)) {
      seenUnits.add(s.unit);
      uniqueServings.push(s);
    }
  }

  return uniqueServings;
}

// ============================================================================
// 3. Phase 1: Ingestion Pipelines (IFCT, INDB CSV, USDA API)
// ============================================================================

/**
 * Ingests base Indian raw ingredients from the ifct2017 npm package.
 */
export async function fetchIFCTFoods(): Promise<RawIFCTComposition[]> {
  console.log('[ETL: IFCT] Loading Indian Food Composition Tables (IFCT 2017)...');
  try {
    const ifct = require('ifct2017');
    await ifct.compositions.load();
    const rows = ifct.compositions('%') as RawIFCTComposition[];
    console.log(`[ETL: IFCT] Successfully loaded ${rows.length} base Indian ingredients.`);
    return rows;
  } catch (error) {
    console.error('[ETL: IFCT] Failed to load ifct2017 compositions:', error);
    return [];
  }
}

/**
 * Streams and parses the Indian Food Nutritional Values Dataset (INDB / Kaggle) using csv-parser.
 */
export async function parseINDBCSV(candidatePath?: string): Promise<RawINDBCsvRow[]> {
  console.log('[ETL: INDB] Locating Indian Cooked Dishes CSV dataset...');

  const searchPaths = [
    candidatePath,
    path.resolve(process.cwd(), 'data', 'indian_food_nutrition.csv'),
    path.resolve(process.cwd(), 'data', 'indian_food.csv'),
    path.resolve(process.cwd(), 'src', 'db', 'indian_food_nutrition.csv'),
  ].filter(Boolean) as string[];

  let resolvedPath: string | null = null;
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      resolvedPath = p;
      break;
    }
  }

  if (!resolvedPath) {
    console.warn('[ETL: INDB] No local CSV dataset found at candidate paths. Skipping INDB CSV stream.');
    return [];
  }

  console.log(`[ETL: INDB] Parsing CSV via csv-parser stream: ${resolvedPath}`);

  return new Promise<RawINDBCsvRow[]>((resolve, reject) => {
    const rows: RawINDBCsvRow[] = [];
    fs.createReadStream(resolvedPath!)
      .pipe(csv())
      .on('data', (data: RawINDBCsvRow) => {
        rows.push(data);
      })
      .on('end', () => {
        console.log(`[ETL: INDB] Successfully parsed ${rows.length} cooked Indian dish records.`);
        resolve(rows);
      })
      .on('error', (err: Error) => {
        console.error('[ETL: INDB] Error streaming CSV dataset:', err);
        reject(err);
      });
  });
}

/**
 * Fetches Foundation Foods and SR Legacy items from the USDA FoodData Central REST API.
 * Includes pagination, timeout handling, and graceful fallback.
 */
export async function fetchUSDAFoods(options: {
  maxPages?: number;
  pageSize?: number;
  apiKey?: string;
} = {}): Promise<RawUSDAFood[]> {
  const { maxPages = 4, pageSize = 200, apiKey = 'DEMO_KEY' } = options;
  console.log(`[ETL: USDA] Ingesting Foundation Foods & SR Legacy (pages: 1..${maxPages}, pageSize: ${pageSize})...`);

  const allFoods: RawUSDAFood[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(
      apiKey
    )}&dataType=Foundation,SR%20Legacy&pageSize=${pageSize}&pageNumber=${page}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 429) {
          console.warn(`[ETL: USDA] Rate limited (429) on page ${page}. Finalizing current USDA intake.`);
          break;
        }
        console.warn(`[ETL: USDA] HTTP ${res.status} on page ${page}. Continuing with collected entries.`);
        break;
      }

      const json = (await res.json()) as RawUSDASearchResponse;
      if (!json.foods || json.foods.length === 0) {
        break;
      }

      allFoods.push(...json.foods);
      console.log(`[ETL: USDA] Page ${page}/${maxPages} retrieved (${json.foods.length} items).`);

      // Gentle pause to stay well under DEMO_KEY thresholds
      await new Promise((r) => setTimeout(r, 300));
    } catch (err: any) {
      console.warn(`[ETL: USDA] Network or timeout encountered on page ${page}:`, err.message || err);
      break;
    }
  }

  // Ensure core foundational staples are included even if pagination was curtailed
  const fallbackStaples = getUSDAFallbackStaples();
  const existingFdcIds = new Set(allFoods.map((f) => f.fdcId));
  for (const staple of fallbackStaples) {
    if (!existingFdcIds.has(staple.fdcId)) {
      allFoods.push(staple);
    }
  }

  console.log(`[ETL: USDA] Ingested total ${allFoods.length} raw USDA food records.`);
  return allFoods;
}

/**
 * Built-in foundational USDA staples for offline execution or when DEMO_KEY quota is exhausted.
 */
function getUSDAFallbackStaples(): RawUSDAFood[] {
  return [
    {
      fdcId: 171688,
      description: 'Apples, raw, with skin',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 52 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 0.26 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 0.17 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 13.8 },
      ],
    },
    {
      fdcId: 171077,
      description: 'Chicken breast, grilled, skinless',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 165 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 31.0 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 3.6 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0.0 },
      ],
    },
    {
      fdcId: 173424,
      description: 'Eggs, grade A, large, whole egg',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 143 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 12.6 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 9.5 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0.72 },
      ],
    },
    {
      fdcId: 175167,
      description: 'Fish, salmon, Atlantic, wild, raw',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 142 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 19.8 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 6.3 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0.0 },
      ],
    },
    {
      fdcId: 170379,
      description: 'Broccoli, raw',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 34 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 2.82 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 0.37 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 6.64 },
      ],
    },
    {
      fdcId: 171413,
      description: 'Olive oil, salad or cooking',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 884 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 0.0 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 100.0 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0.0 },
      ],
    },
    {
      fdcId: 170942,
      description: 'Yogurt, Greek, plain, nonfat',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 59 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 10.2 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 0.39 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 3.6 },
      ],
    },
    {
      fdcId: 173904,
      description: 'Oats, whole grain, rolled',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', value: 389 },
        { nutrientId: 1003, nutrientName: 'Protein', value: 16.9 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 6.9 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 66.3 },
      ],
    },
  ];
}

// ============================================================================
// 4. Phase 2: The Unified Transformation Engine
// ============================================================================

/**
 * Standardized normalization function that maps distinct schemas from IFCT, INDB,
 * and USDA FoodData Central into the strict unified Dexie PWA schema.
 */
export function normalizeFoodItem(
  sourceItem: any,
  origin: 'IFCT' | 'INDB' | 'USDA',
  index: number = 0
): GlobalFoodItem | null {
  if (!sourceItem) return null;

  switch (origin) {
    case 'IFCT':
      return normalizeIFCT(sourceItem as RawIFCTComposition);
    case 'INDB':
      return normalizeINDB(sourceItem as RawINDBCsvRow, index);
    case 'USDA':
      return normalizeUSDA(sourceItem as RawUSDAFood);
    default:
      return null;
  }
}

function normalizeIFCT(item: RawIFCTComposition): GlobalFoodItem | null {
  if (!item.name || !item.code) return null;

  const protein = Math.round((Number(item.protcnt) || 0) * 10) / 10;
  const carbs = Math.round((Number(item.choavldf) || 0) * 10) / 10;
  const fats = Math.round((Number(item.fatce) || 0) * 10) / 10;

  // Atwater macronutrient energetic baseline: (P * 4) + (C * 4) + (F * 9)
  const atwaterKcal = Math.round(protein * 4 + carbs * 4 + fats * 9);
  let calories = atwaterKcal;

  if (item.enerc && item.enerc > 0) {
    const statedKcal = Math.round(item.enerc / 4.184);
    // Align with stated kcal if within a reasonable 12% thermodynamic tolerance
    if (Math.abs(statedKcal - atwaterKcal) <= Math.max(atwaterKcal, statedKcal) * 0.12) {
      calories = statedKcal;
    }
  }

  if (calories <= 0 && protein === 0 && carbs === 0 && fats === 0) {
    return null;
  }

  const cleanName = item.name.trim();
  const servings = generateSmartUnits(cleanName);

  return {
    id: `IFCT_${item.code}`,
    name: cleanName,
    origin: 'IFCT',
    baseMacrosPer100g: {
      calories,
      protein,
      carbs,
      fats,
    },
    servings,
    calories,
    protein,
    carbs,
    fats,
    servingSize: servings[0]?.unit ?? '100g',
  };
}

function normalizeINDB(row: RawINDBCsvRow, index: number): GlobalFoodItem | null {
  const dishName = (
    row['Dish Name'] ||
    row['dish_name'] ||
    row['name'] ||
    row['Dish'] ||
    row['Food Item'] ||
    ''
  ).toString().trim();

  if (!dishName) return null;

  const rawCalories = parseFloat(
    String(row['Calories'] ?? row['calories'] ?? row['Energy'] ?? row['energy_kcal'] ?? 0)
  );
  const rawProtein = parseFloat(
    String(row['Protein'] ?? row['protein'] ?? row['Protein (g)'] ?? 0)
  );
  const rawFats = parseFloat(
    String(row['Fats'] ?? row['fats'] ?? row['Fat'] ?? row['Total Fat'] ?? 0)
  );
  const rawCarbs = parseFloat(
    String(
      row['Carbs per 100g'] ??
      row['Carbs'] ??
      row['carbs'] ??
      row['Carbohydrates'] ??
      row['Carbohydrate (g)'] ??
      0
    )
  );

  const protein = Math.round((isNaN(rawProtein) ? 0 : rawProtein) * 10) / 10;
  const fats = Math.round((isNaN(rawFats) ? 0 : rawFats) * 10) / 10;
  const carbs = Math.round((isNaN(rawCarbs) ? 0 : rawCarbs) * 10) / 10;

  let calories = Math.round(isNaN(rawCalories) ? 0 : rawCalories);
  if (calories <= 0 && (protein > 0 || carbs > 0 || fats > 0)) {
    calories = Math.round(protein * 4 + carbs * 4 + fats * 9);
  }

  if (calories <= 0) return null;

  const slug = dishName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const servings = generateSmartUnits(dishName);

  return {
    id: `INDB_${slug || index}`,
    name: dishName,
    origin: 'INDB',
    baseMacrosPer100g: {
      calories,
      protein,
      carbs,
      fats,
    },
    servings,
    calories,
    protein,
    carbs,
    fats,
    servingSize: servings.find((s) => s.unit === 'katori')?.unit ?? servings[0]?.unit ?? '100g',
  };
}

function normalizeUSDA(food: RawUSDAFood): GlobalFoodItem | null {
  if (!food.description || !food.fdcId) return null;

  let rawKcal = 0;
  let rawProtein = 0;
  let rawCarbs = 0;
  let rawFats = 0;

  if (Array.isArray(food.foodNutrients)) {
    for (const n of food.foodNutrients) {
      const id = Number(n.nutrientId);
      const val = Number(n.value) || 0;

      // USDA Nutrient IDs:
      // Energy: 1008 (KCAL)
      // Protein: 1003 (G)
      // Carbohydrate: 1005 (G)
      // Total lipid/fat: 1004 (G)
      if (id === 1008) {
        rawKcal = val;
      } else if (id === 1003) {
        rawProtein = val;
      } else if (id === 1005) {
        rawCarbs = val;
      } else if (id === 1004) {
        rawFats = val;
      }
    }
  }

  const protein = Math.round(rawProtein * 10) / 10;
  const carbs = Math.round(rawCarbs * 10) / 10;
  const fats = Math.round(rawFats * 10) / 10;

  let calories = Math.round(rawKcal);
  if (calories <= 0 && (protein > 0 || carbs > 0 || fats > 0)) {
    calories = Math.round(protein * 4 + carbs * 4 + fats * 9);
  }

  if (calories <= 0) return null;

  const cleanDescription = food.description.trim();
  const servings = generateSmartUnits(cleanDescription);

  return {
    id: `USDA_${food.fdcId}`,
    name: cleanDescription,
    origin: 'USDA',
    baseMacrosPer100g: {
      calories,
      protein,
      carbs,
      fats,
    },
    servings,
    calories,
    protein,
    carbs,
    fats,
    servingSize: servings[0]?.unit ?? '100g',
  };
}

// ============================================================================
// 5. Phase 4: Output, Deduplication & Optimization
// ============================================================================

/**
 * Validates structural integrity and physical macro plausibility.
 */
function isValidItem(item: GlobalFoodItem): boolean {
  if (!item || !item.name || !item.id) return false;
  if (typeof item.calories !== 'number' || isNaN(item.calories) || item.calories <= 0) return false;
  if (isNaN(item.protein) || item.protein < 0) return false;
  if (isNaN(item.carbs) || item.carbs < 0) return false;
  if (isNaN(item.fats) || item.fats < 0) return false;
  if (!Array.isArray(item.servings) || item.servings.length === 0) return false;
  return true;
}

/**
 * Generates canonical key for fuzzy duplicate detection.
 */
function toCanonicalKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(raw|cooked|fresh|dry|prepared|boiled|steamed|unprepared)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Merges items from all sources and performs deduplication:
 * - When an Indian item (IFCT or INDB) shares a close canonical identity with a USDA item,
 *   we prefer the Indian localized version for culinary relevance.
 * - Filters out all zero-calorie, null, or corrupted data records.
 */
export function mergeAndDeduplicate(allItems: (GlobalFoodItem | null)[]): GlobalFoodItem[] {
  const validItems = allItems.filter((i): i is GlobalFoodItem => i !== null && isValidItem(i));

  const canonicalMap = new Map<string, GlobalFoodItem>();
  const idMap = new Map<string, GlobalFoodItem>();

  for (const item of validItems) {
    const key = toCanonicalKey(item.name);
    const existing = canonicalMap.get(key);

    if (existing) {
      // Localization hierarchy: IFCT > INDB > USDA
      const priority = { IFCT: 3, INDB: 2, USDA: 1 };
      if (priority[item.origin] > priority[existing.origin]) {
        idMap.delete(existing.id);
        canonicalMap.set(key, item);
        idMap.set(item.id, item);
      }
      // Otherwise keep existing higher-priority Indian entry
    } else {
      canonicalMap.set(key, item);
      idMap.set(item.id, item);
    }
  }

  return Array.from(idMap.values());
}

/**
 * Main ETL Orchestration Function
 */
export async function buildGlobalDataset(): Promise<ETLSummary> {
  console.log('================================================================');
  console.log('   Global Foods ETL Pipeline (IFCT + INDB + USDA FoodData)     ');
  console.log('================================================================');

  // Step 1: Fetch all 3 data sources
  const [rawIFCT, rawINDB, rawUSDA] = await Promise.all([
    fetchIFCTFoods(),
    parseINDBCSV(),
    fetchUSDAFoods({ maxPages: 4, pageSize: 200 }),
  ]);

  console.log(`[ETL] Ingested raw records: IFCT=${rawIFCT.length}, INDB=${rawINDB.length}, USDA=${rawUSDA.length}`);

  // Step 2: Normalization Engine
  const normalizedIFCT = rawIFCT
    .map((item) => normalizeFoodItem(item, 'IFCT'))
    .filter((i): i is GlobalFoodItem => i !== null);

  const normalizedINDB = rawINDB
    .map((row, idx) => normalizeFoodItem(row, 'INDB', idx))
    .filter((i): i is GlobalFoodItem => i !== null);

  const normalizedUSDA = rawUSDA
    .map((food) => normalizeFoodItem(food, 'USDA'))
    .filter((i): i is GlobalFoodItem => i !== null);

  const totalRaw = rawIFCT.length + rawINDB.length + rawUSDA.length;
  const totalNormalized = normalizedIFCT.length + normalizedINDB.length + normalizedUSDA.length;

  console.log(`[ETL] Normalized records: IFCT=${normalizedIFCT.length}, INDB=${normalizedINDB.length}, USDA=${normalizedUSDA.length} (Total: ${totalNormalized})`);

  // Step 3: Merge, Deduplication, and Validation
  const masterDataset = mergeAndDeduplicate([
    ...normalizedIFCT,
    ...normalizedINDB,
    ...normalizedUSDA,
  ]);

  console.log(`[ETL] After deduplication and validation: ${masterDataset.length} final food items.`);

  // Step 4: Output to src/db/globalFoods.json
  const outputDir = path.resolve(process.cwd(), 'src', 'db');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'globalFoods.json');
  const jsonContent = JSON.stringify(masterDataset, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');

  // Step 5: File Size Check & PWA Cache Warning
  const stats = fs.statSync(outputPath);
  const sizeMB = stats.size / (1024 * 1024);

  console.log(`[ETL] Successfully written dataset to: ${outputPath}`);
  console.log(`[ETL] Dataset File Size: ${sizeMB.toFixed(2)} MB (${(stats.size / 1024).toFixed(1)} KB)`);

  if (sizeMB > 30) {
    console.warn(
      `[ETL WARNING] Output file exceeds 30MB (${sizeMB.toFixed(
        2
      )} MB)! Consider compressing or splitting chunks to avoid bloating the PWA caching layer.`
    );
  } else {
    console.log(`[ETL Check] File size is optimal for Dexie IndexedDB offline caching (${sizeMB.toFixed(2)} MB <= 30 MB).`);
  }

  const summary: ETLSummary = {
    ifctCount: normalizedIFCT.length,
    indbCount: normalizedINDB.length,
    usdaCount: normalizedUSDA.length,
    totalRaw,
    totalNormalized,
    deduplicatedCount: masterDataset.length,
    outputFileSizeMB: Math.round(sizeMB * 100) / 100,
  };

  console.log('----------------------------------------------------------------');
  console.log('   ETL Pipeline Summary:');
  console.log(`   - IFCT 2017 Foods:       ${summary.ifctCount}`);
  console.log(`   - INDB Cooked Dishes:    ${summary.indbCount}`);
  console.log(`   - USDA Global Items:     ${summary.usdaCount}`);
  console.log(`   - Master Deduplicated:   ${summary.deduplicatedCount}`);
  console.log(`   - File Size:             ${summary.outputFileSizeMB} MB`);
  console.log('================================================================');

  return summary;
}

// Automatically invoke if executed directly via CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith('buildGlobalDataset.ts') ||
    process.argv[1].endsWith('buildGlobalDataset.js'))
) {
  buildGlobalDataset().catch((err) => {
    console.error('[ETL Fatal Error]:', err);
    process.exit(1);
  });
}
