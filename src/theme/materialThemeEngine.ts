import {
  Hct,
  SchemeTonalSpot,
  SchemeVibrant,
  MaterialDynamicColors,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';

export interface ThemeSettings {
  seedColor: string;
  themeMode: 'system' | 'light' | 'dark';
  schemeStyle: 'tonal' | 'vibrant';
  overdriveDynamicBoost: boolean;
}

export const CURATED_SWATCHES = [
  { name: 'Botanical Sage', hex: '#1E6B52' },
  { name: 'Pixel Blue', hex: '#1A73E8' },
  { name: 'Material Iris', hex: '#6750A4' },
  { name: 'Terracotta', hex: '#9C4123' },
  { name: 'Berry Rose', hex: '#984061' },
  { name: 'Ochre Gold', hex: '#795900' },
  { name: 'Monochrome Slate', hex: '#444746' },
] as const;

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  seedColor: '#1E6B52',
  themeMode: 'dark',
  schemeStyle: 'tonal',
  overdriveDynamicBoost: true,
};

const THEME_STORAGE_KEY = 'recomp_theme_settings';

export function getPersistedThemeSettings(): ThemeSettings {
  if (typeof window === 'undefined') return DEFAULT_THEME_SETTINGS;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_THEME_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      seedColor: typeof parsed.seedColor === 'string' ? parsed.seedColor : DEFAULT_THEME_SETTINGS.seedColor,
      themeMode: ['system', 'light', 'dark'].includes(parsed.themeMode) ? parsed.themeMode : DEFAULT_THEME_SETTINGS.themeMode,
      schemeStyle: ['tonal', 'vibrant'].includes(parsed.schemeStyle) ? parsed.schemeStyle : DEFAULT_THEME_SETTINGS.schemeStyle,
      overdriveDynamicBoost: typeof parsed.overdriveDynamicBoost === 'boolean' ? parsed.overdriveDynamicBoost : true,
    };
  } catch (e) {
    console.warn('[ThemeEngine] Failed to read persisted theme:', e);
    return DEFAULT_THEME_SETTINGS;
  }
}

export function savePersistedThemeSettings(settings: ThemeSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[ThemeEngine] Failed to persist theme settings:', e);
  }
}

export function resolveIsDark(mode: ThemeSettings['themeMode']): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
}

const dynamicColors = new MaterialDynamicColors();

export interface ComputedM3Tokens {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  surfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  outline: string;
  outlineVariant: string;
  isDark: boolean;
}

export function computeM3Tokens(settings: ThemeSettings, isOverdriveActive = false): ComputedM3Tokens {
  const isDark = resolveIsDark(settings.themeMode);
  let seedArgb = 0xff1e6b52;
  try {
    seedArgb = argbFromHex(settings.seedColor);
  } catch {
    seedArgb = argbFromHex(DEFAULT_THEME_SETTINGS.seedColor);
  }

  const hct = Hct.fromInt(seedArgb);
  const boost = isOverdriveActive && settings.overdriveDynamicBoost;
  if (boost) {
    hct.chroma = Math.max(hct.chroma, 52);
  }

  const useVibrant = boost || settings.schemeStyle === 'vibrant';
  const scheme = useVibrant
    ? new SchemeVibrant(hct, isDark, 0.0)
    : new SchemeTonalSpot(hct, isDark, 0.0);

  return {
    primary: hexFromArgb(dynamicColors.primary().getArgb(scheme)),
    onPrimary: hexFromArgb(dynamicColors.onPrimary().getArgb(scheme)),
    primaryContainer: hexFromArgb(dynamicColors.primaryContainer().getArgb(scheme)),
    onPrimaryContainer: hexFromArgb(dynamicColors.onPrimaryContainer().getArgb(scheme)),
    secondary: hexFromArgb(dynamicColors.secondary().getArgb(scheme)),
    onSecondary: hexFromArgb(dynamicColors.onSecondary().getArgb(scheme)),
    secondaryContainer: hexFromArgb(dynamicColors.secondaryContainer().getArgb(scheme)),
    onSecondaryContainer: hexFromArgb(dynamicColors.onSecondaryContainer().getArgb(scheme)),
    tertiary: hexFromArgb(dynamicColors.tertiary().getArgb(scheme)),
    onTertiary: hexFromArgb(dynamicColors.onTertiary().getArgb(scheme)),
    tertiaryContainer: hexFromArgb(dynamicColors.tertiaryContainer().getArgb(scheme)),
    onTertiaryContainer: hexFromArgb(dynamicColors.onTertiaryContainer().getArgb(scheme)),
    error: hexFromArgb(dynamicColors.error().getArgb(scheme)),
    onError: hexFromArgb(dynamicColors.onError().getArgb(scheme)),
    errorContainer: hexFromArgb(dynamicColors.errorContainer().getArgb(scheme)),
    onErrorContainer: hexFromArgb(dynamicColors.onErrorContainer().getArgb(scheme)),
    surface: hexFromArgb(dynamicColors.surface().getArgb(scheme)),
    onSurface: hexFromArgb(dynamicColors.onSurface().getArgb(scheme)),
    onSurfaceVariant: hexFromArgb(dynamicColors.onSurfaceVariant().getArgb(scheme)),
    surfaceVariant: hexFromArgb(dynamicColors.surfaceVariant().getArgb(scheme)),
    surfaceContainerLowest: hexFromArgb(dynamicColors.surfaceContainerLowest().getArgb(scheme)),
    surfaceContainerLow: hexFromArgb(dynamicColors.surfaceContainerLow().getArgb(scheme)),
    surfaceContainer: hexFromArgb(dynamicColors.surfaceContainer().getArgb(scheme)),
    surfaceContainerHigh: hexFromArgb(dynamicColors.surfaceContainerHigh().getArgb(scheme)),
    surfaceContainerHighest: hexFromArgb(dynamicColors.surfaceContainerHighest().getArgb(scheme)),
    outline: hexFromArgb(dynamicColors.outline().getArgb(scheme)),
    outlineVariant: hexFromArgb(dynamicColors.outlineVariant().getArgb(scheme)),
    isDark,
  };
}

