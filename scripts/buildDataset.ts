import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Define the standard serving structure
export interface ServingOption {
  unit: string;
  weightInGrams: number;
}

export interface FoodOutput {
  id: string;
  name: string;
  baseMacrosPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  servings: ServingOption[];
}

/**
 * Builds the culinary conversion servings based on food group, name, and nature.
 */
function buildServingUnits(name: string, grup: string): ServingOption[] {
  const servings: ServingOption[] = [
    { unit: 'gram', weightInGrams: 1 },
    { unit: 'kg', weightInGrams: 1000 },
  ];

  const lowerName = name.toLowerCase();
  const lowerGrup = grup.toLowerCase();

  // Sugars, spices, seeds, salts
  const isSugarOrSweetener =
    lowerGrup.includes('sugar') ||
    lowerName.includes('sugar') ||
    lowerName.includes('jaggery') ||
    lowerName.includes('honey') ||
    lowerName.includes('sucrose');

  const isSpiceOrCondiment =
    lowerGrup.includes('condiments and spices') ||
    lowerName.includes('spice') ||
    lowerName.includes('powder') ||
    lowerName.includes('salt') ||
    lowerName.includes('pepper') ||
    lowerName.includes('masala');

  const isSeedOrNut =
    lowerGrup.includes('nuts and oil seeds') ||
    lowerName.includes('seed') ||
    lowerName.includes('chia') ||
    lowerName.includes('flax') ||
    lowerName.includes('sunflower');

  if (isSugarOrSweetener || isSpiceOrCondiment || isSeedOrNut) {
    servings.push({ unit: 'teaspoon', weightInGrams: 4 });
    servings.push({ unit: 'tablespoon', weightInGrams: 15 });
  }

  // Liquids (milk, oils, beverages, juices)
  const isLiquid =
    lowerGrup.includes('edible oils and fats') ||
    lowerName.includes('oil') ||
    lowerName.includes('ghee') ||
    lowerName.includes('milk') ||
    lowerName.includes('juice') ||
    lowerName.includes('water') ||
    lowerName.includes('soup') ||
    lowerName.includes('shake');

  if (isLiquid) {
    servings.push({ unit: 'ml', weightInGrams: 1 });
    servings.push({ unit: 'cup', weightInGrams: 240 });
    servings.push({ unit: 'tablespoon', weightInGrams: 15 });
  }

  // Cooked/raw cereals & legumes (Rice, Dal, Wheat, Millets)
  const isCerealOrLegume =
    lowerGrup.includes('cereals and millets') ||
    lowerGrup.includes('grain legumes') ||
    lowerName.includes('rice') ||
    lowerName.includes('dal') ||
    lowerName.includes('dhal') ||
    lowerName.includes('lentil') ||
    lowerName.includes('curry') ||
    lowerName.includes('chole') ||
    lowerName.includes('rajma') ||
    lowerName.includes('khichdi');

  if (isCerealOrLegume) {
    servings.push({ unit: 'katori', weightInGrams: 150 });
    servings.push({ unit: 'bowl', weightInGrams: 250 });
  }

  // Flatbreads / Pieces
  if (lowerName.includes('roti') || lowerName.includes('chapati') || lowerName.includes('phulka')) {
    servings.push({ unit: 'piece (small 30g)', weightInGrams: 30 });
    servings.push({ unit: 'piece (medium 45g)', weightInGrams: 45 });
  }

  if (lowerName.includes('egg') || lowerName.includes('banana') || lowerName.includes('apple')) {
    servings.push({ unit: 'piece', weightInGrams: 50 });
  }

  // Protein scoops
  if (lowerName.includes('whey') || lowerName.includes('protein isolate') || lowerName.includes('protein powder')) {
    servings.push({ unit: 'scoop', weightInGrams: 32 });
    servings.push({ unit: 'heaping scoop', weightInGrams: 40 });
  }

  // Deduplicate units by unit name
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

export async function buildDataset(): Promise<FoodOutput[]> {
  console.log('[ETL] Loading IFCT 2017 dataset...');
  const ifct = require('ifct2017');
  await ifct.compositions.load();

  const allCompositions = ifct.compositions('%') as Array<{
    code: string;
    name: string;
    grup: string;
    enerc: number; // in kJ
    protcnt: number; // in g
    choavldf: number; // in g
    fatce: number; // in g
    fibtg: number; // in g
  }>;

  console.log(`[ETL] Loaded ${allCompositions.length} entries from IFCT 2017.`);

  const output: FoodOutput[] = [];

  for (const item of allCompositions) {
    const protein = Math.round((Number(item.protcnt) || 0) * 10) / 10;
    const carbs = Math.round((Number(item.choavldf) || 0) * 10) / 10;
    const fats = Math.round((Number(item.fatce) || 0) * 10) / 10;

    // Standard Atwater macro energy: (P * 4) + (C * 4) + (F * 9)
    // Ensures exact macro-calorie consistency:
    const calculatedAtwater = Math.round(protein * 4 + carbs * 4 + fats * 9);
    let calories = calculatedAtwater;

    if (item.enerc && item.enerc > 0) {
      const statedKcal = Math.round(item.enerc / 4.184);
      // If stated kcal is within 10% of Atwater macro calculation, use stated, otherwise align to Atwater
      if (Math.abs(statedKcal - calculatedAtwater) <= Math.max(calculatedAtwater, statedKcal) * 0.10) {
        calories = statedKcal;
      }
    }

    const servings = buildServingUnits(item.name, item.grup || '');

    output.push({
      id: item.code,
      name: item.name,
      baseMacrosPer100g: {
        calories,
        protein,
        carbs,
        fats,
      },
      servings,
    });
  }

  // Supplementary staples from INDB & commercial standards (e.g. standard Table Sugar, Whey Isolate, Paneer Tikka)
  const supplementaryStaples: FoodOutput[] = [
    {
      id: 'INDB_SUGAR_01',
      name: 'Sugar (White Granulated / Sucrose)',
      baseMacrosPer100g: {
        calories: 387,
        protein: 0,
        carbs: 99.8,
        fats: 0,
      },
      servings: [
        { unit: 'gram', weightInGrams: 1 },
        { unit: 'teaspoon', weightInGrams: 4 },
        { unit: 'tablespoon', weightInGrams: 15 },
        { unit: 'kg', weightInGrams: 1000 },
      ],
    },
    {
      id: 'INDB_WHEY_01',
      name: 'Whey Protein Isolate 90%',
      baseMacrosPer100g: {
        calories: 375,
        protein: 85,
        carbs: 3.5,
        fats: 2.2,
      },
      servings: [
        { unit: 'gram', weightInGrams: 1 },
        { unit: 'scoop', weightInGrams: 32 },
        { unit: 'heaping scoop', weightInGrams: 40 },
        { unit: 'kg', weightInGrams: 1000 },
      ],
    },
    {
      id: 'INDB_ROTI_01',
      name: 'Roti (Whole Wheat Phulka)',
      baseMacrosPer100g: {
        calories: 260,
        protein: 8.8,
        carbs: 52.5,
        fats: 1.3,
      },
      servings: [
        { unit: 'gram', weightInGrams: 1 },
        { unit: 'piece (small 30g)', weightInGrams: 30 },
        { unit: 'piece (medium 45g)', weightInGrams: 45 },
        { unit: 'kg', weightInGrams: 1000 },
      ],
    },
    {
      id: 'INDB_PANEER_01',
      name: 'Fresh Paneer (Cottage Cheese)',
      baseMacrosPer100g: {
        calories: 265,
        protein: 18.3,
        carbs: 3.6,
        fats: 20.8,
      },
      servings: [
        { unit: 'gram', weightInGrams: 1 },
        { unit: 'katori', weightInGrams: 150 },
        { unit: 'bowl', weightInGrams: 250 },
        { unit: 'kg', weightInGrams: 1000 },
      ],
    },
  ];

  for (const staple of supplementaryStaples) {
    if (!output.some((x) => x.id === staple.id)) {
      output.unshift(staple);
    }
  }

  const targetPath = path.resolve(process.cwd(), 'src/db/realIndianFoods.json');
  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`[ETL] Wrote ${output.length} curated Indian food items to ${targetPath}`);

  return output;
}

if (process.argv[1] && process.argv[1].includes('buildDataset')) {
  buildDataset().catch((err) => {
    console.error('[ETL Error]:', err);
    process.exit(1);
  });
}
