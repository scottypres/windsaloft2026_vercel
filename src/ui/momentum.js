// Amplified drag scrolling - drags scroll faster than 1:1
const DRAG_MULTIPLIER = 2.5;

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

  // Touch drag
  let touchStartX, touchStartY, touchScrollLeft, touchScrollTop;

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchScrollLeft = container.scrollLeft;
    touchScrollTop = container.scrollTop;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const dx = (e.touches[0].clientX - touchStartX) * DRAG_MULTIPLIER;
    const dy = (e.touches[0].clientY - touchStartY) * DRAG_MULTIPLIER;
    container.scrollLeft = touchScrollLeft - dx;
    container.scrollTop = touchScrollTop - dy;
    e.preventDefault();
  }, { passive: false });
}
