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
  const a = result.address || {};
  const firstSegment = result.display_name?.split(',')[0]?.trim() || '';
  // display_name's first segment disambiguates CDPs that lack city/town fields.
  const place =
    a.city || a.town || a.village || a.hamlet ||
    a.municipality || a.suburb || a.neighbourhood ||
    a.quarter || a.borough || a.city_district ||
    result.name ||
    firstSegment ||
    a.county ||
    '';
  const state = a.state || '';
  const country = a.country_code?.toUpperCase() || '';
  const parts = [];
  if (place) parts.push(place);
  if (state && state !== place) parts.push(state);
  if (country && country !== 'US' && country !== place) parts.push(country);
  return parts.join(', ') || firstSegment || result.display_name || '';
}
