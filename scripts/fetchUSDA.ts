import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import axios from 'axios';
import parser from 'stream-json';
import streamArray from 'stream-json/streamers/stream-array.js';
import pick from 'stream-json/filters/pick.js';

// ============================================================================
// 1. Strict TypeScript Interfaces for USDA SR Legacy Raw & Output Schemas
// ============================================================================

export interface USDANutrientInfo {
  id: number;
  number?: string;
  name?: string;
  rank?: number;
  unitName?: string;
}

export interface USDARawNutrient {
  type?: string;
  id?: number;
  nutrientId?: number;
  nutrient?: USDANutrientInfo;
  amount?: number;
  value?: number;
}

export interface USDARawFoodItem {
  fdcId: number;
  description: string;
  foodClass?: string;
  foodNutrients: USDARawNutrient[];
  publicationDate?: string;
  ndbNumber?: number | string;
  foodCode?: string;
}

export interface ServingOption {
  unit: string;
  weightInGrams: number;
}

export interface BaseMacros {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MappedUSDAFoodItem {
  id: string;
  name: string;
  origin: 'USDA';
  baseMacrosPer100g: BaseMacros;
  servings: ServingOption[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
}

// Target USDA Nutrient IDs
const NUTRIENT_IDS = {
  CALORIES: 1008, // Energy (kcal)
  PROTEIN: 1003,  // Protein (g)
  CARBS: 1005,    // Carbohydrate, by difference (g)
  FATS: 1004,     // Total lipid (fat) (g)
} as const;

const USDA_SR_LEGACY_ZIP_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip';
const JSON_FILENAME = 'FoodData_Central_sr_legacy_food_json_2021-10-28.json';
const ZIP_FILENAME = 'FoodData_Central_sr_legacy_food_json_2021-10-28.zip';

// ============================================================================
// 2. Helper Functions: File Discovery, Streaming Download & Extraction
// ============================================================================

/**
 * Searches common directories for an existing extracted JSON file.
 */
function findExistingJSONFile(): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), 'scripts', JSON_FILENAME),
    path.resolve(process.cwd(), 'data', JSON_FILENAME),
    path.resolve(process.cwd(), JSON_FILENAME),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Searches common directories for an existing ZIP archive.
 */
function findExistingZipFile(): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), 'scripts', ZIP_FILENAME),
    path.resolve(process.cwd(), 'data', ZIP_FILENAME),
    path.resolve(process.cwd(), ZIP_FILENAME),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Stream downloads the bulk USDA SR Legacy ZIP archive using axios.
 */
