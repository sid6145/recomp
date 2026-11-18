import type { FoodItem, ServingOption } from '../db/db';
import { fetchWithRetry, FetchHttpError } from './fetchWithRetry';

export interface OpenFoodFactsNutriments {
  'energy-kcal_100g'?: number | string;
  'energy-kcal'?: number | string;
  'energy-kcal_value'?: number | string;
  'energy-kj_100g'?: number | string;
  energy_100g?: number | string;
  proteins_100g?: number | string;
  proteins?: number | string;
  proteins_value?: number | string;
  carbohydrates_100g?: number | string;
  carbohydrates?: number | string;
  carbohydrates_value?: number | string;
  fat_100g?: number | string;
  fat?: number | string;
  fat_value?: number | string;
  fiber_100g?: number | string;
  sugars_100g?: number | string;
  [key: string]: unknown;
}

export interface OpenFoodFactsProduct {
  _id?: string;
  id?: string;
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: OpenFoodFactsNutriments;
  image_url?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  quantity?: string;
  [key: string]: unknown;
}

const REQUEST_TIMEOUT_MS = 10000;
const USER_AGENT_HEADER = 'recomp - Web - Version 1.0 (offline-first PWA)';

/**
 * Normalizes raw Open Food Facts product JSON into recomp's strict Dexie FoodItem schema.
 * Handles missing nutrient fields, kJ-to-kcal conversions, and extracts dynamic serving sizes.
 */
export function normalizeOFFData(offProduct: OpenFoodFactsProduct | FoodItem): FoodItem {
  // Guard clause: if product is already normalized to FoodItem, return it directly
  if (
    offProduct &&
    typeof offProduct === 'object' &&
    'baseMacrosPer100g' in offProduct &&
    offProduct.baseMacrosPer100g &&
    typeof offProduct.baseMacrosPer100g === 'object' &&
    'servings' in offProduct &&
    Array.isArray(offProduct.servings)
  ) {
    return offProduct as FoodItem;
  }

  const raw = offProduct as OpenFoodFactsProduct;
  const nutriments = raw.nutriments || {};

  // 1. Resolve Product Name
  const rawTitle = (
    raw.product_name ||
    raw.product_name_en ||
    raw.generic_name ||
    ''
  ).trim();

  let finalName = rawTitle || 'Unknown Packaged Food';
  if (raw.brands && raw.brands.trim()) {
    const brand = raw.brands.trim();
    if (!finalName.toLowerCase().includes(brand.toLowerCase())) {
      finalName = `${brand} - ${finalName}`;
    }
  }

  // 2. Resolve Energy (kcal)
  let rawKcal =
    nutriments['energy-kcal_100g'] ??
    nutriments['energy-kcal_value'] ??
    nutriments['energy-kcal'];

  let calories = 0;
  if (rawKcal !== undefined && rawKcal !== null && !isNaN(Number(rawKcal))) {
    calories = Math.round(Number(rawKcal));
  } else {
    // Fallback: energy_100g in kJ (1 kcal = 4.184 kJ)
    const rawKj = nutriments['energy-kj_100g'] ?? nutriments.energy_100g;
    if (rawKj !== undefined && rawKj !== null && !isNaN(Number(rawKj))) {
      calories = Math.round(Number(rawKj) / 4.184);
    }
  }

  // 3. Resolve Macronutrients (g per 100g)
  const rawProtein =
    nutriments.proteins_100g ?? nutriments.proteins_value ?? nutriments.proteins ?? 0;
  const rawCarbs =
    nutriments.carbohydrates_100g ??
    nutriments.carbohydrates_value ??
    nutriments.carbohydrates ??
    0;
  const rawFat =
    nutriments.fat_100g ?? nutriments.fat_value ?? nutriments.fat ?? 0;

  const protein = Math.max(0, Math.round(Number(rawProtein) * 10) / 10 || 0);
  const carbs = Math.max(0, Math.round(Number(rawCarbs) * 10) / 10 || 0);
  const fats = Math.max(0, Math.round(Number(rawFat) * 10) / 10 || 0);

  // 4. Resolve Standard & Dynamic Servings
  const servings: ServingOption[] = [
    { unit: 'gram', weightInGrams: 1 },
    { unit: '100g', weightInGrams: 100 },
  ];

  // Parse custom serving size if present (e.g. "30g", "1 pack (25 g)")
  if (raw.serving_size) {
    const gramMatch = String(raw.serving_size).match(
      /(\d+(?:\.\d+)?)\s*(?:g|ml|gram|grams)/i
    );
    if (gramMatch && gramMatch[1]) {
      const parsedWeight = Math.round(parseFloat(gramMatch[1]));
      if (parsedWeight > 0 && parsedWeight !== 1 && parsedWeight !== 100) {
        servings.push({
          unit: `serving (${parsedWeight}g)`,
          weightInGrams: parsedWeight,
        });
      }
    }
  } else if (raw.serving_quantity) {
    const qty = Math.round(Number(raw.serving_quantity));
    if (qty > 0 && qty !== 1 && qty !== 100) {
      servings.push({
        unit: `serving (${qty}g)`,
        weightInGrams: qty,
      });
    }
  }

  const barcodeId = raw.code || raw._id || raw.id || String(Date.now());
  const uniqueId = `off_${barcodeId}`;

  return {
    id: uniqueId,
    name: finalName,
    baseMacrosPer100g: {
      calories,
      protein,
      carbs,
      fats,
    },
    servings,
  };
}

/**
 * Searches the Open Food Facts global database by product name query with automatic exponential retry.
 */
export async function searchProductByName(query: string): Promise<FoodItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    trimmed
  )}&search_simple=1&action=process&json=1`;

  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT_HEADER,
      Accept: 'application/json',
    },
    timeoutMs: REQUEST_TIMEOUT_MS,
  });

  const data = await response.json();
  const rawProducts: OpenFoodFactsProduct[] = data.products || [];

  // Filter valid items with names and normalize
  const normalizedItems: FoodItem[] = [];
  const seenNames = new Set<string>();

  for (const raw of rawProducts) {
    const name = (raw.product_name || raw.product_name_en || '').trim();
    if (!name) continue;

    const normalizedKey = name.toLowerCase();
    if (seenNames.has(normalizedKey)) continue;
    seenNames.add(normalizedKey);

    const item = normalizeOFFData(raw);
    normalizedItems.push(item);
    if (normalizedItems.length >= 20) break;
  }

  return normalizedItems;
}

/**
 * Looks up a branded food product by EAN/UPC barcode using Open Food Facts API (V3) with auto-retry.
 */
export async function searchProductByBarcode(barcode: string): Promise<FoodItem | null> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  const url = `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(
    cleanBarcode
  )}.json`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        'User-Agent': USER_AGENT_HEADER,
        Accept: 'application/json',
      },
      timeoutMs: REQUEST_TIMEOUT_MS,
    });

    const data = await response.json();

    if (data.status === 'success' && data.product) {
      return normalizeOFFData(data.product);
    }

    // Check V2/V0 style fallback inside response
    if (data.product) {
      return normalizeOFFData(data.product);
    }

    return null;
  } catch (err: unknown) {
    if (err instanceof FetchHttpError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
