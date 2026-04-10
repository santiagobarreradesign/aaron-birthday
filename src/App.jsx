import { useState, useEffect, useCallback, useRef } from 'react';
import AaronCharacter from './AaronCharacter';
import PopupGenerator from './PopupGenerator';
import Guestbook from './Guestbook';
import DesktopIcons from './DesktopIcons';
import BookOfMemories from './BookOfMemories';
import StageGifts from './StageGifts';
import useKonami from './hooks/useKonami';
import { playPopupSpawn, playKonami, isMuted, toggleMute } from './audio';
import { isFirebaseConfigured, trackVisitor, subscribeToVisitorCount } from './firebase';
import {
  MAX_VISIBLE_POPUPS,
  POPUP_SPAWN_THROTTLE_MS,
  MOBILE_SPAWN_THROTTLE_MS,
  BIRTHDAY_MESSAGES,
  AD_MESSAGES,
  SYSTEM_MESSAGES,
  CONFETTI_MESSAGES,
  TITLE_MESSAGES,
  ALL_TICKER_FACTS,
  DESKTOP_PROXIMITY,
  HOTSPOT_PRIORITY,
  STAGE_GIFTS,
  HOTSPOT_AARON_REACTIONS,
} from './config';

let popupIdCounter = 0;

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
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

// --- Decorative stars ---
const STARS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  emoji: ['✨', '⭐', '💫', '🌟', '✦', '★'][i % 6],
  top: `${Math.random() * 90}vh`,
  left: `${Math.random() * 95}vw`,
  size: 16 + Math.random() * 20,
  speed: 4 + Math.random() * 8,
}));

function TaskbarClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <time className="taskbar-clock" dateTime={t.toISOString()}>
      {t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
    </time>
  );
}

