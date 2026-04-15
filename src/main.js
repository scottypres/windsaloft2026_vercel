import { fetchModel, fetchEnsemble } from './api/weather.js';
import { transformWeatherData, transformEnsembleData } from './data/transform.js';
import { renderTable } from './ui/table.js';
import { initControls, restoreControlState } from './ui/controls.js';
import { initLocationUI } from './ui/locations.js';
import { enableMomentumScroll } from './ui/momentum.js';
import { setArrowStyle, ARROW_STYLE_NAMES } from './ui/arrows.js';
import { windColor } from './data/colors.js';
import { MODEL_ORDER, MODEL_CONFIGS } from './data/models.js';
import {
  loadPrefs,
  savePrefs,
  resetPrefs,
  getDefaultLayout,
  addSavedLocation,
  removeSavedLocation,
} from './state/preferences.js';
import './styles/main.css';

let prefs = loadPrefs();
const modelData = {}; // { hrrr: transformedData, ecmwf: ..., ... }
let ensembleData = null; // { gefs: transformedData, ecmwf_ens: transformedData }
let locationUI = null;

// Map model IDs to their table container DOM IDs
const MODEL_CONTAINER_IDS = {
  hrrr: 'hrrr-table',
  ecmwf: 'ecmwf-table',
  nam: 'nam-table',
  gfs_seamless: 'gfs-seamless-table',
  icon: 'icon-table',
};

function getTableOptions() {
  return {
    view: prefs.view === 'ensemble' ? 'wind' : prefs.view,
    windThresholds: prefs.windThresholds,
    showDaylightOnly: prefs.showDaylightOnly,
    hideHighAltitude: prefs.hideHighAltitude,
    showWindShear: prefs.showWindShear,
    showFogMode: prefs.showFogMode,
    bestHoursThreshold: prefs.bestHoursThreshold,
    supplementaryRows: prefs.supplementaryRows,
    isEnsemble: prefs.view === 'ensemble',
  };
}

// N-way synchronized scrolling between all visible table containers
let syncEnabled = false;
let syncing = false;

function setupScrollSync() {
  // Remove old handlers
  document.querySelectorAll('.table-container').forEach((el) => {
    if (el._scrollHandler) {
      el.removeEventListener('scroll', el._scrollHandler);
      el._scrollHandler = null;
    }
  });

  if (!syncEnabled) return;

  // Group visible, non-empty containers by their sync group
  const groups = {};
  const sections = document.querySelectorAll('.table-section:not(.hidden)');
  sections.forEach((section) => {
    const group = section.dataset.syncGroup;
    if (!group) return; // No sync group = scrolls independently
    const container = section.querySelector('.table-container');
    if (container && container.innerHTML.trim()) {
      if (!groups[group]) groups[group] = [];
      groups[group].push(container);
    }
  });

  // Set up per-group sync
  for (const containers of Object.values(groups)) {
    if (containers.length < 2) continue;
    containers.forEach((container) => {
      container._scrollHandler = () => {
        if (syncing) return;
        syncing = true;
        const left = container.scrollLeft;
        containers.forEach((other) => {
          if (other !== container) other.scrollLeft = left;
        });
        syncing = false;
      };
      container.addEventListener('scroll', container._scrollHandler);
    });
  }
}

function updateTableSectionVisibility() {
  document.querySelectorAll('.table-section').forEach((section) => {
    const container = section.querySelector('.table-container');
    section.classList.toggle('empty', !container || !container.innerHTML.trim());
  });
}

function setNormalModelVisibility(visible) {
  for (const id of MODEL_ORDER) {
    const section = document.querySelector(`.table-section[data-model="${id}"]`);
    if (section) {
      section.classList.toggle('hidden', !visible || !prefs.modelToggles[id]);
    }
  }
}

function setEnsembleVisibility(visible) {
  document.querySelectorAll('.ensemble-section').forEach((section) => {
    section.classList.toggle('hidden', !visible);
  });
}

