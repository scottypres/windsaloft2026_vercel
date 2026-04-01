import { fetchGFS, fetchICON } from './api/weather.js';
import { transformWeatherData } from './data/transform.js';
import { renderTable } from './ui/table.js';
import { initControls, restoreControlState } from './ui/controls.js';
import { initLocationUI } from './ui/locations.js';
import { windColor } from './data/colors.js';
import {
  loadPrefs,
  savePrefs,
  resetPrefs,
  addSavedLocation,
  removeSavedLocation,
} from './state/preferences.js';
import './styles/main.css';

let prefs = loadPrefs();
let gfsData = null;
let iconData = null;
let locationUI = null;

function getTableOptions() {
  return {
    view: prefs.view,
    windThresholds: prefs.windThresholds,
    showDaylightOnly: prefs.showDaylightOnly,
    hideHighAltitude: prefs.hideHighAltitude,
    showWindShear: prefs.showWindShear,
    showFogMode: prefs.showFogMode,
    bestHoursThreshold: prefs.bestHoursThreshold,
    supplementaryRows: prefs.supplementaryRows,
  };
}

// Synchronized scrolling between GFS and ICON tables
let syncEnabled = false;
let syncing = false;

function setupScrollSync() {
  const gfs = document.getElementById('gfs-table');
  const icon = document.getElementById('icon-table');

  // Remove old listeners by replacing elements (simplest way)
  // We re-attach every rerender, so just use a flag
  gfs._scrollHandler && gfs.removeEventListener('scroll', gfs._scrollHandler);
  icon._scrollHandler && icon.removeEventListener('scroll', icon._scrollHandler);

  if (!syncEnabled) return;

  gfs._scrollHandler = () => {
    if (syncing) return;
    syncing = true;
    icon.scrollLeft = gfs.scrollLeft;
    syncing = false;
  };
  icon._scrollHandler = () => {
    if (syncing) return;
    syncing = true;
    gfs.scrollLeft = icon.scrollLeft;
    syncing = false;
  };
  gfs.addEventListener('scroll', gfs._scrollHandler);
  icon.addEventListener('scroll', icon._scrollHandler);
}

function updateTableSectionVisibility() {
  document.querySelectorAll('.table-section').forEach((section) => {
    const container = section.querySelector('.table-container');
    section.classList.toggle('empty', !container || !container.innerHTML.trim());
  });
}

function rerender() {
  const gfsContainer = document.getElementById('gfs-table');
  const iconContainer = document.getElementById('icon-table');

  if (prefs.showAllLocations) {
    renderAllLocations();
    return;
  }

  document.querySelector('.tables-wrapper').classList.remove('all-locations-mode');

  // Sync scrolling when best hours is NOT active (same columns in both tables)
  syncEnabled = prefs.bestHoursThreshold == null;

  if (gfsData) {
    renderTable(gfsContainer, gfsData, getTableOptions());
  } else {
    gfsContainer.innerHTML = '';
  }
  if (iconData) {
    renderTable(iconContainer, iconData, getTableOptions());
  } else {
    iconContainer.innerHTML = '';
  }

  updateTableSectionVisibility();
  setupScrollSync();
}

async function loadWeather(lat, lon) {
  const gfsContainer = document.getElementById('gfs-table');
  const iconContainer = document.getElementById('icon-table');
  const loading = document.getElementById('loading');

  gfsContainer.innerHTML = '';
  iconContainer.innerHTML = '';
  loading.classList.remove('hidden');

  try {
    const [gfsRaw, iconRaw] = await Promise.all([
      fetchGFS(lat, lon, prefs.gfsDays),
      fetchICON(lat, lon, prefs.iconDays),
    ]);

    gfsData = transformWeatherData(gfsRaw, 'gfs');
    iconData = transformWeatherData(iconRaw, 'icon');

    rerender();
  } catch (err) {
    gfsContainer.innerHTML = `<div class="error">Failed to load weather data: ${err.message}</div>`;
    console.error(err);
  } finally {
    loading.classList.add('hidden');
  }
}

function setupAllLocationsScrollSync() {
  const containers = document.querySelectorAll('.all-locations-item .table-container');
  let isSyncing = false;

  containers.forEach((container) => {
    container.addEventListener('scroll', () => {
      if (isSyncing) return;
      isSyncing = true;
      const scrollLeft = container.scrollLeft;
      containers.forEach((other) => {
        if (other !== container) other.scrollLeft = scrollLeft;
      });
      isSyncing = false;
    });
  });
}

