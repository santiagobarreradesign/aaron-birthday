import { useState, useEffect, useCallback, useRef } from 'react';
import AaronCharacter from './AaronCharacter';
import PopupGenerator from './PopupGenerator';
import Guestbook from './Guestbook';
import useKonami from './hooks/useKonami';
import { playPopupSpawn, playKonami, isMuted, toggleMute } from './audio';
import { isFirebaseConfigured, trackVisitor, subscribeToVisitorCount } from './firebase';
import {
  AARON_BIRTHDAY,
  MAX_VISIBLE_POPUPS,
  POPUP_SPAWN_THROTTLE_MS,
  MOBILE_SPAWN_THROTTLE_MS,
  BIRTHDAY_MESSAGES,
  AD_MESSAGES,
  SYSTEM_MESSAGES,
  CONFETTI_MESSAGES,
  TITLE_MESSAGES,
  AARON_FACTS,
} from './config';

let popupIdCounter = 0;

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createPopup() {
  const types = ['birthday', 'birthday', 'ad', 'confetti', 'system', 'fakeConfirm'];
  const type = randomPick(types);

  let payload;
  switch (type) {
    case 'birthday': payload = randomPick(BIRTHDAY_MESSAGES); break;
    case 'ad': payload = randomPick(AD_MESSAGES); break;
    case 'system': case 'fakeConfirm': payload = randomPick(SYSTEM_MESSAGES); break;
    case 'confetti': payload = randomPick(CONFETTI_MESSAGES); break;
    default: payload = 'HAPPY BIRTHDAY!!!';
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxW = Math.min(vw * 0.92, 380);

  return {
    id: ++popupIdCounter,
    type,
    x: Math.max(10, Math.min(vw - maxW - 10, Math.random() * (vw - maxW))),
    y: Math.max(40, Math.min(vh - 200, Math.random() * (vh - 250))),
    zIndex: 9000 + popupIdCounter,
    payload,
    seed: Math.floor(Math.random() * 100),
    behaviorFlags: {
      runaway: Math.random() < 0.25,
      stubborn: Math.random() < 0.2,
      spawnsChild: Math.random() < 0.25,
    },
  };
}

// --- Matrix canvas ---
function initMatrix(canvas) {
  if (!canvas) return () => {};
  const ctx = canvas.getContext('2d');
  let animId;
  const fontSize = 14;
  let columns;
  let drops;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / fontSize);
    drops = new Array(columns).fill(1);
  }

  resize();
  window.addEventListener('resize', resize);

  const chars = 'HAPPYBIRTHDAYAARON!🎂🎉✨💫🌟🥳🎈🎊01';

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 51, 0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.25)';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
    animId = requestAnimationFrame(draw);
  }

  draw();
  return () => {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', resize);
  };
}

// --- Countdown ---
function useCountdown(targetISO) {
  const [diff, setDiff] = useState(calcDiff(targetISO));

  useEffect(() => {
    const id = setInterval(() => setDiff(calcDiff(targetISO)), 1000);
    return () => clearInterval(id);
  }, [targetISO]);

  return diff;
}

function calcDiff(targetISO) {
  const now = Date.now();
  const target = new Date(targetISO).getTime();
  const ms = target - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

// --- Decorative stars ---
const STARS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  emoji: ['✨', '⭐', '💫', '🌟', '✦', '★'][i % 6],
  top: `${Math.random() * 90}vh`,
  left: `${Math.random() * 95}vw`,
  size: 16 + Math.random() * 20,
  speed: 4 + Math.random() * 8,
}));

function FactsTicker() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % AARON_FACTS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="facts-ticker" onClick={(e) => e.stopPropagation()}>
      <span className="ticker-label">📋 AARON FACT:</span>
      <span className="ticker-text">{AARON_FACTS[idx]}</span>
    </div>
  );
}

