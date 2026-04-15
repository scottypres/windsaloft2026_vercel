import { buildAltitudeRows, buildCloudAltitudeRows } from './altitudes.js';
import { MODEL_CONFIGS, ENSEMBLE_CONFIGS } from './models.js';

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatHour(isoStr) {
  const d = new Date(isoStr);
  let h = d.getHours();
  const ampm = h >= 12 ? 'P' : 'A';
  h = h % 12 || 12;
  return `${h}${ampm}`;
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDayOfWeek(isoStr) {
  const d = new Date(isoStr);
  return DAY_NAMES[d.getDay()];
}

// Extend is_day by 1 hour on each side of sunrise/sunset
function extendDaylight(isDay) {
  const extended = [...isDay];
  for (let i = 1; i < extended.length; i++) {
    if (isDay[i] === 1 && isDay[i - 1] === 0) {
      extended[i - 1] = 1;
    }
    if (isDay[i - 1] === 1 && isDay[i] === 0) {
      extended[i] = 1;
    }
  }
  return extended;
}

function buildSunTimes(daily) {
  const sunTimes = {};
  if (!daily?.sunrise) return sunTimes;
  for (let i = 0; i < daily.time.length; i++) {
    sunTimes[daily.time[i]] = {
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
    };
  }
  return sunTimes;
}

function buildHours(times, isDay, sunTimes) {
  return times.map((t, i) => {
    const dateStr = t.split('T')[0];
    return {
      time: t,
      dateLabel: formatDate(t),
      dayOfWeek: formatDayOfWeek(t),
      hourLabel: formatHour(t),
      isDay: isDay[i] === 1,
      dateStr,
      sunrise: sunTimes[dateStr]?.sunrise || null,
      sunset: sunTimes[dateStr]?.sunset || null,
    };
  });
}

function buildAltitudeData(altitudeRowDefs, hourly, numHours) {
  return altitudeRowDefs.map((row) => {
    const windSpeeds = hourly[row.windSpeedParam] || new Array(numHours).fill(null);
    const windDirs = hourly[row.windDirParam] || new Array(numHours).fill(null);
    const temps = hourly[row.tempParam] || new Array(numHours).fill(null);
    const clouds = row.cloudParam
      ? hourly[row.cloudParam] || new Array(numHours).fill(null)
      : new Array(numHours).fill(null);

    return {
      key: row.key,
      feet: row.feet,
      label: `${row.feet.toLocaleString()}ft`,
      isHighAltitude: row.isHighAltitude,
      wind: windSpeeds.map((speed, i) => ({
        speed: speed != null ? Math.round(speed) : null,
        direction: windDirs[i],
        displayDirection: windDirs[i] != null ? (windDirs[i] + 180) % 360 : null,
      })),
      temp: temps,
      cloud: clouds,
    };
  });
}

function buildSurface(hourly) {
  return {
    gusts: hourly.wind_gusts_10m || [],
    cape: hourly.cape || null,
    liftedIndex: hourly.lifted_index || null,
    precipProb: hourly.precipitation_probability || null,
    precipInches: hourly.precipitation || null,
    // Also check rain + showers for models that use those instead
    rainInches: hourly.rain || null,
    showersInches: hourly.showers || null,
    temp2m: hourly.temperature_2m || [],
    humidity: hourly.relative_humidity_2m || [],
    dewpoint: hourly.dew_point_2m || [],
    dewpointSpread: (hourly.temperature_2m || []).map((t, i) => {
      const dp = (hourly.dew_point_2m || [])[i];
      return t != null && dp != null ? Math.round((t - dp) * 10) / 10 : null;
    }),
    visibility: hourly.visibility
      ? hourly.visibility.map((v) => (v != null ? Math.round(v * 0.000621371 * 10) / 10 : null))
      : null,
    cloudCover: hourly.cloud_cover || [],
    cloudLow: hourly.cloud_cover_low || [],
    cloudMid: hourly.cloud_cover_mid || [],
    cloudHigh: hourly.cloud_cover_high || [],
    boundaryLayerHeight: hourly.boundary_layer_height || null,
    weatherCode: hourly.weather_code || [],
  };
}

// Find the last hour index with valid surface wind data.
// Returns trimmed length (lastValidIndex + 1).
function findLastValidWindHour(altitudes, totalHours) {
  // Use the lowest surface altitude (10m) to detect null trailing hours
  const surfaceAlt = altitudes.find((a) => a.key === '10m') || altitudes[altitudes.length - 1];
  if (!surfaceAlt) return totalHours;

  let last = totalHours - 1;
  while (last >= 0 && surfaceAlt.wind[last]?.speed == null) {
    last--;
  }
  return last + 1;
}

export function transformWeatherData(raw, modelId) {
  const config = MODEL_CONFIGS[modelId];
  if (!config) throw new Error(`Unknown model config: ${modelId}`);

  const hourly = raw.hourly;
  const daily = raw.daily;
  const times = hourly.time;
  const isDay = extendDaylight(hourly.is_day || []);
  const sunTimes = buildSunTimes(daily);

  const hours = buildHours(times, isDay, sunTimes);
  const altitudeRowDefs = buildAltitudeRows(config);
  const altitudes = buildAltitudeData(altitudeRowDefs, hourly, times.length);

  const cloudRowDefs = buildCloudAltitudeRows(config);
  const cloudAltitudes = cloudRowDefs.map((row) => {
    const clouds = hourly[row.cloudParam] || new Array(times.length).fill(null);
    return {
      key: row.key,
      feet: row.feet,
      label: `${row.feet.toLocaleString()}ft`,
      isHighAltitude: row.isHighAltitude,
      cloud: clouds,
    };
  });

  const surface = buildSurface(hourly);

  // Trim trailing hours where surface wind data is null (HRRR/NAM stop early)
  const trimLen = findLastValidWindHour(altitudes, hours.length);
  if (trimLen < hours.length) {
    hours.length = trimLen;
    for (const alt of altitudes) {
      alt.wind.length = trimLen;
      alt.temp.length = trimLen;
      alt.cloud.length = trimLen;
    }
    for (const ca of cloudAltitudes) {
      ca.cloud.length = trimLen;
    }
    for (const key of Object.keys(surface)) {
      if (Array.isArray(surface[key])) {
        surface[key].length = trimLen;
      }
    }
  }

  const dailyData = daily
    ? {
        uvMax: daily.uv_index_max || [],
        precipSum: daily.precipitation_sum || [],
        dates: daily.time || [],
      }
    : null;

  return {
    model: modelId,
    modelLabel: config.label,
    hours,
    altitudes,
    cloudAltitudes,
    surface,
    daily: dailyData,
    currentWeather: raw.current_weather || null,
  };
}

// --- Ensemble transform ---

// Extract ensemble mean and compute per-member spread (std dev)
function extractEnsembleMeanAndSpread(hourly, baseParam, suffix, memberCount, numHours) {
  const meanKey = `${baseParam}${suffix}`;
  const meanArr = hourly[meanKey] || new Array(numHours).fill(null);

  // Collect member arrays
  const memberArrays = [];
  for (let m = 1; m <= memberCount; m++) {
    const memberKey = `${baseParam}_member${String(m).padStart(2, '0')}${suffix}`;
    const arr = hourly[memberKey];
    if (arr) memberArrays.push(arr);
  }

  if (memberArrays.length === 0) {
    return { mean: meanArr, spread: new Array(numHours).fill(null) };
  }

  const spread = new Array(numHours);
  for (let i = 0; i < numHours; i++) {
    const vals = [];
    for (const arr of memberArrays) {
      if (arr[i] != null) vals.push(arr[i]);
    }
    if (vals.length < 2) {
      spread[i] = null;
    } else {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((sum, v) => sum + (v - avg) ** 2, 0) / vals.length;
      spread[i] = Math.sqrt(variance);
    }
  }

  return { mean: meanArr, spread };
}

export function transformEnsembleData(raw, ensembleModelId) {
  const ensConfig = ENSEMBLE_CONFIGS[ensembleModelId];
  if (!ensConfig) throw new Error(`Unknown ensemble config: ${ensembleModelId}`);

  const hourly = raw.hourly;
  const times = hourly.time;
  const numHours = times.length;
  const suffix = ensConfig.fieldSuffix;
  const mc = ensConfig.memberCount;

  // Build is_day from the ensemble mean field
  const isDayRaw = hourly[`is_day${suffix}`] || hourly.is_day || [];
  const isDay = extendDaylight(isDayRaw);

  const hours = buildHours(times, isDay, {});

  // Build a pseudo model config for altitude row generation
  // Ensemble uses wind_speed_ prefix (with underscore)
  const pseudoConfig = {
    pressureLevels: ensConfig.pressureLevels,
    cloudPressureLevels: ensConfig.cloudPressureLevels,
    surfaceLevels: ensConfig.surfaceLevels,
    windParamPrefix: 'wind_speed_',
    windDirParamPrefix: 'wind_direction_',
  };

  const altRowDefs = buildAltitudeRows(pseudoConfig);

  // Build altitude data with spread
  const altitudes = altRowDefs.map((row) => {
    // The actual API field names have the ensemble suffix
    const speedBase = row.windSpeedParam; // e.g. wind_speed_850hPa
    const dirBase = row.windDirParam;
    const tempBase = row.tempParam;

    const speedData = extractEnsembleMeanAndSpread(hourly, speedBase, suffix, mc, numHours);
    const dirData = extractEnsembleMeanAndSpread(hourly, dirBase, suffix, mc, numHours);
    const tempData = extractEnsembleMeanAndSpread(hourly, tempBase, suffix, mc, numHours);

    return {
      key: row.key,
      feet: row.feet,
      label: `${row.feet.toLocaleString()}ft`,
      isHighAltitude: row.isHighAltitude,
      wind: speedData.mean.map((speed, i) => ({
        speed: speed != null ? Math.round(speed) : null,
        direction: dirData.mean[i],
        displayDirection: dirData.mean[i] != null ? (dirData.mean[i] + 180) % 360 : null,
        spread: speedData.spread[i] != null ? Math.round(speedData.spread[i] * 10) / 10 : null,
      })),
      temp: tempData.mean,
      tempSpread: tempData.spread,
      cloud: row.cloudParam
        ? (hourly[`${row.cloudParam}${suffix}`] || new Array(numHours).fill(null))
        : new Array(numHours).fill(null),
    };
  });

  // Cloud altitude rows
  const cloudRowDefs = buildCloudAltitudeRows(pseudoConfig);
  const cloudAltitudes = cloudRowDefs.map((row) => {
    const clouds = hourly[`${row.cloudParam}${suffix}`] || new Array(numHours).fill(null);
    return {
      key: row.key,
      feet: row.feet,
      label: `${row.feet.toLocaleString()}ft`,
      isHighAltitude: row.isHighAltitude,
      cloud: clouds,
    };
  });

  // Surface data from ensemble means
  const sf = (param) => hourly[`${param}${suffix}`] || [];
  const sfOrNull = (param) => {
    const arr = hourly[`${param}${suffix}`];
    return arr && arr.some((v) => v != null) ? arr : null;
  };

  const temp2m = sf('temperature_2m');
  const dewpoint = sf('dew_point_2m');

  const surface = {
    gusts: sf('wind_gusts_10m'),
    cape: sfOrNull('cape'),
    liftedIndex: null,
    precipProb: null,
    precipInches: null,
    rainInches: sfOrNull('rain'),
    showersInches: null,
    temp2m,
    humidity: sf('relative_humidity_2m'),
    dewpoint,
    dewpointSpread: temp2m.map((t, i) => {
      const dp = dewpoint[i];
      return t != null && dp != null ? Math.round((t - dp) * 10) / 10 : null;
    }),
    visibility: sfOrNull('visibility')
      ? sf('visibility').map((v) => (v != null ? Math.round(v * 0.000621371 * 10) / 10 : null))
      : null,
    cloudCover: sf('cloud_cover'),
    cloudLow: sf('cloud_cover_low'),
    cloudMid: sf('cloud_cover_mid'),
    cloudHigh: sf('cloud_cover_high'),
    boundaryLayerHeight: null,
    weatherCode: [],
  };

  return {
    model: ensembleModelId,
    modelLabel: ensConfig.label,
    isEnsemble: true,
    hours,
    altitudes,
    cloudAltitudes,
    surface,
    daily: null,
    currentWeather: null,
  };
}