async function renderAllLocations() {
  const gfsContainer = document.getElementById('gfs-table');
  const iconContainer = document.getElementById('icon-table');
  const loading = document.getElementById('loading');
  const wrapper = document.querySelector('.tables-wrapper');

  iconContainer.innerHTML = '';
  wrapper.classList.add('all-locations-mode');

  if (prefs.savedLocations.length === 0) {
    gfsContainer.innerHTML = '<div class="no-data">No saved locations to display.</div>';
    return;
  }

  loading.classList.remove('hidden');
  gfsContainer.innerHTML = '';

  try {
    for (const loc of prefs.savedLocations) {
      const raw = await fetchGFS(loc.lat, loc.lon, prefs.gfsDays);
      const data = transformWeatherData(raw, 'gfs');

      const item = document.createElement('div');
      item.className = 'all-locations-item';
      const header = document.createElement('h3');
      header.className = 'location-header';
      header.textContent = loc.shortName;
      item.appendChild(header);

      const tableDiv = document.createElement('div');
      tableDiv.className = 'table-container';
      item.appendChild(tableDiv);
      gfsContainer.appendChild(item);

      renderTable(tableDiv, data, getTableOptions());
    }
    setupAllLocationsScrollSync();
  } catch (err) {
    gfsContainer.innerHTML += `<div class="error">Error: ${err.message}</div>`;
  } finally {
    loading.classList.add('hidden');
    updateTableSectionVisibility();
  }
}

function applyLayout(layout) {
  const root = document.documentElement;
  root.style.setProperty('--cell-width', `${layout.cellWidth}px`);
  root.style.setProperty('--cell-height', `${layout.cellHeight}px`);
  root.style.setProperty('--header-height', `${layout.headerHeight}px`);
  root.style.setProperty('--cell-font-size', `${layout.fontSize}px`);
  root.style.setProperty('--header-font-size', `${layout.headerFontSize}px`);
  root.style.setProperty('--alt-width', `${layout.altWidth}px`);
  root.style.setProperty('--supp-font-size', `${layout.suppFontSize}px`);
  root.style.setProperty('--cell-pad', `${layout.cellPad}px`);
  root.style.setProperty('--arrow-size', `${layout.arrowSize}px`);
  root.style.setProperty('--table-gap', `${layout.tableGap}px`);
  root.style.setProperty('--border-width', `${layout.borderWidth}px`);
  root.style.setProperty('--day-border-width', `${layout.dayBorderWidth}px`);
}

function initLayoutSettings() {
  const panel = document.getElementById('layout-settings');
  const toggleBtn = document.getElementById('layout-toggle');
  const inner = panel.querySelector('.layout-settings-inner');

  toggleBtn.addEventListener('click', () => {
    inner.classList.toggle('hidden');
  });

  const sliders = {
    'layout-cell-width': 'cellWidth',
    'layout-cell-height': 'cellHeight',
    'layout-header-height': 'headerHeight',
    'layout-alt-width': 'altWidth',
    'layout-font-size': 'fontSize',
    'layout-header-font-size': 'headerFontSize',
    'layout-supp-font-size': 'suppFontSize',
    'layout-cell-pad': 'cellPad',
    'layout-arrow-size': 'arrowSize',
    'layout-table-gap': 'tableGap',
    'layout-border-width': 'borderWidth',
    'layout-day-border-width': 'dayBorderWidth',
  };

  for (const [id, key] of Object.entries(sliders)) {
    const slider = document.getElementById(id);
    const valSpan = document.getElementById(`${id}-val`);

    // Restore saved value
    if (prefs.layout[key] != null) {
      slider.value = prefs.layout[key];
      valSpan.textContent = prefs.layout[key];
    }

    slider.addEventListener('input', () => {
      valSpan.textContent = slider.value;
      prefs.layout[key] = parseFloat(slider.value);
      applyLayout(prefs.layout);
    });
    slider.addEventListener('change', () => {
      savePrefs(prefs);
    });
  }

  // Cell borders toggle
  const bordersCheckbox = document.getElementById('layout-cell-borders');
  if (prefs.layout.cellBorders) bordersCheckbox.checked = true;
  applyCellBorders(prefs.layout.cellBorders);
  bordersCheckbox.addEventListener('change', () => {
    prefs.layout.cellBorders = bordersCheckbox.checked;
    applyCellBorders(bordersCheckbox.checked);
    savePrefs(prefs);
  });

  // Wind color thresholds
  initWindColorControls();

  // Show the toggle button always (panel starts hidden)
  panel.classList.remove('hidden');
  inner.classList.add('hidden');
  applyLayout(prefs.layout);
}