function rerender() {
  if (prefs.showAllLocations) {
    renderAllLocations();
    return;
  }

  document.querySelector('.tables-wrapper').classList.remove('all-locations-mode');

  syncEnabled = prefs.bestHoursThreshold == null;
  const isEnsembleView = prefs.view === 'ensemble';

  // Toggle visibility
  setNormalModelVisibility(!isEnsembleView);
  setEnsembleVisibility(isEnsembleView);

  if (isEnsembleView) {
    // Render ensemble tables
    const gefsContainer = document.getElementById('gefs-table');
    const ecmwfEnsContainer = document.getElementById('ecmwf-ens-table');

    if (ensembleData?.gefs) {
      renderTable(gefsContainer, ensembleData.gefs, getTableOptions());
      enableMomentumScroll(gefsContainer);
    } else {
      gefsContainer.innerHTML = '<div class="no-data">Click a location to load ensemble data.</div>';
    }
    if (ensembleData?.ecmwf_ens) {
      renderTable(ecmwfEnsContainer, ensembleData.ecmwf_ens, getTableOptions());
      enableMomentumScroll(ecmwfEnsContainer);
    } else {
      ecmwfEnsContainer.innerHTML = '';
    }
  } else {
    // Render normal model tables
    const opts = getTableOptions();
    for (const id of MODEL_ORDER) {
      const container = document.getElementById(MODEL_CONTAINER_IDS[id]);
      const section = document.querySelector(`.table-section[data-model="${id}"]`);

      if (!prefs.modelToggles[id]) {
        if (section) section.classList.add('hidden');
        if (container) container.innerHTML = '';
        continue;
      }

      // Hide models with no cloud altitude data in clouds view
      if (opts.view === 'clouds' && modelData[id] && (!modelData[id].cloudAltitudes || modelData[id].cloudAltitudes.length === 0)) {
        if (section) section.classList.add('hidden');
        if (container) container.innerHTML = '';
        continue;
      }

      if (modelData[id]) {
        renderTable(container, modelData[id], opts);
      } else {
        container.innerHTML = '';
      }
    }
  }

  updateTableSectionVisibility();
  setupScrollSync();

  // Enable momentum scroll on all visible containers
  document.querySelectorAll('.table-section:not(.hidden) .table-container').forEach((el) => {
    enableMomentumScroll(el);
  });
}

async function loadWeather(lat, lon) {
  const loading = document.getElementById('loading');

  // Clear all containers
  for (const id of MODEL_ORDER) {
    const container = document.getElementById(MODEL_CONTAINER_IDS[id]);
    if (container) container.innerHTML = '';
  }
  loading.classList.remove('hidden');

  try {
    // Fetch all enabled models in parallel
    const enabledModels = MODEL_ORDER.filter((id) => prefs.modelToggles[id]);
    const promises = enabledModels.map((id) =>
      fetchModel(id, lat, lon, prefs.modelDays[id]).catch((err) => {
        console.error(`Failed to fetch ${id}:`, err);
        return null;
      })
    );

    const results = await Promise.all(promises);
    enabledModels.forEach((id, i) => {
      if (results[i]) {
        modelData[id] = transformWeatherData(results[i], id);
      } else {
        modelData[id] = null;
      }
    });

    // If ensemble view is active, also fetch ensemble data
    if (prefs.view === 'ensemble') {
      await loadEnsemble(lat, lon);
    }

    rerender();
  } catch (err) {
    const firstContainer = document.getElementById(MODEL_CONTAINER_IDS[MODEL_ORDER[0]]);
    if (firstContainer) {
      firstContainer.innerHTML = `<div class="error">Failed to load weather data: ${err.message}</div>`;
    }
    console.error(err);
  } finally {
    loading.classList.add('hidden');
  }
}

