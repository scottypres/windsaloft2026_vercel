// Pressure level to feet mapping
const PRESSURE_TO_FEET = {
  1000: 361,
  975: 1050,
  950: 1640,
  925: 2625,
  900: 3281,
  875: 4100,
  850: 4921,
  825: 5807,
  800: 6234,
  775: 7185,
  750: 8091,
  725: 9052,
  700: 9843,
  600: 13780,
  500: 18373,
  400: 23622,
  300: 30184,
  250: 34121,
  200: 38714,
  150: 44948,
  100: 53150,
};

// Surface meter levels to feet
const SURFACE_TO_FEET = {
  10: 33,
  80: 262,
  100: 328,
  120: 394,
  180: 591,
  200: 656,
};

// Build altitude rows dynamically from a model config.
// Returns rows ordered highest to lowest.
export function buildAltitudeRows(config) {
  const rows = [];

  // Pressure level rows
  for (const hPa of config.pressureLevels) {
    const feet = PRESSURE_TO_FEET[hPa];
    if (feet == null) continue;
    rows.push({
      key: `${hPa}hPa`,
      feet,
      type: 'pressure',
      hPa,
      windSpeedParam: `${config.windParamPrefix}${hPa}hPa`,
      windDirParam: `${config.windDirParamPrefix}${hPa}hPa`,
      tempParam: `temperature_${hPa}hPa`,
      cloudParam: `cloud_cover_${hPa}hPa`,
      isHighAltitude: feet > 10000,
    });
  }

  // Sort pressure rows highest to lowest
  rows.sort((a, b) => b.feet - a.feet);

  // Surface level rows (appended lowest after pressure rows)
  const surfaceRows = config.surfaceLevels
    .slice()
    .sort((a, b) => b - a) // highest first
    .map((meters) => ({
      key: `${meters}m`,
      feet: SURFACE_TO_FEET[meters],
      type: 'surface',
      meters,
      windSpeedParam: `wind_speed_${meters}m`,
      windDirParam: `wind_direction_${meters}m`,
      tempParam: meters === 10 ? 'temperature_2m' : `temperature_${meters}m`,
      cloudParam: null,
      isHighAltitude: false,
    }));

  return [...rows, ...surfaceRows];
}

// Build cloud altitude rows from a model config.
export function buildCloudAltitudeRows(config) {
  const levels = config.cloudPressureLevels || [];
  const rows = levels.map((hPa) => {
    const feet = PRESSURE_TO_FEET[hPa];
    return {
      key: `${hPa}hPa`,
      feet,
      type: 'pressure',
      hPa,
      cloudParam: `cloud_cover_${hPa}hPa`,
      isHighAltitude: feet > 10000,
    };
  });
  // Highest to lowest
  rows.sort((a, b) => b.feet - a.feet);
  return rows;
}

// The 3 lowest altitude rows for "Best Hours" filter
export const LOWEST_3_KEYS = ['10m', '80m', '1000hPa'];

export { PRESSURE_TO_FEET, SURFACE_TO_FEET };
