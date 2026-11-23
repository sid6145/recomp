import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { GoalSetter } from './components/GoalSetter';
import { FoodSearchDashboard } from './components/FoodSearchDashboard';
import { RecipeBuilder } from './components/RecipeBuilder';
import { SOSModal } from './components/SOSModal';
import { CravingRebalanceModal } from './components/CravingRebalanceModal';
import { DiaryView } from './components/DiaryView';
import { Layout } from './components/Layout';
import { type NavigationTab } from './components/CommandBar';
import { openSOS, closeCravingRebalance } from './store/sosSlice';
import { openPaletteSheet } from './store/themeSlice';
import { MaterialIcon } from './components/MaterialIcon';
import { ThemeCustomizerSheet } from './components/ThemeCustomizerSheet';
import { applyMaterialYouTheme } from './theme/materialThemeEngine';
import { useAppDispatch, useAppSelector } from './store/store';
import { getFoodLogsForDate, deleteFoodLog } from './db/logManager';
import { setLogEntries, removeLogEntry } from './store/logsSlice';
import { initializeDatabase } from './db/dbSeeder';
import { useHaptics } from './hooks/useHaptics';
import { MomentumProvider, useMomentum } from './context/MomentumContext';
import { MomentumHudPill } from './components/MomentumHudPill';
import { loadProfileFromDb, syncProfileToDb } from './db/profileSync';
import { setHydratedProfile, markHydrated } from './store/userSlice';
import { LazyMotion, domAnimation, AnimatePresence, m } from 'framer-motion';
import './index.css';

// Zero-FOUC Synchronous Boot: compute & inject M3 theme custom properties before React root mounts
applyMaterialYouTheme();

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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);

  const isSOSActive = useAppSelector((state) => state.sos.isSOSActive);
  const isCravingRebalanceOpen = useAppSelector((state) => state.sos.isCravingRebalanceOpen);
  const themeState = useAppSelector((state) => state.theme);
  const { isOverdrive } = useMomentum();
  const haptics = useHaptics();

  // Sync theme changes with Overdrive state and settings
  useEffect(() => {
    applyMaterialYouTheme(themeState, isOverdrive);
  }, [themeState, isOverdrive]);

  // Mobile virtual keyboard viewport height watcher
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const handleResize = () => {
      if (!window.visualViewport) return;
      const isKeyboard = window.visualViewport.height < window.innerHeight * 0.75;
      setIsKeyboardOpen(isKeyboard);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

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
  const shouldShowFAB = !isKeyboardOpen && !isBottomSheetOpen && !isSOSActive && activeTab !== 'search';

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabSwitch}
      onOpenSOS={() => dispatch(openSOS())}
      hideBottomNav={shouldHideBottomNav}
    >
      {/* Mobile M3 Top App Bar (64px height, --md-surface, hidden on md and above) */}
      <div className="w-full flex md:hidden items-center justify-between h-16 px-1 mb-2">
        {/* Left: Recomp Brand Title */}
        <div className="flex items-center gap-2.5">
          <img
            src="/pwa-192x192.png"
            alt="Recomp Logo"
            className="w-7 h-7 rounded-lg object-cover shadow-sm shrink-0"
          />
          <span className="font-display text-[22px] font-bold tracking-tight text-[var(--md-on-surface)]">
            Recomp
          </span>
        </div>

        {/* Right Cluster: Momentum Pill + Palette Button + SOS Craving Button */}
        <div className="flex items-center gap-2">
          <MomentumHudPill compact />

          {/* Theme Palette Button (40px circular tonal icon button) */}
          <button
            type="button"
            onClick={() => {
              haptics.tick();
              dispatch(openPaletteSheet());
            }}
            className="w-10 h-10 rounded-full bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] flex items-center justify-center transition-colors active:scale-95 m3-state-layer cursor-pointer"
            title="Theme Palette"
            aria-label="Theme Customizer"
          >
            <MaterialIcon name="palette" size={20} />
          </button>

          {/* SOS Craving Trigger */}
          <button
            type="button"
            onClick={() => {
              haptics.heartbeat(0.8);
              dispatch(openSOS());
            }}
            className="min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-bold bg-[var(--md-error-container)] text-[var(--md-on-error-container)] flex items-center gap-1.5 transition-transform active:scale-95 m3-state-layer cursor-pointer shadow-sm"
          >
            <MaterialIcon name="warning" filled size={16} className="text-[var(--md-error)]" />
            <span>SOS</span>
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

      {/* M3 Extended FAB (Bottom-right, 56px height, rounded-2xl, --md-primary-container / --md-on-primary-container) */}
      <AnimatePresence>
        {shouldShowFAB && (
          <m.button
            initial={{ opacity: 0, scale: 0.8, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 16 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            type="button"
            onClick={() => {
              haptics.tick();
              setActiveTab('search');
            }}
            className="fixed bottom-[96px] md:bottom-8 right-6 z-40 h-14 px-5 rounded-2xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] shadow-lg hover:shadow-xl flex items-center gap-2.5 font-display font-semibold text-sm cursor-pointer transition-transform active:scale-95 m3-state-layer"
            aria-label="Log Food"
          >
            <MaterialIcon name="add" size={24} />
            <span>Log Food</span>
          </m.button>
        )}
      </AnimatePresence>

      {/* SOS Craving Full-Screen Intervention Modal */}
      <SOSModal />

      {/* Deterministic Craving & Meal Rebalancing Modal */}
      <CravingRebalanceModal
        isOpen={isCravingRebalanceOpen}
        onClose={() => dispatch(closeCravingRebalance())}
      />

      {/* Android Wallpaper & Style Theme Customizer Sheet */}
      <ThemeCustomizerSheet />
    </Layout>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <MomentumProvider>
        <LazyMotion features={domAnimation} strict>
          <App />
        </LazyMotion>
      </MomentumProvider>
    </Provider>
  </React.StrictMode>
);
