import { modelOrderFor, MODEL_CONFIGS } from '../data/models.js';

const PREFS_KEY = 'soar_preferences';

export const REGIONS = ['usa', 'europe'];
export const REGION_LABELS = { usa: 'USA', europe: 'Europe' };
const DEFAULT_REGION = 'usa';

// Which models start enabled in each region.
//
// Europe deliberately enables exactly one: a first Europe page load should fire
// a single deterministic request. Every other model is present and toggleable,
// just off. The USA region keeps its historical all-on behaviour.
const DEFAULT_ENABLED = {
  usa: null, // null = all models on
  europe: new Set(['meteoswiss_seamless']),
};

function defaultToggles(region) {
  const enabled = DEFAULT_ENABLED[region];
  return Object.fromEntries(
    modelOrderFor(region).map((id) => [id, enabled ? enabled.has(id) : true])
  );
}

function defaultDays(region) {
  return Object.fromEntries(
    modelOrderFor(region).map((id) => [id, MODEL_CONFIGS[id].defaultDays])
  );
}

// Everything a region owns. There are no cross-region settings other than
// `activeRegion` itself — switching regions swaps this entire bundle.
const DEFAULTS = {
  view: 'wind',
  units: { wind: 'mph', temp: 'F', altitude: 'ft' },
  showDaylightOnly: true,
  hideHighAltitude: true,
  // "Hide >" cutoff in thousands of the selected altitude unit. Kept per unit
  // so switching ft↔m lands on a round number instead of a converted fraction.
  hideAboveThousands: { ft: 5, m: 3 },
  showWindShear: false,
  showFogMode: false,
  showGroundLevel: false,
  bestHoursThreshold: null,
  windThresholds: { calm: 7, moderate: 13, strong: 21 },
  // Replaced per region in defaultProfile().
  modelToggles: {},
  modelDays: {},
  ensembleDays: 14,
  supplementaryRows: {
    gusts: true,
    cape: false,
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
  dragMultiplier: 1.4,
  settingsVisible: true,
  layout: {
    cellWidth: 18,
    cellHeight: 8,
    headerHeight: 20,
    fontSize: 9,
    headerFontSize: 10,
    altWidth: 45,
    suppFontSize: 9,
    cellPad: 1,
    arrowSize: 9,
    arrowGap: -2,
    arrowStyle: 'thin',
    tableGap: 6,
    borderWidth: 0.5,
    dayBorderWidth: 3,
    cellBorders: false,
  },
};

// Per-region overrides applied on top of DEFAULTS the first time a region is
// used. After that the region keeps whatever the user sets, independent of
// the other region.
//
// Units are display-only: requests stay hardcoded to fahrenheit/mph/inch in
// weather.js because cacheKey() has no unit component, so making units affect
// the request would serve wrong-unit data from cache and double the call count.
// The conversion layer in data/units.js handles the rest.
const REGION_OVERRIDES = {
  usa: {},
  europe: {
    units: { wind: 'kmh', temp: 'C', altitude: 'm' },
    // Europe's model names are long ("MeteoSwiss Seamless", "DWD ICON
    // Seamless"), so the row-header column starts wider here — at the USA
    // default of 45px they break mid-word in the table corner. Still a
    // slider like every other layout value.
    layout: { ...DEFAULTS.layout, altWidth: 62 },
    lastLocation: {
      lat: 46.6863,
      lon: 7.8632,
      shortName: 'Interlaken, Switzerland',
      fullName: 'Interlaken, Verwaltungskreis Interlaken-Oberhasli, Bern, 3800, Switzerland',
    },
  },
};

function defaultProfile(region) {
  const overrides = REGION_OVERRIDES[region] || {};
  return {
    ...deepCopyDefaults(),
    modelToggles: defaultToggles(region),
    modelDays: defaultDays(region),
    ...overrides,
    units: { ...DEFAULTS.units, ...overrides.units },
  };
}

function deepCopyDefaults() {
  return {
    ...DEFAULTS,
    units: { ...DEFAULTS.units },
    hideAboveThousands: { ...DEFAULTS.hideAboveThousands },
    windThresholds: { ...DEFAULTS.windThresholds },
    supplementaryRows: { ...DEFAULTS.supplementaryRows },
    layout: { ...DEFAULTS.layout },
    savedLocations: [],
  };
}

export function getDefaultLayout() {
  return { ...DEFAULTS.layout };
}

// Fill a saved profile out with anything the defaults have gained since it was
// written, without clobbering what the user set.
function hydrateProfile(saved, region) {
  const base = defaultProfile(region);
  if (!saved || typeof saved !== 'object') return base;

  // Migrate old gfsDays/iconDays into modelDays
  const merged = { ...base.modelDays, ...saved.modelDays };
  if (saved.gfsDays && !saved.modelDays?.gfs_seamless) merged.gfs_seamless = saved.gfsDays;
  if (saved.iconDays && !saved.modelDays?.icon) merged.icon = saved.iconDays;

  // Keep only models this region actually has. A saved profile can carry keys
  // for models the region no longer lists (or never did); leaving them in would
  // let a stale toggle drive a fetch for a model with no row to render into.
  const ids = modelOrderFor(region);
  const modelDays = Object.fromEntries(ids.map((id) => [id, merged[id] ?? base.modelDays[id]]));
  const modelToggles = Object.fromEntries(
    ids.map((id) => [id, saved.modelToggles?.[id] ?? base.modelToggles[id]])
  );
  // Day counts must respect each model's real horizon.
  for (const id of ids) {
    const max = MODEL_CONFIGS[id]?.maxDays;
    if (max != null) modelDays[id] = Math.min(modelDays[id] ?? max, max);
  }

  const profile = {
    ...base,
    ...saved,
    units: { ...base.units, ...saved.units },
    hideAboveThousands: { ...base.hideAboveThousands, ...saved.hideAboveThousands },
    windThresholds: { ...base.windThresholds, ...saved.windThresholds },
    modelToggles,
    modelDays,
    supplementaryRows: { ...base.supplementaryRows, ...saved.supplementaryRows },
    layout: { ...base.layout, ...saved.layout },
    savedLocations: saved.savedLocations || [],
  };

  // Lifted Index was never actually requested from Open-Meteo — drop the
  // dead key so it doesn't survive in saved prefs.
  delete profile.supplementaryRows.liftedIndex;

  // Always start on wind view after refresh
  if (profile.view === 'ensemble') profile.view = 'wind';

  return profile;
}

// The persisted shape: { activeRegion, profiles: { usa, europe } }. Cached at
// module level so savePrefs() can write one region back without disturbing the
// other. The rest of the app never sees this — it gets a flat prefs object.
let store = null;

function readStore() {
  let saved = null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch {
    saved = null;
  }

  if (!saved || typeof saved !== 'object') return freshStore();

  if (saved.profiles) {
    // Already region-shaped.
    return {
      activeRegion: REGIONS.includes(saved.activeRegion) ? saved.activeRegion : DEFAULT_REGION,
      profiles: Object.fromEntries(
        REGIONS.map((r) => [r, hydrateProfile(saved.profiles[r], r)])
      ),
    };
  }

  // Migration from the flat pre-region shape: everything the user had becomes
  // the USA profile. Europe starts from its own defaults but inherits the
  // user's tuned layout — cell sizes and fonts are a personal preference, not
  // a regional one, so resetting them to stock would feel like a bug.
  const usa = hydrateProfile(saved, 'usa');
  const europe = defaultProfile('europe');
  europe.layout = { ...usa.layout };
  return { activeRegion: DEFAULT_REGION, profiles: { usa, europe } };
}

function freshStore() {
  return {
    activeRegion: DEFAULT_REGION,
    profiles: Object.fromEntries(REGIONS.map((r) => [r, defaultProfile(r)])),
  };
}

function writeStore() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(store));
  } catch {
    // localStorage unavailable
  }
}

