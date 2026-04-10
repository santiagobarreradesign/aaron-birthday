import { useEffect, useState, useCallback } from 'react';
import { BOOK_OF_MEMORIES_ITEMS } from './config';

const base = import.meta.env.BASE_URL;
const total = BOOK_OF_MEMORIES_ITEMS.length;

function isVideoSrc(src) {
  return /\.(mov|mp4|webm)$/i.test(src);
}

export default function BookOfMemories({ open, onClose }) {
  const [page, setPage] = useState(0);
  /** +1 = forward flip, -1 = back — drives CSS enter animation */
  const [enterDir, setEnterDir] = useState(1);

  const item = BOOK_OF_MEMORIES_ITEMS[page];

  const goNext = useCallback(() => {
    setEnterDir(1);
    setPage((p) => (p >= total - 1 ? p : p + 1));
  }, []);

  const goPrev = useCallback(() => {
    setEnterDir(-1);
    setPage((p) => (p <= 0 ? p : p - 1));
  }, []);

  const jumpTo = useCallback((i) => {
    if (i === page || i < 0 || i >= total) return;
    setEnterDir(i > page ? 1 : -1);
    setPage(i);
  }, [page]);

  const handleKey = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goPrev();
      }
    },
    [open, onClose, goNext, goPrev],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (!open) {
      setPage(0);
      setEnterDir(1);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="mem07-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mem07-title"
      onClick={onClose}
    >
      <div className="mem07-window" onClick={(e) => e.stopPropagation()}>
        <header className="mem07-titlebar">
          <span className="mem07-titlebar-icon" aria-hidden>🖼️</span>
          <span id="mem07-title" className="mem07-titlebar-text">
            Book of Memories — Windows Photo Book
          </span>
          <button
            type="button"
            className="mem07-titlebar-close"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div className="mem07-menurow" aria-hidden>
          <span className="mem07-fakemenu">File</span>
          <span className="mem07-fakemenu">Edit</span>
          <span className="mem07-fakemenu">View</span>
          <span className="mem07-fakemenu">Help</span>
        </div>

        <div className="mem07-toolbar">
          <button
            type="button"
            className="mem07-btn"
            onClick={goPrev}
            disabled={page <= 0}
            title="Previous (←)"
          >
            <span className="mem07-btn-glyph" aria-hidden>◄</span>
            Back
          </button>
          <div className="mem07-toolbar-sep" aria-hidden />
          <button
            type="button"
            className="mem07-btn mem07-btn-primary"
            onClick={goNext}
            disabled={page >= total - 1}
            title="Next (→)"
          >
            Forward
            <span className="mem07-btn-glyph" aria-hidden>►</span>
          </button>
          <span className="mem07-page-indicator" aria-live="polite">
            Picture <strong>{page + 1}</strong> of <strong>{total}</strong>
          </span>
        </div>

        <div className="mem07-workspace">
          <div className="mem07-spine" aria-hidden>
            <span className="mem07-spine-label">MEMORIES</span>
          </div>

          <div className="mem07-stage">
            <div
              key={page}
              className="mem07-page"
              data-enter={enterDir === 1 ? 'fwd' : 'back'}
            >
              <div className="mem07-mat">
                {isVideoSrc(item.src) ? (
                  <video
                    className="mem07-photo"
                    src={`${base}${item.src}`}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={item.alt}
                  />
                ) : (
                  <img
                    src={`${base}${item.src}`}
                    alt={item.alt}
                    className="mem07-photo"
                    decoding="async"
                  />
                )}
              </div>
              <p className="mem07-caption">{item.alt}</p>
            </div>
          </div>
        </div>

        <div className="mem07-filmstrip" role="tablist" aria-label="Jump to picture">
          {BOOK_OF_MEMORIES_ITEMS.map((it, i) => (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={i === page}
              className={`mem07-thumb ${i === page ? 'mem07-thumb--active' : ''}`}
              onClick={() => jumpTo(i)}
              title={`Picture ${i + 1}`}
            >
              {isVideoSrc(it.src) ? (
                <video
                  src={`${base}${it.src}`}
                  className="mem07-thumb-img"
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden
                />
              ) : (
                <img src={`${base}${it.src}`} alt="" className="mem07-thumb-img" />
              )}
            </button>
          ))}
        </div>

        <footer className="mem07-statusbar">
          <span className="mem07-status-icon" aria-hidden>✓</span>
          <span>Ready</span>
          <span className="mem07-status-hint">
            Arrow keys flip pages · Click thumbnails to jump
          </span>
        </footer>
      </div>
    </div>
  );
}
