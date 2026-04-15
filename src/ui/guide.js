const GUIDE_SEEN_KEY = 'soar_guide_seen';

const STEPS = [
  {
    title: 'Welcome to Soar Forecaster!',
    text: 'This guide will walk you through the app so you can get the most out of it. Tip: <b><u>use two fingers to scroll tables up and down</u></b>, and one finger to scroll them left and right! You can skip this guide anytime and replay it later from the Guide button.',
    target: null,
    action: 'closeAll',
  },
  {
    title: 'View Selector',
    text: 'Tap this dropdown to switch between four views:\n\n' +
      'Wind — wind speed (colored by intensity) and direction arrows at multiple altitudes, from surface level up to several thousand feet.\n\n' +
      'Temp — temperature profiles at each altitude, color-coded from cool to warm.\n\n' +
      'Clouds — cloud cover percentage at different pressure levels, helping you spot clear windows and overcast layers.\n\n' +
      'Ensemble — probabilistic forecasts explained in a later step!',
    target: '#view-dropdown',
    action: 'openDropdown',
  },
  {
    title: 'Locations',
    text: 'Tap here to open the location panel where you can search for any place, use your GPS, or quickly switch between saved locations. When you select a location, forecasts from all enabled models load automatically.',
    target: '#toggle-locations',
    action: 'closeDropdown',
  },
  {
    title: 'Location Search',
    text: 'Type a city, town, or place name and results will appear below. Tap a result to load the forecast for that location. The search uses geocoding to find coordinates for any place worldwide.',
    target: '#location-search',
    requireVisible: '#top-bar',
  },
  {
    title: 'GPS',
    text: 'Tap GPS to automatically detect your current position and load the forecast for where you are right now. Your browser will ask for location permission.',
    target: '#gps-btn',
    requireVisible: '#top-bar',
  },
  {
    title: 'Save Locations',
    text: 'Once you have a location loaded, tap Save Current to bookmark it. You can save up to 6 locations for quick access. Saved locations appear in the list below and persist between sessions.',
    target: '#save-location-btn',
    requireVisible: '#top-bar',
  },
  {
    title: 'Show All Locations Forecast',
    text: 'Tap this to see the forecast for every saved location at once, stacked vertically. Great for comparing conditions across multiple flying sites in a single glance. Tap again to return to the single-location view.',
    target: '#show-all-locations',
    requireVisible: '#top-bar',
  },
  {
    title: 'The Forecast Tables',
    text: 'Each table shows one weather model. Rows are altitudes (surface at the bottom, higher altitudes above). Columns are hours. Swipe left/right to scroll through time — all model tables scroll together so you can compare the same hour across models. <b><u>Use two fingers to scroll the page up and down between tables.</u></b>',
    target: '.tables-wrapper',
    action: 'hideLocations',
  },
  {
    title: 'Settings',
    text: 'Tap Settings to open the control panel at the bottom. Here you\'ll find Filters, Extra Rows, Model selection, Layout customization, and Wind Color thresholds. Each section expands when tapped.',
    target: '#bottom-settings-toggle',
  },
  {
    title: 'Filters',
    text: 'Daylight Only hides nighttime hours to focus on flyable times. Hide >5k ft removes high-altitude rows. Wind Shear, Fog Mode, and Best Hours are explained in the next steps.',
    target: '#section-filters',
    requireVisible: '.bottom-settings-inner',
    requireExpanded: '#section-filters .section-body',
  },
  {
    title: 'Wind Shear',
    text: 'Wind Shear highlights cells where wind changes significantly between adjacent altitude levels. It compares each pair of neighboring rows and outlines them with an orange border when: the speed difference exceeds 10 mph, OR the speed difference exceeds 5 mph and the direction changes by more than 90°. This helps you identify dangerous turbulence layers where wind conditions shift abruptly — critical for safe flying decisions.',
    target: '#wind-shear-label',
    requireVisible: '.bottom-settings-inner',
    requireExpanded: '#section-filters .section-body',
  },
  {
    title: 'Fog Mode',
    text: 'Fog Mode automatically enables the Dew Point Spread, Temperature, and Visibility extra rows. It then highlights cells where the dew point and temperature are very close together (small spread), which signals a high likelihood of fog or low visibility. The closer the spread is to zero, the stronger the highlight — helping you spot fog risk at a glance. Note: accuracy is just OK — use it as one tool among many, not a definitive fog forecast.',
    target: '#fog-mode-label',
    requireVisible: '.bottom-settings-inner',
    requireExpanded: '#section-filters .section-body',
  },
  {
    title: 'Best Hours',
    text: 'Best Hours filters the forecast to only show hours where wind speeds up to 400ft are at or below your chosen threshold (default 15 mph). This makes it easy to find the calmest windows for flying. Adjust the threshold number to match your comfort level — lower values show only the lightest wind hours.',
    target: '#best-hours-label',
    requireVisible: '.bottom-settings-inner',
    requireExpanded: '#section-filters .section-body',
  },
  {
    title: 'Extra Rows',
    text: 'Add supplementary data beneath each model table: Gusts, CAPE (convective energy), Lifted Index (stability), Precipitation %, Precipitation inches, Temperature, Humidity, Dew Point Spread, Visibility, and Cloud cover at low/mid/high levels. Toggle each one individually.',
    target: '#section-extra-rows',
    requireVisible: '.bottom-settings-inner',
    requireExpanded: '#section-extra-rows .section-body',
    collapseOthers: true,
  },
  {
    title: 'Models & Forecast Days',
    text: 'Enable or disable individual weather models: HRRR (high-res, short-range), ECMWF (global, medium-range), GFS (global, extended), ICON (European global), and NAM (North American mesoscale). Use the slider next to each model to control how many forecast days to load.',
    target: '#section-models',
    requireVisible: '.bottom-settings-inner',
    requireExpanded: '#section-models .section-body',
    collapseOthers: true,
  },
  {
    title: 'Layout',
    text: 'Open the Layout popup to fine-tune every visual aspect: cell width, row height, font sizes, arrow style and size, table spacing, borders, and more. Great for fitting the tables perfectly to your screen size.',
    target: '#open-layout-popup',
    requireVisible: '.bottom-settings-inner',
    collapseOthers: true,
  },
  {
    title: 'Wind Colors',
    text: 'Customize the three wind speed thresholds that control the color gradient in the tables. Blue means calm winds (at or below the first number), green is moderate, and red means strong. Adjust these to match your personal flying limits.',
    target: '#section-wind-colors',
    requireVisible: '.bottom-settings-inner',
    requireExpanded: '#section-wind-colors .section-body',
    collapseOthers: true,
  },
  {
    title: 'Ensemble View',
    text: 'Now let\'s look at the Ensemble view! Switching to it automatically...',
    target: '#view-dropdown',
    action: 'closeAllAndSwitchToEnsemble',
  },
  {
    title: 'Reading Ensemble Data',
    text: 'Ensemble models (GEFS and ECMWF Ensemble) run the forecast many times with slightly different starting conditions. The number in each cell is the average across all those runs. The cell\'s background color shows the spread (standard deviation) between runs — green means the models mostly agree (high confidence), while yellow to red means they disagree (low confidence, more uncertainty). This helps you judge not just what the forecast says, but how much you can trust it.',
    target: '.ensemble-section:not(.hidden) .table-container',
  },
  {
    title: 'Guide Button',
    text: 'You can replay this guide anytime by tapping the Guide button up here. Happy flying!',
    target: '#guide-btn',
    action: 'switchToWind',
  },
  {
    title: "You're all set!",
    text: 'Start by searching for a location or tapping GPS. Scroll through the tables to explore the forecast. Remember: <b><u>two fingers to scroll up/down between models</u></b>, one finger to scroll left/right through hours. Enjoy!',
    target: null,
    action: 'closeAll',
  },
];