export default function App() {
  const [popups, setPopups] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [muted, setMuted] = useState(isMuted);
  const [konamiActive, setKonamiActive] = useState(false);
  const [confettiBurst, setConfettiBurst] = useState([]);
  const [shaking, setShaking] = useState(false);

  const lastSpawnTime = useRef(0);
  const canvasRef = useRef(null);
  const isMobile = useRef(window.matchMedia('(max-width: 640px)').matches);

  const countdown = useCountdown(AARON_BIRTHDAY);

  // Matrix background
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    return initMatrix(canvasRef.current);
  }, []);

  // Title roulette
  useEffect(() => {
    const id = setInterval(() => {
      document.title = randomPick(TITLE_MESSAGES);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Flush pending queue when a popup slot opens
  useEffect(() => {
    if (popups.length < MAX_VISIBLE_POPUPS && pendingQueue.length > 0) {
      const [next, ...rest] = pendingQueue;
      setPendingQueue(rest);
      setPopups(prev => [...prev, next]);
    }
  }, [popups.length, pendingQueue]);

  // Escape to close topmost
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') {
        setPopups(prev => {
          if (prev.length === 0) return prev;
          return prev.slice(0, -1);
        });
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  const enqueuePopup = useCallback(() => {
    const now = Date.now();
    const throttle = isMobile.current ? MOBILE_SPAWN_THROTTLE_MS : POPUP_SPAWN_THROTTLE_MS;
    if (now - lastSpawnTime.current < throttle) return;
    lastSpawnTime.current = now;

    const p = createPopup();
    playPopupSpawn();
    triggerShake();

    setPopups(prev => {
      if (prev.length >= MAX_VISIBLE_POPUPS) {
        setPendingQueue(q => [...q, p]);
        return prev;
      }
      return [...prev, p];
    });
  }, [triggerShake]);

  const handleClosePopup = useCallback((id) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleSpawnChild = useCallback(() => {
    const child = createPopup();
    child.payload = randomPick([
      "YOU CAN'T ESCAPE!!!",
      "NICE TRY!!! Here's another one!",
      "Closing popups spawns MORE popups!",
      "ERROR: Cannot close birthday fun!",
    ]);
    child.type = 'system';
    child.behaviorFlags = { runaway: false, stubborn: false, spawnsChild: false };

    setPopups(prev => {
      if (prev.length >= MAX_VISIBLE_POPUPS) {
        setPendingQueue(q => [...q, child]);
        return prev;
      }
      return [...prev, child];
    });
  }, []);

  // Global click → spawn popup
  useEffect(() => {
    function handler(e) {
      if (e.target.closest('.guestbook') || e.target.closest('.mute-btn') || e.target.closest('.popup')) return;
      enqueuePopup();
    }
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [enqueuePopup]);

  // Scroll → spawn popup (throttled)
  useEffect(() => {
    function handler() {
      enqueuePopup();
    }
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [enqueuePopup]);

  // Konami
  const triggerConfettiBurst = useCallback(() => {
    const pieces = Array.from({ length: 60 }, (_, i) => ({
      id: Date.now() + i,
      x: `${Math.random() * 100}%`,
      color: randomPick(['var(--lime)', 'var(--hotpink)', 'var(--electric)', 'var(--yellow)', 'var(--orange)', 'var(--purple)']),
      duration: 2 + Math.random() * 2,
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 10,
    }));
    setConfettiBurst(pieces);
    setTimeout(() => setConfettiBurst([]), 5000);
  }, []);

  useKonami(useCallback(() => {
    setKonamiActive(true);
    playKonami();
    triggerConfettiBurst();
    setTimeout(() => setKonamiActive(false), 1000);
    for (let i = 0; i < 5; i++) {
      setTimeout(() => enqueuePopup(), i * 200);
    }
  }, [enqueuePopup, triggerConfettiBurst]));

  const handleMuteToggle = useCallback((e) => {
    e.stopPropagation();
    setMuted(toggleMute());
  }, []);

  const [visitorCount, setVisitorCount] = useState(null);
  const fallbackCount = useRef(
    Math.floor(Math.random() * 50000) + 10000
  ).current;

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    trackVisitor().then((c) => { if (c) setVisitorCount(c); });
    return subscribeToVisitorCount(setVisitorCount);
  }, []);

  return (
    <>
      <canvas id="matrix-canvas" ref={canvasRef} />

      {STARS.map(s => (
        <span
          key={s.id}
          className="deco-star"
          style={{
            '--star-top': s.top,
            '--star-left': s.left,
            '--star-size': `${s.size}px`,
            '--star-speed': `${s.speed}s`,
          }}
        >
          {s.emoji}
        </span>
      ))}

      <div className={`app-wrapper ${shaking ? '' : ''}`}>
        {shaking && <style>{`body { animation: pageShake 0.3s ease-in-out; }`}</style>}

        <header className="site-header">
          <h1>
            <span className="wobble">🎂</span>{' '}
            HAPPY BIRTHDAY AARON{' '}
            <span className="wobble">🎂</span>
          </h1>
          <p className="subtitle blink">
            ★ MOTION DESIGNER ★ CODER ★ BIOLOGY MAJOR ★ TIM HORTONS ALUMNUS ★
          </p>
        </header>

        <FactsTicker />

        {countdown ? (
          <div className="countdown-box">
            <h2 className="neon">⏰ COUNTDOWN TO THE BIG DAY ⏰</h2>
            <div className="countdown-digits">
              <div className="countdown-unit">
                <span className="number">{String(countdown.days).padStart(2, '0')}</span>
                <span className="label">Days</span>
              </div>
              <div className="countdown-unit">
                <span className="number">{String(countdown.hours).padStart(2, '0')}</span>
                <span className="label">Hours</span>
              </div>
              <div className="countdown-unit">
                <span className="number">{String(countdown.minutes).padStart(2, '0')}</span>
                <span className="label">Min</span>
              </div>
              <div className="countdown-unit">
                <span className="number">{String(countdown.seconds).padStart(2, '0')}</span>
                <span className="label">Sec</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="countdown-box">
            <p className="countdown-passed rainbow">
              🎉 IT&apos;S AARON&apos;S BIRTHDAY!!! 🎉
            </p>
          </div>
        )}

        <div className="main-content">
          <Guestbook />
        </div>

        <AaronCharacter
          popupCount={popups.length}
          onInteraction={enqueuePopup}
        />

        <div className="visitor-counter">
          You are visitor #{(visitorCount ?? fallbackCount).toLocaleString()}!
          <br />
          <span style={{ fontSize: 8 }}>
            (this site best viewed in Netscape Navigator 4.0 | NOT approved by The Workhouse Inc.)
          </span>
          <br />
          <span style={{ fontSize: 8 }}>
            Aaron&apos;s real portfolio: <a href="https://aaronvince.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--electric)', textDecoration: 'underline' }}>aaronvince.com</a> (it&apos;s way better than this)
          </span>
        </div>
      </div>

      <PopupGenerator
        popups={popups}
        onClose={handleClosePopup}
        onSpawnChild={handleSpawnChild}
      />

      <button
        className={`mute-btn ${muted ? 'muted' : ''}`}
        onClick={handleMuteToggle}
        title={muted ? 'Unmute' : 'Mute'}
        aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      {konamiActive && <div className="konami-flash" />}

      {confettiBurst.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            '--fall-x': piece.x,
            '--fall-duration': `${piece.duration}s`,
            '--fall-delay': `${piece.delay}s`,
            width: piece.size,
            height: piece.size,
            background: piece.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </>
  );
}
