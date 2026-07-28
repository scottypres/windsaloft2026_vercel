// Central registry of all weather model configurations.
// Each model defines its API endpoint, available pressure/surface levels,
// parameter naming convention, supplementary data capabilities, run schedule, etc.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ICON_URL = 'https://api.open-meteo.com/v1/dwd-icon';
const ENSEMBLE_URL = 'https://ensemble-api.open-meteo.com/v1/ensemble';

// Display order (top to bottom), per region.
//
// Europe drops HRRR and NAM outright: both are CONUS-only domains that return
// HTTP 400 "No data is available for this location" at Alpine coordinates, so
// requesting them there is pure wasted quota.
//
// ICON-D2 is deliberately absent. At an Alpine point it returns values
// bit-identical to the DWD ICON Seamless blend for its entire 48 h range
// (mean and max absolute difference 0.000 on 2 m temperature, 850 hPa wind and
// 850 hPa temperature), while covering fewer pressure levels and less time. A
// separate row would cost a second request to draw the same numbers twice.
export const MODEL_ORDER_BY_REGION = {
  usa: ['hrrr', 'ecmwf', 'gfs_seamless', 'icon', 'nam'],
  europe: [
    'meteoswiss_seamless',
    'meteoswiss_ch1',
    'meteoswiss_ch2',
    'arome_austria',
    'ecmwf_ifs025',
    'icon',
    'gfs_seamless',
  ],
};

export function modelOrderFor(region) {
  return MODEL_ORDER_BY_REGION[region] || MODEL_ORDER_BY_REGION.usa;
}

// One model carries a different name per region: DWD's blend is plain "ICON
// Seamless" in the USA, but in Europe it sits beside MeteoSwiss's own ICON
// blend, so both need their provider in the name to stay distinguishable.
const REGION_LABEL_OVERRIDES = {
  europe: { icon: 'DWD ICON Seamless' },
};

export function modelLabelFor(id, region) {
  return REGION_LABEL_OVERRIDES[region]?.[id] || MODEL_CONFIGS[id]?.label || id;
}

// Model used for the All Locations view when the chosen one has no data at a
// given saved location — must have global coverage.
export const ALL_LOCATIONS_FALLBACK = { usa: 'ecmwf', europe: 'ecmwf_ifs025' };

// Which model the All Locations view starts on in each region.
export const ALL_LOCATIONS_DEFAULT = { usa: 'hrrr', europe: 'meteoswiss_seamless' };

// Ensembles are global products, so both regions get the same pair. Their
// display order is stored separately from the deterministic models.
export const ENSEMBLE_ORDER = ['gefs', 'ecmwf_ens'];

// Pressure levels above 700 hPa (≈9,800 ft) — 25 hPa steps up to 500 hPa, then
// coarser into the jet stream and stratosphere (100 hPa ≈ 53,000 ft).
//
// Coverage varies by model and Open-Meteo does not document it exhaustively, so
// the same list is requested everywhere: levels a model lacks come back as
// all-null arrays and those rows are dropped in transform.js. The whole set is
// also registered as optional in weather.js, so a model that rejects the
// parameters outright is retried with the core levels only.
export const HIGH_PRESSURE_LEVELS = [
  675, 650, 625, 600, 575, 550, 525, 500, 450, 400, 350, 300, 250, 200, 150, 100,
];

// ICON serves 16 pressure levels; these are the ones above 700 hPa.
export const ICON_HIGH_LEVELS = [600, 500, 400, 300, 250, 200, 150, 100];

// ECMWF IFS 0.25 serves 12 levels; these are the ones above 700 hPa.
export const ECMWF_IFS025_HIGH_LEVELS = [600, 500, 400, 300, 250, 200, 150, 100];

// All three MeteoSwiss products expose an identical variable set: no pressure
// levels whatsoever, and 10 m as the only wind height. Everything they offer
// is surface data.
const METEOSWISS_BASE = {
  baseUrl: FORECAST_URL,
  pressureLevels: [],
  cloudPressureLevels: [],
  surfaceLevels: [10],
  windParamPrefix: 'wind_speed_',
  windDirParamPrefix: 'wind_direction_',
  capabilities: {
    cape: true,
    precipProb: true,
    precipInches: true,
    humidity: true,
    visibility: false,
    cloudLayers: true,
    temp80m: false,
    boundaryLayerHeight: false,
  },
  extraHourlyParams: [
    'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
    'wind_gusts_10m', 'cape', 'precipitation_probability',
    'precipitation', 'rain', 'showers', 'freezing_level_height',
    'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
  ],
};

