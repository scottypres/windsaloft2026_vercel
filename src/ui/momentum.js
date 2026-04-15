// Amplified drag scrolling - drags scroll faster than 1:1
const DRAG_MULTIPLIER = 1.5;
// Minimum pixel movement before locking to an axis
const AXIS_LOCK_THRESHOLD = 6;

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
  });

  // Touch drag — axis-locked for single finger, scroll-locked for multi-touch
  let touchStartX, touchStartY, touchScrollLeft;
  let touchAxis = null;
  let multiTouchLock = null;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length >= 2) {
      multiTouchLock = container.scrollLeft;
      touchAxis = null;
      return;
    }
    if (e.touches.length === 1) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchScrollLeft = container.scrollLeft;
      touchAxis = null;
      multiTouchLock = null;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length >= 2 && multiTouchLock !== null) {
      container.scrollLeft = multiTouchLock;
      return;
    }

    if (e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;

    if (!touchAxis) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (absDx > AXIS_LOCK_THRESHOLD || absDy > AXIS_LOCK_THRESHOLD) {
        touchAxis = absDx > absDy ? 'x' : 'y';
      }
      if (!touchAxis) return;
    }

    if (touchAxis === 'x') {
      container.scrollLeft = touchScrollLeft - dx * DRAG_MULTIPLIER;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener('touchend', (e) => {
    if (e.touches.length === 0 && multiTouchLock !== null) {
      container.scrollLeft = multiTouchLock;
      requestAnimationFrame(() => {
        container.scrollLeft = multiTouchLock;
        multiTouchLock = null;
      });
      return;
    }
    touchAxis = null;
  }, { passive: true });
}
