// Amplified drag scrolling - drags scroll faster than 1:1
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

  // Touch drag — CSS touch-action: pan-y handles vertical natively,
  // we only handle horizontal. All listeners passive for compositor perf.
  let touchStartX, touchScrollLeft;
  let rafId = null;
  let targetScrollLeft = null;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchScrollLeft = container.scrollLeft;
    targetScrollLeft = null;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartX;
    targetScrollLeft = touchScrollLeft - dx * DRAG_MULTIPLIER;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        if (targetScrollLeft !== null) {
          container.scrollLeft = targetScrollLeft;
        }
        rafId = null;
      });
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    targetScrollLeft = null;
  }, { passive: true });
}
