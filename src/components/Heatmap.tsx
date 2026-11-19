import React, { useEffect, useState, useMemo } from 'react';
import { m } from 'framer-motion';
import { Award, ArrowLeft, Info } from 'lucide-react';
import { useAppSelector } from '../store/store';
import { fetchHeatmapLogs, type DailyCaloriesMap } from '../db/heatmapData';
import { isWeekendCoveredByBank } from '../utils/calorieBank';
import { useMomentum } from '../context/MomentumContext';

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

export const Heatmap: React.FC<HeatmapProps> = React.memo(({ onBack }) => {
  const targetCalories = useAppSelector((state) => state.user.dailyCaloricTarget);
  const logEntries = useAppSelector((state) => state.logs.entries);
  const { isOverdrive } = useMomentum();

  const [caloriesByDate, setCaloriesByDate] = useState<DailyCaloriesMap>({});
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  // Sync heatmap data from Dexie whenever logs change
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

        // Safe Heatmap Integration: If Sat/Sun overage was covered by banked calories, evaluate as target_hit (Emerald)
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

  // Aggregate consistency metrics
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

  const getColorClass = (status: HeatmapDay['status']) => {
    switch (status) {
      case 'deep_deficit':
        return 'bg-[#00FF41] hover:ring-2 hover:ring-[#00FF41]/80 shadow-[0_0_6px_rgba(0,255,65,0.4)]';
      case 'target_hit':
        return 'bg-[#00FF41]/80 hover:ring-2 hover:ring-[#00FF41]/60';
      case 'slight_surplus':
        return 'bg-amber-400 hover:ring-2 hover:ring-amber-300';
      case 'surplus':
        return 'bg-[#E60000] hover:ring-2 hover:ring-[#E60000]/60 shadow-[0_0_6px_rgba(230,0,0,0.4)]';
      default:
        return 'bg-neutral-800/80 hover:bg-neutral-700';
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 bg-[#00FF41]/10 rounded-full blur-3xl transform-gpu will-change-transform" />

      {/* 1. Slim Consolidated Header */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-white/5 pb-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            title="Return to Today's Summary"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-neutral-400" />
            <span>Summary</span>
          </button>
        ) : (
          <div />
        )}

        {/* Aggregated Consistency Metric Badge */}
        <div className="inline-flex items-center gap-2 bg-neutral-950/80 border border-white/5 px-3 py-2 rounded-xl text-xs font-mono text-neutral-300 shadow-sm">
          <Award className="w-4 h-4 text-[#00FF41]" />
          <span>
            Consistency:{' '}
            <strong className="text-neutral-100 font-bold tabular-nums">
              {stats.consistencyRate}%
            </strong>{' '}
            <span className="text-neutral-500 font-normal">
              ({stats.targetHitDays}/{stats.loggedDays || 1} days)
            </span>
          </span>
        </div>
      </div>

      {/* 2. Maximized 52-Week Grid */}
      <div className="relative z-10 my-auto py-2">
        <div className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-800">
          <div className="min-w-[680px]">
            {/* The 52x7 Grid (columns: 52 weeks, rows: 7 days) */}
            <div
              className="grid grid-flow-col grid-rows-7 grid-cols-[repeat(52,minmax(0,1fr))] gap-1"
              onMouseLeave={() => setHoveredDay(null)}
            >
              {heatmapDays.map((day) => (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredDay(day)}
                  className={`heatmap-cell w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs transition-all duration-150 cursor-pointer ${getColorClass(
                    day.status
                  )} ${
                    isOverdrive
                      ? (day.status === 'target_hit' || day.status === 'deep_deficit'
                          ? 'shadow-[0_0_6px_rgba(16,185,129,0.5)] '
                          : '') + 'hover:shadow-[0_0_12px_rgba(52,211,153,0.9)] hover:scale-125 z-10'
                      : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Tooltip & Legend Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] pt-2 border-t border-white/5 font-mono text-neutral-400">
        {/* Active Hover readout */}
        <div className="min-h-[22px] flex items-center gap-2">
          {hoveredDay ? (
            <m.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-neutral-300 font-mono text-[11px] tabular-nums"
            >
              <span className="font-semibold text-neutral-100">{hoveredDay.displayDate}:</span>
              {hoveredDay.hasData ? (
                <>
                  <span className="text-amber-400 font-bold">{hoveredDay.calories} kcal</span>
                  <span className="text-neutral-500">/ target {targetCalories} kcal</span>
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold ${hoveredDay.variance <= 0
                        ? 'bg-[#00FF41]/20 text-[#00FF41]'
                        : 'bg-[#E60000]/20 text-rose-400'
                      }`}
                  >
                    {hoveredDay.variance > 0 ? `+${hoveredDay.variance}` : hoveredDay.variance} kcal
                  </span>
                </>
              ) : (
                <span className="text-neutral-500">No logs recorded</span>
              )}
            </m.div>
          ) : (
            <span className="text-[11px] text-neutral-500 flex items-center gap-1.5 font-sans">
              <Info className="w-3.5 h-3.5" />
              Tap or hover a day to view details.
            </span>
          )}
        </div>

        {/* Color Legend */}
        <div className="flex items-center gap-2 text-[10px] text-neutral-400 shrink-0 font-mono">
          <span>Under Goal</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#00FF41]" title="Under Goal" />
            <span className="w-2.5 h-2.5 rounded-xs bg-[#00FF41]/80" title="On Target" />
            <span className="w-2.5 h-2.5 rounded-xs bg-[#E60000]" title="Over Goal" />
            <span className="w-2.5 h-2.5 rounded-xs bg-neutral-800" title="No Data" />
          </div>
          <span>Over Goal</span>
        </div>
      </div>
    </div>
  );
});
