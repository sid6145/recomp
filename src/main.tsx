import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { GoalSetter } from './components/GoalSetter';
import { FoodSearchDashboard } from './components/FoodSearchDashboard';
import { RecipeBuilder } from './components/RecipeBuilder';
import { SOSModal } from './components/SOSModal';
import { DiaryView } from './components/DiaryView';
import { Layout } from './components/Layout';
import { type NavigationTab } from './components/CommandBar';
import { openSOS } from './store/sosSlice';
import { ShieldAlert } from 'lucide-react';
import { useAppDispatch, useAppSelector } from './store/store';
import { getFoodLogsForDate, deleteFoodLog } from './db/logManager';
import { setLogEntries, removeLogEntry } from './store/logsSlice';
import { initializeDatabase } from './db/dbSeeder';
import { useHaptics } from './hooks/useHaptics';
import { MomentumProvider } from './context/MomentumContext';
import { MomentumHudPill } from './components/MomentumHudPill';
import { loadProfileFromDb, syncProfileToDb } from './db/profileSync';
import { setHydratedProfile, markHydrated } from './store/userSlice';
import './index.css';

interface DailyDiaryProps {
  onNavigateToSearch: () => void;
}

const DailyDiary: React.FC<DailyDiaryProps> = ({ onNavigateToSearch }) => {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((state) => state.logs.entries);
  const targetCalories = useAppSelector((state) => state.user.dailyCaloricTarget);
  const isHydrated = useAppSelector((state) => state.user.isHydrated);

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

  if (!isHydrated) {
    return (
      <div
        data-testid="diary-loading"
        className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[360px]"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#00FF41]/30 border-t-[#00FF41] animate-spin" />
          <span className="text-xs font-mono text-neutral-400">Loading metabolic profile...</span>
        </div>
      </div>
    );
  }

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

  // Hydrate user profile from Dexie on startup as single source of truth
  useEffect(() => {
    loadProfileFromDb().then((saved) => {
      if (saved) {
        dispatch(setHydratedProfile(saved));
      } else {
        dispatch(markHydrated());
        syncProfileToDb({ ...store.getState().user, isHydrated: true });
      }
    });
  }, [dispatch]);

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
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabSwitch}
      onOpenSOS={() => dispatch(openSOS())}
      hideBottomNav={shouldHideBottomNav}
    >
      {/* Mobile Top Brand Bar & SOS Craving Trigger (hidden on md and above) */}
      <div className="w-full flex md:hidden items-center justify-between py-3 mb-2">
        <div className="flex items-center gap-2">
          <img
            src="/pwa-192x192.png"
            alt="Recomp Logo"
            className="w-6 h-6 rounded-md object-cover shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0 border border-emerald-500/20"
          />
          <div className="w-2 h-2 rounded-full bg-[#00FF41] shadow-[0_0_10px_#00FF41]" />
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-neutral-200">
            recomp
          </span>
        </div>

        <div className="flex items-center gap-2">
          <MomentumHudPill compact />
          <button
            type="button"
            onClick={() => {
              haptics.heartbeat(0.8);
              dispatch(openSOS());
            }}
            className="min-h-[44px] min-w-[44px] inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all cursor-pointer shadow-lg shadow-rose-950/40 active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>SOS Craving</span>
          </button>
        </div>
      </div>

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

      {/* SOS Craving Full-Screen Intervention Modal */}
      <SOSModal />
    </Layout>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <MomentumProvider>
        <App />
      </MomentumProvider>
    </Provider>
  </React.StrictMode>
);