function FactsTicker() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % ALL_TICKER_FACTS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="facts-ticker glass-panel" onClick={(e) => e.stopPropagation()}>
      <span className="ticker-label">📋 FUN FACT:</span>
      <span className="ticker-text">{ALL_TICKER_FACTS[idx]}</span>
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
  const suppressSpamRef = useRef(
    typeof localStorage !== 'undefined' && localStorage.getItem('aaron-suppressSpamPopups') === '1',
  );
  const [suppressSpamPopups, setSuppressSpamPopups] = useState(() => suppressSpamRef.current);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const memoriesOpenRef = useRef(false);
  useEffect(() => {
    memoriesOpenRef.current = memoriesOpen;
  }, [memoriesOpen]);

  const [startOrbFlash, setStartOrbFlash] = useState(false);
  const startOrbFlashTimerRef = useRef(null);

  const triggerStartOrbFlash = useCallback(() => {
    if (startOrbFlashTimerRef.current) clearTimeout(startOrbFlashTimerRef.current);
    setStartOrbFlash(true);
    startOrbFlashTimerRef.current = setTimeout(() => {
      setStartOrbFlash(false);
      startOrbFlashTimerRef.current = null;
    }, 500);
  }, []);

  useEffect(
    () => () => {
      if (startOrbFlashTimerRef.current) clearTimeout(startOrbFlashTimerRef.current);
    },
    [],
  );

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

  // Escape to close topmost (skip while Book of Memories is open — gallery handles Escape)
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') {
        if (memoriesOpenRef.current) return;
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
    if (suppressSpamRef.current) return;
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
      if (
        e.target.closest('.guestbook')
        || e.target.closest('.mute-btn')
        || e.target.closest('.popup')
        || e.target.closest('.win7-taskbar')
        || e.target.closest('.desktop-icon')
        || e.target.closest('.facts-ticker')
        || e.target.closest('.desktop-toast')
        || e.target.closest('.desktop-hotspot')
        || e.target.closest('.scene-prop')
        || e.target.closest('.stage-gifts-floating-root')
        || e.target.closest('.stage-gift-float')
        || e.target.closest('.spam-calm-btn')
        || e.target.closest('.mem07-backdrop')
      ) return;
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

  const handleToggleSpamCalm = useCallback((e) => {
    e.stopPropagation();
    suppressSpamRef.current = !suppressSpamRef.current;
    localStorage.setItem('aaron-suppressSpamPopups', suppressSpamRef.current ? '1' : '0');
    setSuppressSpamPopups(suppressSpamRef.current);
  }, []);

  const [visitorCount, setVisitorCount] = useState(null);
  const fallbackCount = useRef(
    Math.floor(Math.random() * 50000) + 10000
  ).current;

  const guestbookRef = useRef(null);
  const hotspotRefs = useRef({
    portfolio: null,
    memories: null,
    recipes: null,
    guestbook: null,
    plant: null,
    oatly: null,
    motion: null,
    turntable: null,
    pickleJar: null,
    stovetop: null,
    cocktailBar: null,
  });
  const lastCharSample = useRef(0);
  const prevHotspotId = useRef(null);
  const [charBounds, setCharBounds] = useState(null);
  const [desktopToast, setDesktopToast] = useState(null);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [giftDelivery, setGiftDelivery] = useState(null);

  const handleFloatDeliver = useCallback((id) => {
    const gift = STAGE_GIFTS.find((g) => g.id === id);
    if (gift) {
      const line = gift.lines[Math.floor(Math.random() * gift.lines.length)];
      setGiftDelivery({
        key: Date.now(),
        id: gift.id,
        line,
      });
      return;
    }
    const spec = HOTSPOT_AARON_REACTIONS[id];
    if (!spec) return;
    const line = spec.lines[Math.floor(Math.random() * spec.lines.length)];
    setGiftDelivery({
      key: Date.now(),
      id,
      line,
      scene: spec.scene,
      part: spec.part,
    });
  }, []);

  const spawnSystemPopup = useCallback((payload) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(vw * 0.92, 380);
    const p = {
      id: ++popupIdCounter,
      type: 'system',
      x: Math.max(10, Math.min(vw - maxW - 10, Math.random() * (vw - maxW))),
      y: Math.max(40, Math.min(vh - 200, Math.random() * (vh - 250))),
      zIndex: 9000 + popupIdCounter,
      payload,
      seed: Math.floor(Math.random() * 100),
      behaviorFlags: { runaway: false, stubborn: false, spawnsChild: false },
    };
    playPopupSpawn();
    triggerShake();
    setPopups((prev) => {
      if (prev.length >= MAX_VISIBLE_POPUPS) {
        setPendingQueue((q) => [...q, p]);
        return prev;
      }
      return [...prev, p];
    });
  }, [triggerShake]);

  /** Veggie Recipes desktop icon — full absurd recipe card */
  const spawnRecipePopup = useCallback((recipe) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(vw * 0.94, 460);
    const p = {
      id: ++popupIdCounter,
      type: 'recipe',
      x: Math.max(8, Math.min(vw - maxW - 8, Math.random() * Math.max(1, vw - maxW - 16))),
      y: Math.max(24, Math.min(vh - 420, Math.random() * Math.max(1, vh - 480))),
      zIndex: 9000 + popupIdCounter,
      payload: recipe,
      seed: Math.floor(Math.random() * 100),
      behaviorFlags: { runaway: false, stubborn: false, spawnsChild: false },
    };
    playPopupSpawn();
    triggerShake();
    setPopups((prev) => {
      if (prev.length >= MAX_VISIBLE_POPUPS) {
        setPendingQueue((q) => [...q, p]);
        return prev;
      }
      return [...prev, p];
    });
  }, [triggerShake]);

  const handleCharPosition = useCallback((bounds) => {
    const t = Date.now();
    if (t - lastCharSample.current < 120) return;
    lastCharSample.current = t;
    setCharBounds(bounds);
  }, []);

  useEffect(() => {
    if (!charBounds) {
      setActiveHotspot(null);
      prevHotspotId.current = null;
      return;
    }
    const cr = {
      left: charBounds.x,
      top: charBounds.y,
      right: charBounds.x + charBounds.w,
      bottom: charBounds.y + charBounds.h,
    };
    let found = null;
    for (const id of HOTSPOT_PRIORITY) {
      const el = hotspotRefs.current[id];
      if (!el) continue;
      const ir = el.getBoundingClientRect();
      const br = {
        left: ir.left,
        top: ir.top,
        right: ir.right,
        bottom: ir.bottom,
      };
      if (rectsOverlap(cr, br)) {
        found = id;
        break;
      }
    }
    setActiveHotspot(found);
    if (found !== prevHotspotId.current) {
      prevHotspotId.current = found;
      if (found) {
        const lines = DESKTOP_PROXIMITY[found];
        if (lines?.length) {
          setDesktopToast(randomPick(lines));
          setTimeout(() => setDesktopToast(null), 3500);
        }
      }
    }
  }, [charBounds]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    trackVisitor().then((c) => { if (c) setVisitorCount(c); });
    return subscribeToVisitorCount(setVisitorCount);
  }, []);

  return (
    <>
      <div className="aurora-bg" aria-hidden />
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

      <div className={`app-wrapper desktop-shell ${shaking ? '' : ''}`}>
        {shaking && <style>{`body { animation: pageShake 0.3s ease-in-out; }`}</style>}

        <DesktopIcons
          iconRefs={hotspotRefs}
          onOpenPortfolio={() => {
            window.open('https://aaronvince.com', '_blank', 'noopener,noreferrer');
          }}
          onOpenMemories={() => {
            playPopupSpawn();
            setMemoriesOpen(true);
          }}
          onVeggieRecipes={(recipe) => spawnRecipePopup(recipe)}
          onGuestbookFocus={() => {
            guestbookRef.current?.expand?.();
            guestbookRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          }}
        />

        {desktopToast && (
          <div className="desktop-toast" role="status">
            {desktopToast}
          </div>
        )}

        <header className="site-header glass-panel">
          <h1>
            <span className="wobble">🎂</span>{' '}
            HAPPY BIRTHDAY AARON{' '}
            <span className="wobble">🎂</span>
          </h1>
          <p className="subtitle blink">
            ★ MOTION DESIGNER ★ CODER ★ BIOLOGY MAJOR ★ VEGETARIAN ★
          </p>
        </header>

        <FactsTicker />

        <p className="stage-gifts-inline-hint glass-panel">
          Drag or touch-drag any icon from the row to Aaron — or walk him over an icon. He reacts, holds it, then
          tosses it when he feels like it.
        </p>

        <StageGifts charBounds={charBounds} onDeliver={handleFloatDeliver} />

        <div className="main-content">
          <Guestbook ref={guestbookRef} />
        </div>

        <AaronCharacter
          popupCount={popups.length}
          onInteraction={enqueuePopup}
          onPositionChange={handleCharPosition}
          activeHotspot={activeHotspot}
          giftDelivery={giftDelivery}
        />

        <div className="visitor-counter glass-panel">
          You are visitor #{(visitorCount ?? fallbackCount).toLocaleString()}!
          <br />
          <span style={{ fontSize: 8 }}>
            (this site best viewed in Netscape Navigator 4.0 | résumé includes mail routes & motion graphics)
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

      <BookOfMemories open={memoriesOpen} onClose={() => setMemoriesOpen(false)} />

      <nav className="win7-taskbar" aria-label="Taskbar">
        <button
          type="button"
          className="start-orb"
          onClick={(e) => {
            e.stopPropagation();
            playPopupSpawn();
            triggerStartOrbFlash();
            setDesktopToast('Windows 7 aesthetic. Windows 11 anxiety.');
            setTimeout(() => setDesktopToast(null), 2800);
          }}
          aria-label="Start"
        />
        <div className="taskbar-apps" aria-hidden />
        <div className="taskbar-tray">
          <button
            type="button"
            className={`spam-calm-btn spam-calm-btn--tray ${suppressSpamPopups ? 'active' : ''}`}
            onClick={handleToggleSpamCalm}
            title={
              suppressSpamPopups
                ? 'Turn chaos back on (random popups from clicks & scroll)'
                : 'Calm mode: stop random popups — Aaron still talks & animalese plays'
            }
            aria-label={
              suppressSpamPopups ? 'Disable calm popup mode' : 'Enable calm mode: fewer random popups'
            }
            aria-pressed={suppressSpamPopups}
          >
            {suppressSpamPopups ? '🧘 Calm' : '⚡ Chaos'}
          </button>
          <button
            type="button"
            className={`mute-btn mute-btn--tray ${muted ? 'muted' : ''}`}
            onClick={handleMuteToggle}
            title={muted ? 'Unmute' : 'Mute'}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <TaskbarClock />
        </div>
      </nav>

      {startOrbFlash && (
        <div className="start-orb-flash" aria-hidden>
          <img
            src={`${import.meta.env.BASE_URL}crazy-aaron.png`}
            alt=""
            className="start-orb-flash__img"
            draggable={false}
          />
        </div>
      )}

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
