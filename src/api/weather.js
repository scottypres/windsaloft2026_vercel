import { cacheGet, cacheSet, cacheKey } from './cache.js';

const GFS_URL = 'https://api.open-meteo.com/v1/gfs';
const ICON_URL = 'https://api.open-meteo.com/v1/dwd-icon';

// Pressure levels for wind/temp
const WIND_PRESSURE_LEVELS = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400];
// Additional cloud pressure levels
const CLOUD_PRESSURE_LEVELS = [
  1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300, 250, 200, 150, 100, 70, 50, 30,
];

function buildHourlyParams(model) {
  const params = [];

  // Surface wind
  params.push('wind_speed_10m', 'wind_speed_80m', 'wind_speed_180m');
  params.push('wind_direction_10m', 'wind_direction_80m', 'wind_direction_180m');
  params.push('wind_gusts_10m');

  // Pressure level winds
  for (const p of WIND_PRESSURE_LEVELS) {
    params.push(`windspeed_${p}hPa`, `winddirection_${p}hPa`);
  }

  // Surface temperature
  params.push('temperature_2m', 'temperature_80m');
  if (model === 'icon') params.push('temperature_180m');

  // Pressure level temperatures
  for (const p of WIND_PRESSURE_LEVELS) {
    params.push(`temperature_${p}hPa`);
  }

  // Cloud cover
  params.push('cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high');
  for (const p of CLOUD_PRESSURE_LEVELS) {
    params.push(`cloud_cover_${p}hPa`);
  }

  // Other
  params.push('weather_code', 'relative_humidity_2m', 'dew_point_2m', 'is_day');

  if (model === 'gfs') {
    params.push(
      'boundary_layer_height',
      'visibility',
      'lifted_index',
      'cape',
      'precipitation_probability'
    );
  }
  if (model === 'icon') {
    params.push('precipitation');
  }

  return params;
}

// Parameters that may not be available and can be removed on fallback
function getOptionalParams(model) {
  if (model === 'gfs') {
    return ['wind_speed_10m', 'wind_direction_10m'];
  }
  if (model === 'icon') {
    return ['wind_speed_180m', 'wind_direction_180m', 'temperature_180m'];
  }
  return [];
}

const DAILY_PARAMS = ['weather_code', 'sunrise', 'sunset', 'uv_index_max', 'precipitation_sum'];

function buildUrl(baseUrl, lat, lon, hourlyParams, days) {
  const params = new URLSearchParams({
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
  });
  return `${baseUrl}?${params}`;
}

async function fetchWithFallback(baseUrl, model, lat, lon, days) {
  const allParams = buildHourlyParams(model);
  const url = buildUrl(baseUrl, lat, lon, allParams, days);

  try {
    const resp = await fetch(url);
    if (resp.ok) {
      return await resp.json();
    }
    // Try fallback without optional params
    throw new Error(`HTTP ${resp.status}`);
  } catch {
    const optional = getOptionalParams(model);
    const reducedParams = allParams.filter((p) => !optional.includes(p));
    const fallbackUrl = buildUrl(baseUrl, lat, lon, reducedParams, days);
    const resp = await fetch(fallbackUrl);
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    const data = await resp.json();

    // Fill missing optional params with null arrays
    const hourlyLen = data.hourly?.time?.length || 0;
    for (const p of optional) {
      if (!data.hourly[p]) {
        data.hourly[p] = new Array(hourlyLen).fill(null);
      }
    }
    return data;
  }
}

export async function fetchGFS(lat, lon, days = 7) {
  const key = cacheKey('gfs', lat, lon, days);
  const cached = cacheGet(key);
  if (cached) return cached;

  const data = await fetchWithFallback(GFS_URL, 'gfs', lat, lon, days);
  cacheSet(key, data);
  return data;
}

export async function fetchICON(lat, lon, days = 5) {
  const key = cacheKey('icon', lat, lon, days);
  const cached = cacheGet(key);
  if (cached) return cached;

  const data = await fetchWithFallback(ICON_URL, 'icon', lat, lon, days);
  cacheSet(key, data);
  return data;
}
