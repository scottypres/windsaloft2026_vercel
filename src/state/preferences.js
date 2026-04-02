const PREFS_KEY = 'soar_preferences';

const DEFAULTS = {
  view: 'wind',
  showDaylightOnly: true,
  hideHighAltitude: true,
  showWindShear: false,
  showFogMode: false,
  bestHoursThreshold: null,
  windThresholds: { calm: 7, moderate: 13, strong: 21 },
  gfsDays: 14,
  iconDays: 7,
  supplementaryRows: {
    gusts: true,
    cape: true,
    liftedIndex: false,
    precipProb: true,
    precipInches: true,
    temp: true,
    humidity: true,
    dewpointSpread: true,
    visibility: true,
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
