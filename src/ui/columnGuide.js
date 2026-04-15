// Column guide: white vertical lines at regular column intervals + snap-to-column

let guideEnabled = false;
let guideInterval = 6; // show a line every N columns

export function setColumnGuide(enabled, interval) {
  guideEnabled = enabled;
  if (interval != null) guideInterval = interval;
  applyGuideClass();
}

function applyGuideClass() {
  document.body.classList.toggle('column-guide-active', guideEnabled);
}

function getActualColumnWidth(container) {
  const cell = container.querySelector('.forecast-table tbody .cell');
  if (cell) return cell.offsetWidth;
  const th = container.querySelector('.forecast-table thead th:nth-child(2)');
  if (th) return th.offsetWidth;
  const style = getComputedStyle(document.documentElement);
  return parseFloat(style.getPropertyValue('--cell-width')) || 34;
}

// Snap scrollLeft to the nearest column boundary.
// The alt-label column is sticky, so scrollLeft = i * colW aligns column i at the sticky edge.
function snapToColumn(container) {
  if (!guideEnabled) return;
  const colW = getActualColumnWidth(container);
  if (colW <= 0) return;

  const currentScroll = container.scrollLeft;
  const nearestCol = Math.round(currentScroll / colW);
  const target = nearestCol * colW;

  if (Math.abs(target - currentScroll) < 1) return;

  container.scrollTo({ left: target, behavior: 'smooth' });
}

// Set up snap-on-scroll-end for a container
export function enableSnapScroll(container) {
  if (!container || container._snapEnabled) return;
  container._snapEnabled = true;

  let scrollTimeout = null;

  const onScroll = () => {
    if (!guideEnabled) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      snapToColumn(container);
    }, 150);
  };

  container.addEventListener('scroll', onScroll, { passive: true });

  // Also snap on touchend for more responsive feel
  container.addEventListener('touchend', () => {
    if (!guideEnabled) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      snapToColumn(container);
    }, 200);
  }, { passive: true });
}

// Apply guide lines to rendered tables by adding CSS classes to guide-boundary cells
export function applyGuideLines(container) {
  if (!container) return;
  // Remove old guide lines
  container.querySelectorAll('.col-guide-line').forEach((el) => {
    el.classList.remove('col-guide-line');
  });

  if (!guideEnabled) return;

  const table = container.querySelector('.forecast-table');
  if (!table) return;

  // Mark every Nth data column with a guide line class
  const rows = table.querySelectorAll('tr');
  for (const row of rows) {
    const cells = row.children;
    // cells[0] is the alt-label/corner, data columns start at index 1
    for (let c = 1; c < cells.length; c++) {
      const dataColIndex = c - 1; // 0-based data column
      if (dataColIndex > 0 && dataColIndex % guideInterval === 0) {
        cells[c].classList.add('col-guide-line');
      }
    }
  }
}
