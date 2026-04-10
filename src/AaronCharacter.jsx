import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { SPEECH_BUBBLE_MESSAGES, HOTSPOT_AARON_REACTIONS, DRAG_ITEM_EMOJI } from './config';
import { playHeadClick, playArmClick, playLegClick, playBubbleSpeech, stopBubbleSpeech, preloadAnimalese } from './audio';

const WALK_SPEED = 1.2;
const IDLE_MIN = 1500;
const IDLE_MAX = 4000;

/** Stick-figure layout (viewBox 0 0 80 120) — head is full PNG (no clip/mask) */
const HC = 40;
const NECK_Y = 50;
/** Portrait box: preserveAspectRatio meet = entire cutout visible */
const FACE_W = 38;
const FACE_H = 48;
const FACE_X = HC - FACE_W / 2;
const FACE_Y = NECK_Y - FACE_H;
const HIP_Y = 76;
const SHOULDER_Y = 58;
const HAND_Y = 70;

const INTERACT_MESSAGES = [
  "This layout is TERRIBLE. I love it.",
  "*adjusts party hat like a pro designer*",
  "Somebody get me an oat latte 🥛✨",
  "I'm walking here!! (Toronto energy)",
  "Birthday stroll down Lansdowne Ave~",
  "Wheee! More fun than delivering mail!",
  "Don't mind me, just a designer who codes...",
  "This site needs more keyframes honestly",
  "🎂 BIRTHDAY BOY COMING THROUGH 🎂",
  "Anyone got oat milk? Asking for myself.",
  "Back when I studied bio I never had THIS many popups",
  "My York professors would NOT approve of this site",
  "My portfolio site would never ship this lol",
  "*critiques own birthday website's typography*",
  "Plants > drama. This is FACT.",
  "More motion design than a Pearson terminal screen!",
  "I went from dissecting frogs to dissecting Figma files",
  "This font? Comic Sans? *chef's kiss* ...wait no",
  "Fun fact: The hamburger menu icon was invented in 1981",
  "Who decided 'center div' should be this hard??",
  "I should be animating rn not walking around",
  "Did you know 'lorem ipsum' is from a Cicero text from 45 BC?",
  "*notices bad kerning* ...I can't unsee it now",
  "Vegetarian cake and motion graphics. Name a better duo. I'll wait.",
  "Walk near the pickle jar — I dare you.",
  "The cocktail illustrations are vector — unlike my sleep schedule.",
];

const PUPPET_DRAG_QUIPS = [
  '🎭 Puppet mode! Who’s pulling the strings?!',
  'Wheee — this is NOT in the design brief!',
  'I’m a designer, not a marionette! …okay maybe today I am.',
  '*limbs go floppy on purpose*',
  'Toronto transit has NOTHING on this ride.',
  'Put me down and I’ll kern your birthday card!',
];

const DRAG_CLICK_MAX_PX = 10;

