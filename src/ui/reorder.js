// Drag-to-reorder for the model list.
//
// Uses Pointer Events rather than HTML5 drag-and-drop: native DnD never fires
// on touch, and this app is mostly read on a phone. Pointer Events cover
// mouse, touch and pen through one code path with no library.
//
// ponytail: rows swap in whole-row steps rather than following the finger
// pixel-for-pixel. Simpler, and the list is short enough that the jump reads
// as a swap rather than a glitch. If it ever needs to feel smoother, the
// upgrade is a transform on the dragged row plus a placeholder gap.

const ROW_SELECTOR = '[data-order-id]';

export function makeReorderable(list, onReorder) {
  if (!list || list._reorderBound) return;
  list._reorderBound = true;

  let row = null; // the row being dragged
  let pointerId = null;

  function rowsIn() {
    return [...list.querySelectorAll(ROW_SELECTOR)];
  }

  function finish() {
    if (!row) return;
    row.classList.remove('dragging');
    list.classList.remove('reordering');
    row = null;
    pointerId = null;
  }

  list.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle || row) return;
    row = handle.closest(ROW_SELECTOR);
    if (!row) return;

    pointerId = e.pointerId;
    // Capture on the handle so the drag survives the pointer leaving the row,
    // and so moving the row in the DOM does not drop the event stream. Throws
    // if the pointer is already gone; the drag still works via the listeners
    // on the list itself, so this is not worth failing over.
    try {
      handle.setPointerCapture(pointerId);
    } catch {
      // no capture available
    }
    row.classList.add('dragging');
    list.classList.add('reordering');
    e.preventDefault();
  });

  list.addEventListener('pointermove', (e) => {
    if (!row || e.pointerId !== pointerId) return;
    e.preventDefault();

    // Find the row the pointer is currently over and move the dragged row
    // to that side of it. Comparing against each row's midpoint means the
    // swap happens once the pointer is more than halfway past a neighbour,
    // which avoids flip-flopping on small movements.
    for (const other of rowsIn()) {
      if (other === row) continue;
      const box = other.getBoundingClientRect();
      const midpoint = box.top + box.height / 2;
      if (e.clientY >= box.top && e.clientY <= box.bottom) {
        if (e.clientY < midpoint) other.before(row);
        else other.after(row);
        break;
      }
    }
  });

  for (const type of ['pointerup', 'pointercancel']) {
    list.addEventListener(type, (e) => {
      if (!row || e.pointerId !== pointerId) return;
      const order = rowsIn().map((r) => r.dataset.orderId);
      finish();
      onReorder(order);
    });
  }
}

// Three horizontal lines, the conventional drag affordance.
export const DRAG_HANDLE_HTML =
  '<span class="drag-handle" aria-hidden="true" title="Drag to reorder">' +
  '<span></span><span></span><span></span>' +
  '</span>';
