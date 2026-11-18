import React from 'react';
import { Globe, Plus, Check, Loader2 } from 'lucide-react';
import type { FoodItem } from '../db/db';

export interface GlobalSearchResultsProps {
  globalResults: FoodItem[];
  isGlobalSearching: boolean;
  savedCustomIds: Set<string>;
  onAddAndLog: (food: FoodItem) => void;
}

export const GlobalSearchResults: React.FC<GlobalSearchResultsProps> = React.memo(({
  globalResults,
  isGlobalSearching,
  savedCustomIds,
  onAddAndLog,
}) => {
  if (globalResults.length === 0 && !isGlobalSearching) {
    return null;
  }

  return (
    <div className="space-y-3 pt-2 pb-1 border-t border-white/5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-sans">
            Open Food Facts Global Results
          </span>
        </div>
        <span className="text-xs text-neutral-500 font-mono tabular-nums">
          {globalResults.length} global
        </span>
      </div>

      {isGlobalSearching ? (
        <div className="py-8 text-center text-neutral-400 text-xs flex items-center justify-center gap-2 font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          <span>Searching Open Food Facts global database...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {globalResults.map((item) => {
            const isImported = savedCustomIds.has(String(item.id));
            const calories = item.baseMacrosPer100g?.calories ?? 0;
            const protein = item.baseMacrosPer100g?.protein ?? 0;
            const carbs = item.baseMacrosPer100g?.carbs ?? 0;
            const fats = item.baseMacrosPer100g?.fats ?? 0;

            return (
              <div
                key={item.id}
                className="group p-4 rounded-xl bg-neutral-900 border border-white/5 hover:border-sky-500/40 shadow-lg shadow-black/40 flex flex-col justify-between gap-3 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-sm font-semibold tracking-tight text-neutral-100 group-hover:text-sky-300 transition-colors truncate font-sans">
                      {item.name}
                    </h4>
                    <p className="text-[11px] font-medium text-neutral-400 font-sans truncate">
                      Brand/Origin: <span className="text-neutral-300">{item.category || 'Global Open Food Facts'}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-2">
                    <div className="flex items-baseline gap-1 text-sky-400 font-mono">
                      <span className="text-2xl font-black tracking-tighter tabular-nums">
                        {calories}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-sky-400/80">
                        kcal
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest tabular-nums mt-0.5">
                      per 100g
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/5">
                  <div className="flex items-center gap-2 flex-wrap text-neutral-500 text-[11px] font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-white/5">
                      <span className="text-neutral-500 font-medium">[ P:</span>
                      <span className="text-neutral-300 font-bold">{protein}g</span>
                      <span className="text-neutral-500 font-medium">]</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-white/5">
                      <span className="text-neutral-500 font-medium">[ C:</span>
                      <span className="text-neutral-300 font-bold">{carbs}g</span>
                      <span className="text-neutral-500 font-medium">]</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950/80 border border-white/5">
                      <span className="text-neutral-500 font-medium">[ F:</span>
                      <span className="text-neutral-300 font-bold">{fats}g</span>
                      <span className="text-neutral-500 font-medium">]</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAddAndLog(item)}
                    className="shrink-0 min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  >
                    {isImported ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Logged</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add &amp; Log</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

GlobalSearchResults.displayName = 'GlobalSearchResults';
