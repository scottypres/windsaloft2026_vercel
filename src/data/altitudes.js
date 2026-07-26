// Pressure level to feet mapping. Levels Open-Meteo publishes an altitude for
// use their documented value; the rest are standard-atmosphere heights.
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
  675: 10817,
  650: 11780,
  625: 12774,
  600: 13780,
  575: 14862,
  550: 15962,
  525: 17103,
  500: 18373,
  475: 19524,
  450: 20812,
  425: 22160,
  400: 23622,
  375: 25062,
  350: 26631,
  325: 28295,
  300: 30184,
  275: 31960,
  250: 34121,
  225: 36211,
  200: 38714,
  175: 41311,
  150: 44948,
  125: 47768,
  100: 53150,
  70: 57970,
  50: 63395,
  30: 70994,
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

// Every pressure level a config asks for: the core set plus the optional
// high-altitude extension (see models.js).
export function allPressureLevels(config) {
  return [...(config.pressureLevels || []), ...(config.highPressureLevels || [])];
}

export function allCloudPressureLevels(config) {
  return [...(config.cloudPressureLevels || []), ...(config.highCloudPressureLevels || [])];
}

// Build altitude rows dynamically from a model config.
// Returns rows ordered highest to lowest.
export function buildAltitudeRows(config) {
  const rows = [];

  // Pressure level rows
  for (const hPa of allPressureLevels(config)) {
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
    }));

  return [...rows, ...surfaceRows];
}

// Build cloud altitude rows from a model config.
export function buildCloudAltitudeRows(config) {
  const rows = allCloudPressureLevels(config)
    .filter((hPa) => PRESSURE_TO_FEET[hPa] != null)
    .map((hPa) => ({
      key: `${hPa}hPa`,
      feet: PRESSURE_TO_FEET[hPa],
      type: 'pressure',
      hPa,
      cloudParam: `cloud_cover_${hPa}hPa`,
    }));
  // Highest to lowest
  rows.sort((a, b) => b.feet - a.feet);
  return rows;
}

// Maximum altitude (in feet) to check for "Best Hours" filter
export const BEST_HOURS_MAX_FEET = 400;

// Highest altitude any row can reach — bounds the "Hide >" threshold input.
export const MAX_ROW_FEET = Math.max(...Object.values(PRESSURE_TO_FEET));

export { PRESSURE_TO_FEET, SURFACE_TO_FEET };
