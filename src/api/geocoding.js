const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

let debounceTimer = null;

export function searchLocations(query) {
  return new Promise((resolve, reject) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!query || query.trim().length < 2) {
        resolve([]);
        return;
      }
      try {
        const params = new URLSearchParams({
          format: 'json',
          q: query.trim(),
          limit: '8',
          addressdetails: '1',
        });
        const resp = await fetch(`${NOMINATIM_URL}?${params}`, {
          headers: { 'User-Agent': 'SoarForecaster/1.0' },
        });
        if (!resp.ok) throw new Error(`Geocoding error: ${resp.status}`);
        const results = await resp.json();
        resolve(
          results.map((r) => ({
            name: r.display_name,
            shortName: buildShortName(r),
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
          }))
        );
      } catch (err) {
        reject(err);
      }
    }, 500);
  });
}

export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    format: 'json',
    lat: lat.toString(),
    lon: lon.toString(),
    addressdetails: '1',
  });
  const resp = await fetch(`${NOMINATIM_REVERSE_URL}?${params}`, {
    headers: { 'User-Agent': 'SoarForecaster/1.0' },
  });
  if (!resp.ok) throw new Error(`Reverse geocoding error: ${resp.status}`);
  const r = await resp.json();
  return {
    name: r.display_name,
    shortName: buildShortName(r),
    lat,
    lon,
  };
}

function buildShortName(result) {
  const parts = [];
  if (result.address) {
    const a = result.address;
    const city = a.city || a.town || a.village || a.hamlet || a.county || '';
    const state = a.state || '';
    const country = a.country_code?.toUpperCase() || '';
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country && country !== 'US') parts.push(country);
  } else {
    // Fallback: use first 2 parts of display_name
    const segments = result.display_name.split(',').map((s) => s.trim());
    parts.push(...segments.slice(0, 2));
  }
  return parts.join(', ') || result.display_name.split(',')[0];
}
