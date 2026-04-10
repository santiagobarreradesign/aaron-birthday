import { useState, useRef, useCallback } from 'react';
import { playPopupClose, playError } from './audio';

export default function PopupGenerator({ popups, onClose, onSpawnChild }) {
  return (
    <div className="popup-overlay">
      {popups.map((p) => (
        <Popup key={p.id} data={p} onClose={onClose} onSpawnChild={onSpawnChild} />
      ))}
    </div>
  );
}

function Popup({ data, onClose, onSpawnChild }) {
  const { id, type, x, y, zIndex, payload, behaviorFlags } = data;
  const [closing, setClosing] = useState(false);
  const [closeOffset, setCloseOffset] = useState({ x: 0, y: 0 });
  const [stubbornClicks, setStubbornClicks] = useState(0);
  const [swappedButtons, setSwappedButtons] = useState(false);
  const closeRef = useRef(null);

  const isRunaway = behaviorFlags?.runaway;
  const isStubbornClose = behaviorFlags?.stubborn;
  const spawnsChild = behaviorFlags?.spawnsChild;

  const doClose = useCallback(() => {
    setClosing(true);
    playPopupClose();
    setTimeout(() => {
      if (spawnsChild) onSpawnChild?.(id);
      onClose(id);
    }, 250);
  }, [id, onClose, onSpawnChild, spawnsChild]);

  const handleCloseClick = useCallback(() => {
    if (isStubbornClose && stubbornClicks < 1) {
      setStubbornClicks(c => c + 1);
      playError();
      return;
    }
    doClose();
  }, [isStubbornClose, stubbornClicks, doClose]);

  const handleCloseHover = useCallback(() => {
    if (!isRunaway) return;
    setCloseOffset({
      x: (Math.random() - 0.5) * 80,
      y: (Math.random() - 0.5) * 40,
    });
  }, [isRunaway]);

  const handleFakeConfirm = useCallback((btn) => {
    if (btn === 'ok') {
      doClose();
    } else {
      setSwappedButtons(s => !s);
      playError();
    }
  }, [doClose]);

  const rotation = (data.seed ?? 0) % 7 - 3;

  return (
    <div
      className={`popup popup--win7 type-${type} ${closing ? 'closing' : ''}`}
      style={{
        left: x,
        top: y,
        zIndex,
        '--popup-rotate': `${rotation}deg`,
      }}
    >
      <div className="popup-titlebar">
        <span>{getTitleForType(type, payload)}</span>
        <button
          ref={closeRef}
          className={`popup-close ${isRunaway ? 'runaway' : ''}`}
          onClick={handleCloseClick}
          onMouseEnter={handleCloseHover}
          style={{
            transform: `translate(${closeOffset.x}px, ${closeOffset.y}px)`,
          }}
          aria-label="Close popup"
        >
          ✕
        </button>
      </div>
      <div className="popup-body">
        {type === 'fakeConfirm' ? (
          <>
            <p>{payload}</p>
            <div className="popup-buttons">
              {swappedButtons ? (
                <>
                  <button className="btn-y2k btn-bounce" onClick={() => handleFakeConfirm('cancel')}>OK</button>
                  <button className="btn-y2k btn-bounce" onClick={() => handleFakeConfirm('ok')}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn-y2k btn-bounce" onClick={() => handleFakeConfirm('ok')}>OK</button>
                  <button className="btn-y2k btn-bounce" onClick={() => handleFakeConfirm('cancel')}>Cancel</button>
                </>
              )}
            </div>
          </>
        ) : type === 'recipe' && payload && typeof payload === 'object' ? (
          <>
            <div className="recipe-popup-hero">
              <span className="recipe-popup-icon" aria-hidden>{payload.icon}</span>
              <strong className="recipe-popup-title">{payload.title}</strong>
            </div>
            <p className="recipe-popup-time">{payload.time}</p>
            <h4 className="recipe-popup-h">🧺 Ingredients</h4>
            <ul className="recipe-popup-list recipe-popup-ingredients">
              {payload.ingredients.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <h4 className="recipe-popup-h">👩‍🍳 Method</h4>
            <ol className="recipe-popup-list recipe-popup-steps">
              {payload.steps.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
            <p className="recipe-popup-foot">{payload.footnote}</p>
          </>
        ) : (
          <>
            {type === 'confetti' && <span style={{ fontSize: 32 }}>🎊</span>}
            {type === 'ad' && <span style={{ fontSize: 11, color: '#00c', textDecoration: 'underline', cursor: 'pointer' }}>Advertisement</span>}
            <p>{payload}</p>
            {type === 'ad' && (
              <button className="btn-y2k btn-bounce blink" onClick={doClose}>
                CLAIM NOW!!!
              </button>
            )}
            {type === 'birthday' && (
              <span style={{ fontSize: 28 }}>🎂🎉🥳</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function getTitleForType(type, payload) {
  switch (type) {
    case 'birthday': return '🎂 Birthday Alert!';
    case 'ad': return '⚠️ Special Offer!';
    case 'confetti': return '🎊 Celebration!';
    case 'system': return '⚙️ System Message';
    case 'fakeConfirm': return '⚠️ Confirm';
    case 'recipe': {
      const t = payload && typeof payload === 'object' && payload.title;
      return t ? `🥗 ${t}` : '🥗 VeggieRecipe.exe';
    }
    default: return 'Message';
  }
}
