// Central registry of all weather model configurations.
// Each model defines its API endpoint, available pressure/surface levels,
// parameter naming convention, supplementary data capabilities, run schedule, etc.

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ICON_URL = 'https://api.open-meteo.com/v1/dwd-icon';
const ENSEMBLE_URL = 'https://ensemble-api.open-meteo.com/v1/ensemble';

// Display order (top to bottom)
export const MODEL_ORDER = ['hrrr', 'ecmwf', 'gfs_seamless', 'icon', 'nam'];

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
    // Cloud-specific pressure levels (same set for HRRR — no higher levels)
    cloudPressureLevels: [700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000],
    // Surface meter levels with real wind data
    surfaceLevels: [10, 80],
    // Parameter naming: /v1/forecast?models= uses underscore style
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      liftedIndex: false,
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
    defaultDays: 10,
    pressureLevels: [],  // No pressure level data
    cloudPressureLevels: [],
    surfaceLevels: [10, 100, 200],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      liftedIndex: false,
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
    defaultDays: 4,
    pressureLevels: [],  // No pressure level data
    cloudPressureLevels: [],
    surfaceLevels: [10, 80],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      liftedIndex: false,
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
    modelsParam: 'gfs_seamless',
    maxDays: 14,
    defaultDays: 7,
    pressureLevels: [700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000],
    cloudPressureLevels: [700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000],
    surfaceLevels: [10, 80],
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
    capabilities: {
      cape: true,
      liftedIndex: false,
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
    label: 'ICON',
    baseUrl: ICON_URL,
    modelsParam: null,  // Dedicated endpoint, no models= param
    maxDays: 7,
    defaultDays: 5,
    pressureLevels: [700, 800, 850, 900, 925, 950, 975, 1000],
    cloudPressureLevels: [700, 800, 850, 900, 925, 950, 975, 1000],
    surfaceLevels: [10, 80, 180],
    // ICON dedicated endpoint uses NO underscore: windspeed_850hPa
    windParamPrefix: 'windspeed_',
    windDirParamPrefix: 'winddirection_',
    capabilities: {
      cape: false,
      liftedIndex: false,
      precipProb: false,
      precipInches: true,
      humidity: true,
      visibility: false,
      cloudLayers: true,
      temp80m: true,
      boundaryLayerHeight: false,
    },
    extraHourlyParams: [
      'relative_humidity_2m', 'dew_point_2m', 'is_day', 'weather_code',
      'wind_gusts_10m', 'precipitation',
      'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
    ],
    // Optional params that may fail (fallback removes them)
    optionalParams: ['wind_speed_180m', 'wind_direction_180m', 'temperature_180m'],
    runSchedule: { type: 'fixed', hoursUTC: [0, 6, 12, 18] },
    availabilityDelayMinutes: 240, // 4 hours
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