export const MODEL_CONFIGS = {
  hrrr: {
    id: 'hrrr',
    label: 'HRRR',
    baseUrl: FORECAST_URL,
    modelsParam: 'gfs_hrrr',
    maxDays: 3,
    defaultDays: 3,
    // Pressure levels that actually return data (wind/temp/cloud)
    pressureLevels: [700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000],
    highPressureLevels: HIGH_PRESSURE_LEVELS,
    // Cloud-specific pressure levels
    cloudPressureLevels: [700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000],
    highCloudPressureLevels: HIGH_PRESSURE_LEVELS,
    // Surface meter levels with real wind data
    surfaceLevels: [10, 80],
    // Parameter naming: /v1/forecast?models= uses underscore style
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      precipProb: true,
      precipInches: false,
      humidity: true,
      visibility: true,
      cloudLayers: true,
      temp80m: false,
      boundaryLayerHeight: false,
    },
    // Extra hourly params beyond wind/temp/cloud
    extraHourlyParams: [
      'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'cape', 'precipitation_probability',
      'rain', 'showers', 'visibility',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    // Run schedule for cache TTL
    runSchedule: { type: 'hourly' },
    availabilityDelayMinutes: 90,
  },

  ecmwf: {
    id: 'ecmwf',
    label: 'ECMWF',
    baseUrl: FORECAST_URL,
    modelsParam: 'ecmwf_ifs',
    maxDays: 15,
    defaultDays: 7,
    pressureLevels: [],  // No pressure level data
    cloudPressureLevels: [],
    surfaceLevels: [10, 100, 200],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      precipProb: false,
      precipInches: true,
      humidity: false,
      visibility: false,
      cloudLayers: true,
      temp80m: false,
      boundaryLayerHeight: false,
    },
    extraHourlyParams: [
      'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'cape',
      'precipitation', 'rain',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    runSchedule: { type: 'fixed', hoursUTC: [0, 12] },
    availabilityDelayMinutes: 420, // 7 hours
  },

  nam: {
    id: 'nam',
    label: 'NAM',
    baseUrl: FORECAST_URL,
    modelsParam: 'ncep_nam_conus',
    maxDays: 4,
    defaultDays: 3,
    pressureLevels: [],  // No pressure level data
    cloudPressureLevels: [],
    surfaceLevels: [10, 80],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      precipProb: false,
      precipInches: false,
      humidity: true,
      visibility: true,
      cloudLayers: true,
      temp80m: false,
      boundaryLayerHeight: false,
    },
    extraHourlyParams: [
      'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'cape',
      'rain', 'showers',
      'visibility',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    runSchedule: { type: 'fixed', hoursUTC: [0, 6, 12, 18] },
    availabilityDelayMinutes: 240, // 4 hours
  },

  gfs_seamless: {
    id: 'gfs_seamless',
    label: 'GFS',
    baseUrl: FORECAST_URL,
    modelsParam: 'gfs_global',
    maxDays: 14,
    defaultDays: 7,
    pressureLevels: [700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000],
    highPressureLevels: HIGH_PRESSURE_LEVELS,
    cloudPressureLevels: [700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000],
    highCloudPressureLevels: HIGH_PRESSURE_LEVELS,
    surfaceLevels: [10, 80],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      precipProb: true,
      precipInches: false,
      humidity: true,
      visibility: true,
      cloudLayers: true,
      temp80m: true,
      boundaryLayerHeight: false,
    },
    extraHourlyParams: [
      'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'cape', 'precipitation_probability',
      'rain', 'showers', 'visibility', 'uv_index',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    runSchedule: { type: 'fixed', hoursUTC: [0, 6, 12, 18] },
    availabilityDelayMinutes: 300, // 5 hours
  },

  icon: {
    id: 'icon',
    label: 'ICON Seamless',
    baseUrl: ICON_URL,
    modelsParam: null,  // Dedicated endpoint, no models= param
    maxDays: 7,
    defaultDays: 7,
    // Verified level-by-level against live responses: ICON serves exactly
    // these. The 13 levels the app also used to request (875, 825, 775, 750,
    // 725, 675, 650, 625, 575, 550, 525, 450, 350) come back all-null from
    // every ICON variant, so asking for them only inflated request weight.
    pressureLevels: [700, 800, 850, 900, 925, 950, 975, 1000],
    highPressureLevels: ICON_HIGH_LEVELS,
    cloudPressureLevels: [700, 800, 850, 900, 925, 950, 975, 1000],
    highCloudPressureLevels: ICON_HIGH_LEVELS,
    surfaceLevels: [10, 80, 120, 180],
    // Both naming styles are accepted on every model and on the dedicated
    // dwd-icon endpoint; they are aliases returning identical values.
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      precipProb: false,
      precipInches: true,
      humidity: true,
      visibility: true,
      cloudLayers: true,
      temp80m: true,
      boundaryLayerHeight: false,
    },
    extraHourlyParams: [
      'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'precipitation', 'cape', 'visibility',
      'precipitation_probability', 'freezing_level_height',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    // ICON-D2 refreshes the near field of the blend every 3 hours, so the old
    // 6-hourly schedule under-refreshed exactly the hours users read most.
    runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
    availabilityDelayMinutes: 150,
  },

  // ---------------------------------------------------------------------
  // Europe. Every value below traces to docs/openmeteo-model-findings.md,
  // which verified each one against a live API response.
  // ---------------------------------------------------------------------

  // MeteoSwiss ICON-CH1 for the first ~33 h, then CH2 out to 120 h.
  meteoswiss_seamless: {
    ...METEOSWISS_BASE,
    id: 'meteoswiss_seamless',
    label: 'MeteoSwiss Seamless',
    modelsParam: 'meteoswiss_icon_seamless',
    maxDays: 6,
    defaultDays: 5,
    // Refreshes on CH1's 3-hourly cadence in the near field.
    runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
    availabilityDelayMinutes: 150,
  },

  meteoswiss_ch1: {
    ...METEOSWISS_BASE,
    id: 'meteoswiss_ch1',
    label: 'MeteoSwiss CH1',
    modelsParam: 'meteoswiss_icon_ch1',
    maxDays: 2,
    defaultDays: 2,
    runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
    availabilityDelayMinutes: 150,
  },

  meteoswiss_ch2: {
    ...METEOSWISS_BASE,
    id: 'meteoswiss_ch2',
    label: 'MeteoSwiss CH2',
    modelsParam: 'meteoswiss_icon_ch2',
    maxDays: 6,
    defaultDays: 5,
    runSchedule: { type: 'fixed', hoursUTC: [0, 6, 12, 18] },
    availabilityDelayMinutes: 300,
  },

  arome_austria: {
    id: 'arome_austria',
    label: 'AROME Austria',
    baseUrl: FORECAST_URL,
    modelsParam: 'geosphere_arome_austria',
    maxDays: 3,
    defaultDays: 3,
    // No pressure-level data at all, and 10 m is the only wind height.
    pressureLevels: [],
    cloudPressureLevels: [],
    surfaceLevels: [10],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      precipProb: false,
      precipInches: true,
      humidity: true,
      visibility: false,
      cloudLayers: true,
      temp80m: false,
      boundaryLayerHeight: false,
    },
    extraHourlyParams: [
      'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'cape',
      'precipitation', 'rain', 'showers',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    runSchedule: { type: 'fixed', hoursUTC: [0, 3, 6, 9, 12, 15, 18, 21] },
    availabilityDelayMinutes: 195,
  },

  // ECMWF's only product with pressure-level winds. The 9 km IFS HRES used by
  // the USA row (`ecmwf`) publishes no winds aloft at all, so a European row
  // that exists to show an altitude profile has to be the 0.25 degree variant.
  ecmwf_ifs025: {
    id: 'ecmwf_ifs025',
    label: 'ECMWF IFS (25km)',
    baseUrl: FORECAST_URL,
    modelsParam: 'ecmwf_ifs025',
    maxDays: 15,
    defaultDays: 7,
    pressureLevels: [700, 850, 925, 1000],
    highPressureLevels: ECMWF_IFS025_HIGH_LEVELS,
    cloudPressureLevels: [700, 850, 925, 1000],
    highCloudPressureLevels: ECMWF_IFS025_HIGH_LEVELS,
    surfaceLevels: [10, 100],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      precipProb: true,
      precipInches: true,
      humidity: true,
      visibility: false,
      cloudLayers: true,
      temp80m: false,
      boundaryLayerHeight: false,
    },
    extraHourlyParams: [
      'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'cape', 'precipitation_probability',
      'precipitation', 'rain', 'showers',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    runSchedule: { type: 'fixed', hoursUTC: [0, 12] },
    availabilityDelayMinutes: 420,
  },
};

