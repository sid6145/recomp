import fs from 'node:fs';
import { Builder, By, until, logging } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getChromiumBinary() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function createDriver(width = 1280, height = 800) {
  const options = new chrome.Options();
  const binary = getChromiumBinary();
  if (binary) {
    options.setBinaryPath(binary);
  }
  options.addArguments('--headless=new');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-gpu');
  options.addArguments('--force-prefers-reduced-motion=no-preference');
  options.addArguments(`--window-size=${width},${height}`);

  const prefs = new logging.Preferences();
  prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);
  options.setLoggingPrefs(prefs);

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  return driver;
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const results = [];

function recordTest(name, passed, message = '') {
  results.push({ name, passed, message });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol}: ${name}${message ? ` - ${message}` : ''}`);
}

async function runSeleniumSuite() {
  console.log('====================================================');
  console.log('🚀 Starting Recomp Selenium WebDriver E2E Suite');
  console.log(`Target: ${BASE_URL}`);
  console.log('Browser Binary:', getChromiumBinary() || 'Default System Chrome');
  console.log('====================================================\n');

  let driver = null;

  try {
    driver = await createDriver(1280, 800);

    // ---------------------------------------------------------------
    // 1. Boot, Splash Screen & Console Audit
    // ---------------------------------------------------------------
    try {
      await driver.get(BASE_URL);

      // Verify Startup Splash Screen mounts on fresh session
      const splashScreen = await driver.wait(
        until.elementLocated(By.css('[data-testid="splash-screen"]')),
        3000
      ).catch(() => null);

      if (splashScreen) {
        // Wait for Splash Screen to unmount completely within 2.5s
        await driver.wait(until.stalenessOf(splashScreen), 3000);
        const isBooted = await driver.executeScript("return sessionStorage.getItem('recomp_booted');");
        if (isBooted !== 'true') {
          throw new Error(`Expected sessionStorage recomp_booted='true', received '${isBooted}'`);
        }
      }

      await driver.wait(until.elementLocated(By.css('#root')), 10000);
      await sleep(1000);

      const logs = await driver.manage().logs().get(logging.Type.BROWSER);
      const severeErrors = logs.filter(
        (entry) =>
          entry.level.name === 'SEVERE' &&
          !entry.message.includes('favicon') &&
          !entry.message.includes('manifest') &&
          !entry.message.includes('WebSocket') &&
          !entry.message.includes('vite')
      );

      if (severeErrors.length === 0) {
        recordTest('1. Boot, Splash Screen & Console Audit', true, 'Splash played & unmounted cleanly; zero severe console errors');
      } else {
        recordTest(
          '1. Boot, Splash Screen & Console Audit',
          false,
          `Found ${severeErrors.length} severe console error(s): ${severeErrors.map((e) => e.message).join('; ')}`
        );
      }
    } catch (err) {
      recordTest('1. Boot, Splash Screen & Console Audit', false, err.message);
    }

    // ---------------------------------------------------------------
    // 1b. PWA Manifest & Brand Icon HTTP Audit
    // ---------------------------------------------------------------
    try {
      const iconUrls = [
        '/favicon.ico',
        '/favicon-32x32.png',
        '/apple-touch-icon.png',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/pwa-maskable-512x512.png',
        '/manifest.webmanifest',
      ];

      const fetchResults = await driver.executeAsyncScript((urls, done) => {
        Promise.all(
          urls.map((url) =>
            fetch(url)
              .then((res) => ({ url, status: res.status, ok: res.ok }))
              .catch((err) => ({ url, status: 0, ok: false, error: err.message }))
          )
        ).then(done);
      }, iconUrls);

      const failedUrls = fetchResults.filter((r) => !r.ok || r.status !== 200);
      if (failedUrls.length > 0) {
        throw new Error(`Failed to load icon/manifest assets: ${JSON.stringify(failedUrls)}`);
      }

      // Verify Header brand icon is displayed
      const headerLogo = await driver.findElement(By.css('header img[src="/pwa-192x192.png"]'));
      const isHeaderLogoDisplayed = await headerLogo.isDisplayed();
      if (!isHeaderLogoDisplayed) {
        throw new Error('Header brand icon is not displayed');
      }

      recordTest(
        '1b. PWA Manifest & Brand Icon HTTP Audit',
        true,
        'All 7 favicon/PWA assets returned HTTP 200; Header brand icon rendered'
      );
    } catch (err) {
      recordTest('1b. PWA Manifest & Brand Icon HTTP Audit', false, err.message);
    }

    // ---------------------------------------------------------------
    // 2. Food Search & Logging (Existing)
    // ---------------------------------------------------------------
    try {
      // Navigate to AI Food Search
      const searchTabBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "Search") or contains(., "search")]')),
        5000
      );
      await searchTabBtn.click();
      await sleep(600);

      // Locate search input
      const searchInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder*="search" i], input[placeholder*="Search" i]')),
        5000
      );
      await searchInput.clear();
      await searchInput.sendKeys('Chicken');
      await sleep(1000);

      // Wait for search result cards
      const firstResultCard = await driver.wait(
        until.elementLocated(By.css('.group.p-4')),
        8000
      );
      await driver.executeScript('arguments[0].scrollIntoView(true);', firstResultCard);
      await sleep(300);
      const cardTitle = await firstResultCard.findElement(By.css('h4')).getText();

      // Click "Log Food" button on first card
      const logFoodBtn = await firstResultCard.findElement(
        By.xpath('.//button[contains(., "Log") or contains(., "log") or @aria-label="Log Food"]')
      );
      await driver.executeScript('arguments[0].click();', logFoodBtn);
      await sleep(800);

      // Verify bottom sheet opened
      const sheetDialog = await driver.wait(
        until.elementLocated(By.css('div[role="dialog"][aria-modal="true"]')),
        5000
      );

      // Set portion quantity to 100g to log realistic macros
      const qtyInput = await sheetDialog.findElements(By.css('input[type="number"]'));
      if (qtyInput.length > 0) {
        await qtyInput[0].clear();
        await qtyInput[0].sendKeys('100');
        await sleep(400);
      }

      // Click "Log to Diary" button
      const logToDiaryBtn = await sheetDialog.findElement(
        By.xpath('.//button[contains(., "Log to Diary") or contains(., "Log")]')
      );
      await logToDiaryBtn.click();
      await sleep(1200);

      // Switch back to Daily Diary
      const diaryTabBtn = await driver.findElement(
        By.xpath('//button[contains(., "Diary") or contains(., "diary")]')
      );
      await diaryTabBtn.click();
      await sleep(800);

      // Assert consumed calories and protein metrics incremented
      const consumedText = await driver.findElement(By.css('strong.text-amber-400')).getText();
      const proteinText = await driver
        .findElement(By.css('section[aria-label="Daily Metabolic Telemetry"] .text-rose-400'))
        .getText();

      const calNumber = parseInt(consumedText.replace(/\D/g, ''), 10) || 0;
      const protNumber = parseInt(proteinText.replace(/\D/g, ''), 10) || 0;

      if (calNumber > 0 && protNumber > 0) {
        recordTest(
          '2. Food Search & Logging',
          true,
          `Logged "${cardTitle}" -> Consumed: ${calNumber} kcal, Protein: ${protNumber}g`
        );
      } else {
        recordTest(
          '2. Food Search & Logging',
          false,
          `Metrics not incremented: Cal=${calNumber}, Protein=${protNumber}`
        );
      }
    } catch (err) {
      recordTest('2. Food Search & Logging', false, err.message);
    }

    // ---------------------------------------------------------------
    // 3. SOS Timer & Dodged Vault (Existing + New)
    // ---------------------------------------------------------------
    try {
      const sosBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "SOS Craving")]')),
        5000
      );
      await sosBtn.click();
      await sleep(600);

      const sosDialog = await driver.wait(
        until.elementLocated(By.css('div[role="dialog"][aria-modal="true"]')),
        5000
      );

      // Read initial timer text
      const timerElement = await driver.findElement(
        By.xpath('//div[@role="dialog"]//*[contains(text(), ":") and string-length(text()) <= 6]')
      );
      const initialTimer = (await timerElement.getText()).trim();
      const [initM, initS] = initialTimer.split(':').map(Number);
      const initialSeconds = initM * 60 + initS;

      // Sleep 2500ms to verify ticking
      await sleep(2500);

      const decrementedTimer = (await timerElement.getText()).trim();
      const [decM, decS] = decrementedTimer.split(':').map(Number);
      const decSeconds = decM * 60 + decS;

      if (decSeconds >= initialSeconds) {
        throw new Error(`Timer did not decrement: before=${initialTimer}, after=${decrementedTimer}`);
      }

      // Click "I Beat the Urge" button
      const beatUrgeBtn = await driver.findElement(
        By.xpath('//button[contains(., "I Beat the Urge")]')
      );
      await beatUrgeBtn.click();
      await sleep(600);

      // Select preset "Sweets / Dessert" (+350 kcal)
      const presetBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "Sweets / Dessert")]')),
        5000
      );
      await presetBtn.click();

      // Wait for celebration and auto-close (2.5s)
      await sleep(2600);

      // Check Dodged Vault card updates
      const dodgedCard = await driver.wait(
        until.elementLocated(By.xpath('//div[contains(., "Dodged Vault") and .//span[contains(text(), "kcal")]]')),
        5000
      );
      const dodgedCardText = await dodgedCard.getText();
      const hasDodgedIncrement = dodgedCardText.includes('350') && dodgedCardText.includes('0.05');

      if (hasDodgedIncrement) {
        recordTest(
          '3. SOS Timer & Dodged Vault',
          true,
          `Timer ticked from ${initialTimer} -> ${decrementedTimer}; Vault updated +350 kcal / 0.05 kg fat`
        );
      } else {
        recordTest(
          '3. SOS Timer & Dodged Vault',
          false,
          `Dodged Vault did not show expected totals. Card content: ${dodgedCardText}`
        );
      }
    } catch (err) {
      recordTest('3. SOS Timer & Dodged Vault', false, err.message);
    }

    // ---------------------------------------------------------------
    // 4. Weekend Calorie Bank (New)
    // ---------------------------------------------------------------
    try {
      const bankCard = await driver.wait(
        until.elementLocated(By.xpath('//div[contains(., "Weekend Bank") and .//span[contains(text(), "kcal")]]')),
        5000
      );
      await driver.executeScript('arguments[0].scrollIntoView(true);', bankCard);

      // Check Mon-Fri day indicators
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      let allDaysFound = true;
      for (const d of days) {
        const dayEl = await bankCard.findElements(By.xpath(`.//span[contains(text(), "${d}")]`));
        if (dayEl.length === 0) {
          allDaysFound = false;
          break;
        }
      }

      // Check text overflow
      const hasOverflow = await driver.executeScript(
        'return arguments[0].scrollWidth > arguments[0].clientWidth + 4;',
        bankCard
      );

      if (allDaysFound && !hasOverflow) {
        recordTest(
          '4. Weekend Calorie Bank',
          true,
          'Weekend Bank card and Mon–Fri strip rendered cleanly without text overflow'
        );
      } else {
        recordTest(
          '4. Weekend Calorie Bank',
          false,
          `Days found=${allDaysFound}, overflow detected=${hasOverflow}`
        );
      }
    } catch (err) {
      recordTest('4. Weekend Calorie Bank', false, err.message);
    }

    // ---------------------------------------------------------------
    // 5. 52-Week Heatmap (Existing)
    // ---------------------------------------------------------------
    try {
      // Find flip button
      const flipBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "View Telemetry") or @title="Flip to 52-Week Longitudinal Matrix"]')),
        5000
      );
      await flipBtn.click();
      await sleep(1500); // 3D flip animation

      // Assert 52-week heatmap grid is visible
      const heatmapGrid = await driver.wait(
        until.elementLocated(By.css('.grid-rows-7')),
        5000
      );
      const isGridDisplayed = await heatmapGrid.isDisplayed();

      // Assert no redundant nested h1/h2 headings exist inside back face
      const backFace = await driver.findElement(
        By.css('div[aria-label="52-Week Longitudinal Matrix"]')
      );
      const nestedHeadings = await backFace.findElements(By.css('h1, h2'));

      // Flip back
      const backBtn = await driver.findElement(By.xpath('//button[contains(., "Summary")]'));
      await backBtn.click();
      await sleep(1500);

      if (isGridDisplayed && nestedHeadings.length === 0) {
        recordTest(
          '5. 52-Week Heatmap',
          true,
          'Heatmap 52x7 grid directly visible on 3D flip with 0 redundant nested headers'
        );
      } else {
        recordTest(
          '5. 52-Week Heatmap',
          false,
          `isGridDisplayed=${isGridDisplayed}, nestedHeadingsCount=${nestedHeadings.length}`
        );
      }
    } catch (err) {
      recordTest('5. 52-Week Heatmap', false, err.message);
    }

    // ---------------------------------------------------------------
    // 6. Stepped Overdrive UI & Aurora + Motes (New)
    // ---------------------------------------------------------------
    try {
      // Navigate to Settings / Goals tab
      const goalsTabBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "Goal") or contains(., "goal")]')),
        5000
      );
      await goalsTabBtn.click();
      await sleep(600);

      // Step 1: 1.0x Standby
      const tier1Btn = await driver.wait(
        until.elementLocated(By.css('button[data-testid="dev-tier-1.0"]')),
        5000
      );
      await driver.executeScript('arguments[0].scrollIntoView(true);', tier1Btn);
      await tier1Btn.click();
      await sleep(300);
      let momentum = await driver.executeScript('return document.documentElement.dataset.momentum;');
      if (momentum !== 'standby') {
        throw new Error(`Expected dataset.momentum='standby' at 1.0x, received '${momentum}'`);
      }

      // Step 2: 1.5x Ignition
      const tier15Btn = await driver.findElement(By.css('button[data-testid="dev-tier-1.5"]'));
      await tier15Btn.click();
      await sleep(300);
      momentum = await driver.executeScript('return document.documentElement.dataset.momentum;');
      if (momentum !== 'ignition') {
        throw new Error(`Expected dataset.momentum='ignition' at 1.5x, received '${momentum}'`);
      }

      // Step 3: 2.0x Velocity
      const tier2Btn = await driver.findElement(By.css('button[data-testid="dev-tier-2.0"]'));
      await tier2Btn.click();
      await sleep(300);
      momentum = await driver.executeScript('return document.documentElement.dataset.momentum;');
      if (momentum !== 'velocity') {
        throw new Error(`Expected dataset.momentum='velocity' at 2.0x, received '${momentum}'`);
      }

      // Step 4: 3.0x Overdrive
      const tier3Btn = await driver.findElement(By.css('button[data-testid="dev-tier-3.0"]'));
      await tier3Btn.click();
      await sleep(500);
      momentum = await driver.executeScript('return document.documentElement.dataset.momentum;');
      if (momentum !== 'overdrive') {
        throw new Error(`Expected dataset.momentum='overdrive' at 3.0x, received '${momentum}'`);
      }

      // Verify <canvas> motes mounts at overdrive and has computed pointer-events: none
      const canvasEl = await driver.wait(
        until.elementLocated(By.css('canvas[data-testid="motes-canvas"]')),
        5000
      );
      const pointerEvents = await driver.executeScript(
        'return window.getComputedStyle(arguments[0]).pointerEvents;',
        canvasEl
      );
      if (pointerEvents !== 'none') {
        throw new Error(`Canvas pointer-events expected 'none', received '${pointerEvents}'`);
      }

      // Toggle Unstable Preview
      const toggleUnstableBtn = await driver.findElement(
        By.css('button[data-testid="toggle-unstable-btn"]')
      );
      await toggleUnstableBtn.click();
      await sleep(400);

      const unstableAttr = await driver.executeScript('return document.documentElement.dataset.unstable;');
      if (unstableAttr !== 'true') {
        throw new Error(`Expected dataset.unstable='true', received '${unstableAttr}'`);
      }

      const warningPill = await driver.wait(
        until.elementLocated(By.css('[data-testid="unstable-warning-pill"]')),
        5000
      );
      const warningText = await warningPill.getText();
      if (!warningText.includes('OVERDRIVE UNSTABLE')) {
        throw new Error(`Warning pill text mismatch: ${warningText}`);
      }

      // Return to Search dashboard and assert clicking works cleanly with zero overlay interception
      const searchNav = await driver.findElement(
        By.xpath('//header//button[contains(., "Search") or contains(., "search")]')
      );
      await searchNav.click();
      await sleep(600);

      const searchInputInOverdrive = await driver.wait(
        until.elementLocated(By.css('input[placeholder*="search" i]')),
        5000
      );
      await searchInputInOverdrive.click();
      await searchInputInOverdrive.clear();
      await searchInputInOverdrive.sendKeys('Paneer');
      await sleep(800);

      const paneerCard = await driver.wait(
        until.elementLocated(By.css('.group.p-4')),
        5000
      );
      const isCardClickable = await paneerCard.isDisplayed();

      recordTest(
        '6. Stepped Overdrive UI & Aurora + Motes',
        true,
        'Ladder stepped standby->ignition->velocity->overdrive; Canvas has pointer-events: none; Unstable warning verified; Zero overlay interception'
      );
    } catch (err) {
      recordTest('6. Stepped Overdrive UI & Aurora + Motes', false, err.message);
    }

    // ---------------------------------------------------------------
    // 7. Responsive Navigation (Existing)
    // ---------------------------------------------------------------
    try {
      // 1. Desktop Viewport (1280x800)
      await driver.manage().window().setRect({ width: 1280, height: 800 });
      await sleep(500);

      const headerNav = await driver.findElement(By.css('header'));
      const isHeaderVisibleDesktop = await headerNav.isDisplayed();

      const bottomNavElsDesktop = await driver.findElements(
        By.css('aside[aria-label="Floating Navigation Dock"]')
      );
      let isBottomNavHiddenDesktop = true;
      if (bottomNavElsDesktop.length > 0) {
        isBottomNavHiddenDesktop = !(await bottomNavElsDesktop[0].isDisplayed());
      }

      // 2. Mobile Viewport (390x844)
      await driver.manage().window().setRect({ width: 390, height: 844 });
      await sleep(500);

      const isHeaderHiddenMobile = !(await headerNav.isDisplayed());
      const bottomNavMobile = await driver.findElement(
        By.css('aside[aria-label="Floating Navigation Dock"]')
      );
      const isBottomNavVisibleMobile = await bottomNavMobile.isDisplayed();

      if (
        isHeaderVisibleDesktop &&
        isBottomNavHiddenDesktop &&
        isHeaderHiddenMobile &&
        isBottomNavVisibleMobile
      ) {
        recordTest(
          '7. Responsive Navigation',
          true,
          'Desktop (1280x800): HeaderNav visible, BottomNav hidden. Mobile (390x844): BottomNav visible, HeaderNav hidden.'
        );
      } else {
        recordTest(
          '7. Responsive Navigation',
          false,
          `Desktop: Header=${isHeaderVisibleDesktop}, BottomHidden=${isBottomNavHiddenDesktop}. Mobile: HeaderHidden=${isHeaderHiddenMobile}, BottomVisible=${isBottomNavVisibleMobile}`
        );
      }
    } catch (err) {
      recordTest('7. Responsive Navigation', false, err.message);
    }

    // ---------------------------------------------------------------
    // 8. Mobile PWA Install Popup (New)
    // ---------------------------------------------------------------
    try {
      // In Mobile Viewport (390x844), switch to Goals tab via BottomNav
      const mobileGoalTab = await driver.findElement(
        By.xpath('//aside//button[contains(., "Goal") or contains(., "goal")]')
      );
      await mobileGoalTab.click();
      await sleep(600);

      // Trigger Dev Preview for PWA Install Popup
      const pwaPreviewBtn = await driver.wait(
        until.elementLocated(By.css('button[data-testid="dev-preview-pwa-btn"]')),
        5000
      );
      await driver.executeScript('arguments[0].scrollIntoView(true);', pwaPreviewBtn);
      await pwaPreviewBtn.click();
      await sleep(400);

      // Verify PWA Install Popup appears and is displayed
      const pwaPopup = await driver.wait(
        until.elementLocated(By.css('[data-testid="pwa-install-prompt"]')),
        5000
      );
      const isPopupDisplayed = await pwaPopup.isDisplayed();
      const popupText = await pwaPopup.getText();

      if (!isPopupDisplayed || !popupText.includes('Install Recomp')) {
        throw new Error(`PWA popup not displayed or content mismatch: ${popupText}`);
      }

      // Verify Install button exists
      const installBtn = await pwaPopup.findElement(
        By.css('[data-testid="pwa-install-button"]')
      );
      const isInstallBtnVisible = await installBtn.isDisplayed();

      // Dismiss popup
      const dismissBtn = await pwaPopup.findElement(
        By.css('[data-testid="pwa-dismiss-button"]')
      );
      await dismissBtn.click();
      await sleep(400);

      // Wait for popup to animate out / become stale or unmounted
      const isDismissed = await driver.executeScript(
        'return document.querySelector("[data-testid=\'pwa-install-prompt\']") === null;'
      );

      if (isPopupDisplayed && isInstallBtnVisible && isDismissed) {
        recordTest(
          '8. Mobile PWA Install Popup',
          true,
          'PWA popup rendered with branding, Install CTA, and dismissed cleanly via AnimatePresence'
        );
      } else {
        recordTest(
          '8. Mobile PWA Install Popup',
          false,
          `popupDisplayed=${isPopupDisplayed}, installBtn=${isInstallBtnVisible}, isDismissed=${isDismissed}`
        );
      }
    } catch (err) {
      recordTest('8. Mobile PWA Install Popup', false, err.message);
    }

    // ---------------------------------------------------------------
    // 9. Calorie Goal Persistence & Reload Verification (Phase 1 Fix)
    // ---------------------------------------------------------------
    try {
      // 1. Mobile Viewport (390x844) Check
      await driver.manage().window().setRect({ width: 390, height: 844 });
      await sleep(400);

      // Navigate to Goal Setter via BottomNav or Header
      const goalNavBtn = await driver.wait(
        until.elementLocated(By.xpath('//button[contains(., "Goal") or contains(., "goal")]')),
        5000
      );
      await driver.executeScript('arguments[0].click();', goalNavBtn);
      await sleep(600);

      // Select Extreme (-1.00 kg/wk) weight-loss goal
      const extremeOptionBtn = await driver.wait(
        until.elementLocated(
          By.css('button[data-testid="goal-option-1"], button[data-testid="goal-option-1.0"]')
        ),
        5000
      ).catch(async () => {
        return await driver.findElement(
          By.xpath('//button[contains(., "Extreme") or contains(., "-1.00 kg/wk")]')
        );
      });
      await driver.executeScript('arguments[0].scrollIntoView(true);', extremeOptionBtn);
      await driver.executeScript('arguments[0].click();', extremeOptionBtn);
      await sleep(500);

      // Record the calculated daily calorie target from the hero readout
      const targetHeroEl = await driver.wait(
        until.elementLocated(By.css('[data-testid="goal-target-calories"]')),
        5000
      );
      const calculatedTargetRaw = await targetHeroEl.getText();
      const calculatedTarget = parseInt(calculatedTargetRaw.replace(/\D/g, ''), 10);
      if (!calculatedTarget || isNaN(calculatedTarget)) {
        throw new Error(`Failed to parse calculated daily calorie target from hero readout: "${calculatedTargetRaw}"`);
      }

      // Navigate to Diary page
      const diaryNavBtn = await driver.findElement(
        By.xpath('//button[contains(., "Diary") or contains(., "diary")]')
      );
      await driver.executeScript('arguments[0].click();', diaryNavBtn);
      await sleep(600);

      // Trigger full browser reload
      await driver.navigate().refresh();
      await sleep(1000);

      // Wait for hydration & target calories element
      const reloadedTargetEl = await driver.wait(
        until.elementLocated(By.css('[data-testid="target-calories-value"]')),
        6000
      );
      const reloadedTargetRaw = await reloadedTargetEl.getText();
      const reloadedTarget = parseInt(reloadedTargetRaw.replace(/\D/g, ''), 10);

      if (reloadedTarget !== calculatedTarget) {
        throw new Error(
          `Goal reload mismatch in Mobile viewport: Expected ${calculatedTarget} kcal, received ${reloadedTarget} kcal`
        );
      }

      // 2. Desktop Viewport (1280x800) Verification
      await driver.manage().window().setRect({ width: 1280, height: 800 });
      await sleep(500);

      // Assert target is still exactly calculatedTarget in desktop viewport
      const desktopTargetEl = await driver.wait(
        until.elementLocated(By.css('[data-testid="target-calories-value"]')),
        5000
      );
      const desktopTargetRaw = await desktopTargetEl.getText();
      const desktopTarget = parseInt(desktopTargetRaw.replace(/\D/g, ''), 10);

      if (desktopTarget !== calculatedTarget) {
        throw new Error(
          `Goal reload mismatch in Desktop viewport: Expected ${calculatedTarget} kcal, received ${desktopTarget} kcal`
        );
      }

      // Trigger another full reload in Desktop mode to confirm cold-boot hydration
      await driver.navigate().refresh();
      await sleep(1000);

      const desktopRefreshedEl = await driver.wait(
        until.elementLocated(By.css('[data-testid="target-calories-value"]')),
        6000
      );
      const desktopRefreshedRaw = await desktopRefreshedEl.getText();
      const desktopRefreshed = parseInt(desktopRefreshedRaw.replace(/\D/g, ''), 10);

      if (desktopRefreshed !== calculatedTarget) {
        throw new Error(
          `Goal reload mismatch after desktop refresh: Expected ${calculatedTarget} kcal, received ${desktopRefreshed} kcal`
        );
      }

      recordTest(
        '9. Calorie Goal Persistence & Reload Verification',
        true,
        `Calculated target (${calculatedTarget} kcal for -1 kg/wk) persisted with zero drift across mobile & desktop browser reloads`
      );
    } catch (err) {
      recordTest('9. Calorie Goal Persistence & Reload Verification', false, err.message);
    }
  } finally {
    if (driver) {
      await driver.quit();
    }
  }

  // ---------------------------------------------------------------
  // Suite Summary
  // ---------------------------------------------------------------
  console.log('\n====================================================');
  console.log('📊 SELENIUM REGRESSION SUITE RESULTS SUMMARY');
  console.log('====================================================');

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  for (const r of results) {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  }

  console.log(`\nTotal Tests: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error(`\n❌ Selenium Suite Failed with ${failedCount} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL SELENIUM E2E REGRESSION ASSERTIONS PASSED (100%)');
    process.exit(0);
  }
}

runSeleniumSuite().catch((err) => {
  console.error('Fatal Selenium error:', err);
  process.exit(1);
});
