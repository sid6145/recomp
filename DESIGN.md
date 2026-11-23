# Material You (Material Design 3) Design System Specification
**Project:** Recomp (`recomp-plum-seven.vercel.app`)  
**Architecture:** Zero-Regression Material Design 3 (M3) with Dynamic HCT Theme Engine  
**Living Document Version:** 1.0.0 (Production Verified)

---

## 1. Design Philosophy & Aesthetic Principles

Recomp's user interface is engineered according to **Google Material Design 3 (Material You)** specifications, tailored for a high-performance, biometric-driven Progressive Web App (PWA).

### Core Tenets
1. **Tonal Elevation Over Hard Borders:**
   - Cards, dialogs, sheets, and menus do not rely on high-contrast `1px solid` border frames or neon drop shadows.
   - Spatial hierarchy is established strictly via tonal surface container stepping:
     `--md-surface` $\rightarrow$ `--md-surface-container-lowest` $\rightarrow$ `--md-surface-container-low` $\rightarrow$ `--md-surface-container` $\rightarrow$ `--md-surface-container-high` $\rightarrow$ `--md-surface-container-highest`.
2. **Squircle & Stadium Pill Contrast:**
   - Primary structural content surfaces (Hero cards, Bottom Sheets, Heatmap) use generous squircle radii (`rounded-[28px]`).
   - Interactive controls (search bars, action buttons, filter chips, navigation indicators, segmented buttons, status badges) use stadium pill shapes (`rounded-full` / `9999px`).
   - Floating Action Buttons (FAB) adopt the standard M3 squircle radius (`rounded-2xl` / `16px`).
3. **Tabular Numerals for Metabolic Data:**
   - All dynamic counters, gram metrics, timers, percentages, and heatmap variance numbers enforce `font-variant-numeric: tabular-nums` (`.tabular-nums`) to prevent layout shift during tick updates.
4. **60fps GPU-Composited State Transitions:**
   - Interactions avoid expensive repaints or full-viewport `backdrop-filter: blur(20px)` layers that degrade low-end mobile performance.
   - All state shifts and transitions operate strictly on GPU-composited layers (`transform` and `opacity`) using standard Material 3 easing:
     $$\text{ease-m3} = \text{cubic-bezier}(0.2, 0, 0, 1)$$

---

## 2. Dynamic Color Engine & Token Architecture