export function applyMaterialYouTheme(settings?: ThemeSettings, isOverdriveActive = false): ComputedM3Tokens {
  const currentSettings = settings ?? getPersistedThemeSettings();
  const tokens = computeM3Tokens(currentSettings, isOverdriveActive);

  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--md-primary', tokens.primary);
    root.style.setProperty('--md-on-primary', tokens.onPrimary);
    root.style.setProperty('--md-primary-container', tokens.primaryContainer);
    root.style.setProperty('--md-on-primary-container', tokens.onPrimaryContainer);
    root.style.setProperty('--md-secondary', tokens.secondary);
    root.style.setProperty('--md-on-secondary', tokens.onSecondary);
    root.style.setProperty('--md-secondary-container', tokens.secondaryContainer);
    root.style.setProperty('--md-on-secondary-container', tokens.onSecondaryContainer);
    root.style.setProperty('--md-tertiary', tokens.tertiary);
    root.style.setProperty('--md-on-tertiary', tokens.onTertiary);
    root.style.setProperty('--md-tertiary-container', tokens.tertiaryContainer);
    root.style.setProperty('--md-on-tertiary-container', tokens.onTertiaryContainer);
    root.style.setProperty('--md-error', tokens.error);
    root.style.setProperty('--md-on-error', tokens.onError);
    root.style.setProperty('--md-error-container', tokens.errorContainer);
    root.style.setProperty('--md-on-error-container', tokens.onErrorContainer);
    root.style.setProperty('--md-surface', tokens.surface);
    root.style.setProperty('--md-on-surface', tokens.onSurface);
    root.style.setProperty('--md-on-surface-variant', tokens.onSurfaceVariant);
    root.style.setProperty('--md-surface-variant', tokens.surfaceVariant);
    root.style.setProperty('--md-surface-container-lowest', tokens.surfaceContainerLowest);
    root.style.setProperty('--md-surface-container-low', tokens.surfaceContainerLow);
    root.style.setProperty('--md-surface-container', tokens.surfaceContainer);
    root.style.setProperty('--md-surface-container-high', tokens.surfaceContainerHigh);
    root.style.setProperty('--md-surface-container-highest', tokens.surfaceContainerHighest);
    root.style.setProperty('--md-outline', tokens.outline);
    root.style.setProperty('--md-outline-variant', tokens.outlineVariant);

    // Bridge variables for backwards compatibility and seamless styling
    root.style.setProperty('--app-bg', tokens.surface);
    root.style.setProperty('--color-surface-base', tokens.surface);
    root.style.setProperty('--color-surface-card', tokens.surfaceContainer);
    root.style.setProperty('--color-surface-elevated', tokens.surfaceContainerHigh);
    root.style.setProperty('--color-text-main', tokens.onSurface);
    root.style.setProperty('--color-text-muted', tokens.onSurfaceVariant);
    root.style.setProperty('--color-brand-primary', tokens.primary);
    root.style.setProperty('--color-brand-accent', tokens.primaryContainer);

    root.setAttribute('data-theme-mode', tokens.isDark ? 'dark' : 'light');
    root.style.colorScheme = tokens.isDark ? 'dark' : 'light';

    // Synchronize PWA status bar / theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', tokens.surface);
    }
  }

  return tokens;
}
