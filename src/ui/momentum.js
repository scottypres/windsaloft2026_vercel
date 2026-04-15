// Mouse drag scrolling with multiplier (desktop only).
// Touch scrolling is handled natively by the browser for maximum smoothness.
const DRAG_MULTIPLIER = 1.5;

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

  // Multi-touch lock: prevent horizontal drift during two-finger vertical scrolls
  let multiTouchLock = null;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length >= 2) {
      multiTouchLock = container.scrollLeft;
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length >= 2 && multiTouchLock !== null) {
      container.scrollLeft = multiTouchLock;
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (e.touches.length === 0 && multiTouchLock !== null) {
      container.scrollLeft = multiTouchLock;
      requestAnimationFrame(() => {
        container.scrollLeft = multiTouchLock;
        multiTouchLock = null;
      });
    }
  }, { passive: true });
}
