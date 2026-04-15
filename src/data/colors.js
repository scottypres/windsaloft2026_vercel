// Interpolate between two [r,g,b] colors
function lerp(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function rgb(arr) {
  return `rgb(${arr[0]},${arr[1]},${arr[2]})`;
}

// Wind speed color: blue (calm) → green (moderate) → yellow → red (strong)
export function windColor(speed, thresholds = { calm: 7, moderate: 15, strong: 20 }) {
  if (speed == null) return '#555';
  const { calm, moderate, strong } = thresholds;

  const blue = [70, 130, 230];
  const green = [70, 200, 100];
  const yellow = [230, 200, 50];
  const red = [220, 50, 50];

  if (speed <= calm) {
    const t = Math.max(0, speed / calm);
    return rgb(lerp([200, 220, 255], blue, t));
  }
  if (speed <= moderate) {
    const t = (speed - calm) / (moderate - calm);
    return rgb(lerp(blue, green, t));
  }
  if (speed <= strong) {
    const t = (speed - moderate) / (strong - moderate);
    return rgb(lerp(green, yellow, t));
  }
  const t = Math.min(1, (speed - strong) / (strong * 0.5));
  return rgb(lerp(yellow, red, t));
}

// Temperature color: white (≤32) → blue (32-55) → green (55-72) → red (72-90) → dark red (90+)
export function tempColor(temp) {
  if (temp == null) return '#555';

  const white = [240, 240, 255];
  const blue = [80, 140, 230];
  const green = [70, 200, 100];
  const orange = [230, 140, 40];
  const red = [220, 50, 50];
  const darkRed = [140, 20, 20];

  if (temp <= 32) return rgb(white);
  if (temp <= 55) {
    const t = (temp - 32) / 23;
    return rgb(lerp(white, blue, t));
  }
  if (temp <= 72) {
    const t = (temp - 55) / 17;
    return rgb(lerp(blue, green, t));
  }
  if (temp <= 90) {
    const t = (temp - 72) / 18;
    return rgb(lerp(green, orange, t));
  }
  const t = Math.min(1, (temp - 90) / 15);
  return rgb(lerp(orange, darkRed, t));
}

// Cloud cover: white background, gray intensity based on coverage
export function cloudColor(cover) {
  if (cover == null) return '#ddd';
  const gray = Math.round(255 - (cover / 100) * 200);
  return `rgb(${gray},${gray},${gray})`;
}

// Cloud cell text color (dark text on light, white on dark)
export function cloudTextColor(cover) {
  if (cover == null) return '#888';
  const gray = Math.round(255 - (cover / 100) * 200);
  return gray < 140 ? '#fff' : '#111';
}

// CAPE: white→lightblue→green→yellow→red
export function capeColor(cape) {
  if (cape == null) return '#555';
  if (cape <= 0) return rgb([240, 240, 240]);
  if (cape <= 500) {
    const t = cape / 500;
    return rgb(lerp([240, 240, 240], [150, 200, 255], t));
  }
  if (cape <= 1000) {
    const t = (cape - 500) / 500;
    return rgb(lerp([150, 200, 255], [70, 200, 100], t));
  }
  if (cape <= 2000) {
    const t = (cape - 1000) / 1000;
    return rgb(lerp([70, 200, 100], [230, 200, 50], t));
  }
  const t = Math.min(1, (cape - 2000) / 2000);
  return rgb(lerp([230, 200, 50], [220, 50, 50], t));
}

// Lifted Index: blue (stable, ≥6) → red (unstable, ≤0)
export function liftedIndexColor(li) {
  if (li == null) return '#555';
  if (li >= 6) return rgb([70, 130, 230]);
  if (li <= 0) return rgb([220, 50, 50]);
  const t = (6 - li) / 6;
  return rgb(lerp([70, 130, 230], [220, 50, 50], t));
}

// Precipitation probability: white→dark blue
export function precipColor(pct) {
  if (pct == null) return '#555';
  const t = Math.min(1, pct / 100);
  return rgb(lerp([240, 240, 255], [30, 60, 180], t));
}

// Precipitation inches: white→blue
export function precipInchesColor(inches) {
  if (inches == null) return '#555';
  const t = Math.min(1, inches / 2);
  return rgb(lerp([240, 240, 255], [30, 60, 180], t));
}

// Humidity: white→teal
export function humidityColor(pct) {
  if (pct == null) return '#555';
  const t = Math.min(1, pct / 100);
  return rgb(lerp([240, 240, 240], [50, 160, 160], t));
}

// Visibility: green (good) → red (poor)
export function visibilityColor(miles) {
  if (miles == null) return '#555';
  if (miles >= 10) return rgb([70, 200, 100]);
  if (miles <= 1) return rgb([220, 50, 50]);
  const t = (10 - miles) / 9;
  return rgb(lerp([70, 200, 100], [220, 50, 50], t));
}

// Blend a color toward neutral gray based on confidence factor.
// factor: 1.0 = full original color, 0.0 = fully gray.
// Used for ensemble spread overlay — high spread = low confidence = grayed out.
export function blendTowardGray(color, factor) {
  const match = color.match(/\d+/g);
  if (!match) return color;
  const [r, g, b] = match.map(Number);
  const gray = 180;
  const f = Math.max(0, Math.min(1, factor));
  const nr = Math.round(gray + (r - gray) * f);
  const ng = Math.round(gray + (g - gray) * f);
  const nb = Math.round(gray + (b - gray) * f);
  return `rgb(${nr},${ng},${nb})`;
}

// Compute confidence factor from ensemble spread.
// spread < 2 mph = full confidence (1.0), spread > 10 mph = low confidence (0.15).
export function spreadConfidence(spread) {
  if (spread == null) return 1;
  if (spread <= 2) return 1;
  if (spread >= 10) return 0.15;
  return 1 - ((spread - 2) / 8) * 0.85;
}

// Get contrasting text color for a background
export function textColorFor(bgColor) {
  // Parse rgb values
  const match = bgColor.match(/\d+/g);
  if (!match) return '#fff';
  const [r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#111' : '#fff';
}