const CHAR_W = 120;
const CHAR_H = 180;

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function AaronCharacter({
  popupCount,
  onInteraction,
  onPositionChange,
  activeHotspot,
  giftDelivery,
}) {
  const fid = useId().replace(/:/g, '');
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth / 2 - 60,
    y: window.innerHeight - 260,
  }));
  const [target, setTarget] = useState(null);
  const [facingLeft, setFacingLeft] = useState(false);
  const [walkPhase, setWalkPhase] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [headAnim, setHeadAnim] = useState(false);
  const [armAnim, setArmAnim] = useState(false);
  const [legAnim, setLegAnim] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [bubbleMsg, setBubbleMsg] = useState(null);
  /** Layered props: flying pickle, stovetop steam, cocktail toast (see HOTSPOT_AARON_REACTIONS.scene) */
  const [scenePlay, setScenePlay] = useState(null);
  /** Random idle “VAMONOS” — big red head + yell */
  const [vamonosActive, setVamonosActive] = useState(false);
  const vamonosCooldown = useRef(0);
  /** Random idle body animation after reaching a roam target (visual only). */
  const [idlePlay, setIdlePlay] = useState(null);

  /** Drag-to-Aaron gifts: held in hand until Drop / YEET */
  const [heldItem, setHeldItem] = useState(null);
  const roamRef = useRef(null);
  const armRef = useRef({ rx: 58, ry: 70, fl: false });
  const flightRef = useRef(null);
  const flightRafRef = useRef(null);
  const [flightTick, setFlightTick] = useState(0);
  const throwDecideTimerRef = useRef(null);

  const dragOffset = useRef({ x: 0, y: 0 });
  /** Unified pointer: small movement = part click, larger = puppet drag */
  const pointerSession = useRef(null);
  const bubbleTimer = useRef(null);
  const animFrame = useRef(null);
  const idleTimeout = useRef(null);
  const posRef = useRef(pos);
  const targetRef = useRef(target);
  const draggingRef = useRef(false);

  posRef.current = pos;
  targetRef.current = target;
  draggingRef.current = dragging;

  useEffect(() => {
    onPositionChange?.({ x: pos.x, y: pos.y, w: CHAR_W, h: CHAR_H });
  }, [pos, onPositionChange]);

  const isTired = interactionCount >= 8;

  const expression = popupCount <= 2 ? 'happy'
    : popupCount <= 5 ? 'stressed'
    : 'overwhelmed';

  const faceHref = `${import.meta.env.BASE_URL}aaron-face.png`;

  let moodFilter = '';
  if (vamonosActive) moodFilter = `url(#${fid}-filt-vamonos)`;
  else if (isTired) moodFilter = `url(#${fid}-filt-tired)`;
  else if (expression === 'overwhelmed') moodFilter = `url(#${fid}-filt-panic)`;
  else if (expression === 'stressed') moodFilter = `url(#${fid}-filt-stress)`;
  else moodFilter = `url(#${fid}-filt-party)`;

  const showBubble = useCallback((msg) => {
    const text = msg ?? SPEECH_BUBBLE_MESSAGES[Math.floor(Math.random() * SPEECH_BUBBLE_MESSAGES.length)];
    setBubbleMsg(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubbleMsg(null), 3000);
  }, []);

  const triggerVamonos = useCallback(() => {
    clearTimeout(bubbleTimer.current);
    setBubbleMsg('VAMONOS!!!');
    setVamonosActive(true);
    playHeadClick();
    bubbleTimer.current = setTimeout(() => {
      setBubbleMsg(null);
      setVamonosActive(false);
    }, 2800);
  }, []);

  const pickNewTarget = useCallback(() => {
    const margin = 80;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tx = margin + Math.random() * (vw - margin * 2 - 120);
    const ty = vh * 0.3 + Math.random() * (vh * 0.55 - margin);
    setTarget({ x: tx, y: ty });
  }, []);

  useEffect(() => {
    let running = true;

    function step() {
      if (!running) return;

      const cur = posRef.current;
      const tgt = targetRef.current;

      if (draggingRef.current || !tgt) {
        setIsWalking(false);
        animFrame.current = requestAnimationFrame(step);
        return;
      }

      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        setIsWalking(false);
        setTarget(null);
        const idleTime = IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN);

        const now = Date.now();
        if (now - vamonosCooldown.current > 11000 && Math.random() < 0.12) {
          vamonosCooldown.current = now;
          triggerVamonos();
        } else if (Math.random() < 0.38) {
          showBubble(INTERACT_MESSAGES[Math.floor(Math.random() * INTERACT_MESSAGES.length)]);
        } else {
          const r = Math.random();
          if (r < 0.08) {
            setIdlePlay('dance');
            setTimeout(() => setIdlePlay(null), 2400);
          } else if (r < 0.14) {
            setIdlePlay('slump');
            setTimeout(() => setIdlePlay(null), 2100);
          }
        }

        idleTimeout.current = setTimeout(() => {
          if (running && !draggingRef.current) pickNewTarget();
        }, idleTime);

        animFrame.current = requestAnimationFrame(step);
        return;
      }

      const speed = isTired ? WALK_SPEED * 0.6 : WALK_SPEED;
      const vx = (dx / dist) * speed;
      const vy = (dy / dist) * speed;

      setFacingLeft(vx < 0);
      setIsWalking(true);
      setWalkPhase(p => p + 1);
      setPos(prev => ({ x: prev.x + vx, y: prev.y + vy }));

      animFrame.current = requestAnimationFrame(step);
    }

    const startDelay = setTimeout(() => {
      pickNewTarget();
      animFrame.current = requestAnimationFrame(step);
    }, 1000);

    return () => {
      running = false;
      cancelAnimationFrame(animFrame.current);
      clearTimeout(idleTimeout.current);
      clearTimeout(startDelay);
    };
  }, [pickNewTarget, showBubble, isTired, triggerVamonos]);

  useEffect(() => {
    if (popupCount > 0) {
      showBubble(SPEECH_BUBBLE_MESSAGES[popupCount % SPEECH_BUBBLE_MESSAGES.length]);
    }
  }, [popupCount, showBubble]);

  useEffect(() => {
    preloadAnimalese();
  }, []);

  useEffect(() => {
    if (!bubbleMsg) {
      stopBubbleSpeech();
      return;
    }
    playBubbleSpeech(bubbleMsg);
    return () => {
      stopBubbleSpeech();
    };
  }, [bubbleMsg]);

  useEffect(() => {
    if (idlePlay !== 'dance') return;
    setArmAnim(true);
    setLegAnim(true);
    const t = window.setTimeout(() => {
      setArmAnim(false);
      setLegAnim(false);
    }, 2200);
    return () => clearTimeout(t);
  }, [idlePlay]);

  const lastHotspotReaction = useRef(null);
  useEffect(() => {
    if (!activeHotspot) {
      lastHotspotReaction.current = null;
      return;
    }
    if (activeHotspot === lastHotspotReaction.current) return;
    lastHotspotReaction.current = activeHotspot;
    const spec = HOTSPOT_AARON_REACTIONS[activeHotspot];
    if (!spec) return;
    const msg = randomPick(spec.lines);
    showBubble(msg);

    let sceneTid;
    if (spec.scene) {
      setScenePlay(spec.scene);
      sceneTid = setTimeout(() => setScenePlay(null), 3000);
    }

    const part = spec.part;
    if (part === 'head') {
      setHeadAnim(true);
      playHeadClick();
      setTimeout(() => setHeadAnim(false), 700);
    } else if (part === 'arms') {
      setArmAnim(true);
      playArmClick();
      setTimeout(() => setArmAnim(false), 1000);
    } else if (part === 'legs') {
      setLegAnim(true);
      playLegClick();
      setTimeout(() => setLegAnim(false), 1200);
    }

    return () => {
      if (sceneTid) clearTimeout(sceneTid);
    };
  }, [activeHotspot, showBubble]);

  useEffect(() => {
    if (!giftDelivery?.key) return;

    clearTimeout(bubbleTimer.current);
    setBubbleMsg(giftDelivery.line);
    bubbleTimer.current = setTimeout(() => setBubbleMsg(null), 4200);

    setHeldItem({ id: giftDelivery.id });

    let sceneTid;
    if (giftDelivery.scene) {
      setScenePlay(giftDelivery.scene);
      sceneTid = setTimeout(() => setScenePlay(null), 3000);
    }

    const part = giftDelivery.part ?? 'arms';
    let partTid;
    if (part === 'head') {
      setHeadAnim(true);
      playHeadClick();
      partTid = setTimeout(() => setHeadAnim(false), 700);
    } else if (part === 'arms') {
      setArmAnim(true);
      playArmClick();
      partTid = setTimeout(() => setArmAnim(false), 1000);
    } else if (part === 'legs') {
      setLegAnim(true);
      playLegClick();
      partTid = setTimeout(() => setLegAnim(false), 1200);
    }

    onInteraction?.();

    return () => {
      if (sceneTid) clearTimeout(sceneTid);
      if (partTid) clearTimeout(partTid);
    };
  }, [giftDelivery, onInteraction]);

  const stopFlightLoop = useCallback(() => {
    if (flightRafRef.current) {
      cancelAnimationFrame(flightRafRef.current);
      flightRafRef.current = null;
    }
    flightRef.current = null;
    setFlightTick((n) => n + 1);
  }, []);

  const releaseRandomThrow = useCallback(() => {
    if (!heldItem || !roamRef.current) return;
    const { rx, ry, fl } = armRef.current;
    const rect = roamRef.current.getBoundingClientRect();
    const PX = 120 / 80;
    const hx = fl ? 120 - rx * PX : rx * PX;
    const hy = ry * PX;
    const x0 = rect.left + hx;
    const y0 = rect.top + hy;
    const itemId = heldItem.id;
    setHeldItem(null);
    if (throwDecideTimerRef.current) {
      clearTimeout(throwDecideTimerRef.current);
      throwDecideTimerRef.current = null;
    }
    stopFlightLoop();
    playArmClick();
    const angle = Math.random() * Math.PI * 2;
    const speed = 7 + Math.random() * 18;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    flightRef.current = {
      x: x0,
      y: y0,
      vx,
      vy,
      rot: 0,
      itemId,
    };
    setFlightTick((n) => n + 1);
    const loop = () => {
      const f = flightRef.current;
      if (!f) return;
      f.vy += 0.58;
      f.x += f.vx;
      f.y += f.vy;
      f.vx *= 0.997;
      f.rot = (f.rot || 0) + f.vx * 0.28;
      setFlightTick((n) => n + 1);
      if (f.y < window.innerHeight + 140 && f.x > -120 && f.x < window.innerWidth + 120) {
        flightRafRef.current = requestAnimationFrame(loop);
      } else {
        flightRef.current = null;
        setFlightTick((n) => n + 1);
      }
    };
    flightRafRef.current = requestAnimationFrame(loop);
  }, [heldItem, stopFlightLoop]);

  useEffect(() => {
    if (!heldItem) {
      if (throwDecideTimerRef.current) {
        clearTimeout(throwDecideTimerRef.current);
        throwDecideTimerRef.current = null;
      }
      return;
    }
    const delay = 1600 + Math.random() * 4200;
    throwDecideTimerRef.current = setTimeout(() => {
      releaseRandomThrow();
    }, delay);
    return () => {
      if (throwDecideTimerRef.current) clearTimeout(throwDecideTimerRef.current);
    };
  }, [heldItem?.id, releaseRandomThrow]);

  useEffect(() => () => {
    stopFlightLoop();
  }, [stopFlightLoop]);

  const handlePartClick = useCallback((part, e) => {
    e?.stopPropagation?.();
    setInteractionCount(c => c + 1);
    onInteraction?.();

    const headQuips = [
      "Hey! That's my face!",
      "My head contains a Biology AND Design degree",
      "Careful, there's vegetarian braincell knowledge in there",
      "That's where the kerning expertise lives",
      "Ow! I need this brain for After Effects!",
    ];
    const armQuips = [
      "*waves excitedly*",
      "*waves like I'm flagging down oat lattes*",
      "These arms animated the MaRS branding!",
      "Jazz hands! I learned this at York!",
      "*waves at my real portfolio from this terrible website*",
    ];
    const legQuips = [
      "*dances aggressively*",
      "*does the designer shuffle*",
      "These legs delivered mail for Canada Post!",
      "I need these legs to walk to the bakery (egg-free options please)",
      "*breakdances in Comic Sans*",
    ];

    if (part === 'head') {
      setHeadAnim(true);
      playHeadClick();
      showBubble(headQuips[Math.floor(Math.random() * headQuips.length)]);
      setTimeout(() => setHeadAnim(false), 700);
    } else if (part === 'arms') {
      setArmAnim(true);
      playArmClick();
      showBubble(armQuips[Math.floor(Math.random() * armQuips.length)]);
      setTimeout(() => setArmAnim(false), 1000);
    } else if (part === 'legs') {
      setLegAnim(true);
      playLegClick();
      showBubble(legQuips[Math.floor(Math.random() * legQuips.length)]);
      setTimeout(() => setLegAnim(false), 1200);
    }
  }, [onInteraction, showBubble]);

  const endPointer = useCallback((e) => {
    const s = pointerSession.current;
    if (!s) return;
    pointerSession.current = null;
    try {
      e?.currentTarget?.releasePointerCapture?.(s.pointerId);
    } catch { /* ignore */ }

    if (draggingRef.current) {
      draggingRef.current = false;
      setDragging(false);
      setTimeout(() => pickNewTarget(), 700);
      return;
    }

    const dx = (e?.clientX ?? s.sx) - s.sx;
    const dy = (e?.clientY ?? s.sy) - s.sy;
    if (dx * dx + dy * dy <= DRAG_CLICK_MAX_PX * DRAG_CLICK_MAX_PX && s.part) {
      handlePartClick(s.part, e);
    }
  }, [handlePartClick, pickNewTarget]);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const partEl = e.target.closest('[data-part]');
    const part = partEl?.getAttribute('data-part') ?? null;
    pointerSession.current = {
      sx: e.clientX,
      sy: e.clientY,
      part,
      pointerId: e.pointerId,
    };
    clearTimeout(idleTimeout.current);
    setTarget(null);
    dragOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    const s = pointerSession.current;
    if (!s) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    if (!draggingRef.current && dx * dx + dy * dy > DRAG_CLICK_MAX_PX * DRAG_CLICK_MAX_PX) {
      draggingRef.current = true;
      setDragging(true);
      clearTimeout(idleTimeout.current);
      setTarget(null);
      showBubble(randomPick(PUPPET_DRAG_QUIPS));
    }
    if (draggingRef.current) {
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    }
  }, [showBubble]);

  const onPointerUp = useCallback((e) => {
    endPointer(e);
  }, [endPointer]);

  const onPointerCancel = useCallback((e) => {
    endPointer(e);
  }, [endPointer]);

  const legCycle = walkPhase % 30;
  const phase = (legCycle / 30) * Math.PI * 2;
  const leftLegAngle = isWalking ? Math.sin(phase) * 25 : 0;
  const rightLegAngle = isWalking ? Math.sin(phase + Math.PI) * 25 : 0;
  const leftArmSwing = isWalking ? Math.sin(phase + Math.PI) * 15 : 0;
  const rightArmSwing = isWalking ? Math.sin(phase) * 15 : 0;
  const bodyBob = isWalking ? Math.abs(Math.sin(phase)) * 2 : 0;

  const lLegX = 36 + Math.sin(leftLegAngle * Math.PI / 180) * 14;
  const lLegY = HIP_Y + Math.cos(leftLegAngle * Math.PI / 180) * 28;
  const rLegX = 44 + Math.sin(rightLegAngle * Math.PI / 180) * 14;
  const rLegY = HIP_Y + Math.cos(rightLegAngle * Math.PI / 180) * 28;

  const lArmX = 22 + Math.sin(leftArmSwing * Math.PI / 180) * 6;
  const lArmY = HAND_Y - bodyBob + Math.cos(leftArmSwing * Math.PI / 180) * 3;
  const rArmX = 58 + Math.sin(rightArmSwing * Math.PI / 180) * 6;
  const rArmY = HAND_Y - bodyBob + Math.cos(rightArmSwing * Math.PI / 180) * 3;

  armRef.current = { rx: rArmX, ry: rArmY, fl: facingLeft };
  const PX = 120 / 80;
  const handLeft = facingLeft ? 120 - rArmX * PX : rArmX * PX;
  const handTop = rArmY * PX;

  const headClass =
    `${headAnim ? 'head-confused' : ''} ${expression === 'overwhelmed' ? 'head-mood-panic' : ''}`.trim();

  return (
    <div
      ref={roamRef}
      className={`aaron-roaming ${dragging ? 'aaron-puppet-drag' : ''}`}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 500,
      }}
    >
      {bubbleMsg && (
        <div
          className={`speech-bubble ${expression === 'overwhelmed' ? 'stressed' : ''} ${bubbleMsg === 'VAMONOS!!!' ? 'vamonos-yell' : ''}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 4,
          }}
        >
          {bubbleMsg}
        </div>
      )}

      <div
        className="aaron-facing"
        style={{ transform: facingLeft ? 'scaleX(-1)' : undefined }}
      >
        <div
          className={`aaron-puppet-swing ${dragging ? 'is-swinging' : ''} ${idlePlay === 'dance' ? 'idle-dance' : ''} ${idlePlay === 'slump' ? 'idle-slump' : ''}`}
        >
          <svg
            className={`aaron-character ${isTired ? 'tired-character' : ''}`}
            width="120"
            height="180"
            viewBox="0 0 80 120"
            style={{
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
              overflow: 'visible',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
          >
        <defs>
          {/* Mood filters on the photo */}
          <filter id={`${fid}-filt-party`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1.15 0 0 0 0  0 1.12 0 0 0  0 0 1.05 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id={`${fid}-filt-stress`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.92 0 0 0 0  0 0.88 0 0 0  0 0 1.08 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id={`${fid}-filt-panic`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1.12 0 0 0 0  0 0.85 0 0 0  0 0 0.85 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id={`${fid}-filt-tired`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0.35 0.35 0.35 0 0  0.35 0.35 0.35 0 0  0.35 0.35 0.35 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id={`${fid}-filt-vamonos`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="1.45 0.1 0.05 0 0.12  0.15 0.35 0.05 0 0  0.05 0.05 0.35 0 0  0 0 0 1 0"
            />
          </filter>
          {/* Soft sticker shadow behind head */}
          <filter id={`${fid}-head-shadow`} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.45" />
          </filter>
        </defs>

        <ellipse cx="40" cy="115" rx="18" ry="4" fill="rgba(0,0,0,0.3)" />

        <g
          className={`clickable-zone ${legAnim ? 'leg-dancing' : ''}`}
          data-part="legs"
        >
          <line x1="36" y1={HIP_Y} x2={lLegX} y2={lLegY}
            stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx={lLegX} cy={lLegY + 2} rx="6" ry="3"
            fill="#333" stroke="#000" strokeWidth="1" />
          <line x1="44" y1={HIP_Y} x2={rLegX} y2={rLegY}
            stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx={rLegX} cy={rLegY + 2} rx="6" ry="3"
            fill="#333" stroke="#000" strokeWidth="1" />
          <rect x="14" y={HIP_Y - 2} width="52" height="42" fill="transparent" />
        </g>

        <line x1="40" y1={NECK_Y - bodyBob} x2="40" y2={HIP_Y}
          stroke="#000" strokeWidth="3.5" strokeLinecap="round" />

        <g
          className={`clickable-zone ${armAnim ? 'arm-waving' : ''}`}
          data-part="arms"
        >
          <line x1="40" y1={SHOULDER_Y - bodyBob} x2={lArmX} y2={lArmY}
            stroke="#000" strokeWidth="3" strokeLinecap="round" />
          <circle cx={lArmX} cy={lArmY} r="3"
            fill="#FFE0B2" stroke="#000" strokeWidth="1" />
          <line x1="40" y1={SHOULDER_Y - bodyBob} x2={rArmX} y2={rArmY}
            stroke="#000" strokeWidth="3" strokeLinecap="round" />
          <circle cx={rArmX} cy={rArmY} r="3"
            fill="#FFE0B2" stroke="#000" strokeWidth="1" />
          <rect x="12" y={SHOULDER_Y - 12 - bodyBob} width="56" height="26" fill="transparent" />
        </g>

        {/* Head = full PNG cutout (no circular clip) + mood overlays + hat */}
        <g
          className={`clickable-zone aaron-head-group ${headClass}`}
          data-part="head"
          transform={`translate(0, ${-bodyBob}) translate(${HC} ${NECK_Y}) scale(${vamonosActive ? 1.34 : 1}) translate(${-HC} ${-NECK_Y})`}
          style={{ transformOrigin: `${HC}px ${NECK_Y}px` }}
          filter={`url(#${fid}-head-shadow)`}
        >
          <g
            className={`aaron-head-mouth ${bubbleMsg ? 'is-speaking' : ''}`}
            style={{ transformOrigin: `${HC}px ${NECK_Y}px` }}
          >
            <g filter={moodFilter}>
              <image
                href={faceHref}
                x={FACE_X}
                y={FACE_Y}
                width={FACE_W}
                height={FACE_H}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>

            {/* Happy: sparkles */}
            {expression === 'happy' && !isTired && (
              <>
                <text x="58" y="10" fontSize="9" style={{ pointerEvents: 'none' }}>✨</text>
                <text x="20" y="14" fontSize="8" style={{ pointerEvents: 'none' }}>✨</text>
              </>
            )}

            {/* Stressed: sweat (no drawn brows) */}
            {expression === 'stressed' && (
              <text x="60" y="32" fontSize="9" fill="#39f" style={{ pointerEvents: 'none' }}>💧</text>
            )}

            {/* Overwhelmed: spiral eyes vibe + extra sweat */}
            {expression === 'overwhelmed' && (
              <>
                <text x="40" y="6" fontSize="10" textAnchor="middle" style={{ pointerEvents: 'none' }}>😵</text>
                <text x="60" y="30" fontSize="8" fill="#39f" style={{ pointerEvents: 'none' }}>💧</text>
                <text x="18" y="30" fontSize="8" fill="#39f" style={{ pointerEvents: 'none' }}>💧</text>
                <text x="64" y="38" fontSize="7" style={{ pointerEvents: 'none' }}>💦</text>
              </>
            )}

            {/* Click head: brief confused cue */}
            {headAnim && (
              <text x="40" y="4" fontSize="10" textAnchor="middle" fill="#FF1493" style={{ pointerEvents: 'none' }}>??</text>
            )}

            {/* Party hat — above hairline */}
            <g style={{ pointerEvents: 'none' }}>
              <polygon
                points={`${HC},-2 ${HC - 14},14 ${HC + 14},14`}
                fill="var(--hotpink)"
                stroke="#000"
                strokeWidth="1"
              />
              <circle cx={HC} cy="-2" r="2.8" fill="var(--yellow)" />
              <line x1={HC - 9} y1="8" x2={HC + 9} y2="8" stroke="var(--lime)" strokeWidth="1.5" />
              <line x1={HC - 10} y1="11" x2={HC + 10} y2="11" stroke="var(--electric)" strokeWidth="1" />
            </g>
          </g>
        </g>
          </svg>
        </div>
      </div>

      {scenePlay === 'pickleChomp' && (
        <div className="aaron-scene-layer aaron-scene-pickle" aria-hidden>
          <span className="pickle-sprite">🥒</span>
          <span className="pickle-crunch">CRUNCH</span>
        </div>
      )}
      {scenePlay === 'cookingSteam' && (
        <div className="aaron-scene-layer aaron-scene-cook" aria-hidden>
          <span className="cook-steam cook-s1">💨</span>
          <span className="cook-pan">🍳</span>
          <span className="cook-steam cook-s2">💨</span>
          <span className="cook-spark">✨</span>
        </div>
      )}
      {scenePlay === 'cocktailToast' && (
        <div className="aaron-scene-layer aaron-scene-cocktail" aria-hidden>
          <span className="cocktail-glass cocktail-g1">🍸</span>
          <span className="cocktail-glass cocktail-g2">🥂</span>
          <span className="cocktail-clink">CLINK</span>
          <span className="cocktail-olive">🫒</span>
        </div>
      )}
      {heldItem && (
        <div
          className="aaron-held-cluster"
          style={{
            position: 'absolute',
            left: handLeft,
            top: handTop,
            transform: 'translate(-50%, -55%)',
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          <span className="aaron-held-emoji" aria-hidden>
            {DRAG_ITEM_EMOJI[heldItem.id]}
          </span>
        </div>
      )}

      {flightRef.current != null && (
        <div
          key={flightTick}
          className="aaron-gift-projectile"
          style={{
            position: 'fixed',
            left: flightRef.current.x,
            top: flightRef.current.y,
            transform: `translate(-50%, -50%) rotate(${flightRef.current.rot || 0}deg)`,
            zIndex: 600,
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <span className="aaron-gift-projectile-emoji" aria-hidden>
            {DRAG_ITEM_EMOJI[flightRef.current.itemId]}
          </span>
        </div>
      )}
    </div>
  );
}
