// Amplified drag scrolling - drags scroll faster than 1:1
const DRAG_MULTIPLIER = 2.5;
// Minimum pixel distance before we lock to an axis
const LOCK_THRESHOLD = 6;

export function enableMomentumScroll(container) {
  // Prevent duplicate listeners
  if (container._momentumEnabled) return;
  container._momentumEnabled = true;

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
    const dy = (e.clientY - startY) * DRAG_MULTIPLIER;
    container.scrollLeft = scrollLeftStart - dx;
    container.scrollTop = scrollTopStart - dy;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = '';
    container.style.userSelect = '';
  });

  // Touch drag with direction locking
  let touchStartX, touchStartY, touchScrollLeft, touchScrollTop;
  let axis = null; // null = undecided, 'x' = horizontal, 'y' = vertical (pass-through)

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchScrollLeft = container.scrollLeft;
    touchScrollTop = container.scrollTop;
    axis = null;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const rawDx = e.touches[0].clientX - touchStartX;
    const rawDy = e.touches[0].clientY - touchStartY;

    // Determine axis lock once we've moved enough
    if (axis === null) {
      if (Math.abs(rawDx) < LOCK_THRESHOLD && Math.abs(rawDy) < LOCK_THRESHOLD) return;
      axis = Math.abs(rawDx) >= Math.abs(rawDy) ? 'x' : 'y';
    }

    if (axis === 'y') {
      // Vertical scroll — let the browser handle it (scroll between tables)
      return;
    }

    // Horizontal scroll — we handle it
    e.preventDefault();
    const dx = rawDx * DRAG_MULTIPLIER;
    container.scrollLeft = touchScrollLeft - dx;
  }, { passive: false });
}
