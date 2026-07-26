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

// Precipitation and visibility have no unit setting of their own — there are
// only three user-facing unit choices. Both follow the altitude unit, which is
// the app's de-facto imperial/metric switch: someone reading heights in metres
// wants millimetres and kilometres, not inches and miles. Canonical values stay
// imperial (the API is asked for inches; transform.js converts visibility to
// miles), so colour thresholds are unaffected — only the rendered number moves.
export function isMetric(units) {
  return (units?.altitude || 'ft') === 'm';
}

// canonical inches → display
export function precipTo(inches, units) {
  return isMetric(units) ? inches * 25.4 : inches;
}

export function precipLabel(units) {
  return isMetric(units) ? 'Precip mm' : 'Precip in';
}

// canonical miles → display
export function visibilityTo(miles, units) {
  return isMetric(units) ? miles * 1.609344 : miles;
}

export function visibilityRowLabel(units) {
  return isMetric(units) ? 'Vis (km)' : 'Vis (mi)';
}

export const ALTITUDE_UNIT_LABELS = { ft: 'ft', m: 'm' };

export function altitudeLabel(feet, unit) {
  if (unit === 'm') return `${Math.round(feet * 0.3048).toLocaleString()}m`;
  return `${feet.toLocaleString()}ft`;
}

// metres → feet (site elevation from the DEM comes back in metres)
export function metersToFeet(m) {
  return m / 0.3048;
}

// The "Hide >" filter is expressed in thousands of the selected altitude unit
// (5 → 5k ft, 3 → 3k m). Altitude rows are stored in feet, so convert.
export function thousandsToFeet(thousands, unit) {
  const value = thousands * 1000;
  return unit === 'm' ? metersToFeet(value) : value;
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
