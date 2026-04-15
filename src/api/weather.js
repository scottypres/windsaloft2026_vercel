import { cacheGet, cacheSet, cacheKey, modelTTL } from './cache.js';
import {
  MODEL_CONFIGS,
  ENSEMBLE_CONFIGS,
  ENSEMBLE_URL_BASE,
} from '../data/models.js';

const DAILY_PARAMS = ['weather_code', 'sunrise', 'sunset', 'uv_index_max', 'precipitation_sum'];

// Build the hourly parameter list for a given model config
function buildHourlyParams(config) {
  const params = [];

  // Surface wind params
  for (const m of config.surfaceLevels) {
    params.push(`wind_speed_${m}m`, `wind_direction_${m}m`);
  }
  params.push('wind_gusts_10m');

  // Pressure level winds
  for (const p of config.pressureLevels) {
    params.push(`${config.windParamPrefix}${p}hPa`);
    params.push(`${config.windDirParamPrefix}${p}hPa`);
  }

  // Surface temperature
  params.push('temperature_2m');
  for (const m of config.surfaceLevels) {
    if (m !== 10) params.push(`temperature_${m}m`);
  }

  // Pressure level temperatures
  for (const p of config.pressureLevels) {
    params.push(`temperature_${p}hPa`);
  }

  // Cloud cover at pressure levels
  for (const p of (config.cloudPressureLevels || [])) {
    params.push(`cloud_cover_${p}hPa`);
  }

  // Extra hourly params (model-specific supplementary data)
  for (const p of (config.extraHourlyParams || [])) {
    if (!params.includes(p)) params.push(p);
  }

  return params;
}

function buildUrl(baseUrl, config, lat, lon, hourlyParams, days) {
  const query = {
    latitude: lat,
    longitude: lon,
    hourly: hourlyParams.join(','),
    daily: DAILY_PARAMS.join(','),
    current_weather: 'true',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
    forecast_days: days,
  };
  if (config.modelsParam) {
    query.models = config.modelsParam;
  }
  return `${baseUrl}?${new URLSearchParams(query)}`;
}

// Fetch a single deterministic model
export async function fetchModel(modelId, lat, lon, days) {
  const config = MODEL_CONFIGS[modelId];
  if (!config) throw new Error(`Unknown model: ${modelId}`);

  const ttl = modelTTL(config);
  const key = cacheKey(modelId, lat, lon, days);
  const cached = cacheGet(key, ttl);
  if (cached) return cached;

  const allParams = buildHourlyParams(config);
  const url = buildUrl(config.baseUrl, config, lat, lon, allParams, days);

  try {
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      cacheSet(key, data);
      return data;
    }
    throw new Error(`HTTP ${resp.status}`);
  } catch (err) {
    // Fallback: remove optional params if defined
    const optional = config.optionalParams || [];
    if (optional.length === 0) throw err;

    const reduced = allParams.filter((p) => !optional.includes(p));
    const fallbackUrl = buildUrl(config.baseUrl, config, lat, lon, reduced, days);
    const resp = await fetch(fallbackUrl);
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    const data = await resp.json();

    // Fill missing optional params with null arrays
    const len = data.hourly?.time?.length || 0;
    for (const p of optional) {
      if (!data.hourly[p]) {
        data.hourly[p] = new Array(len).fill(null);
      }
    }
    cacheSet(key, data);
    return data;
  }
}

// Keep fetchICON as a convenience alias (ICON uses the generic fetchModel path)
export async function fetchICON(lat, lon, days = 5) {
  return fetchModel('icon', lat, lon, days);
}

// Build ensemble hourly params — request params without suffixes;
// the API automatically returns suffixed mean + member fields.
function buildEnsembleHourlyParams() {
  // Use GEFS config as the superset for surface levels (10, 80, 100, 120)
  const gefs = ENSEMBLE_CONFIGS.gefs;
  const ecmwf = ENSEMBLE_CONFIGS.ecmwf_ens;

  const params = new Set();

  // Surface winds — union of both models' surface levels
  const allSurface = [...new Set([...gefs.surfaceLevels, ...ecmwf.surfaceLevels])];
  for (const m of allSurface) {
    params.add(`wind_speed_${m}m`);
    params.add(`wind_direction_${m}m`);
  }
  params.add('wind_gusts_10m');

  // Surface temperature
  params.add('temperature_2m');
  for (const m of allSurface) {
    if (m !== 10) params.add(`temperature_${m}m`);
  }

  // Pressure level winds/temps (union — both share the same levels)
  const allPressure = [...new Set([...gefs.pressureLevels, ...ecmwf.pressureLevels])];
  for (const p of allPressure) {
    params.add(`wind_speed_${p}hPa`);
    params.add(`wind_direction_${p}hPa`);
    params.add(`temperature_${p}hPa`);
  }

  // Cloud cover at pressure levels (ECMWF ensemble has it, GEFS doesn't)
  for (const p of ecmwf.cloudPressureLevels) {
    params.add(`cloud_cover_${p}hPa`);
  }

  // Supplementary
  params.add('cloud_cover');
  params.add('cloud_cover_low');
  params.add('cloud_cover_mid');
  params.add('cloud_cover_high');
  params.add('relative_humidity_2m');
  params.add('dew_point_2m');
  params.add('is_day');
  params.add('cape');
  params.add('rain');
  params.add('visibility');
  params.add('uv_index');

  return [...params];
}

// Fetch ensemble data (both GEFS + ECMWF ensemble in one call)
export async function fetchEnsemble(lat, lon, days = 14) {
  const key = cacheKey('ensemble', lat, lon, days);
  const ttl = modelTTL({
    runSchedule: { type: 'fixed', hoursUTC: [0, 12] },
    availabilityDelayMinutes: 420,
  });
  const cached = cacheGet(key, ttl);
  if (cached) return cached;

  const hourlyParams = buildEnsembleHourlyParams();
  const query = {
    latitude: lat,
    longitude: lon,
    hourly: hourlyParams.join(','),
    models: `${ENSEMBLE_CONFIGS.gefs.modelsParam},${ENSEMBLE_CONFIGS.ecmwf_ens.modelsParam}`,
    timezone: 'auto',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    forecast_days: days,
  };
  const url = `${ENSEMBLE_URL_BASE}?${new URLSearchParams(query)}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Ensemble API error: ${resp.status}`);
  const data = await resp.json();
  cacheSet(key, data);
  return data;
}
