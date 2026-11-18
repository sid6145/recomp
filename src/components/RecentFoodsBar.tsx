import React from 'react';
import { History, Loader2 } from 'lucide-react';
import type { FoodItem } from '../db/db';
import { FoodSearchResultCell } from './FoodSearchResultCell';

export interface RecentFoodsBarProps {
  recentFoods: FoodItem[];
  isLoading: boolean;
  onSelectFood: (food: FoodItem) => void;
}

export const RecentFoodsBar: React.FC<RecentFoodsBarProps> = React.memo(({
  recentFoods,
  isLoading,
  onSelectFood,
}) => {
  if (isLoading) {
    return (
      <div className="py-12 text-center text-neutral-500 text-xs flex items-center justify-center gap-2 font-mono">
        <Loader2 className="w-4 h-4 animate-spin text-[#00FF41]" />
        <span>Loading recent foods...</span>
      </div>
    );
  }

  if (recentFoods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 border border-dashed border-white/5 rounded-2xl bg-neutral-950/40">
        <History className="w-8 h-8 text-neutral-600" />
        <p className="text-sm font-medium text-neutral-400 font-sans">
          Search for a food to start logging.
        </p>
        <p className="text-xs text-neutral-500 font-sans">
          Your frequently logged dishes will appear here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {recentFoods.map((food) => (
        <FoodSearchResultCell
          key={food.id}
          food={food}
          onSelect={onSelectFood}
        />
      ))}
    </div>
  );
});

RecentFoodsBar.displayName = 'RecentFoodsBar';
