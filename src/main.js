import { fetchGFS, fetchICON } from './api/weather.js';
import { transformWeatherData } from './data/transform.js';
import { renderTable } from './ui/table.js';
import { initControls, restoreControlState } from './ui/controls.js';
import { initLocationUI } from './ui/locations.js';
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

function rerender() {
  const gfsContainer = document.getElementById('gfs-table');
  const iconContainer = document.getElementById('icon-table');

  if (prefs.showAllLocations) {
    renderAllLocations();
    return;
  }

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

async function renderAllLocations() {
  const gfsContainer = document.getElementById('gfs-table');
  const iconContainer = document.getElementById('icon-table');
  const loading = document.getElementById('loading');

  iconContainer.innerHTML = '';

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

      const wrapper = document.createElement('div');
      wrapper.className = 'all-locations-item';
      const header = document.createElement('h3');
      header.className = 'location-header';
      header.textContent = loc.shortName;
      wrapper.appendChild(header);

      const tableDiv = document.createElement('div');
      tableDiv.className = 'table-container';
      wrapper.appendChild(tableDiv);
      gfsContainer.appendChild(wrapper);

      renderTable(tableDiv, data, getTableOptions());
    }
  } catch (err) {
    gfsContainer.innerHTML += `<div class="error">Error: ${err.message}</div>`;
  } finally {
    loading.classList.add('hidden');
  }
}

function init() {
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

document.addEventListener('DOMContentLoaded', init);
