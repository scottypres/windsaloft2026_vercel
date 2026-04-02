// Adds momentum/fling scrolling to a scrollable container via mouse drag
export function enableMomentumScroll(container) {
  let isDragging = false;
  let startX, startY, scrollLeftStart, scrollTopStart;
  let velocityX = 0, velocityY = 0;
  let lastX, lastY, lastTime;
  let animId = null;

  container.addEventListener('mousedown', (e) => {
    // Only left button, ignore if clicking interactive elements
    if (e.button !== 0) return;
    if (e.target.closest('input, button, select, a')) return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    scrollLeftStart = container.scrollLeft;
    scrollTopStart = container.scrollTop;
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = performance.now();
    velocityX = 0;
    velocityY = 0;
    if (animId) cancelAnimationFrame(animId);
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    container.scrollLeft = scrollLeftStart - dx;
    container.scrollTop = scrollTopStart - dy;

    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) {
      velocityX = (e.clientX - lastX) / dt;
      velocityY = (e.clientY - lastY) / dt;
    }
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = now;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = '';
    container.style.userSelect = '';

    // Apply momentum
    const friction = 0.95;
    const minVelocity = 0.01;

    const animate = () => {
      if (Math.abs(velocityX) < minVelocity && Math.abs(velocityY) < minVelocity) return;
      container.scrollLeft -= velocityX * 16;
      container.scrollTop -= velocityY * 16;
      velocityX *= friction;
      velocityY *= friction;
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
  });

  // Stop momentum on new scroll interaction (wheel, touch)
  container.addEventListener('wheel', () => {
    if (animId) cancelAnimationFrame(animId);
  }, { passive: true });
}