async function loadEnsemble(lat, lon) {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');

  try {
    const raw = await fetchEnsemble(lat, lon, prefs.ensembleDays || 14);
    ensembleData = {
      gefs: transformEnsembleData(raw, 'gefs'),
      ecmwf_ens: transformEnsembleData(raw, 'ecmwf_ens'),
    };
  } catch (err) {
    console.error('Failed to fetch ensemble data:', err);
    ensembleData = null;
    const container = document.getElementById('gefs-table');
    if (container) {
      container.innerHTML = `<div class="error">Failed to load ensemble data: ${err.message}</div>`;
    }
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
  const firstContainer = document.getElementById(MODEL_CONTAINER_IDS[MODEL_ORDER[0]]);
  const loading = document.getElementById('loading');
  const wrapper = document.querySelector('.tables-wrapper');

  // Hide all model sections except the first one (used for all-locations rendering)
  MODEL_ORDER.slice(1).forEach((id) => {
    const container = document.getElementById(MODEL_CONTAINER_IDS[id]);
    if (container) container.innerHTML = '';
    const section = document.querySelector(`.table-section[data-model="${id}"]`);
    if (section) section.classList.add('hidden');
  });
  setEnsembleVisibility(false);

  wrapper.classList.add('all-locations-mode');

  if (prefs.savedLocations.length === 0) {
    firstContainer.innerHTML = '<div class="no-data">No saved locations to display.</div>';
    return;
  }

  loading.classList.remove('hidden');
  firstContainer.innerHTML = '';

  // Use the first enabled model for all-locations view
  const activeModel = MODEL_ORDER.find((id) => prefs.modelToggles[id]) || MODEL_ORDER[0];

  try {
    for (const loc of prefs.savedLocations) {
      const raw = await fetchModel(activeModel, loc.lat, loc.lon, prefs.modelDays[activeModel]);
      const data = transformWeatherData(raw, activeModel);

      const item = document.createElement('div');
      item.className = 'all-locations-item';
      const header = document.createElement('h3');
      header.className = 'location-header';
      header.textContent = loc.shortName;
      item.appendChild(header);

      const tableDiv = document.createElement('div');
      tableDiv.className = 'table-container';
      item.appendChild(tableDiv);
      firstContainer.appendChild(item);

      renderTable(tableDiv, data, getTableOptions());
      enableMomentumScroll(tableDiv);
    }
    setupAllLocationsScrollSync();
  } catch (err) {
    firstContainer.innerHTML += `<div class="error">Error: ${err.message}</div>`;
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
  root.style.setProperty('--arrow-gap', `${layout.arrowGap}px`);
  root.style.setProperty('--table-gap', `${layout.tableGap}px`);
  if (layout.arrowStyle) setArrowStyle(layout.arrowStyle);
  root.style.setProperty('--border-width', `${layout.borderWidth}px`);
  root.style.setProperty('--day-border-width', `${layout.dayBorderWidth}px`);
}

function initBottomSettings() {
  const panel = document.getElementById('bottom-settings');
  const toggleBtn = document.getElementById('bottom-settings-toggle');
  const inner = panel.querySelector('.bottom-settings-inner');

  toggleBtn.addEventListener('click', () => {
    inner.classList.toggle('hidden');
  });

  // Collapsible section headers
  panel.querySelectorAll('.section-header').forEach((header) => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      if (body) {
        body.classList.toggle('hidden');
        header.classList.toggle('collapsed');
      }
    });
  });

  // Layout popup open/close
  const layoutPopup = document.getElementById('layout-popup');
  document.getElementById('open-layout-popup').addEventListener('click', () => {
    layoutPopup.classList.remove('hidden');
    inner.classList.add('hidden');
  });
  document.getElementById('layout-popup-done').addEventListener('click', () => {
    layoutPopup.classList.add('hidden');
    savePrefs(prefs);
  });
  document.querySelector('.layout-popup-backdrop').addEventListener('click', () => {
    layoutPopup.classList.add('hidden');
    savePrefs(prefs);
  });

  // Layout sliders
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
    'layout-arrow-gap': 'arrowGap',
    'layout-table-gap': 'tableGap',
    'layout-border-width': 'borderWidth',
    'layout-day-border-width': 'dayBorderWidth',
  };

  for (const [id, key] of Object.entries(sliders)) {
    const slider = document.getElementById(id);
    const valSpan = document.getElementById(`${id}-val`);

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

  // Arrow style select
  const arrowStyleSelect = document.getElementById('layout-arrow-style');
  if (prefs.layout.arrowStyle) arrowStyleSelect.value = prefs.layout.arrowStyle;
  arrowStyleSelect.addEventListener('change', () => {
    prefs.layout.arrowStyle = arrowStyleSelect.value;
    setArrowStyle(arrowStyleSelect.value);
    savePrefs(prefs);
    rerender();
  });

  // Layout reset
  document.getElementById('layout-reset').addEventListener('click', () => {
    if (confirm('Reset layout to defaults?')) {
      const defaults = getDefaultLayout();
      prefs.layout = defaults;
      savePrefs(prefs);
      applyLayout(defaults);
      applyCellBorders(defaults.cellBorders);
      setArrowStyle(defaults.arrowStyle);
      // Update all slider values in the UI
      for (const [id, key] of Object.entries(sliders)) {
        const s = document.getElementById(id);
        const v = document.getElementById(`${id}-val`);
        if (s && defaults[key] != null) {
          s.value = defaults[key];
          if (v) v.textContent = defaults[key];
        }
      }
      bordersCheckbox.checked = !!defaults.cellBorders;
      arrowStyleSelect.value = defaults.arrowStyle || 'classic';
      rerender();
    }
  });

  // Wind color thresholds
  initWindColorControls();

  // Show panel, start with inner collapsed
  panel.classList.remove('hidden');
  inner.classList.add('hidden');

  // Start all section bodies collapsed
  panel.querySelectorAll('.section-body').forEach((body) => {
    body.classList.add('hidden');
  });
  panel.querySelectorAll('.section-header').forEach((h) => {
    h.classList.add('collapsed');
  });

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

  calmInput.value = prefs.windThresholds.calm;
  modInput.value = prefs.windThresholds.moderate;
  strongInput.value = prefs.windThresholds.strong;
  updateWindGradient();

  const readThresholds = () => ({
    calm: parseInt(calmInput.value) || 7,
    moderate: parseInt(modInput.value) || 15,
    strong: parseInt(strongInput.value) || 20,
  });

  const onInput = () => {
    prefs.windThresholds = readThresholds();
    updateWindGradient();
  };

  const onChange = () => {
    prefs.windThresholds = readThresholds();
    savePrefs(prefs);
    updateWindGradient();
    rerender();
  };

  calmInput.addEventListener('input', onInput);
  modInput.addEventListener('input', onInput);
  strongInput.addEventListener('input', onInput);
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
  const bottomInner = document.querySelector('.bottom-settings-inner');

  const updateVisibility = () => {
    topBar.classList.toggle('hidden', !prefs.settingsVisible);
    btn.textContent = prefs.settingsVisible ? 'Hide' : 'Locations';
  };

  btn.addEventListener('click', () => {
    prefs.settingsVisible = !prefs.settingsVisible;
    savePrefs(prefs);
    updateVisibility();
    // Hide bottom settings when locations panel opens
    if (prefs.settingsVisible && bottomInner) {
      bottomInner.classList.add('hidden');
    }
  });

  updateVisibility();
}

