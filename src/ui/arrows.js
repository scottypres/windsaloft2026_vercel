// Generate an inline SVG wind direction arrow
// meteoDirection: meteorological direction (where wind comes FROM)
// Display shows where wind blows TO (rotated 180°)

const ARROW_SHAPES = {
  classic: '<polygon points="10,3 6,15 10,12 14,15" fill="currentColor"/>',
  triangle: '<polygon points="10,2 4,16 16,16" fill="currentColor"/>',
  thin: '<line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="2"/><polygon points="10,2 6,8 14,8" fill="currentColor"/>',
  dot: '<circle cx="10" cy="10" r="3" fill="currentColor"/><line x1="10" y1="7" x2="10" y2="2" stroke="currentColor" stroke-width="1.5"/>',
  chevron: '<polyline points="5,12 10,4 15,12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
};

export const ARROW_STYLE_NAMES = Object.keys(ARROW_SHAPES);

let currentStyle = 'classic';

export function setArrowStyle(style) {
  currentStyle = ARROW_SHAPES[style] ? style : 'classic';
}

export function windArrow(meteoDirection) {
  if (meteoDirection == null) return '';
  const displayDeg = (meteoDirection + 180) % 360;
  const shape = ARROW_SHAPES[currentStyle] || ARROW_SHAPES.classic;
  return `<svg class="wind-arrow" viewBox="0 0 20 20" style="transform:rotate(${displayDeg}deg)">
    ${shape}
  </svg>`;
}
