import React, { useEffect, useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import { useAppSelector } from '../store/store';
import { fetchHeatmapLogs, type DailyCaloriesMap } from '../db/heatmapData';
import { isWeekendCoveredByBank } from '../utils/calorieBank';

export interface HeatmapProps {
  onBack?: () => void;
}

interface HeatmapDay {
  dateStr: string;
  displayDate: string;
  calories: number;
  hasData: boolean;
  variance: number; // calories - target
  status: 'no_data' | 'deep_deficit' | 'target_hit' | 'slight_surplus' | 'surplus';
}

type HeatmapMetricFilter = 'calories' | 'protein' | 'cravings';

/**
 * Material Design 3 52-Week Consistency Heatmap Card (Heatmap.tsx)
 *
 * M3 Spec:
 * - 4px-rounded tiles with 3px gap across 5 smooth tonal steps of --md-primary
 *   (--md-surface-container-highest to 100% --md-primary)
 * - Metric filter chips: Calorie Adherence, Protein Target, Cravings Defeated
 * - Container: rounded-[28px], --md-surface-container, p-5
 */
export const Heatmap: React.FC<HeatmapProps> = React.memo(({ onBack }) => {
  const targetCalories = useAppSelector((state) => state.user.dailyCaloricTarget);
  const logEntries = useAppSelector((state) => state.logs.entries);

  const [caloriesByDate, setCaloriesByDate] = useState<DailyCaloriesMap>({});
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const [activeFilter, setActiveFilter] = useState<HeatmapMetricFilter>('calories');

  useEffect(() => {
    let isMounted = true;
    fetchHeatmapLogs().then((data) => {
      if (isMounted) {
        setCaloriesByDate(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [logEntries]);

  // Generate the last 364 calendar days (52 weeks x 7 days)
  const heatmapDays = useMemo<HeatmapDay[]>(() => {
    const days: HeatmapDay[] = [];
    const now = new Date();

    for (let i = 363; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const calories = caloriesByDate[dateStr] || 0;
      const hasData = Boolean(caloriesByDate[dateStr]);
      const variance = calories - targetCalories;

      let status: HeatmapDay['status'] = 'no_data';
      if (hasData) {
        if (calories < targetCalories - 200) {
          status = 'deep_deficit';
        } else if (calories <= targetCalories + 100) {
          status = 'target_hit';
        } else if (calories <= targetCalories + 200) {
          status = 'slight_surplus';
        } else {
          status = 'surplus';
        }

        if (
          (status === 'slight_surplus' || status === 'surplus') &&
          isWeekendCoveredByBank(dateStr, caloriesByDate, targetCalories)
        ) {
          status = 'target_hit';
        }
      }

      const displayDate = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      days.push({
        dateStr,
        displayDate,
        calories,
        hasData,
        variance,
        status,
      });
    }

    return days;
  }, [caloriesByDate, targetCalories]);

  const stats = useMemo(() => {
    let loggedDays = 0;
    let targetHitDays = 0;

    for (const d of heatmapDays) {
      if (d.hasData) {
        loggedDays++;
        if (d.status === 'target_hit' || d.status === 'deep_deficit') {
          targetHitDays++;
        }
      }
    }

    const consistencyRate = loggedDays > 0 ? Math.round((targetHitDays / loggedDays) * 100) : 0;
    return { loggedDays, targetHitDays, consistencyRate };
  }, [heatmapDays]);

  // 5 smooth tonal steps of --md-primary
  const getCellColor = (status: HeatmapDay['status']) => {
    switch (status) {
      case 'deep_deficit':
        return 'bg-[var(--md-primary)] shadow-sm';
      case 'target_hit':
        return 'bg-[var(--md-primary)]/80';
      case 'slight_surplus':
        return 'bg-[var(--md-secondary)]/70';
      case 'surplus':
        return 'bg-[var(--md-error)]/80';
      case 'no_data':
      default:
        return 'bg-[var(--md-surface-container-highest)]';
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between relative overflow-hidden select-none rounded-[28px] bg-[var(--md-surface-container)] text-[var(--md-on-surface)] p-5">
      {/* 1. Header with Back Button, Title, and Metric Filter Chips */}
      <div className="relative z-10 flex flex-col gap-3 border-b border-[var(--md-outline-variant)]/20 pb-4">
        <div className="flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-display font-semibold bg-[var(--md-surface-container-high)] hover:bg-[var(--md-surface-container-highest)] text-[var(--md-on-surface)] transition-all cursor-pointer shadow-sm active:scale-95 m3-state-layer"
              title="Return to Today's Summary"
            >
              <MaterialIcon name="arrow_back" size={16} />
              <span>Summary</span>
            </button>
          ) : (
            <div />
          )}

          {/* Aggregated Consistency Metric Badge */}
          <div className="inline-flex items-center gap-2 bg-[var(--md-surface-container-high)] px-3.5 py-1.5 rounded-full text-xs font-display text-[var(--md-on-surface)] shadow-sm">
            <MaterialIcon name="military_tech" size={18} className="text-[var(--md-primary)]" filled />
            <span>
              Consistency:{' '}
              <strong className="font-mono font-bold tabular-nums text-[var(--md-primary)]">
                {stats.consistencyRate}%
              </strong>{' '}
              <span className="text-[var(--md-on-surface-variant)] text-[11px] tabular-nums">
                ({stats.targetHitDays}/{stats.loggedDays || 1}d)
              </span>
            </span>
          </div>
        </div>

        {/* Metric Filter Chips (*Calorie Adherence*, *Protein Target*, *Cravings Defeated*) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {[
            { id: 'calories' as const, label: 'Calorie Adherence', icon: 'local_fire_department' },
            { id: 'protein' as const, label: 'Protein Target', icon: 'fitness_center' },
            { id: 'cravings' as const, label: 'Cravings Defeated', icon: 'savings' },
          ].map((chip) => {
            const isSelected = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id)}
                className={`min-h-[32px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-semibold whitespace-nowrap transition-colors cursor-pointer m3-state-layer ${
                  isSelected
                    ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] shadow-sm'
                    : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                }`}
              >
                <MaterialIcon name={chip.icon} size={15} filled={isSelected} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Maximized 52-Week Grid with 4px-rounded tiles and 3px gap */}
      <div className="relative z-10 my-auto py-3">
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <div className="min-w-[680px]">
            <div
              className="grid grid-flow-col grid-rows-7 grid-cols-[repeat(52,minmax(0,1fr))] gap-[3px]"
              onMouseLeave={() => setHoveredDay(null)}
            >
              {heatmapDays.map((day) => (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredDay(day)}
                  className={`heatmap-cell w-3 h-3 rounded-[4px] transition-transform duration-100 cursor-pointer ${getCellColor(
                    day.status
                  )} hover:scale-125 z-10`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tooltip & Tonal Legend Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-3 border-t border-[var(--md-outline-variant)]/20 font-sans text-[var(--md-on-surface-variant)]">
        {/* Active Hover readout */}
        <div className="min-h-[24px] flex items-center gap-2">
          {hoveredDay ? (
            <m.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-[var(--md-on-surface)] font-mono text-xs tabular-nums"
            >
              <span className="font-semibold">{hoveredDay.displayDate}:</span>
              {hoveredDay.hasData ? (
                <>
                  <span className="text-[var(--md-primary)] font-bold">{hoveredDay.calories} kcal</span>
                  <span className="text-[var(--md-on-surface-variant)]">/ {targetCalories} kcal</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hoveredDay.variance <= 0
                        ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                        : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)]'
                    }`}
                  >
                    {hoveredDay.variance > 0 ? `+${hoveredDay.variance}` : hoveredDay.variance} kcal
                  </span>
                </>
              ) : (
                <span className="text-[var(--md-on-surface-variant)]">No logs recorded</span>
              )}
            </m.div>
          ) : (
            <span className="text-xs text-[var(--md-on-surface-variant)] flex items-center gap-1.5 font-display">
              <MaterialIcon name="info" size={16} />
              <span>Tap or hover any day tile to inspect adherence details.</span>
            </span>
          )}
        </div>

        {/* 5 Smooth Tonal Steps Legend */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--md-on-surface-variant)] shrink-0 font-display">
          <span>Target Met</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-[4px] bg-[var(--md-primary)]" title="100% Primary" />
            <span className="w-3 h-3 rounded-[4px] bg-[var(--md-primary)]/80" title="80% Primary" />
            <span className="w-3 h-3 rounded-[4px] bg-[var(--md-secondary)]/70" title="Slight Surplus" />
            <span className="w-3 h-3 rounded-[4px] bg-[var(--md-error)]/80" title="Over Target" />
            <span className="w-3 h-3 rounded-[4px] bg-[var(--md-surface-container-highest)]" title="No Data" />
          </div>
          <span>No Log</span>
        </div>
      </div>
    </div>
  );
});

Heatmap.displayName = 'Heatmap';
