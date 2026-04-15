const MAX_ENTRIES = 25;
const INDEX_KEY = 'soar_cache_index';

function getIndex() {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY)) || [];
  } catch {
    return [];
  }
}

function setIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

// Compute the TTL (in ms) for a model based on its run schedule.
// Returns the time until the next model run's data becomes available.
// Falls back to a minimum of 15 minutes so we never cache too short.
export function modelTTL(config) {
  const MIN_TTL = 15 * 60 * 1000; // 15 min floor

  if (!config.runSchedule) return MIN_TTL;

  const now = new Date();
  const nowUTC_h = now.getUTCHours();
  const nowUTC_m = now.getUTCMinutes();
  const nowMinutesSinceMidnight = nowUTC_h * 60 + nowUTC_m;
  const delayMin = config.availabilityDelayMinutes || 60;

  if (config.runSchedule.type === 'hourly') {
    // Next run is top of the next hour + delay
    const nextRunMinutes = (Math.floor(nowMinutesSinceMidnight / 60) + 1) * 60;
    const nextAvailableMinutes = nextRunMinutes + delayMin;
    const diffMinutes = nextAvailableMinutes - nowMinutesSinceMidnight;
    return Math.max(diffMinutes * 60 * 1000, MIN_TTL);
  }

  if (config.runSchedule.type === 'fixed') {
    const hours = config.runSchedule.hoursUTC;
    // Find the next run whose data will be available
    let bestDiff = Infinity;
    for (const h of hours) {
      // Run at h:00 UTC, available at h:00 + delay
      const runMinutes = h * 60;
      const availableMinutes = runMinutes + delayMin;
      let diff = availableMinutes - nowMinutesSinceMidnight;
      if (diff <= 0) diff += 24 * 60; // wrap to tomorrow
      if (diff < bestDiff) bestDiff = diff;
    }
    return Math.max(bestDiff * 60 * 1000, MIN_TTL);
  }

  return MIN_TTL;
}

export function cacheGet(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(key);
      const index = getIndex().filter((k) => k !== key);
      setIndex(index);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function cacheSet(key, data) {
  try {
    let index = getIndex().filter((k) => k !== key);
    // Evict oldest entries if over limit
    while (index.length >= MAX_ENTRIES) {
      const oldest = index.shift();
      localStorage.removeItem(oldest);
    }
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
    index.push(key);
    setIndex(index);
  } catch {
    // localStorage full or unavailable
  }
}

export function cacheKey(model, lat, lon, days) {
  return `soar_${model}_${lat.toFixed(2)}_${lon.toFixed(2)}_${days}`;
}
