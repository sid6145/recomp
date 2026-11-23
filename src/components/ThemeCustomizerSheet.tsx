import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence } from 'framer-motion';
import { MaterialIcon } from './MaterialIcon';
import { useAppDispatch, useAppSelector } from '../store/store';
import {
  setSeedColor,
  setThemeMode,
  setSchemeStyle,
  setOverdriveDynamicBoost,
  closePaletteSheet,
} from '../store/themeSlice';
import { CURATED_SWATCHES, computeM3Tokens } from '../theme/materialThemeEngine';
import { useHaptics } from '../hooks/useHaptics';

export const ThemeCustomizerSheet: React.FC = () => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme);
  const isOpen = theme.isPaletteSheetOpen;
  const haptics = useHaptics();

  const [customHex, setCustomHex] = useState(theme.seedColor);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      dispatch(setSeedColor(val));
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    dispatch(setSeedColor(val));
  };

  const handleSwatchSelect = (hex: string) => {
    haptics.tick();
    setCustomHex(hex);
    dispatch(setSeedColor(hex));
  };

  const handleClose = () => {
    haptics.tick();
    dispatch(closePaletteSheet());
  };

  // Compute live tokens for mini preview
  const previewTokens = computeM3Tokens(
    {
      seedColor: customHex.startsWith('#') && customHex.length === 7 ? customHex : theme.seedColor,
      themeMode: theme.themeMode,
      schemeStyle: theme.schemeStyle,
      overdriveDynamicBoost: theme.overdriveDynamicBoost,
    },
    false
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center pointer-events-auto">
          {/* Backdrop Scrim */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Modal Bottom Sheet */}
          <m.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg rounded-t-[28px] bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden z-10 border-t border-[var(--md-outline-variant)]/30"
          >
            {/* Centered Drag Handle Pill */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab">
              <div className="w-8 h-1 rounded-full bg-[var(--md-outline-variant)] opacity-60" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--md-outline-variant)]/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center">
                  <MaterialIcon name="palette" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display tracking-tight text-[var(--md-on-surface)]">
                    Wallpaper &amp; Style
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">
                    Material You Dynamic Color
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-full text-[var(--md-on-surface-variant)] hover:bg-[var(--md-on-surface)]/10 flex items-center justify-center transition-colors m3-state-layer"
                aria-label="Close theme customizer"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </div>

            {/* Scrollable Content (Single scroll container) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* 1. Live Interactive Mini-Preview Card */}
              <div
                className="p-4 rounded-[24px] border border-[var(--md-outline-variant)]/40 flex flex-col gap-3 transition-colors duration-300"
                style={{ backgroundColor: previewTokens.surfaceContainer }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider font-display"
                    style={{ color: previewTokens.onSurfaceVariant }}
                  >
                    Live Theme Preview
                  </span>
                  <div
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{
                      backgroundColor: previewTokens.primaryContainer,
                      color: previewTokens.onPrimaryContainer,
                    }}
                  >
                    Active Palette
                  </div>
                </div>

                <div className="flex items-center justify-around gap-4 py-2">
                  {/* Miniature Calorie Ring */}
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                      <circle
                        cx="32"
                        cy="32"
                        r="24"
                        fill="transparent"
                        stroke={previewTokens.surfaceContainerHighest}
                        strokeWidth="6"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="24"
                        fill="transparent"
                        stroke={previewTokens.primary}
                        strokeWidth="6"
                        strokeDasharray={150}
                        strokeDashoffset={45}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="text-[12px] font-mono font-bold tabular-nums"
                        style={{ color: previewTokens.onSurface }}
                      >
                        1,840
                      </span>
                    </div>
                  </div>

                  {/* Macro Pills Preview */}
                  <div className="flex flex-col gap-1.5 flex-1 max-w-[130px]">
                    <div
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center justify-between"
                      style={{
                        backgroundColor: previewTokens.secondaryContainer,
                        color: previewTokens.onSecondaryContainer,
                      }}
                    >
                      <span>Protein</span>
                      <span className="font-mono tabular-nums font-bold">142g</span>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center justify-between"
                      style={{
                        backgroundColor: previewTokens.tertiaryContainer,
                        color: previewTokens.onTertiaryContainer,
                      }}
                    >
                      <span>Carbs</span>
                      <span className="font-mono tabular-nums font-bold">190g</span>
                    </div>
                  </div>

                  {/* Mini Extended FAB Preview */}
                  <div
                    className="h-10 px-3.5 rounded-2xl flex items-center gap-1.5 shadow-sm text-xs font-semibold"
                    style={{
                      backgroundColor: previewTokens.primaryContainer,
                      color: previewTokens.onPrimaryContainer,
                    }}
                  >
                    <MaterialIcon name="add" size={16} />
                    <span>Log</span>
                  </div>
                </div>
              </div>

              {/* 2. Mode Selector: Segmented Button Group */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wide uppercase text-[var(--md-on-surface-variant)] font-display">
                  Appearance Mode
                </label>
                <div className="grid grid-cols-3 p-1 rounded-full bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]/30">
                  {(['light', 'dark', 'system'] as const).map((mode) => {
                    const isSelected = theme.themeMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          haptics.tick();
                          dispatch(setThemeMode(mode));
                        }}
                        className={`min-h-[40px] rounded-full text-xs font-medium capitalize flex items-center justify-center gap-1.5 transition-all m3-state-layer ${
                          isSelected
                            ? 'bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] font-bold shadow-sm'
                            : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
                        }`}
                      >
                        <MaterialIcon
                          name={
                            mode === 'light'
                              ? 'light_mode'
                              : mode === 'dark'
                              ? 'dark_mode'
                              : 'settings_brightness'
                          }
                          size={16}
                          filled={isSelected}
                        />
                        <span>{mode}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Curated Two-Tone M3 Swatches */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold tracking-wide uppercase text-[var(--md-on-surface-variant)] font-display">
                  Curated Material Tones
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
                  {CURATED_SWATCHES.map((swatch) => {
                    const isSelected = theme.seedColor.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => handleSwatchSelect(swatch.hex)}
                        title={swatch.name}
                        className={`group flex flex-col items-center gap-1.5 p-2 rounded-[20px] transition-all m3-state-layer ${
                          isSelected
                            ? 'bg-[var(--md-secondary-container)] ring-2 ring-[var(--md-primary)]'
                            : 'bg-[var(--md-surface-container)] hover:bg-[var(--md-surface-container-highest)]'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center shadow-md relative overflow-hidden transition-transform group-hover:scale-105"
                          style={{ backgroundColor: swatch.hex }}
                        >
                          {/* Split-circle accent */}
                          <div
                            className="absolute bottom-0 right-0 w-5 h-5 rounded-tl-full opacity-60"
                            style={{ backgroundColor: '#ffffff' }}
                          />
                          {isSelected && (
                            <MaterialIcon
                              name="check"
                              size={20}
                              className="text-white drop-shadow relative z-10"
                            />
                          )}
                        </div>
                        <span className="text-[10px] font-medium truncate max-w-full text-[var(--md-on-surface-variant)]">
                          {swatch.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. "Any Color" Custom Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wide uppercase text-[var(--md-on-surface-variant)] font-display">
                  Custom Seed Hue
                </label>
                <div className="flex items-center gap-3 p-3 rounded-[24px] bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]/30">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-inner shrink-0 border border-white/20">
                    <input
                      type="color"
                      value={customHex.startsWith('#') && customHex.length === 7 ? customHex : '#1e6b52'}
                      onChange={handleColorPickerChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Select custom seed color"
                    />
                    <div
                      className="w-full h-full pointer-events-none"
                      style={{ backgroundColor: customHex }}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] text-[var(--md-on-surface-variant)] block">
                      Hex Code
                    </span>
                    <input
                      type="text"
                      maxLength={7}
                      value={customHex}
                      onChange={handleHexChange}
                      placeholder="#1E6B52"
                      className="w-full bg-transparent font-mono text-sm font-bold text-[var(--md-on-surface)] focus:outline-none uppercase"
                    />
                  </div>
                  <span
                    className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: previewTokens.primary }}
                    title="Computed Primary Tone"
                  />
                </div>
              </div>

              {/* 5. Style & Overdrive Toggles */}
              <div className="space-y-3 pt-2 border-t border-[var(--md-outline-variant)]/20 pb-4">
                {/* Vibrant Mode Switch */}
                <div className="flex items-center justify-between p-3 rounded-[20px] bg-[var(--md-surface-container)]">
                  <div className="space-y-0.5 pr-3">
                    <span className="text-sm font-semibold text-[var(--md-on-surface)] font-display block">
                      Vibrant Color Scheme
                    </span>
                    <span className="text-xs text-[var(--md-on-surface-variant)] block">
                      Amplifies color saturation via SchemeVibrant
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme.schemeStyle === 'vibrant'}
                    onClick={() => {
                      haptics.tick();
                      dispatch(
                        setSchemeStyle(theme.schemeStyle === 'vibrant' ? 'tonal' : 'vibrant')
                      );
                    }}
                    className={`relative w-[52px] h-[32px] rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      theme.schemeStyle === 'vibrant'
                        ? 'bg-[var(--md-primary)]'
                        : 'bg-[var(--md-surface-container-highest)] border border-[var(--md-outline)]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                        theme.schemeStyle === 'vibrant'
                          ? 'translate-x-5 bg-[var(--md-on-primary)] text-[var(--md-primary)]'
                          : 'translate-x-0 bg-[var(--md-outline)]'
                      }`}
                    >
                      {theme.schemeStyle === 'vibrant' && (
                        <MaterialIcon name="check" size={14} />
                      )}
                    </div>
                  </button>
                </div>

                {/* Dynamic Overdrive Boost Switch */}
                <div className="flex items-center justify-between p-3 rounded-[20px] bg-[var(--md-surface-container)]">
                  <div className="space-y-0.5 pr-3">
                    <span className="text-sm font-semibold text-[var(--md-on-surface)] font-display block">
                      Dynamic Overdrive Boost
                    </span>
                    <span className="text-xs text-[var(--md-on-surface-variant)] block">
                      Visibly energizes UI chroma when Momentum Overdrive is active
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme.overdriveDynamicBoost}
                    onClick={() => {
                      haptics.tick();
                      dispatch(setOverdriveDynamicBoost(!theme.overdriveDynamicBoost));
                    }}
                    className={`relative w-[52px] h-[32px] rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                      theme.overdriveDynamicBoost
                        ? 'bg-[var(--md-primary)]'
                        : 'bg-[var(--md-surface-container-highest)] border border-[var(--md-outline)]'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${
                        theme.overdriveDynamicBoost
                          ? 'translate-x-5 bg-[var(--md-on-primary)] text-[var(--md-primary)]'
                          : 'translate-x-0 bg-[var(--md-outline)]'
                      }`}
                    >
                      {theme.overdriveDynamicBoost && (
                        <MaterialIcon name="check" size={14} />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
