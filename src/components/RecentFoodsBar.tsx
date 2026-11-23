import React from 'react';
import { Loader2 } from 'lucide-react';
import type { FoodItem } from '../db/db';
import { FoodSearchResultCell } from './FoodSearchResultCell';
import { MaterialIcon } from './MaterialIcon';

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
      <div className="py-12 text-center text-[var(--md-on-surface-variant)] text-xs flex items-center justify-center gap-2 font-mono">
        <Loader2 className="w-4 h-4 animate-spin text-[var(--md-primary)]" />
        <span>Loading recent foods...</span>
      </div>
    );
  }

  if (recentFoods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-2 rounded-[24px] bg-[var(--md-surface-container-low)] text-[var(--md-on-surface)] transition-colors">
        <div className="w-10 h-10 rounded-full bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] flex items-center justify-center">
          <MaterialIcon name="history" size={22} />
        </div>
        <p className="text-sm font-semibold text-[var(--md-on-surface)] font-display">
          Search for a food to start logging.
        </p>
        <p className="text-xs text-[var(--md-on-surface-variant)] font-sans max-w-xs mx-auto">
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