function updateWindGradient() {
  const preview = document.getElementById('wind-gradient-preview');
  if (!preview) return;
  const t = prefs.windThresholds;
  const maxMph = Math.round(t.strong * 1.5);
  const stops = [];
  for (let mph = 0; mph <= maxMph; mph++) {
    const pct = (mph / maxMph) * 100;
    stops.push(`${windColor(mph, t)} ${pct}%`);
  }
  preview.style.background = `linear-gradient(to right, ${stops.join(', ')})`;

  // Add labels
  const calmPct = (t.calm / maxMph) * 100;
  const modPct = (t.moderate / maxMph) * 100;
  const strongPct = (t.strong / maxMph) * 100;
  preview.innerHTML = `<div class="gradient-labels">
    <span style="left:${calmPct}%">${t.calm}</span>
    <span style="left:${modPct}%">${t.moderate}</span>
    <span style="left:${strongPct}%">${t.strong}</span>
  </div>`;
}

function initWindColorControls() {
  const calmInput = document.getElementById('wt-calm');
  const modInput = document.getElementById('wt-moderate');
  const strongInput = document.getElementById('wt-strong');

  // Restore saved values
  calmInput.value = prefs.windThresholds.calm;
  modInput.value = prefs.windThresholds.moderate;
  strongInput.value = prefs.windThresholds.strong;
  updateWindGradient();

  const onChange = () => {
    prefs.windThresholds = {
      calm: parseInt(calmInput.value) || 7,
      moderate: parseInt(modInput.value) || 15,
      strong: parseInt(strongInput.value) || 20,
    };
    savePrefs(prefs);
    updateWindGradient();
    // Also sync the controls panel thresholds
    const tc = document.getElementById('threshold-calm');
    const tm = document.getElementById('threshold-moderate');
    const ts = document.getElementById('threshold-strong');
    if (tc) tc.value = prefs.windThresholds.calm;
    if (tm) tm.value = prefs.windThresholds.moderate;
    if (ts) ts.value = prefs.windThresholds.strong;
    rerender();
  };

  calmInput.addEventListener('change', onChange);
  modInput.addEventListener('change', onChange);
  strongInput.addEventListener('change', onChange);
}

function applyCellBorders(enabled) {
  document.body.classList.toggle('cell-borders', !!enabled);
}

function initSettingsToggle() {
  const btn = document.getElementById('toggle-settings');
  const topBar = document.getElementById('top-bar');

  const updateVisibility = () => {
    topBar.classList.toggle('hidden', !prefs.settingsVisible);
    btn.textContent = prefs.settingsVisible ? 'Hide Settings' : 'Settings';
  };

  btn.addEventListener('click', () => {
    prefs.settingsVisible = !prefs.settingsVisible;
    savePrefs(prefs);
    updateVisibility();
  });

  updateVisibility();
}

function init() {
  // Settings toggle & layout
  initSettingsToggle();
  initLayoutSettings();

  // Init location UI
  locationUI = initLocationUI(document.getElementById('location-panel'), {
    onLocationSelect(loc) {
      prefs.lastLocation = loc;
      prefs.showAllLocations = false;
      savePrefs(prefs);
      loadWeather(loc.lat, loc.lon);
    },
    onSaveLocation(loc) {
      prefs = addSavedLocation(prefs, loc);
      locationUI.renderSavedLocations(prefs.savedLocations);
    },
    onDeleteLocation(idx) {
      prefs = removeSavedLocation(prefs, idx);
      locationUI.renderSavedLocations(prefs.savedLocations);
    },
  });

  locationUI.renderSavedLocations(prefs.savedLocations);

  // Init controls
  initControls(document.getElementById('controls-panel'), {
    onViewChange(view) {
      prefs.view = view;
      savePrefs(prefs);
      rerender();
    },
    onToggle(key, value) {
      prefs[key] = value;
      savePrefs(prefs);
      rerender();
    },
    onSuppChange(suppState) {
      prefs.supplementaryRows = suppState;
      savePrefs(prefs);
      rerender();
    },
    onThresholdsChange(thresholds) {
      prefs.windThresholds = thresholds;
      savePrefs(prefs);
      rerender();
    },
    onForecastDaysChange(model, days) {
      if (model === 'gfs') prefs.gfsDays = days;
      else prefs.iconDays = days;
      savePrefs(prefs);
      // Re-fetch with new day count
      if (prefs.lastLocation) {
        loadWeather(prefs.lastLocation.lat, prefs.lastLocation.lon);
      }
    },
    onShowAllLocations() {
      prefs.showAllLocations = !prefs.showAllLocations;
      savePrefs(prefs);
      if (prefs.showAllLocations) {
        renderAllLocations();
      } else {
        rerender();
      }
    },
    onReset() {
      prefs = resetPrefs();
      location.reload();
    },
  });

  // Restore control state
  restoreControlState(document.getElementById('controls-panel'), prefs);

  // Auto-load last location
  if (prefs.lastLocation) {
    locationUI.setCurrentLocation(prefs.lastLocation);
    if (prefs.showAllLocations) {
      renderAllLocations();
    } else {
      loadWeather(prefs.lastLocation.lat, prefs.lastLocation.lon);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  init();
});