let currentStep = 0;
let overlayEl = null;
let onComplete = null;
let actionHandler = null;

function createOverlay() {
  const el = document.createElement('div');
  el.className = 'guide-overlay';
  el.innerHTML = `
    <div class="guide-backdrop"></div>
    <div class="guide-highlight"></div>
    <div class="guide-tooltip">
      <div class="guide-title"></div>
      <div class="guide-text"></div>
      <div class="guide-footer">
        <span class="guide-progress"></span>
        <div class="guide-buttons">
          <button class="guide-skip">Skip</button>
          <button class="guide-prev">Back</button>
          <button class="guide-next">Next</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);

  el.querySelector('.guide-skip').addEventListener('click', endGuide);
  el.querySelector('.guide-prev').addEventListener('click', () => goToStep(currentStep - 1));
  el.querySelector('.guide-next').addEventListener('click', () => {
    if (currentStep >= STEPS.length - 1) {
      endGuide();
    } else {
      goToStep(currentStep + 1);
    }
  });

  el.querySelector('.guide-backdrop').addEventListener('click', endGuide);

  return el;
}

function collapseAllSections() {
  document.querySelectorAll('.bottom-settings .section-body').forEach((body) => {
    body.classList.add('hidden');
  });
  document.querySelectorAll('.bottom-settings .section-header').forEach((h) => {
    h.classList.add('collapsed');
  });
}

function ensureVisible(step) {
  if (step.requireVisible) {
    const el = document.querySelector(step.requireVisible);
    if (el && el.classList.contains('hidden')) {
      el.classList.remove('hidden');
      el.dataset.guideOpened = 'true';
    }
  }
  // Collapse other sections first if requested
  if (step.collapseOthers) {
    collapseAllSections();
  }
  if (step.requireExpanded) {
    const el = document.querySelector(step.requireExpanded);
    if (el && el.classList.contains('hidden')) {
      el.classList.remove('hidden');
      const header = el.previousElementSibling;
      if (header && header.classList.contains('collapsed')) {
        header.classList.remove('collapsed');
      }
    }
  }
}

function executeAction(step) {
  if (!step.action) return;
  // Handle local UI actions
  if (step.action === 'openDropdown') {
    const menu = document.getElementById('view-dropdown-menu');
    if (menu) menu.classList.remove('hidden');
  } else if (step.action === 'closeDropdown') {
    const menu = document.getElementById('view-dropdown-menu');
    if (menu) menu.classList.add('hidden');
  } else if (step.action === 'closeAll') {
    // Hide locations panel
    const topBar = document.getElementById('top-bar');
    const locBtn = document.getElementById('toggle-locations');
    if (topBar) topBar.classList.add('hidden');
    if (locBtn) locBtn.textContent = 'Locations';
    // Hide bottom settings
    const bottomInner = document.querySelector('.bottom-settings-inner');
    if (bottomInner) bottomInner.classList.add('hidden');
    const bottomToggle = document.getElementById('bottom-settings-toggle');
    if (bottomToggle) bottomToggle.textContent = 'Settings';
    // Close dropdown
    const menu = document.getElementById('view-dropdown-menu');
    if (menu) menu.classList.add('hidden');
    // Collapse all sections
    collapseAllSections();
  } else if (step.action === 'closeAllAndSwitchToEnsemble') {
    // Hide bottom settings
    const bottomInner = document.querySelector('.bottom-settings-inner');
    if (bottomInner) bottomInner.classList.add('hidden');
    const bottomToggle = document.getElementById('bottom-settings-toggle');
    if (bottomToggle) bottomToggle.textContent = 'Settings';
    collapseAllSections();
    if (actionHandler) actionHandler('switchToEnsemble');
  } else if (actionHandler) {
    // Delegate to main.js handler
    actionHandler(step.action);
  }
}

function goToStep(idx) {
  if (idx < 0 || idx >= STEPS.length) return;
  currentStep = idx;
  const step = STEPS[currentStep];
  const highlight = overlayEl.querySelector('.guide-highlight');
  const tooltip = overlayEl.querySelector('.guide-tooltip');

  // Execute any action for this step
  executeAction(step);

  // Ensure required panels are visible
  ensureVisible(step);

  // Small delay to let DOM update after actions
  requestAnimationFrame(() => {
    // Position highlight
    if (step.target) {
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const pad = 4;
        highlight.style.display = 'block';
        highlight.style.left = `${rect.left - pad}px`;
        highlight.style.top = `${rect.top - pad}px`;
        highlight.style.width = `${rect.width + pad * 2}px`;
        highlight.style.height = `${rect.height + pad * 2}px`;
        positionTooltip(tooltip, rect);
      } else {
        highlight.style.display = 'none';
        centerTooltip(tooltip);
      }
    } else {
      highlight.style.display = 'none';
      centerTooltip(tooltip);
    }

    // Update content
    overlayEl.querySelector('.guide-title').textContent = step.title;
    overlayEl.querySelector('.guide-text').innerHTML = step.text;
    overlayEl.querySelector('.guide-progress').textContent = `${currentStep + 1} / ${STEPS.length}`;

    // Button visibility
    overlayEl.querySelector('.guide-prev').style.display = currentStep > 0 ? '' : 'none';
    const nextBtn = overlayEl.querySelector('.guide-next');
    nextBtn.textContent = currentStep >= STEPS.length - 1 ? 'Done' : 'Next';
  });
}

function positionTooltip(tooltip, targetRect) {
  tooltip.style.position = 'fixed';
  tooltip.style.left = '';
  tooltip.style.right = '';
  tooltip.style.top = '';
  tooltip.style.bottom = '';
  tooltip.style.transform = '';

  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const belowY = targetRect.bottom + margin;
  if (belowY + 200 < vh) {
    tooltip.style.top = `${belowY}px`;
    tooltip.style.left = `${Math.max(8, Math.min(targetRect.left, vw - 320))}px`;
    return;
  }

  const aboveY = targetRect.top - margin;
  if (aboveY > 200) {
    tooltip.style.bottom = `${vh - aboveY}px`;
    tooltip.style.left = `${Math.max(8, Math.min(targetRect.left, vw - 320))}px`;
    return;
  }

  centerTooltip(tooltip);
}

function centerTooltip(tooltip) {
  tooltip.style.position = 'fixed';
  tooltip.style.top = '50%';
  tooltip.style.left = '50%';
  tooltip.style.transform = 'translate(-50%, -50%)';
  tooltip.style.right = '';
  tooltip.style.bottom = '';
}

function endGuide() {
  if (actionHandler) actionHandler('switchToWind');
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  // Close all panels
  const topBar = document.getElementById('top-bar');
  const locBtn = document.getElementById('toggle-locations');
  if (topBar) topBar.classList.add('hidden');
  if (locBtn) locBtn.textContent = 'Locations';
  const bottomInner = document.querySelector('.bottom-settings-inner');
  if (bottomInner) bottomInner.classList.add('hidden');
  const bottomToggle = document.getElementById('bottom-settings-toggle');
  if (bottomToggle) bottomToggle.textContent = 'Settings';
  const menu = document.getElementById('view-dropdown-menu');
  if (menu) menu.classList.add('hidden');
  collapseAllSections();

  localStorage.setItem(GUIDE_SEEN_KEY, 'true');
  if (onComplete) onComplete();
}

export function startGuide(onAction, completionCallback) {
  actionHandler = onAction || null;
  onComplete = completionCallback || null;
  currentStep = 0;
  if (overlayEl) overlayEl.remove();
  overlayEl = createOverlay();
  goToStep(0);
}

export function hasSeenGuide() {
  return localStorage.getItem(GUIDE_SEEN_KEY) === 'true';
}

export function resetGuideSeen() {
  localStorage.removeItem(GUIDE_SEEN_KEY);
}