// Flat view of the active region, plus which region it is. Every existing
// `prefs.units`, `prefs.layout`, `prefs.modelToggles`… call site keeps working.
function flatten() {
  return { activeRegion: store.activeRegion, ...store.profiles[store.activeRegion] };
}

export function loadPrefs() {
  store = readStore();
  const prefs = flatten();
  writeStore(); // persist migrations and any newly-seeded region
  return prefs;
}

export function savePrefs(prefs) {
  if (!store) store = readStore();
  const region = REGIONS.includes(prefs.activeRegion) ? prefs.activeRegion : store.activeRegion;
  const { activeRegion, ...profile } = prefs;
  store.activeRegion = region;
  store.profiles[region] = profile;
  writeStore();
}

export function getActiveRegion() {
  if (!store) store = readStore();
  return store.activeRegion;
}

// Switch regions and return the new region's flat prefs. The caller is
// expected to reload — see main.js.
export function setActiveRegion(region) {
  if (!REGIONS.includes(region)) return flatten();
  if (!store) store = readStore();
  store.activeRegion = region;
  writeStore();
  return flatten();
}

export function resetPrefs(preserveLocations = true) {
  if (!store) store = readStore();
  const region = store.activeRegion;
  const current = store.profiles[region];
  const fresh = defaultProfile(region);
  if (preserveLocations && current) {
    fresh.savedLocations = current.savedLocations || [];
    fresh.lastLocation = current.lastLocation || fresh.lastLocation;
  }
  // Reset only the active region — the other region's settings are untouched.
  store.profiles[region] = fresh;
  writeStore();
  return flatten();
}

export const MAX_SAVED_LOCATIONS = 6;

export function addSavedLocation(prefs, location) {
  const exists = prefs.savedLocations.some(
    (l) => l.lat.toFixed(3) === location.lat.toFixed(3) && l.lon.toFixed(3) === location.lon.toFixed(3)
  );
  if (exists) return prefs;
  if (prefs.savedLocations.length >= MAX_SAVED_LOCATIONS) return prefs;

  prefs.savedLocations = [location, ...prefs.savedLocations];
  savePrefs(prefs);
  return prefs;
}

export function removeSavedLocation(prefs, index) {
  prefs.savedLocations.splice(index, 1);
  savePrefs(prefs);
  return prefs;
}
