import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Camera,
  Loader2,
  Plus,
  Check,
  AlertCircle,
  Barcode,
  Sparkles,
  Flame,
  Scale,
  X,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  searchProductByName,
  searchProductByBarcode,
} from '../utils/openFoodFacts';
import { db, type FoodItem } from '../db/db';

interface GlobalSearchFallbackProps {
  query: string;
  onFoodAdded?: (savedFood: FoodItem) => void;
  onSelectFoodToLog?: (food: FoodItem) => void;
  onIndexItem?: (item: { id: string; name: string; servings?: { unit: string }[] }) => void;
}

export const GlobalSearchFallback: React.FC<GlobalSearchFallbackProps> = ({
  query,
  onFoodAdded,
  onSelectFoodToLog,
  onIndexItem,
}) => {
  const [isSearchingGlobal, setIsSearchingGlobal] = useState<boolean>(false);
  const [globalResults, setGlobalResults] = useState<FoodItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Barcode scanner states
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState<boolean>(false);

  // Track saved items
  const [savedFoodIds, setSavedFoodIds] = useState<Set<string>>(new Set());

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Barcode camera scanner lifecycle
  useEffect(() => {
    if (!isScanning) return;

    setScanError(null);
    const scannerId = 'barcode-scanner-viewport';

    // Allow DOM element to mount before initializing Html5Qrcode
    const timer = setTimeout(() => {
      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        html5QrCode
          .start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 240, height: 240 },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              try {
                if (html5QrCode.isScanning) {
                  await html5QrCode.stop();
                  html5QrCode.clear();
                }
              } catch (e) {
                console.warn('Scanner stop error:', e);
              }
              setIsScanning(false);
              handleBarcodeLookup(decodedText);
            },
            () => {
              // Ignore standard frame-by-frame non-match
            }
          )
          .catch((err) => {
            console.error('Html5Qrcode start error:', err);
            setScanError(
              'Camera unavailable or permission denied. You can enter the barcode manually below.'
            );
            setIsScanning(false);
          });
      } catch (initErr) {
        console.error('Html5Qrcode instantiation error:', initErr);
        setScanError('Failed to initialize barcode scanner.');
        setIsScanning(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {});
        }
      }
    };
  }, [isScanning]);

  const handleStopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error closing scanner:', err);
      }
    }
    setIsScanning(false);
  };

  // Trigger search by product name in Open Food Facts
  const handleGlobalSearch = async () => {
    if (!query.trim()) return;

    setIsSearchingGlobal(true);
    setSearchError(null);

    try {
      const results = await searchProductByName(query);
      if (results.length === 0) {
        setSearchError(`No products found for "${query}" on Open Food Facts.`);
      } else {
        setGlobalResults(results);
      }
    } catch (err: unknown) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to Open Food Facts. Check network connection.'
      );
    } finally {
      setIsSearchingGlobal(false);
    }
  };

  // Lookup barcode in Open Food Facts V3
  const handleBarcodeLookup = async (codeToLookup: string) => {
    const clean = codeToLookup.trim();
    if (!clean) return;

    setIsLookingUpBarcode(true);
    setSearchError(null);

    try {
      const product = await searchProductByBarcode(clean);
      if (!product) {
        setSearchError(`No product found with barcode: ${clean}`);
      } else {
        setGlobalResults((prev) => {
          const exists = prev.some((p) => p.id === product.id);
          return exists ? prev : [product, ...prev];
        });
      }
    } catch (err: unknown) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'Failed to lookup barcode. Check your internet connection.'
      );
    } finally {
      setIsLookingUpBarcode(false);
      setManualBarcode('');
    }
  };

  // Save product to Dexie db.customFoods & trigger Web Worker embedding indexer
  const handleAddToMyFoods = async (food: FoodItem) => {
    try {
      // 1. Persist to IndexedDB customFoods table
      await db.customFoods.put(food);

      // 2. Mark locally as saved
      setSavedFoodIds((prev) => new Set(prev).add(String(food.id)));

      // 3. Trigger Web Worker semantic vector embedding generation
      if (onIndexItem && food.id) {
        onIndexItem({
          id: String(food.id),
          name: food.name,
          servings: food.servings,
        });
      }

      // 4. Notify parent callback
      if (onFoodAdded) {
        onFoodAdded(food);
      }
    } catch (err) {
      console.error('Failed to add custom food to database:', err);
      setSearchError('Failed to save product to local database.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Empty State Card with Fallback Options */}
      <div className="p-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400">
          <Globe className="w-6 h-6 text-amber-400" />
        </div>

        <div className="space-y-1 max-w-md">
          <h4 className="text-sm font-semibold text-zinc-100">
            No local offline matches for &ldquo;{query}&rdquo;
          </h4>
          <p className="text-xs text-zinc-400">
            Search 3+ million packaged foods on Open Food Facts, or scan a physical barcode to save it directly to your offline database.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleGlobalSearch}
            disabled={isSearchingGlobal || !query.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/10 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSearchingGlobal ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            Search Global Database
          </button>

          <button
            type="button"
            onClick={() => setIsScanning(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-600 shadow-md active:scale-95 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            Scan Barcode
          </button>
        </div>

        {/* Optional Manual Barcode Input Fallback */}
        <div className="pt-2 flex items-center gap-2 w-full max-w-xs">
          <div className="relative flex-1">
            <Barcode className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBarcodeLookup(manualBarcode);
              }}
              placeholder="Or enter barcode (e.g. 737628064502)..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>
          <button
            type="button"
            disabled={!manualBarcode.trim() || isLookingUpBarcode}
            onClick={() => handleBarcodeLookup(manualBarcode)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 disabled:opacity-40 cursor-pointer"
          >
            {isLookingUpBarcode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Lookup'}
          </button>
        </div>

        {/* Feedback / Error Alerts */}
        {(searchError || scanError) && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left max-w-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError || scanError}</span>
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal Viewport */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-xl"
          >
            <div className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Live Barcode Scanner
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopScanner}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Viewport container for html5-qrcode */}
              <div className="relative overflow-hidden rounded-2xl bg-black border border-zinc-800 aspect-square flex items-center justify-center">
                <div id="barcode-scanner-viewport" className="w-full h-full" />
                <div className="pointer-events-none absolute inset-8 border-2 border-dashed border-amber-400/60 rounded-xl" />
              </div>

              <p className="text-[11px] text-center text-zinc-400">
                Point camera at product UPC/EAN barcode. It will auto-capture and fetch nutrition info.
              </p>

              <button
                type="button"
                onClick={handleStopScanner}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Cancel Scanner
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Search Results List */}
      {globalResults.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Open Food Facts Matches ({globalResults.length})
              </h5>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Cloud Verified</span>
          </div>

          <div className="space-y-2.5">
            {globalResults.map((food) => {
              const isSaved = savedFoodIds.has(String(food.id));

              return (
                <div
                  key={food.id}
                  className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-zinc-700"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-zinc-100">{food.name}</h4>
                      {isSaved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Saved Offline
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Scale className="w-3.5 h-3.5 text-zinc-500" />
                      <span>
                        Servings: {food.servings.map((s) => s.unit).join(' • ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Flame className="w-3 h-3" />
                        {food.baseMacrosPer100g.calories} kcal / 100g
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        P: {food.baseMacrosPer100g.protein}g
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        C: {food.baseMacrosPer100g.carbs}g
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        F: {food.baseMacrosPer100g.fats}g
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      disabled={isSaved}
                      onClick={() => handleAddToMyFoods(food)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md cursor-pointer ${
                        isSaved
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 border border-zinc-700 hover:border-amber-400 active:scale-95'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Added to My Foods
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Add to My Foods
                        </>
                      )}
                    </button>

                    {onSelectFoodToLog && (
                      <button
                        type="button"
                        onClick={() => onSelectFoodToLog(food)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-zinc-950 border border-amber-500/30 hover:border-amber-400 cursor-pointer active:scale-95"
                      >
                        Log Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
