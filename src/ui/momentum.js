// Amplified drag scrolling - drags scroll faster than 1:1
const DRAG_MULTIPLIER = 2.5;
// Minimum pixel movement before locking to an axis
const AXIS_LOCK_THRESHOLD = 6;

export function enableMomentumScroll(container) {
  let isDragging = false;
  let startX, startY, scrollLeftStart, scrollTopStart;

  // Mouse drag
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('input, button, select, a')) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollLeftStart = container.scrollLeft;
    scrollTopStart = container.scrollTop;
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
  });

  // Touch drag — single finger scrolls horizontally only
  let touchStartX, touchScrollLeft;
  let touchAxis = null; // 'x' | 'y' | null

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchScrollLeft = container.scrollLeft;
    touchAxis = null;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - (container._touchStartY || e.touches[0].clientY);

    // Lock axis on first significant movement
    if (!touchAxis) {
      if (!container._touchStartY) container._touchStartY = e.touches[0].clientY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(e.touches[0].clientY - container._touchStartY);
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
    touchAxis = null;
    delete container._touchStartY;
  }, { passive: true });
}
