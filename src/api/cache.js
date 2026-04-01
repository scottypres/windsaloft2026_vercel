const TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ENTRIES = 10;
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

export function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > TTL_MS) {
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