async function downloadUSDAZip(destZipPath: string): Promise<void> {
  console.log(`[USDA ETL] Starting stream download from: ${USDA_SR_LEGACY_ZIP_URL}`);
  console.log(`[USDA ETL] Destination: ${destZipPath}`);

  const destDir = path.dirname(destZipPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const response = await axios({
    method: 'GET',
    url: USDA_SR_LEGACY_ZIP_URL,
    responseType: 'stream',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
  });

  const totalLength = parseInt(response.headers['content-length'] || '0', 10);
  let downloadedBytes = 0;
  let lastLoggedProgress = 0;

  const writer = fs.createWriteStream(destZipPath);

  response.data.on('data', (chunk: Buffer) => {
    downloadedBytes += chunk.length;
    if (totalLength > 0) {
      const percent = Math.floor((downloadedBytes / totalLength) * 100);
      if (percent >= lastLoggedProgress + 20) {
        lastLoggedProgress = percent;
        console.log(`[USDA ETL] Download progress: ${percent}% (${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalLength / (1024 * 1024)).toFixed(1)} MB)`);
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', () => {
      console.log(`[USDA ETL] Download complete: ${(downloadedBytes / (1024 * 1024)).toFixed(2)} MB`);
      resolve();
    });
    writer.on('error', (err) => {
      console.error('[USDA ETL] Stream write error:', err);
      reject(err);
    });
  });
}

/**
 * Extracts the ZIP archive using system tar/unzip or provides instructions if unavailable.
 */
function extractZip(zipPath: string, targetDir: string): string {
  console.log(`[USDA ETL] Extracting ${zipPath} into ${targetDir}...`);
  try {
    // Both modern Windows (10/11) and Linux/macOS provide bsdtar/tar out of the box
    execSync(`tar -xf "${zipPath}" -C "${targetDir}"`, { stdio: 'inherit' });
    const extractedFile = path.join(targetDir, JSON_FILENAME);
    if (fs.existsSync(extractedFile)) {
      console.log(`[USDA ETL] Extraction succeeded: ${extractedFile}`);
      return extractedFile;
    }
  } catch (tarErr) {
    console.warn('[USDA ETL] tar command failed, attempting PowerShell Expand-Archive...');
    try {
      execSync(
        `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force"`,
        { stdio: 'inherit' }
      );
      const extractedFile = path.join(targetDir, JSON_FILENAME);
      if (fs.existsSync(extractedFile)) {
        console.log(`[USDA ETL] PowerShell extraction succeeded: ${extractedFile}`);
        return extractedFile;
      }
    } catch (psErr) {
      console.error('[USDA ETL] Automated extraction failed.');
      console.error(
        `[INSTRUCTION] Please manually unzip "${zipPath}" and place "${JSON_FILENAME}" into the "${targetDir}" folder.`
      );
      throw new Error(
        `Could not extract ${zipPath}. Please extract manually to ${path.join(targetDir, JSON_FILENAME)}`
      );
    }
  }

  throw new Error(`Extracted file not found at expected path: ${path.join(targetDir, JSON_FILENAME)}`);
}

// ============================================================================
// 3. Nutrient Extraction & Transformation Engine
// ============================================================================

/**
 * Extracts a specific nutrient value from the foodNutrients array.
 * Supports both nested USDA bulk schemas (nutrient.id + amount) and flattened schemas (nutrientId + value).
 */
function extractNutrientValue(nutrients: USDARawNutrient[] = [], targetId: number): number {
  if (!Array.isArray(nutrients)) return 0;

  for (const item of nutrients) {
    const id = item?.nutrient?.id ?? item?.nutrientId ?? item?.id;
    if (Number(id) === targetId) {
      const val = item?.amount ?? item?.value ?? 0;
      const num = typeof val === 'number' ? val : parseFloat(String(val));
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
}

/**
 * Transforms a raw USDA food item into the strict Dexie PWA schema.
 * All nutrients represent baseline values per 100g.
 */
export function mapUSDAItem(raw: USDARawFoodItem): MappedUSDAFoodItem | null {
  if (!raw || !raw.description || !raw.fdcId) return null;

  const nutrients = raw.foodNutrients || [];

  const rawKcal = extractNutrientValue(nutrients, NUTRIENT_IDS.CALORIES);
  const rawProtein = extractNutrientValue(nutrients, NUTRIENT_IDS.PROTEIN);
  const rawCarbs = extractNutrientValue(nutrients, NUTRIENT_IDS.CARBS);
  const rawFats = extractNutrientValue(nutrients, NUTRIENT_IDS.FATS);

  const protein = Math.round(rawProtein * 10) / 10;
  const carbs = Math.round(rawCarbs * 10) / 10;
  const fats = Math.round(rawFats * 10) / 10;

  // Primary energy from nutrient 1008; Atwater thermodynamic fallback if missing
  let calories = Math.round(rawKcal);
  if (calories <= 0 && (protein > 0 || carbs > 0 || fats > 0)) {
    calories = Math.round(protein * 4 + carbs * 4 + fats * 9);
  }

  // Discard empty or zero-calorie entries
  if (calories <= 0) return null;

  const cleanName = raw.description.trim();

  // Dynamic Units: Inject standard serving baseline
  const servings: ServingOption[] = [
    { unit: 'gram', weightInGrams: 1 },
    { unit: '100g', weightInGrams: 100 },
  ];

  return {
    id: `USDA_${raw.fdcId}`,
    name: cleanName,
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
    servingSize: '100g',
  };
}

// ============================================================================
// 4. Memory-Safe Streaming ETL Orchestrator
// ============================================================================

/**
 * Streams the SRLegacyFoods array from the JSON file using stream-json,
 * mapping items incrementally to avoid V8 heap memory exhaustion.
 */
export async function streamParseUSDAJSON(jsonFilePath: string): Promise<MappedUSDAFoodItem[]> {
  console.log(`[USDA ETL] Initializing stream-json pipeline for: ${jsonFilePath}`);

  const fileStats = fs.statSync(jsonFilePath);
  console.log(`[USDA ETL] File Size: ${(fileStats.size / (1024 * 1024)).toFixed(1)} MB`);

  const mappedItems: MappedUSDAFoodItem[] = [];
  let rawItemCount = 0;
  let validItemCount = 0;

  return new Promise<MappedUSDAFoodItem[]>((resolve, reject) => {
    const fileStream = fs.createReadStream(jsonFilePath, { highWaterMark: 64 * 1024 });

    // Build the streaming pipeline:
    // ReadStream -> JSON Parser -> Pick('SRLegacyFoods') -> StreamArray -> Data Event
    const pipeline = fileStream
      .pipe(parser())
      .pipe(pick.asStream({ filter: 'SRLegacyFoods' }))
      .pipe(streamArray.asStream());

    pipeline.on('data', (data: { key: number; value: USDARawFoodItem }) => {
      rawItemCount++;
      const item = mapUSDAItem(data.value);

      if (item) {
        mappedItems.push(item);
        validItemCount++;
      }

      // Real-time progress indicators
      if (rawItemCount % 1000 === 0) {
        console.log(`[USDA ETL] Processed ${rawItemCount} items... (Valid: ${validItemCount})`);
      }
    });

    pipeline.on('end', () => {
      console.log('================================================================');
      console.log(`[USDA ETL] Stream processing finished.`);
      console.log(`[USDA ETL] Total raw items processed: ${rawItemCount}`);
      console.log(`[USDA ETL] Total valid items extracted: ${validItemCount}`);
      console.log('================================================================');
      resolve(mappedItems);
    });

    pipeline.on('error', (err: Error) => {
      console.error('[USDA ETL] Stream processing error:', err);
      reject(err);
    });

    fileStream.on('error', (err: Error) => {
      console.error('[USDA ETL] File read stream error:', err);
      reject(err);
    });
  });
}

/**
 * Main Execution Function
 */
export async function runUSDAETL(): Promise<void> {
  console.log('================================================================');
  console.log('   USDA SR Legacy Bulk Streaming ETL Pipeline                   ');
  console.log('================================================================');

  const scriptsDir = path.resolve(process.cwd(), 'scripts');
  let jsonFilePath = findExistingJSONFile();

  // Step 1: Ensure JSON dataset is available
  if (!jsonFilePath) {
    let zipFilePath = findExistingZipFile();

    if (!zipFilePath) {
      zipFilePath = path.join(scriptsDir, ZIP_FILENAME);
      console.log(`[USDA ETL] Local dataset not detected. Commencing bulk ZIP download...`);
      await downloadUSDAZip(zipFilePath);
    } else {
      console.log(`[USDA ETL] Found existing ZIP archive: ${zipFilePath}`);
    }

    // Step 2: Unzip archive
    jsonFilePath = extractZip(zipFilePath, scriptsDir);
  } else {
    console.log(`[USDA ETL] Found existing extracted JSON dataset: ${jsonFilePath}`);
  }

  // Step 3: Stream parse and map items
  const mappedResults = await streamParseUSDAJSON(jsonFilePath);

  // Step 4: Write final output to src/db/usdaFoods.json
  const outputDir = path.resolve(process.cwd(), 'src', 'db');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'usdaFoods.json');
  console.log(`[USDA ETL] Writing ${mappedResults.length} records to: ${outputPath}`);

  fs.writeFileSync(outputPath, JSON.stringify(mappedResults, null, 2), 'utf-8');

  const outputStats = fs.statSync(outputPath);
  const sizeMB = outputStats.size / (1024 * 1024);

  console.log(`[USDA ETL] Success! Generated usdaFoods.json (${sizeMB.toFixed(2)} MB, ${(outputStats.size / 1024).toFixed(1)} KB)`);
  console.log('================================================================');
}

// Automatically invoke if executed directly via CLI
if (
  process.argv[1] &&
  (process.argv[1].endsWith('fetchUSDA.ts') || process.argv[1].endsWith('fetchUSDA.js'))
) {
  runUSDAETL().catch((err) => {
    console.error('[USDA ETL Fatal Error]:', err);
    process.exit(1);
  });
}
