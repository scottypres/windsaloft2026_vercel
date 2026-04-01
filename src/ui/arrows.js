// Generate an inline SVG wind direction arrow
// meteoDirection: meteorological direction (where wind comes FROM)
// Display shows where wind blows TO (rotated 180°)
export function windArrow(meteoDirection) {
  if (meteoDirection == null) return '';
  const displayDeg = (meteoDirection + 180) % 360;
  return `<svg class="wind-arrow" viewBox="0 0 20 20" width="14" height="14" style="transform:rotate(${displayDeg}deg)">
    <polygon points="10,3 6,15 10,12 14,15" fill="currentColor"/>
  </svg>`;
}