function init() {
  initSettingsToggle();
  initBottomSettings();

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

  initControls({
    onViewChange(view) {
      prefs.view = view;
      savePrefs(prefs);
      // If switching to ensemble view, fetch ensemble data if we have a location
      if (view === 'ensemble' && !ensembleData && prefs.lastLocation) {
        loadEnsemble(prefs.lastLocation.lat, prefs.lastLocation.lon).then(() => rerender());
        return;
      }
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
    onModelToggle(modelId, enabled) {
      prefs.modelToggles[modelId] = enabled;
      savePrefs(prefs);
      // If enabling a model that hasn't been fetched, fetch it
      if (enabled && !modelData[modelId] && prefs.lastLocation) {
        fetchModel(modelId, prefs.lastLocation.lat, prefs.lastLocation.lon, prefs.modelDays[modelId])
          .then((raw) => {
            modelData[modelId] = transformWeatherData(raw, modelId);
            rerender();
          })
          .catch((err) => console.error(`Failed to fetch ${modelId}:`, err));
        return;
      }
      rerender();
    },
    onModelDaysChange(modelId, days) {
      prefs.modelDays[modelId] = days;
      savePrefs(prefs);
      if (prefs.lastLocation && prefs.modelToggles[modelId]) {
        fetchModel(modelId, prefs.lastLocation.lat, prefs.lastLocation.lon, days)
          .then((raw) => {
            modelData[modelId] = transformWeatherData(raw, modelId);
            rerender();
          })
          .catch((err) => console.error(`Failed to fetch ${modelId}:`, err));
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

  restoreControlState(prefs);

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
