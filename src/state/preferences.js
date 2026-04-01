const PREFS_KEY = 'soar_preferences';

const DEFAULTS = {
  view: 'wind',
  showDaylightOnly: false,
  hideHighAltitude: false,
  showWindShear: false,
  showFogMode: false,
  bestHoursThreshold: null,
  windThresholds: { calm: 7, moderate: 15, strong: 20 },
  gfsDays: 7,
  iconDays: 5,
  supplementaryRows: {
    gusts: false,
    cape: false,
    liftedIndex: false,
    precipProb: false,
    precipInches: false,
    temp: false,
    humidity: false,
    dewpointSpread: false,
    visibility: false,
    cloudCover: false,
    thermals: false,
  },
  savedLocations: [],
  lastLocation: null,
  showAllLocations: false,
  settingsVisible: true,
  layout: {
    cellWidth: 34,
    cellHeight: 28,
    headerHeight: 42,
    fontSize: 11,
    headerFontSize: 9,
    altWidth: 60,
    cellPad: 2,
    arrowSize: 10,
    cellBorders: false,
  },
};

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS, supplementaryRows: { ...DEFAULTS.supplementaryRows }, windThresholds: { ...DEFAULTS.windThresholds }, savedLocations: [] };
    const saved = JSON.parse(raw);
    return {
      ...DEFAULTS,
      ...saved,
      windThresholds: { ...DEFAULTS.windThresholds, ...saved.windThresholds },
      supplementaryRows: { ...DEFAULTS.supplementaryRows, ...saved.supplementaryRows },
      layout: { ...DEFAULTS.layout, ...saved.layout },
      savedLocations: saved.savedLocations || [],
    };
  } catch {
    return { ...DEFAULTS, supplementaryRows: { ...DEFAULTS.supplementaryRows }, windThresholds: { ...DEFAULTS.windThresholds }, layout: { ...DEFAULTS.layout }, savedLocations: [] };
  }
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
  return { ...DEFAULTS, supplementaryRows: { ...DEFAULTS.supplementaryRows }, windThresholds: { ...DEFAULTS.windThresholds }, savedLocations: [] };
}

export function addSavedLocation(prefs, location) {
  // Don't duplicate
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
