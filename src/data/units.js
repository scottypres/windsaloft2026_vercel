// Display-unit conversions. All internal data stays in the API units
// (mph, °F, feet) — thresholds, colors, shear detection and caching are
// unaffected. Conversion happens only when values are rendered or when a
// user edits a setting expressed in their chosen display unit.

export const DEFAULT_UNITS = { wind: 'mph', temp: 'F', altitude: 'ft' };

export const WIND_UNIT_FACTORS = {
  mph: 1,
  kmh: 1.609344,
  kt: 0.8689762,
  ms: 0.44704,
};

export const WIND_UNIT_LABELS = {
  mph: 'mph',
  kmh: 'km/h',
  kt: 'kt',
  ms: 'm/s',
};

// mph → display unit
export function windTo(mph, unit) {
  return mph * (WIND_UNIT_FACTORS[unit] ?? 1);
}

// display unit → mph
export function windFrom(value, unit) {
  return value / (WIND_UNIT_FACTORS[unit] ?? 1);
}

// °F → display unit
export function tempTo(f, unit) {
  return unit === 'C' ? ((f - 32) * 5) / 9 : f;
}

// °F difference → display unit difference (no offset)
export function tempDeltaTo(f, unit) {
  return unit === 'C' ? (f * 5) / 9 : f;
}

export function altitudeLabel(feet, unit) {
  if (unit === 'm') return `${Math.round(feet * 0.3048).toLocaleString()}m`;
  return `${feet.toLocaleString()}ft`;
}

// metres → feet (site elevation from the DEM comes back in metres)
export function metersToFeet(m) {
  return m / 0.3048;
}

// Format a height-above-ground value for the ground-level overlay. Unlike
// altitudeLabel this can be negative (a pressure level below the site sits
// underground) and carries an explicit sign so "+" vs "−" reads unambiguously.
export function aglLabel(feet, unit) {
  const rounded = unit === 'm' ? Math.round(feet * 0.3048) : Math.round(feet);
  const suffix = unit === 'm' ? 'm' : 'ft';
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded).toLocaleString()}${suffix}`;
}
