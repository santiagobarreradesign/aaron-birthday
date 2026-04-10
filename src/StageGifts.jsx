import { useState, useCallback, useRef, useEffect } from 'react';
import { INTERACTIVE_DRAG_ITEMS, DRAG_ITEM_EMOJI } from './config';

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function charBoundsToScreenRect(cb) {
  return {
    left: cb.x,
    top: cb.y,
    right: cb.x + cb.w,
    bottom: cb.y + cb.h,
  };
}

function pointInRect(px, py, rect) {
  return px >= rect.left && px <= rect.right && py >= rect.top && py <= rect.bottom;
}

/**
 * Bottom-centered flex row of draggable icons (unified sticker art).
 * Aaron can pick up an item by walking over it (overlap), or you can drag to him.
 */
export default function StageGifts({ charBounds, onDeliver }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragFixed, setDragFixed] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const slotRefs = useRef({});
  const lastOverlapIdRef = useRef(null);

  const endDrag = useCallback((clientX, clientY, giftId) => {
    if (charBounds) {
      const cr = charBoundsToScreenRect(charBounds);
      if (pointInRect(clientX, clientY, cr)) {
        onDeliver(giftId);
      }
    }
    setDraggingId(null);
    dragRef.current = null;
  }, [charBounds, onDeliver]);

  const handlePointerDown = useCallback((e, giftId) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      id: giftId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setDraggingId(giftId);
    setDragFixed({ x: rect.left, y: rect.top });
    e.preventDefault();

    function move(ev) {
      if (!dragRef.current) return;
      setDragFixed({
        x: ev.clientX - dragRef.current.offsetX,
        y: ev.clientY - dragRef.current.offsetY,
      });
    }
    function up(ev) {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      const id = dragRef.current?.id;
      if (id) endDrag(ev.clientX, ev.clientY, id);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }, [endDrag]);

  useEffect(() => {
    if (!charBounds || draggingId) return;

    const tick = () => {
      const cr = charBoundsToScreenRect(charBounds);
      let hitId = null;
      for (const g of INTERACTIVE_DRAG_ITEMS) {
        const el = slotRefs.current[g.id];
        if (!el) continue;
        const br = el.getBoundingClientRect();
        if (rectsOverlap(cr, br)) {
          hitId = g.id;
          break;
        }
      }
      if (hitId && hitId !== lastOverlapIdRef.current) {
        lastOverlapIdRef.current = hitId;
        onDeliver(hitId);
      }
      if (!hitId) {
        lastOverlapIdRef.current = null;
      }
    };

    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [charBounds, draggingId, onDeliver]);

  return (
    <div className="stage-gifts-floating-root" aria-label="Draggable props for Aaron">
      <div className="stage-gifts-flex-dock">
        {INTERACTIVE_DRAG_ITEMS.map((g) => (
          <div
            key={g.id}
            className="stage-gift-slot"
            ref={(el) => {
              if (el) slotRefs.current[g.id] = el;
              else delete slotRefs.current[g.id];
            }}
          >
            {draggingId === g.id ? (
              <div className="stage-gift-placeholder" aria-hidden />
            ) : (
              <button
                type="button"
                className="stage-gift-float"
                aria-label={`${g.label} — drag to Aaron`}
                onPointerDown={(e) => handlePointerDown(e, g.id)}
              >
                <div className="stage-gift-float-inner">
                  <span className="stage-gift-emoji" aria-hidden>
                    {DRAG_ITEM_EMOJI[g.id]}
                  </span>
                </div>
              </button>
            )}
          </div>
        ))}
      </div>
      {draggingId && (
        <div
          className="stage-gift-float stage-gift-float--ghost"
          style={{
            position: 'fixed',
            left: dragFixed.x,
            top: dragFixed.y,
            zIndex: 600,
          }}
          aria-hidden
        >
          <div className="stage-gift-float-inner">
            <span className="stage-gift-emoji" aria-hidden>
              {DRAG_ITEM_EMOJI[draggingId]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
