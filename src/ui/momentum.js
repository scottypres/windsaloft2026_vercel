// Amplified drag scrolling - drags scroll faster than 1:1
const DRAG_MULTIPLIER = 2.5;
// Minimum pixel movement before locking to an axis
const AXIS_LOCK_THRESHOLD = 6;

function snapToColumn(container) {
  if (!document.body.classList.contains('col-guide')) return;
  const cell = container.querySelector('.cell');
  if (!cell) return;
  const cellWidth = cell.offsetWidth;
  if (cellWidth <= 0) return;

  const snapped = Math.round(container.scrollLeft / cellWidth) * cellWidth;
  container.scrollTo({ left: snapped, behavior: 'smooth' });
}

export function enableMomentumScroll(container) {
  let isDragging = false;
  let startX, scrollLeftStart;

  // Mouse drag — horizontal only
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('input, button, select, a')) return;

    isDragging = true;
    startX = e.clientX;
    scrollLeftStart = container.scrollLeft;
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - startX) * DRAG_MULTIPLIER;
    container.scrollLeft = scrollLeftStart - dx;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = '';
    container.style.userSelect = '';
    snapToColumn(container);
  });

  // Touch drag — axis-locked
  let touchStartX, touchStartY, touchScrollLeft;
  let touchAxis = null; // 'x' | 'y' | null

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchScrollLeft = container.scrollLeft;
    touchAxis = null;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    // Lock axis on first significant movement
    if (!touchAxis) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > AXIS_LOCK_THRESHOLD || absDy > AXIS_LOCK_THRESHOLD) {
        touchAxis = absDx > absDy ? 'x' : 'y';
      }
      if (!touchAxis) return;
    }

    // Only handle horizontal scrolling; let vertical pass through to parent
    if (touchAxis === 'x') {
      container.scrollLeft = touchScrollLeft - dx * DRAG_MULTIPLIER;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (touchAxis === 'x') {
      snapToColumn(container);
    }
    touchAxis = null;
  }, { passive: true });
}
