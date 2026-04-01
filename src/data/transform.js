import { GFS_ALTITUDE_ROWS, ICON_ALTITUDE_ROWS, CLOUD_ALTITUDE_ROWS } from './altitudes.js';

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
    // Sunrise transition: 0→1, extend previous hour
    if (isDay[i] === 1 && isDay[i - 1] === 0) {
      extended[i - 1] = 1;
    }
    // Sunset transition: 1→0, extend next hour
    if (isDay[i - 1] === 1 && isDay[i] === 0) {
      extended[i] = 1;
    }
  }
  return extended;
}

// Build sunrise/sunset lookup from daily data
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

export function transformWeatherData(raw, model) {
  const hourly = raw.hourly;
  const daily = raw.daily;
  const times = hourly.time;
  const isDay = extendDaylight(hourly.is_day || []);
  const sunTimes = buildSunTimes(daily);

  // Build hours array
  const hours = times.map((t, i) => {
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

  // Build wind/temp altitude data (model-specific rows)
  const altitudeRowDefs = model === 'gfs' ? GFS_ALTITUDE_ROWS : ICON_ALTITUDE_ROWS;
  const altitudes = altitudeRowDefs.map((row) => {
    const windSpeeds = hourly[row.windSpeedParam] || new Array(times.length).fill(null);
    const windDirs = hourly[row.windDirParam] || new Array(times.length).fill(null);
    const temps = hourly[row.tempParam] || new Array(times.length).fill(null);
    const clouds = row.cloudParam
      ? hourly[row.cloudParam] || new Array(times.length).fill(null)
      : new Array(times.length).fill(null);

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

  // Build cloud altitude data
  const cloudAltitudes = CLOUD_ALTITUDE_ROWS.map((row) => {
    const clouds = hourly[row.cloudParam] || new Array(times.length).fill(null);
    return {
      key: row.key,
      feet: row.feet,
      label: `${row.feet.toLocaleString()}ft`,
      isHighAltitude: row.isHighAltitude,
      cloud: clouds,
    };
  });

  // Surface / supplementary data
  const surface = {
    gusts: hourly.wind_gusts_10m || [],
    cape: hourly.cape || null,
    liftedIndex: hourly.lifted_index || null,
    precipProb: hourly.precipitation_probability || null,
    precipInches: hourly.precipitation || null,
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

  // Daily summaries
  const dailyData = daily
    ? {
        uvMax: daily.uv_index_max || [],
        precipSum: daily.precipitation_sum || [],
        dates: daily.time || [],
      }
    : null;

  return {
    model,
    hours,
    altitudes,
    cloudAltitudes,
    surface,
    daily: dailyData,
    currentWeather: raw.current_weather || null,
  };
}
