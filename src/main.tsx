import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { AnimatePresence } from 'framer-motion';
import { store } from './store/store';
import { GoalSetter } from './components/GoalSetter';
import { FoodSearchDashboard } from './components/FoodSearchDashboard';
import { RecipeBuilder } from './components/RecipeBuilder';
import { SOSModal } from './components/SOSModal';
import { DiaryView } from './components/DiaryView';
import { CommandBar, type NavigationTab } from './components/CommandBar';
import { openSOS } from './store/sosSlice';
import { Target, Search, BookOpen, UtensilsCrossed, ShieldAlert } from 'lucide-react';
import { useAppDispatch, useAppSelector } from './store/store';
import { getFoodLogsForDate, deleteFoodLog } from './db/logManager';
import { setLogEntries, removeLogEntry } from './store/logsSlice';
import { initializeDatabase } from './db/dbSeeder';
import { useHaptics } from './hooks/useHaptics';
import './index.css';

interface DailyDiaryProps {
  onNavigateToSearch: () => void;
}

const DailyDiary: React.FC<DailyDiaryProps> = ({ onNavigateToSearch }) => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((state) => state.logs.entries);
  const targetCalories = useAppSelector((state) => state.user.dailyCaloricTarget);

  // Sync entries from IndexedDB on mount
  useEffect(() => {
    getFoodLogsForDate().then((saved) => {
      dispatch(
        setLogEntries(
          saved.map((item) => ({
            id: item.id!,
            date: item.date,
            foodId: item.foodId,
            foodName: item.foodName,
            selectedUnit: item.selectedUnit,
            quantity: item.quantity,
            totalCalories: item.totalCalories,
            timestamp: item.timestamp,
            calculatedMacros: item.calculatedMacros,
          }))
        )
      );
    });
  }, [dispatch]);

  const handleDelete = async (id: number) => {
    await deleteFoodLog(id);
    dispatch(removeLogEntry(id));
  };

  return (
    <DiaryView
      entries={entries}
      targetCalories={targetCalories}
      onNavigateToSearch={onNavigateToSearch}
      onDeleteEntry={handleDelete}
    />
  );
};

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<NavigationTab>('diary');
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState<boolean>(false);

  const isSOSActive = useAppSelector((state) => state.sos.isSOSActive);
  const haptics = useHaptics();

  // Initialize food items immediately at root mount
  useEffect(() => {
    initializeDatabase().catch((err) => {
      console.error('App database initialization error:', err);
    });
  }, []);

  const handleTabSwitch = (tab: NavigationTab) => {
    haptics.tick();
    setActiveTab(tab);
  };

  const shouldHideBottomNav = isBottomSheetOpen || isSOSActive;

  return (
    <main className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col items-center pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] px-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))] space-y-6">
      {/* Top Header Bar: Responsive Navigation Switcher & SOS Craving Trigger */}
      <header className="w-full max-w-4xl flex items-center justify-between gap-3">
        {/* Mobile brand indicator */}
        <div className="flex md:hidden items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00FF41] shadow-[0_0_10px_#00FF41]" />
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-neutral-200">
            recomp
          </span>
        </div>

        {/* Desktop Navigation Switcher (min 44px touch targets) */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:inline-flex items-center p-1.5 rounded-2xl bg-neutral-900/90 border border-white/5 shadow-xl backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() => handleTabSwitch('diary')}
            className={`min-h-[44px] flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'diary'
                ? 'bg-[#00FF41] text-neutral-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Daily Diary</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('search')}
            className={`min-h-[44px] flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-[#00FF41] text-neutral-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>AI Food Search</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('recipe')}
            className={`min-h-[44px] flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'recipe'
                ? 'bg-[#00FF41] text-neutral-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Recipe Builder</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('goal')}
            className={`min-h-[44px] flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'goal'
                ? 'bg-[#00FF41] text-neutral-950 shadow-[0_0_15px_rgba(0,255,65,0.25)] font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Goal &amp; Target</span>
          </button>
        </nav>

        {/* SOS Craving Defeat Trigger */}
        <button
          type="button"
          onClick={() => {
            haptics.heartbeat(0.8);
            dispatch(openSOS());
          }}
          className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-lg shadow-rose-950/40 hover:scale-[1.02] active:scale-[0.98] ml-auto md:ml-0"
        >
          <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>SOS Craving</span>
        </button>
      </header>

      {/* Screen Views */}
      <div className="w-full flex justify-center">
        {activeTab === 'diary' && (
          <DailyDiary onNavigateToSearch={() => setActiveTab('search')} />
        )}
        {activeTab === 'search' && (
          <FoodSearchDashboard onBottomSheetToggle={setIsBottomSheetOpen} />
        )}
        {activeTab === 'recipe' && (
          <RecipeBuilder onRecipeSaved={() => setActiveTab('diary')} />
        )}
        {activeTab === 'goal' && <GoalSetter />}
      </div>

      {/* Floating Bottom Navigation Bar (Raycast / iOS Floating Dock) */}
      <AnimatePresence>
        {!shouldHideBottomNav && (
          <CommandBar
            activeTab={activeTab}
            onTabChange={handleTabSwitch}
            onOpenSOS={() => dispatch(openSOS())}
          />
        )}
      </AnimatePresence>

      {/* SOS Craving Full-Screen Intervention Modal */}
      <SOSModal />
    </main>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
