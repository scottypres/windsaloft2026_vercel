import { MODEL_ORDER, MODEL_CONFIGS } from '../data/models.js';

const PREFS_KEY = 'soar_preferences';

// Build default toggles/days from model configs
const DEFAULT_TOGGLES = {};
const DEFAULT_DAYS = {};
for (const id of MODEL_ORDER) {
  DEFAULT_TOGGLES[id] = true;
  DEFAULT_DAYS[id] = MODEL_CONFIGS[id].defaultDays;
}

const DEFAULTS = {
  view: 'wind',
  showDaylightOnly: true,
  hideHighAltitude: true,
  showWindShear: false,
  showFogMode: false,
  bestHoursThreshold: null,
  windThresholds: { calm: 7, moderate: 13, strong: 21 },
  modelToggles: { ...DEFAULT_TOGGLES },
  modelDays: { ...DEFAULT_DAYS },
  ensembleDays: 14,
  supplementaryRows: {
    gusts: true,
    cape: false,
    liftedIndex: false,
    precipProb: false,
    precipInches: false,
    temp: true,
    humidity: false,
    dewpointSpread: false,
    visibility: false,
    cloudCover: false,
    cloudLow: false,
    cloudMid: false,
    cloudHigh: false,
  },
  savedLocations: [],
  lastLocation: { lat: 26.68, lon: -80.25, shortName: 'Loxahatchee, FL', fullName: 'Loxahatchee, Palm Beach County, FL 33470, USA' },
  showAllLocations: false,
  settingsVisible: true,
  layout: {
    cellWidth: 25,
    cellHeight: 8,
    headerHeight: 20,
    fontSize: 9,
    headerFontSize: 10,
    altWidth: 30,
    suppFontSize: 7,
    cellPad: 1,
    arrowSize: 9,
    tableGap: 6,
    borderWidth: 0.5,
    dayBorderWidth: 3,
    cellBorders: false,
  },
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return freshDefaults();
    const saved = JSON.parse(raw);

    // Migrate old gfsDays/iconDays into modelDays
    const modelDays = { ...DEFAULT_DAYS, ...saved.modelDays };
    if (saved.gfsDays && !saved.modelDays?.gfs_seamless) {
      modelDays.gfs_seamless = saved.gfsDays;
    }
    if (saved.iconDays && !saved.modelDays?.icon) {
      modelDays.icon = saved.iconDays;
    }

    return {
      ...DEFAULTS,
      ...saved,
      windThresholds: { ...DEFAULTS.windThresholds, ...saved.windThresholds },
      modelToggles: { ...DEFAULT_TOGGLES, ...saved.modelToggles },
      modelDays,
      supplementaryRows: { ...DEFAULTS.supplementaryRows, ...saved.supplementaryRows },
      layout: { ...DEFAULTS.layout, ...saved.layout },
      savedLocations: saved.savedLocations || [],
    };
  } catch {
    return freshDefaults();
  }
}

function freshDefaults() {
  return {
    ...DEFAULTS,
    windThresholds: { ...DEFAULTS.windThresholds },
    modelToggles: { ...DEFAULT_TOGGLES },
    modelDays: { ...DEFAULT_DAYS },
    supplementaryRows: { ...DEFAULTS.supplementaryRows },
    layout: { ...DEFAULTS.layout },
    savedLocations: [],
  };
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable
  }
}

export function resetPrefs() {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    // ignore
  }
  return freshDefaults();
}

export function addSavedLocation(prefs, location) {
  const exists = prefs.savedLocations.some(
    (l) => l.lat.toFixed(3) === location.lat.toFixed(3) && l.lon.toFixed(3) === location.lon.toFixed(3)
  );
  if (exists) return prefs;

  prefs.savedLocations = [location, ...prefs.savedLocations].slice(0, 10);
  savePrefs(prefs);
  return prefs;
}

export function removeSavedLocation(prefs, index) {
  prefs.savedLocations.splice(index, 1);
  savePrefs(prefs);
  return prefs;
}
