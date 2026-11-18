import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  Loader2,
  AlertCircle,
  Database,
  Compass,
  Globe,
  Camera,
  X,
} from 'lucide-react';
import { initializeDatabase } from '../db/dbSeeder';
import { getRecentlyLoggedFoods } from '../db/recentFoods';
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { FoodLogBottomSheet } from './FoodLogBottomSheet';
import { BarcodeScanner } from './BarcodeScanner';
import { FoodSearchResultCell } from './FoodSearchResultCell';
import { RecentFoodsBar } from './RecentFoodsBar';
import { GlobalSearchResults } from './GlobalSearchResults';
import {
  searchProductByName,
  searchProductByBarcode,
  normalizeOFFData,
} from '../utils/openFoodFacts';
import { db, type FoodItem } from '../db/db';
import { useHaptics } from '../hooks/useHaptics';
import { AgenticTransition } from '../utils/motionPresets';

export interface FoodSearchDashboardProps {
  onBottomSheetToggle?: (isOpen: boolean) => void;
}

export const FoodSearchDashboard: React.FC<FoodSearchDashboardProps> = ({
  onBottomSheetToggle,
}) => {
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(true);
  const [selectedFoodForLog, setSelectedFoodForLog] = useState<FoodItem | null>(null);

  // Global search & scanner state segregation
  const [globalResults, setGlobalResults] = useState<FoodItem[]>([]);
  const [isGlobalSearching, setIsGlobalSearching] = useState<boolean>(false);
  const [globalSearchError, setGlobalSearchError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [savedCustomIds, setSavedCustomIds] = useState<Set<string>>(new Set());

  const inputRef = useRef<HTMLInputElement>(null);
  const haptics = useHaptics();

  const handleSelectFoodForLog = (food: FoodItem | null) => {
    setSelectedFoodForLog(food);
    onBottomSheetToggle?.(Boolean(food));
  };

  const handleClearQuery = () => {
    haptics.tick();
    setQuery('');
    search('');
    inputRef.current?.focus();
  };

  const handleOpenScanner = () => {
    haptics.tick();
    setIsScannerOpen(true);
    onBottomSheetToggle?.(true);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
    onBottomSheetToggle?.(false);
  };

  const {
    search,
    results: localResults,
    isSearching: isSearchingLocal,
    status,
    error: localError,
    embedCustomFood,
    worker,
  } = useSemanticSearch();

  // Fetch recently logged meals from IndexedDB
  const refreshRecentFoods = useCallback(async () => {
    try {
      const recent = await getRecentlyLoggedFoods(15);
      setRecentFoods(recent);
    } catch (err) {
      console.error('[FoodSearchDashboard] Error loading recent foods:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  // Mount Effect: initialize database & load recent foods
  useEffect(() => {
    let isMounted = true;

    initializeDatabase(worker ?? undefined)
      .then(async () => {
        if (!isMounted) return;
        setDbReady(true);
        await refreshRecentFoods();
      })
      .catch((err) => {
        console.error('Failed to initialize local database:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshRecentFoods, worker]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = e.target.value;
    setQuery(nextQuery);
    search(nextQuery);
    if (globalSearchError) {
      setGlobalSearchError(null);
    }
  };

  // Direct "Search Online" handler using Open Food Facts
  const handleSearchOnline = async () => {
    const cleanQuery = query.trim();
    if (!cleanQuery || isGlobalSearching) return;

    haptics.tick();
    setIsGlobalSearching(true);
    setGlobalSearchError(null);

    try {
      const offResults = await searchProductByName(cleanQuery);
      if (offResults.length === 0) {
        setGlobalSearchError(`No Open Food Facts items found matching "${cleanQuery}".`);
      } else {
        setGlobalResults(offResults);
      }
    } catch (err) {
      console.error('[FoodSearchDashboard] Global search error:', err);
      setGlobalSearchError('Network error connecting to Open Food Facts API.');
    } finally {
      setIsGlobalSearching(false);
    }
  };

  // Barcode Detected Callback handler
  const handleBarcodeDetected = async (barcode: string) => {
    handleCloseScanner();
    setGlobalSearchError(null);
    setIsGlobalSearching(true);
    haptics.success();

    try {
      const product = await searchProductByBarcode(barcode);
      if (!product) {
        setGlobalSearchError(`No packaged food found for barcode [${barcode}].`);
      } else {
        setGlobalResults([product]);
        setQuery(product.name);
        // Automatically open portion sheet
        handleSelectFoodForLog(product);
      }
    } catch (err) {
      console.error('[FoodSearchDashboard] Barcode lookup error:', err);
      setGlobalSearchError('Failed to lookup barcode via Open Food Facts.');
    } finally {
      setIsGlobalSearching(false);
    }
  };

  // The "Add & Log" Pipeline
  const handleAddAndLogGlobalFood = async (rawItem: FoodItem) => {
    try {
      haptics.tick();
      // 1. Normalize data to strict schema
      const normalized = normalizeOFFData(rawItem);

      // 2. Persist to Dexie customFoods table
      await db.customFoods.put(normalized);

      // 3. Mark as saved locally
      setSavedCustomIds((prev) => new Set(prev).add(String(normalized.id)));

      // 4. Send message to Web Worker to vectorize embedding for future offline searches
      embedCustomFood(normalized);

      // 5. Refresh recent foods & open FoodLogBottomSheet immediately
      await refreshRecentFoods();
      handleSelectFoodForLog(normalized);
    } catch (err) {
      console.error('[FoodSearchDashboard] Error in Add & Log pipeline:', err);
      setGlobalSearchError('Failed to import and log food item.');
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'loading_model':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading...
          </span>
        );
      case 'searching':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Loader2 className="w-3 h-3 animate-spin" />
            Searching...
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/20">
            <Sparkles className="w-3 h-3 text-[#00FF41]" />
            Search Ready
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3 text-rose-400" />
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-neutral-900 text-neutral-400 border border-white/5">
            <Database className="w-3 h-3" />
            Ready
          </span>
        );
    }
  };

  const displayedLocalResults = localResults.slice(0, 15);
  const displayedRecentFoods = recentFoods.slice(0, 15);
  const isQueryEmpty = query.trim() === '';

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 touch-pan-y">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={AgenticTransition}
        className="relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 space-y-6 touch-pan-y"
      >
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-[#00FF41]/10 rounded-full blur-3xl transform-gpu will-change-transform" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl transform-gpu will-change-transform" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-neutral-100 font-sans">
              Food Search
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans">
              Search local foods, online database, or scan a barcode.
            </p>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Search Bar & Action Buttons Container */}
        <div className="space-y-3">
          {/* Main Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400 group-focus-within:text-[#00FF41] transition-colors">
              {isSearchingLocal ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#00FF41]" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={!dbReady}
              value={query}
              onChange={handleQueryChange}
              onFocus={(e) => {
                setTimeout(() => {
                  e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 150);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  handleSearchOnline();
                }
              }}
              placeholder={
                dbReady
                  ? 'Semantic search (e.g., "dal", "egg", "rice", "Oreo", "Nutella")...'
                  : 'Seeding local database...'
              }
              className="w-full bg-neutral-950/90 border border-white/5 rounded-2xl pl-12 pr-12 py-3.5 text-base sm:text-sm font-medium text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/50 focus:border-[#00FF41]/60 shadow-lg shadow-black/40 transition-all disabled:opacity-50 font-sans"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 pr-3.5 pl-2 flex items-center justify-center min-w-[44px] min-h-[44px] text-neutral-400 hover:text-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Row: Direct "Search Online" & "Scan Barcode" Buttons (min 44px touch targets) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSearchOnline}
                disabled={isGlobalSearching || !query.trim()}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all bg-[#00FF41] hover:bg-[#00FF41]/90 text-neutral-950 shadow-md shadow-[#00FF41]/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGlobalSearching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-950" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-neutral-950" />
                )}
                <span>Search Online</span>
              </button>

              <button
                type="button"
                onClick={handleOpenScanner}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-white/5 hover:border-white/10 shadow-md active:scale-95 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#00FF41]" />
                <span>Scan Barcode</span>
              </button>
            </div>

            {query.trim() && (
              <span className="text-[11px] text-neutral-500 font-mono">
                Tap Search Online for external brands
              </span>
            )}
          </div>

          {/* Feedback & Error Messages */}
          {(localError || globalSearchError) && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalSearchError || localError}</span>
            </div>
          )}
        </div>

        {/* Global Database Results Section */}
        <GlobalSearchResults
          globalResults={globalResults}
          isGlobalSearching={isGlobalSearching}
          savedCustomIds={savedCustomIds}
          onAddAndLog={handleAddAndLogGlobalFood}
        />

        {/* Local Results / Recently Logged Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2 font-sans">
              <Compass className="w-3.5 h-3.5 text-[#00FF41]" />
              {isQueryEmpty ? 'Recent Foods' : 'Search Results'}
            </span>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              {isQueryEmpty
                ? `${displayedRecentFoods.length} recent`
                : `${displayedLocalResults.length} match${displayedLocalResults.length === 1 ? '' : 'es'}`}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {isQueryEmpty ? (
              <RecentFoodsBar
                recentFoods={displayedRecentFoods}
                isLoading={isLoadingRecent}
                onSelectFood={(f) => {
                  haptics.tick();
                  handleSelectFoodForLog(f);
                }}
              />
            ) : isSearchingLocal && displayedLocalResults.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="p-4 rounded-2xl bg-neutral-950/40 border border-white/5 animate-pulse flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2.5 flex-1">
                      <div className="h-4 bg-neutral-800 rounded-md w-1/3" />
                      <div className="h-3 bg-neutral-800/60 rounded-md w-1/4" />
                      <div className="flex gap-2 pt-1">
                        <div className="h-5 bg-neutral-800/80 rounded-lg w-20" />
                        <div className="h-5 bg-neutral-800/80 rounded-lg w-16" />
                      </div>
                    </div>
                    <div className="h-9 bg-neutral-800 rounded-xl w-24 self-start sm:self-center" />
                  </div>
                ))}
              </div>
            ) : displayedLocalResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedLocalResults.map((food) => (
                  <FoodSearchResultCell
                    key={food.id}
                    food={food}
                    onSelect={(f) => {
                      haptics.tick();
                      handleSelectFoodForLog(f);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 border border-dashed border-white/5 rounded-2xl bg-neutral-950/40 p-6">
                <Globe className="w-8 h-8 text-[#00FF41]/80" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-neutral-300 font-sans">
                    No local matches found for &quot;{query}&quot;.
                  </p>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto font-sans">
                    Tap &quot;Search Online&quot; above to find items on the web.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Food Log Modal Bottom Sheet */}
      <FoodLogBottomSheet
        food={selectedFoodForLog}
        isOpen={Boolean(selectedFoodForLog)}
        onClose={() => handleSelectFoodForLog(null)}
        onSuccess={() => {
          refreshRecentFoods();
          handleSelectFoodForLog(null);
        }}
      />

      {/* Barcode Scanner Viewport Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScanSuccess={handleBarcodeDetected}
      />
    </div>
  );
};
