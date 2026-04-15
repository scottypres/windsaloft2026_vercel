const GUIDE_SEEN_KEY = 'soar_guide_seen';

const STEPS = [
  {
    title: 'Welcome to Soar Forecaster!',
    text: 'This quick guide will walk you through the app. You can skip anytime.',
    target: null, // no highlight, centered overlay
  },
  {
    title: 'View Selector',
    text: 'Switch between Wind, Temp, Clouds, and Ensemble views. Wind shows wind speed and direction at various altitudes. Temp shows temperature profiles. Clouds shows cloud cover at different levels. Ensemble shows probabilistic forecasts from multiple model runs.',
    target: '#view-dropdown',
  },
  {
    title: 'Locations',
    text: 'Open the location panel to search for a location, use GPS, or pick from your saved locations.',
    target: '#toggle-locations',
  },
  {
    title: 'Location Search',
    text: 'Type a city or place name to search. Results appear in a dropdown — tap one to load its forecast.',
    target: '#location-search',
    requireVisible: '#top-bar',
  },
  {
    title: 'GPS',
    text: 'Tap GPS to use your current location for the forecast.',
    target: '#gps-btn',
    requireVisible: '#top-bar',
  },
  {
    title: 'Save Locations',
    text: 'After selecting a location, tap Save Current to add it to your saved list for quick access.',
    target: '#save-location-btn',
    requireVisible: '#top-bar',
  },
  {
    title: 'Show All Locations Forecast',
    text: 'View forecasts for all your saved locations at once, side by side.',
    target: '#show-all-locations',
    requireVisible: '#top-bar',
  },
  {
    title: 'Settings',
    text: 'Open the settings panel to customize filters, extra data rows, model selection, layout, and wind colors.',
    target: '#bottom-settings-toggle',
  },
  {
    title: 'Filters',
    text: 'Toggle Daylight Only to hide nighttime hours. Hide altitudes above 5k ft. Enable Wind Shear highlighting, Fog Mode, or Best Hours filtering.',
    target: '#section-filters',
    requireVisible: '.bottom-settings-inner',
  },
  {
    title: 'Extra Rows',
    text: 'Add supplementary data rows like Gusts, CAPE, Precip, Temp, Humidity, Dew Point Spread, Visibility, and Cloud layers beneath each model table.',
    target: '#section-extra-rows',
    requireVisible: '.bottom-settings-inner',
  },
  {
    title: 'Models & Forecast',
    text: 'Enable or disable individual weather models (HRRR, ECMWF, GFS, ICON, NAM) and adjust how many forecast days each model shows.',
    target: '#section-models',
    requireVisible: '.bottom-settings-inner',
  },
  {
    title: 'Layout',
    text: 'Fine-tune cell sizes, fonts, arrow style, borders, and spacing to fit your screen perfectly.',
    target: '#open-layout-popup',
    requireVisible: '.bottom-settings-inner',
  },
  {
    title: 'Wind Colors',
    text: 'Customize the wind speed thresholds that control the blue → green → red color gradient in the tables.',
    target: '#section-wind-colors',
    requireVisible: '.bottom-settings-inner',
  },
  {
    title: 'Guide Button',
    text: 'You can replay this guide anytime by tapping the Guide button in the header.',
    target: '#guide-btn',
  },
  {
    title: "You're all set!",
    text: 'Start by searching for a location or tapping GPS. Enjoy forecasting!',
    target: null,
  },
];

let currentStep = 0;
let overlayEl = null;
let onComplete = null;

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

  // Close on backdrop click
  el.querySelector('.guide-backdrop').addEventListener('click', endGuide);

  return el;
}

function ensureVisible(step) {
  if (!step.requireVisible) return;
  const el = document.querySelector(step.requireVisible);
  if (el && el.classList.contains('hidden')) {
    el.classList.remove('hidden');
    // Track that we opened it so we can decide whether to close later
    el.dataset.guideOpened = 'true';
  }
}

function goToStep(idx) {
  if (idx < 0 || idx >= STEPS.length) return;
  currentStep = idx;
  const step = STEPS[currentStep];
  const highlight = overlayEl.querySelector('.guide-highlight');
  const tooltip = overlayEl.querySelector('.guide-tooltip');

  // Ensure required panels are visible
  ensureVisible(step);

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

      // Position tooltip near the target
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
  overlayEl.querySelector('.guide-text').textContent = step.text;
  overlayEl.querySelector('.guide-progress').textContent = `${currentStep + 1} / ${STEPS.length}`;

  // Button visibility
  overlayEl.querySelector('.guide-prev').style.display = currentStep > 0 ? '' : 'none';
  const nextBtn = overlayEl.querySelector('.guide-next');
  nextBtn.textContent = currentStep >= STEPS.length - 1 ? 'Done' : 'Next';
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

  // Try below target
  const belowY = targetRect.bottom + margin;
  if (belowY + 200 < vh) {
    tooltip.style.top = `${belowY}px`;
    tooltip.style.left = `${Math.max(8, Math.min(targetRect.left, vw - 320))}px`;
    return;
  }

  // Try above target
  const aboveY = targetRect.top - margin;
  if (aboveY > 200) {
    tooltip.style.bottom = `${vh - aboveY}px`;
    tooltip.style.left = `${Math.max(8, Math.min(targetRect.left, vw - 320))}px`;
    return;
  }

  // Fallback: center
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
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  localStorage.setItem(GUIDE_SEEN_KEY, 'true');
  if (onComplete) onComplete();
}

export function startGuide(completionCallback) {
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
