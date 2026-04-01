// Pressure level to feet mapping
const PRESSURE_TO_FEET = {
  1000: 361,
  975: 1050,
  950: 1640,
  925: 2625,
  900: 3281,
  850: 4921,
  800: 6234,
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
  180: 591,
};

// Wind/temperature altitude rows (ordered highest to lowest)
// These have wind speed, wind direction, and temperature data
const WIND_TEMP_PRESSURE_LEVELS = [400, 500, 600, 700, 800, 850, 900, 925, 950, 975, 1000];
const WIND_TEMP_SURFACE_LEVELS = [180, 80, 10];

// Cloud cover pressure levels (more levels than wind/temp)
const CLOUD_PRESSURE_LEVELS = [
  100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 850, 900, 925, 950, 975, 1000,
];

// Build ordered altitude row definitions for wind/temp views
// Highest to lowest
export const WIND_ALTITUDE_ROWS = [
  ...WIND_TEMP_PRESSURE_LEVELS.map((hPa) => ({
    key: `${hPa}hPa`,
    feet: PRESSURE_TO_FEET[hPa],
    type: 'pressure',
    hPa,
    windSpeedParam: `windspeed_${hPa}hPa`,
    windDirParam: `winddirection_${hPa}hPa`,
    tempParam: `temperature_${hPa}hPa`,
    cloudParam: `cloud_cover_${hPa}hPa`,
    isHighAltitude: PRESSURE_TO_FEET[hPa] > 5000,
  })),
  {
    key: '180m',
    feet: SURFACE_TO_FEET[180],
    type: 'surface',
    meters: 180,
    windSpeedParam: 'wind_speed_180m',
    windDirParam: 'wind_direction_180m',
    tempParam: 'temperature_180m',
    cloudParam: null,
    isHighAltitude: false,
  },
  {
    key: '80m',
    feet: SURFACE_TO_FEET[80],
    type: 'surface',
    meters: 80,
    windSpeedParam: 'wind_speed_80m',
    windDirParam: 'wind_direction_80m',
    tempParam: 'temperature_80m',
    cloudParam: null,
    isHighAltitude: false,
  },
  {
    key: '10m',
    feet: SURFACE_TO_FEET[10],
    type: 'surface',
    meters: 10,
    windSpeedParam: 'wind_speed_10m',
    windDirParam: 'wind_direction_10m',
    tempParam: 'temperature_2m',
    cloudParam: null,
    isHighAltitude: false,
  },
];

// Cloud view altitude rows (highest to lowest)
export const CLOUD_ALTITUDE_ROWS = [
  ...CLOUD_PRESSURE_LEVELS.map((hPa) => ({
    key: `${hPa}hPa`,
    feet: PRESSURE_TO_FEET[hPa],
    type: 'pressure',
    hPa,
    cloudParam: `cloud_cover_${hPa}hPa`,
    isHighAltitude: PRESSURE_TO_FEET[hPa] > 5000,
  })),
];

// The 3 lowest altitude rows for "Best Hours" filter
export const LOWEST_3_KEYS = ['10m', '80m', '1000hPa'];

export { PRESSURE_TO_FEET, SURFACE_TO_FEET };
