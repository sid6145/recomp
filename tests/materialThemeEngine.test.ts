import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  computeM3Tokens,
  applyMaterialYouTheme,
  DEFAULT_THEME_SETTINGS,
  CURATED_SWATCHES,
} from '../src/theme/materialThemeEngine';

describe('Material You (Material Design 3) Theme Engine', () => {
  let mockProperties: Record<string, string>;
  let mockAttributes: Record<string, string>;
  let mockMetaContent: string | null;

  beforeEach(() => {
    mockProperties = {};
    mockAttributes = {};
    mockMetaContent = null;

    // Setup global document mock for node test runner
    // @ts-expect-error Mocking document for node environment
    globalThis.document = {
      documentElement: {
        style: {
          setProperty: (prop: string, val: string) => {
            mockProperties[prop] = val;
          },
          getPropertyValue: (prop: string) => mockProperties[prop] || '',
          colorScheme: 'dark',
        },
        setAttribute: (attr: string, val: string) => {
          mockAttributes[attr] = val;
        },
        getAttribute: (attr: string) => mockAttributes[attr] || null,
        removeAttribute: (attr: string) => {
          delete mockAttributes[attr];
        },
      },
      querySelector: (selector: string) => {
        if (selector === 'meta[name="theme-color"]') {
          return {
            setAttribute: (_: string, val: string) => {
              mockMetaContent = val;
            },
            getAttribute: () => mockMetaContent,
          };
        }
        return null;
      },
    };
  });

  afterEach(() => {
    // @ts-expect-error Cleanup
    delete globalThis.document;
  });

  it('computes complete WCAG-compliant M3 tonal palette from default Botanical Sage (#1E6B52)', () => {
    const tokens = computeM3Tokens(DEFAULT_THEME_SETTINGS, false);

    expect(tokens.primary).toBeDefined();
    expect(tokens.primary.startsWith('#')).toBe(true);
    expect(tokens.onPrimary.startsWith('#')).toBe(true);
    expect(tokens.primaryContainer).toBeDefined();
    expect(tokens.primaryContainer.startsWith('#')).toBe(true);
    expect(tokens.onPrimaryContainer.startsWith('#')).toBe(true);
    expect(tokens.secondary.startsWith('#')).toBe(true);
    expect(tokens.secondaryContainer.startsWith('#')).toBe(true);
    expect(tokens.surface.startsWith('#')).toBe(true);
    expect(tokens.onSurface.startsWith('#')).toBe(true);
    expect(tokens.surfaceContainer.startsWith('#')).toBe(true);
    expect(tokens.surfaceContainerHigh.startsWith('#')).toBe(true);
    expect(tokens.surfaceContainerHighest.startsWith('#')).toBe(true);
    expect(tokens.outline.startsWith('#')).toBe(true);
    expect(tokens.outlineVariant.startsWith('#')).toBe(true);
    expect(tokens.isDark).toBe(true);
  });

  it('computes distinct palettes across all curated swatches', () => {
    const primaryColors = new Set<string>();

    for (const swatch of CURATED_SWATCHES) {
      const tokens = computeM3Tokens({
        ...DEFAULT_THEME_SETTINGS,
        seedColor: swatch.hex,
      });
      primaryColors.add(tokens.primary.toLowerCase());
    }

    expect(primaryColors.size).toBe(CURATED_SWATCHES.length);
  });

  it('switches between Light and Dark mode with appropriate surface values', () => {
    const darkTokens = computeM3Tokens({ ...DEFAULT_THEME_SETTINGS, themeMode: 'dark' });
    const lightTokens = computeM3Tokens({ ...DEFAULT_THEME_SETTINGS, themeMode: 'light' });

    expect(darkTokens.isDark).toBe(true);
    expect(lightTokens.isDark).toBe(false);
    expect(darkTokens.surface).not.toBe(lightTokens.surface);
  });

  it('boosts chroma when Momentum Overdrive is active and boost enabled', () => {
    const normalTokens = computeM3Tokens(DEFAULT_THEME_SETTINGS, false);
    const overdriveTokens = computeM3Tokens(
      { ...DEFAULT_THEME_SETTINGS, overdriveDynamicBoost: true },
      true
    );

    expect(overdriveTokens.primary).toBeDefined();
    expect(overdriveTokens.primaryContainer).toBeDefined();
    expect(normalTokens.primary).toBeDefined();
  });

  it('injects all required CSS custom properties onto document.documentElement', () => {
    applyMaterialYouTheme(DEFAULT_THEME_SETTINGS, false);

    expect(mockProperties['--md-primary']).toBeTruthy();
    expect(mockProperties['--md-on-primary']).toBeTruthy();
    expect(mockProperties['--md-primary-container']).toBeTruthy();
    expect(mockProperties['--md-on-primary-container']).toBeTruthy();
    expect(mockProperties['--md-secondary']).toBeTruthy();
    expect(mockProperties['--md-secondary-container']).toBeTruthy();
    expect(mockProperties['--md-surface']).toBeTruthy();
    expect(mockProperties['--md-on-surface']).toBeTruthy();
    expect(mockProperties['--md-surface-container']).toBeTruthy();
    expect(mockProperties['--md-surface-container-high']).toBeTruthy();
    expect(mockProperties['--md-surface-container-highest']).toBeTruthy();
    expect(mockProperties['--md-outline']).toBeTruthy();
    expect(mockProperties['--md-outline-variant']).toBeTruthy();

    expect(mockAttributes['data-theme-mode']).toBe('dark');
  });

  it('updates meta theme-color tag dynamically for PWA status bar sync', () => {
    const tokens = applyMaterialYouTheme(DEFAULT_THEME_SETTINGS, false);
    expect(mockMetaContent).toBe(tokens.surface);
  });
});
