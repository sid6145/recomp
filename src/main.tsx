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
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabSwitch}
      onOpenSOS={() => dispatch(openSOS())}
      hideBottomNav={shouldHideBottomNav}
    >
      {/* Mobile Top Brand Bar & SOS Craving Trigger (hidden on md and above) */}
      <div className="w-full flex md:hidden items-center justify-between py-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00FF41] shadow-[0_0_10px_#00FF41]" />
          <span className="font-mono text-xs font-bold tracking-widest uppercase text-neutral-200">
            recomp
          </span>
        </div>

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
      <App />
    </Provider>
  </React.StrictMode>
);