// Ensemble model configs (fetched separately via ensemble API)
export const ENSEMBLE_CONFIGS = {
  gefs: {
    id: 'gefs',
    label: 'GEFS Ensemble',
    modelsParam: 'ncep_gefs_seamless',
    fieldSuffix: '_ncep_gefs_seamless',
    memberCount: 30,
    pressureLevels: [700, 850, 925, 1000],
    cloudPressureLevels: [],  // GEFS cloud at hPa = all null
    surfaceLevels: [10, 80, 100, 120],
    capabilities: {
      cape: true,
      humidity: true,
      visibility: true,
      cloudLayers: false,
    },
  },
  ecmwf_ens: {
    id: 'ecmwf_ens',
    label: 'ECMWF Ensemble',
    modelsParam: 'ecmwf_ifs025_ensemble',
    fieldSuffix: '_ecmwf_ifs025_ensemble',
    memberCount: 50,
    pressureLevels: [700, 850, 925, 1000],
    cloudPressureLevels: [700, 850, 925, 1000],
    surfaceLevels: [10, 100],
    capabilities: {
      cape: true,
      humidity: true,
      visibility: false,
      cloudLayers: true,
    },
  },
};

export const ENSEMBLE_URL_BASE = ENSEMBLE_URL;
export const ENSEMBLE_MAX_DAYS = 14;
export const ENSEMBLE_DEFAULT_DAYS = 14;

// Run schedule for ensembles (use ECMWF's 00/12Z since it's the slower one)
export const ENSEMBLE_RUN_SCHEDULE = { type: 'fixed', hoursUTC: [0, 12] };
export const ENSEMBLE_AVAILABILITY_DELAY_MINUTES = 420; // 7 hours