The theme engine is implemented in [`src/theme/materialThemeEngine.ts`](file:///c:/projects/kalTrack/src/theme/materialThemeEngine.ts) powered by Google's official [`@material/material-color-utilities`](https://github.com/material-foundation/material-color-utilities).

### HCT Algorithmic Pipeline
- **Source Hex to ARGB:** User seed color is converted via `argbFromHex(seedColor)`.
- **HCT Color Space (`Hct`):** Seed is decomposed into Hue, Chroma, and Tone.
- **Overdrive Dynamic Boost:** When the user enters *Momentum Overdrive* (multi-day calorie/protein target streak) and `overdriveDynamicBoost` is enabled, the theme engine dynamically pumps chroma:
  ```ts
  if (boost) {
    hct.chroma = Math.max(hct.chroma, 52);
  }
  ```
- **Scheme Construction:** Emits either `SchemeTonalSpot` (default balanced M3 scheme) or `SchemeVibrant` (when Overdrive is active or `schemeStyle === 'vibrant'`).
- **Dynamic Color Extraction:** `MaterialDynamicColors` evaluates the scheme for both `isDark` and light modes to generate full contrast-compliant tokens.

### Synchronous Zero-FOUC Boot
To guarantee zero Flash of Unstyled Content (FOUC), [`src/main.tsx`](file:///c:/projects/kalTrack/src/main.tsx) invokes `applyMaterialYouTheme()` **synchronously** before `ReactDOM.createRoot` executes:
```ts
// main.tsx
import { applyMaterialYouTheme } from './theme/materialThemeEngine';
applyMaterialYouTheme(); // Hydrates from localStorage 'recomp_theme_settings' synchronously
```

### Dynamic PWA Status Bar Synchronization
Whenever the theme, seed color, or mode toggles, `applyMaterialYouTheme()` updates the mobile OS browser chrome:
```ts
const metaThemeColor = document.querySelector('meta[name="theme-color"]');
if (metaThemeColor) {
  metaThemeColor.setAttribute('content', tokens.surface);
}
```

### Complete M3 CSS Custom Properties Reference
All tokens are injected onto `:root` (`document.documentElement.style`):

| Token Name | Token Role / Typical Surface | Default Dark Baseline |
| :--- | :--- | :--- |
| `--md-primary` | Primary accent, filled CTA buttons, progress arcs | `#1E6B52` |
| `--md-on-primary` | Text/icons on `--md-primary` | `#FFFFFF` |
| `--md-primary-container` | High-emphasis accent containers, Extended FAB, Momentum pill | `#A7F2D2` |
| `--md-on-primary-container` | Text/icons on primary container | `#002116` |
| `--md-secondary` | Secondary accent, tonal details | `#4C6358` |
| `--md-on-secondary` | Text/icons on secondary accent | `#FFFFFF` |
| `--md-secondary-container` | Weekend Bank card, active bottom nav indicator pill | `#CEE9DA` |
| `--md-on-secondary-container`| Text/icons on secondary container | `#092017` |
| `--md-tertiary` | Tertiary accent | `#3E6374` |
| `--md-on-tertiary` | Text/icons on tertiary accent | `#FFFFFF` |
| `--md-tertiary-container` | Dodged Calories Vault card, biometric highlights | `#C2E8FD` |
| `--md-on-tertiary-container` | Text/icons on tertiary container | `#001F2A` |
| `--md-error` | Critical warnings, destructive actions, SOS pulse | `#BA1A1A` |
| `--md-on-error` | Text/icons on error background | `#FFFFFF` |
| `--md-error-container` | SOS pill container, deficit overage badges | `#FFDAD6` |
| `--md-on-error-container` | Text/icons on error container | `#410002` |
| `--md-surface` | Baseline canvas background, PWA status bar | `#101512` |
| `--md-on-surface` | Primary high-contrast body & heading text | `#E1E3DF` |
| `--md-on-surface-variant` | Secondary muted text, labels, inactive icons | `#BFC9C2` |
| `--md-surface-variant` | Subtle chip & search backgrounds | `#3F4943` |
| `--md-surface-container-lowest` | Deepest recessed areas (underlays) | `#0B0F0D` |
| `--md-surface-container-low` | Food diary meal group cards | `#181D1A` |
| `--md-surface-container` | Hero summary card, heatmap container, desktop pill nav | `#1C211E` |
| `--md-surface-container-high` | Modal bottom sheets, docked pill search bar, FAB state | `#272B28` |
| `--md-surface-container-highest`| Search result cells, progress bar background tracks | `#323633` |
| `--md-outline` | Focus rings, active dividers | `#89938D` |
| `--md-outline-variant` | Subtle structural dividers (opacity $0.2 - 0.3$) | `#3F4943` |

#### Backwards Compatibility Bridges
To ensure existing styles continue to work without regressions, the engine also sets:
```css
--app-bg: var(--md-surface);
--color-surface-base: var(--md-surface);
--color-surface-card: var(--md-surface-container);
--color-surface-elevated: var(--md-surface-container-high);
--color-text-main: var(--md-on-surface);
--color-text-muted: var(--md-on-surface-variant);
--color-brand-primary: var(--md-primary);
--color-brand-accent: var(--md-primary-container);
```

### Curated Color Swatches
Preset swatches available in the theme customizer:
1. **Botanical Sage:** `#1E6B52` (Default)
2. **Pixel Blue:** `#1A73E8`
3. **Material Iris:** `#6750A4`
4. **Terracotta:** `#9C4123`
5. **Berry Rose:** `#984061`
6. **Ochre Gold:** `#795900`
7. **Monochrome Slate:** `#444746`

---

## 3. Typography & Iconography Rules

### Font Stacks
Loaded in [`index.html`](file:///c:/projects/kalTrack/index.html) from Google Fonts:
- **Display & Headings:** `Plus Jakarta Sans` (`--font-display`)
  - Weights: `500` (Medium), `600` (SemiBold), `700` (Bold), `800` (ExtraBold).
  - Letter Spacing: Enforce `-0.02em` (`tracking-tight` / `.font-display`).
- **Body & Controls:** `Inter` (`--font-sans`)
  - Weights: `400` (Regular), `500` (Medium), `600` (SemiBold).
- **Code, Biometric Logs & Exact Units:** `JetBrains Mono` (`--font-mono`)
  - Used for raw debug telemetry, exact barcodes, and test selectors.

### Numeric Rules
```css
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
```
All calorie targets, remaining numbers, macro gram values, countdown clocks, and percentage badges must include `tabular-nums`.

### Iconography: Material Symbols Rounded
- Component: [`src/components/MaterialIcon.tsx`](file:///c:/projects/kalTrack/src/components/MaterialIcon.tsx)
- Font: `'Material Symbols Rounded', sans-serif`
- Optical Configuration: `opsz 24, wght 500, GRAD 0`
- State Fill:
  - **Inactive / Outlined:** `font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24`
  - **Active / Selected:** `font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24` (`filled={true}`)

---

## 4. Shape, Elevation & State Layers

### Border Radius Hierarchy

```
+-------------------------------------------------------------+
|  Hero Cards, Bottom Sheets, Heatmap Container:               |
|  rounded-[28px]                                             |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  Bento Cards (Weekend Bank, Dodged Vault), Meal Groups:|  |
|  |  rounded-[24px]                                       |  |
|  |                                                       |  |
|  |  +-------------------------------------------------+  |  |
|  |  |  Extended Floating Action Button (FAB):         |  |  |
|  |  |  rounded-2xl (16px)                             |  |  |
|  |  +-------------------------------------------------+  |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  Stadium Pills (Search Bar, Nav Pill, Buttons, Chips):       |
|  rounded-full (9999px)                                      |
+-------------------------------------------------------------+
```

### Material 3 State Layers
Rather than shifting borders or shrinking box models, hover and active states use CSS state layers:
```css
/* src/index.css */
.m3-state-layer {
  position: relative;
  overflow: hidden;
  transition: transform 150ms cubic-bezier(0.2, 0, 0, 1), opacity 150ms cubic-bezier(0.2, 0, 0, 1);
}

.m3-state-layer::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: currentColor;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms cubic-bezier(0.2, 0, 0, 1);
}

.m3-state-layer:hover::after {
  opacity: 0.08; /* 8% state overlay */
}

.m3-state-layer:active::after {
  opacity: 0.12; /* 12% state overlay */
}
```

---

## 5. Core Component Catalog

### 1. Top App Bar & Docked Search Bar
- **Mobile Top App Bar:** Height `64px` (`h-16`), transparent/`--md-surface`. Left: `<BrandLogo variant="horizontal" interactive={true} size={28} />`. Right: `MomentumHudPill`, circular `40px` theme palette button, and stadium SOS pill (`--md-error-container`).
- **Desktop Top App Bar (`HeaderNav.tsx`):** Height `64px`, fixed at top, backdrop blur with `--md-surface/90`. Left: `<BrandLogo variant="horizontal" interactive={true} size={32} />`. Houses center pill navigation dock.
- **Docked Pill Search Bar (`FoodSearchDashboard.tsx`):**
  - Height: `56px` (`h-14`).
  - Shape: `rounded-full`.
  - Surface: `bg-[var(--md-surface-container-high)]`.
  - Content: Left `search` Material Symbol, center text input (`Cmd+K`/`Ctrl+K` shortcut supported), right clear button (`close`) and barcode scanner trigger button (`barcode_scanner`).
  - Results container: `rounded-[24px]` list of `FoodSearchResultCell` with macro pills (`P:`, `C:`, `F:`).

### 2. Bento Dashboard (Today View)
- **Hero Metabolic Summary (`DailyMetabolicSummary.tsx`):**
  - Container: `rounded-[28px]`, `bg-[var(--md-surface-container)]`, `p-5 sm:p-6`.
  - **M3 Circular Progress Indicator:** `140px` outer diameter, `14px` stroke width, `stroke-linecap: round`. Track: `--md-surface-container-highest`, Arc: `--md-primary`. Center: Remaining calories in tabular numerals.
  - **M3 Linear Progress Bars:** $8\text{ px}$ height, `rounded-full` track in `--md-surface-container-highest` with smooth progress fill for Protein, Carbs, and Fats.
  - Interactive 3D perspective flip button switches to the 52-Week Heatmap matrix.
- **Weekend Calorie Bank Card (`WeekendVaultCard.tsx`):**
  - Container: `rounded-[24px]`, `bg-[var(--md-secondary-container)]`, text `var(--md-on-secondary-container)`.
  - Displays banked surplus calories with M3 two-tone segmented progress bar and Mon–Fri sweep strip.
- **Dodged Calories Vault Card (`DodgedVaultCard.tsx`):**
  - Container: `rounded-[24px]`, `bg-[var(--md-tertiary-container)]`, text `var(--md-on-tertiary-container)`.
  - Displays cumulative calories saved through the SOS urge surfing intervention, with `savings` Material Symbol and fat-equivalent conversion ($7700\text{ kcal} = 1\text{ kg}$).

### 3. Food Diary Meal Sections (`DiaryView.tsx`)
- Groups: *Breakfast*, *Lunch*, *Dinner*, *Snacks*.
- Containers: `rounded-[24px]`, `bg-[var(--md-surface-container-low)]`.
- Food Log Rows: Minimum height `64px`, featuring a `40px` circular tonal icon (`--md-secondary-container`), food name, portion subtitle, and right-aligned kcal + protein pills.

### 4. Modal Bottom Sheets
Implemented for **Food Info / Portion Logging**, **SOS Urge Surfing**, and **Barcode Scanner**:
- Shape: `rounded-t-[28px] sm:rounded-[28px]`.
- Surface: `bg-[var(--md-surface-container-high)]`.
- Drag Handle: Centered `32px × 4px` rounded-full pill (`bg-[var(--md-outline-variant)]`).
- Scrim: `rgba(0, 0, 0, 0.40)`.
- **FoodLogBottomSheet Rules:** Contains a single scrollable container (`overflow-y-auto max-h-[85dvh]`). Food serving unit selector pills, numerical quantity stepper, live calculated macro pills, and full-width $52\text{ px}$ filled CTA (`bg-[var(--md-primary)] text-[var(--md-on-primary)] rounded-full`).
- **SOSModal Rules:** Calm $200\text{ px}$ SVG breathing and urge countdown ring (`--md-primary`), 10-minute timer, CBT prompt carousel card, quick dodge presets, and $52\text{ px}$ filled victory CTA wired to the Dodged Calories Vault.
- **BarcodeScanner Rules:** Viewfinder housed in `rounded-[24px]` frame with corner brackets and torch toggle. Camera stream lifecycle cleans up on unmount.

### 5. Android "Wallpaper & Style" Theme Customizer (`ThemeCustomizerSheet.tsx`)
- Interactive Live Mini-Preview card (mini circular progress ring, macro pill, and mini-FAB reacting in real time).
- Segmented mode selector (`Light`, `Dark`, `System`) in a `rounded-full` container.
- Two-tone split-circle curated swatches.
- Full-spectrum custom hex picker with native color input + text validation.
- Overdrive Dynamic Boost switch and Vibrant Scheme switch.

### 6. M3 Bottom Navigation & Extended FAB
- **Bottom Navigation Bar (`BottomNav.tsx`):**
  - Total container height: `80px` (`h-[80px]`) + `env(safe-area-inset-bottom)`.
  - Surface: `bg-[var(--md-surface-container)]`.
  - Active Pill Indicator: `64px × 32px` (`w-16 h-8`) `rounded-full` pill in `bg-[var(--md-secondary-container)]`.
  - Icons: Active tab displays `MaterialIcon filled={true}`; inactive displays `filled={false}`.
- **Extended FAB (`main.tsx`):**
  - Height: `56px` (`h-14`), padding `px-5`.
  - Radius: `rounded-2xl` ($16\text{ px}$).
  - Surface: `bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]`.
  - Position: Fixed bottom-right (`bottom-[calc(96px+env(safe-area-inset-bottom,0px))]` on mobile; `md:bottom-[calc(16px+env(safe-area-inset-bottom,0px))]` on desktop, `right-4`).
  - Automatically unmounts when the mobile virtual keyboard or bottom sheets open.

### 7. Official Material You Brand Logo (`BrandLogo.tsx`)
- Pure inline SVG component with geometric Material Design 3 figure flexing inside a 3-segment rounded calorie/macro progress ring.
- **M3 Token Color Bindings (Zero Hardcoded Hex):**
  - Carbs / Base Track Arc: `stroke="var(--md-secondary-container)"`
  - Primary Calorie Arc: `stroke="var(--md-primary)"`
  - Protein / Tertiary Arc: `stroke="var(--md-tertiary)"`
  - Head & Torso: `fill="var(--md-primary)"` with subtle `var(--md-secondary)` specular shading.
  - Upper Arm & Bicep: `fill="var(--md-primary)"`
  - Forearm & Fist: `fill="var(--md-secondary)"` and `fill="var(--md-primary)"` with knuckle accent in `var(--md-secondary-container)`.
- **Articulated Rigging & Zero-Gap Elbow Geometry:**
  - ViewBox: `0 0 100 100`
  - Exact elbow pivot coordinates `(38, 44)` with overlapping circular joint ($r = 5.5$) so rotation never introduces an elbow gap.
  - Shoulder pivot at `(45, 38)`.
  - GPU-composited `<g>` groups:
    - `.recomp-ring-arc-1/2/3`: sweeps with `stroke-dashoffset` from 100 to 0 ($750\text{ ms}$, M3 Emphasized Decelerate $\text{cubic-bezier}(0.05, 0.7, 0.1, 1)$).
    - `.recomp-bicep`: scales $\text{scale}(1, 1) \rightarrow \text{scale}(1.07, 1.20) \rightarrow \text{scale}(1.03, 1.12)$ during muscle swell.
    - `.recomp-forearm`: rotates from relaxed $28^\circ$ up to locked flex $-7^\circ \rightarrow 0^\circ$ with spring overshoot $\text{cubic-bezier}(0.34, 1.56, 0.64, 1)$.
    - `.recomp-torso`: subtle $1\text{ px} \rightarrow -1.5\text{ px} \rightarrow 0\text{ px}$ synchronized chest lift.
- **Interactive Micro-Flex:** Tapping or hovering when `interactive={true}` triggers a snappy $450\text{ ms}$ replay with `active:scale-95` tactile feedback.
- **Variants:** `'icon-only'` (raw SVG), `'horizontal'` (SVG + Plus Jakarta Sans 700 wordmark), and `'app-icon'` (includes $rx=28$ squircle backdrop in `--md-surface-container`).

### 8. Non-Blocking PWA Launch Splash (`PwaLaunchSplash.tsx`)
- Mounts as a `fixed inset-0 z-50` overlay in `var(--md-surface)` directly over the live app shell.
- **Zero-Block Hydration:** Dexie IndexedDB profile/food databases, Redux hydration, and Web Workers load uninterrupted in the background.
- **$1100\text{ ms}$ Session Timeline:**
  - $0\text{ ms} - 750\text{ ms}$: Centered `<BrandLogo variant="app-icon" animate={true} size={96} />` sweeps rings and curls bicep.
  - $750\text{ ms} - 1100\text{ ms}$: Smooth GPU fade-out ($\text{opacity: } 1 \rightarrow 0$, $\text{scale: } 1 \rightarrow 1.04$) and unmounts from DOM.
  - Persists `sessionStorage.setItem('recomp_boot_animated', '1')` so internal navigations and re-renders never re-trigger the splash.
  - Bypassed immediately when `prefers-reduced-motion` is active.

---

## 6. Anti-Regression & Mobile PWA Guardrails

Any future edits by human engineers or coding agents **must strictly follow these constraints**:

1. **Single Scroll Container in Bottom Sheets:**
   - Never nest an `overflow-y-auto` child inside an already scrollable modal body. Double scrollbars break iOS/Android touch momentum.
2. **Virtual Viewport & Keyboard Safety:**
   - Mobile keyboards compress the viewport. Observe `window.visualViewport`:
     ```ts
     const isKeyboard = window.visualViewport.height < window.innerHeight * 0.75;
     ```
   - When `isKeyboard` is true, hide the FAB and bottom navigation to prevent obscuring the food search input or results list.
3. **Safe-Area Inset Enforcement:**
   - Fixed bottom elements must always declare:
     ```css
     padding-bottom: env(safe-area-inset-bottom, 0px);
     ```
4. **Calorie Target Hydration Lock:**
   - Do NOT alter the user profile hydration flow in `main.tsx` / `profileSync.ts`. Profile data must hydrate from Dexie IndexedDB before rendering default caloric targets to prevent overwriting user targets on page reload.
5. **Camera Stream Lifecycle Cleanup:**
   - In `BarcodeScanner.tsx`, always call `html5QrCode.stop()` and `html5QrCode.clear()` inside the `useEffect` unmount cleanup function to prevent hardware camera lockups on iOS and Android.
6. **No Arbitrary Hard Borders or Heavy Blurs:**
   - Do NOT add `border border-white/20` or `backdrop-blur-xl` to content cards. Maintain M3 tonal contrast using `--md-surface-container-*` tokens.
7. **Redux & Dexie Logic Segregation:**
   - Do NOT touch business logic files in `src/utils/` (thermodynamics, macro math, calorie bank calculations) or database schemas in `src/db/` during visual design iterations.
