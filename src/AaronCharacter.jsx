import { useState, useRef, useCallback, useEffect } from 'react';
import { SPEECH_BUBBLE_MESSAGES } from './config';
import { playHeadClick, playArmClick, playLegClick } from './audio';

const WALK_SPEED = 1.2;
const IDLE_MIN = 1500;
const IDLE_MAX = 4000;
const INTERACT_MESSAGES = [
  "This layout is TERRIBLE. I love it.",
  "*adjusts party hat like a pro designer*",
  "Somebody get me a pickle back 🥒🥃",
  "I'm walking here!! (Toronto energy)",
  "Birthday stroll down Lansdowne Ave~",
  "Wheee! More fun than delivering mail!",
  "Don't mind me, just a designer who codes...",
  "This site needs more keyframes honestly",
  "🎂 BIRTHDAY BOY COMING THROUGH 🎂",
  "Anyone got pickle juice? Asking for myself.",
  "Back at Tim Hortons I just served coffee, not chaos",
  "My York professors would NOT approve of this site",
  "The Workhouse would never let me ship this lol",
  "*critiques own birthday website's typography*",
  "Pickle backs > regular shots. This is FACT.",
  "More motion design than a Pearson terminal screen!",
  "I went from dissecting frogs to dissecting Figma files",
  "This font? Comic Sans? *chef's kiss* ...wait no",
  "Fun fact: The hamburger menu icon was invented in 1981",
  "Who decided 'center div' should be this hard??",
  "I should be doing pickle backs rn not walking around",
  "Did you know 'lorem ipsum' is from a Cicero text from 45 BC?",
  "*notices bad kerning* ...I can't unsee it now",
  "Pickle backs and birthday cake. Name a better duo. I'll wait.",
];

export default function AaronCharacter({ popupCount, onInteraction }) {
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

  const dragOffset = useRef({ x: 0, y: 0 });
  const bubbleTimer = useRef(null);
  const animFrame = useRef(null);
  const idleTimeout = useRef(null);
  const posRef = useRef(pos);
  const targetRef = useRef(target);
  const draggingRef = useRef(false);

  posRef.current = pos;
  targetRef.current = target;
  draggingRef.current = dragging;

  const isTired = interactionCount >= 8;

  const expression = popupCount <= 2 ? 'happy'
    : popupCount <= 5 ? 'stressed'
    : 'overwhelmed';

  const showBubble = useCallback((msg) => {
    const text = msg ?? SPEECH_BUBBLE_MESSAGES[Math.floor(Math.random() * SPEECH_BUBBLE_MESSAGES.length)];
    setBubbleMsg(text);
    clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubbleMsg(null), 3000);
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

        if (Math.random() < 0.4) {
          showBubble(INTERACT_MESSAGES[Math.floor(Math.random() * INTERACT_MESSAGES.length)]);
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
  }, [pickNewTarget, showBubble, isTired]);

  useEffect(() => {
    if (popupCount > 0) {
      showBubble(SPEECH_BUBBLE_MESSAGES[popupCount % SPEECH_BUBBLE_MESSAGES.length]);
    }
  }, [popupCount, showBubble]);

  const handlePartClick = useCallback((part, e) => {
    e.stopPropagation();
    setInteractionCount(c => c + 1);
    onInteraction?.();

    const headQuips = [
      "Hey! That's my face!",
      "My head contains a Biology AND Design degree",
      "Careful, there's pickle back knowledge in there",
      "That's where the kerning expertise lives",
      "Ow! I need this brain for After Effects!",
    ];
    const armQuips = [
      "*waves excitedly*",
      "*waves like I'm flagging down pickle backs*",
      "These arms animated the MaRS branding!",
      "Jazz hands! I learned this at York!",
      "*waves at The Workhouse from this terrible website*",
    ];
    const legQuips = [
      "*dances aggressively*",
      "*does the Tim Hortons shuffle*",
      "These legs delivered mail for Canada Post!",
      "I need these legs to walk to the bar for pickle backs",
      "*breakdances in Comic Sans*",
    ];

    if (part === 'head') {
      setHeadAnim(true);
      playHeadClick();
      showBubble(headQuips[Math.floor(Math.random() * headQuips.length)]);
      setTimeout(() => setHeadAnim(false), 600);
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

  const onPointerDown = useCallback((e) => {
    if (e.target.closest('.clickable-zone')) return;
    setDragging(true);
    clearTimeout(idleTimeout.current);
    setTarget(null);
    dragOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!dragging) return;
    setPos({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    setTimeout(() => pickNewTarget(), 800);
  }, [pickNewTarget]);

  const legCycle = walkPhase % 30;
  const phase = (legCycle / 30) * Math.PI * 2;
  const leftLegAngle = isWalking ? Math.sin(phase) * 25 : 0;
  const rightLegAngle = isWalking ? Math.sin(phase + Math.PI) * 25 : 0;
  const leftArmSwing = isWalking ? Math.sin(phase + Math.PI) * 15 : 0;
  const rightArmSwing = isWalking ? Math.sin(phase) * 15 : 0;
  const bodyBob = isWalking ? Math.abs(Math.sin(phase)) * 2 : 0;

  const lLegX = 36 + Math.sin(leftLegAngle * Math.PI / 180) * 14;
  const lLegY = 72 + Math.cos(leftLegAngle * Math.PI / 180) * 28;
  const rLegX = 44 + Math.sin(rightLegAngle * Math.PI / 180) * 14;
  const rLegY = 72 + Math.cos(rightLegAngle * Math.PI / 180) * 28;

  const lArmX = 22 + Math.sin(leftArmSwing * Math.PI / 180) * 6;
  const lArmY = 64 - bodyBob + Math.cos(leftArmSwing * Math.PI / 180) * 3;
  const rArmX = 58 + Math.sin(rightArmSwing * Math.PI / 180) * 6;
  const rArmY = 64 - bodyBob + Math.cos(rightArmSwing * Math.PI / 180) * 3;

  return (
    <div
      className="aaron-roaming"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 500,
      }}
    >
      {bubbleMsg && (
        <div
          className={`speech-bubble ${expression === 'overwhelmed' ? 'stressed' : ''}`}
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

      <svg
        className={`aaron-character ${isTired ? 'tired-character' : ''}`}
        width="120"
        height="180"
        viewBox="0 0 80 120"
        style={{
          transform: facingLeft ? 'scaleX(-1)' : 'scaleX(1)',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
          overflow: 'visible',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <defs>
          <clipPath id="aaron-head-clip">
            <circle cx="40" cy="28" r="16" />
          </clipPath>
        </defs>

        {/* Shadow on ground */}
        <ellipse cx="40" cy="115" rx="18" ry="4" fill="rgba(0,0,0,0.3)" />

        {/* LEGS with walk cycle */}
        <g
          className={`clickable-zone ${legAnim ? 'leg-dancing' : ''}`}
          onClick={(e) => handlePartClick('legs', e)}
        >
          <line x1="36" y1="72" x2={lLegX} y2={lLegY}
            stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx={lLegX} cy={lLegY + 2} rx="6" ry="3"
            fill="#333" stroke="#000" strokeWidth="1" />
          <line x1="44" y1="72" x2={rLegX} y2={rLegY}
            stroke="#000" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx={rLegX} cy={rLegY + 2} rx="6" ry="3"
            fill="#333" stroke="#000" strokeWidth="1" />
          <rect x="14" y="70" width="52" height="42" fill="transparent" />
        </g>

        {/* BODY */}
        <line x1="40" y1={44 - bodyBob} x2="40" y2="72"
          stroke="#000" strokeWidth="3.5" strokeLinecap="round" />

        {/* ARMS with swing */}
        <g
          className={`clickable-zone ${armAnim ? 'arm-waving' : ''}`}
          onClick={(e) => handlePartClick('arms', e)}
        >
          <line x1="40" y1={52 - bodyBob} x2={lArmX} y2={lArmY}
            stroke="#000" strokeWidth="3" strokeLinecap="round" />
          <circle cx={lArmX} cy={lArmY} r="3"
            fill="#FFE0B2" stroke="#000" strokeWidth="1" />
          <line x1="40" y1={52 - bodyBob} x2={rArmX} y2={rArmY}
            stroke="#000" strokeWidth="3" strokeLinecap="round" />
          <circle cx={rArmX} cy={rArmY} r="3"
            fill="#FFE0B2" stroke="#000" strokeWidth="1" />
          <rect x="12" y={46 - bodyBob} width="56" height="24" fill="transparent" />
        </g>

        {/* HEAD with Aaron's face */}
        <g
          className={`clickable-zone ${headAnim ? 'head-confused' : ''}`}
          onClick={(e) => handlePartClick('head', e)}
          transform={`translate(0, ${-bodyBob})`}
          style={{ transformOrigin: '40px 44px' }}
        >
          <circle cx="40" cy="28" r="16.5" fill="#FFE0B2"
            stroke="#000" strokeWidth="2" />

          <image
            href="/aaron-face.png"
            x="22" y="10"
            width="36" height="36"
            clipPath="url(#aaron-head-clip)"
            preserveAspectRatio="xMidYMid slice"
          />

          {expression === 'stressed' && (
            <text x="58" y="22" fontSize="8" fill="#39f">💧</text>
          )}
          {expression === 'overwhelmed' && (
            <>
              <text x="58" y="20" fontSize="8" fill="#39f">💧</text>
              <text x="18" y="22" fontSize="8" fill="#39f">💧</text>
              <text x="40" y="10" fontSize="7" textAnchor="middle">😵</text>
            </>
          )}

          {/* Party hat */}
          <polygon points="40,6 30,18 50,18"
            fill="var(--hotpink)" stroke="#000" strokeWidth="1" />
          <circle cx="40" cy="6" r="2.5" fill="var(--yellow)" />
          <line x1="32" y1="14" x2="48" y2="14"
            stroke="var(--lime)" strokeWidth="1.5" />
          <line x1="31" y1="16.5" x2="49" y2="16.5"
            stroke="var(--electric)" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
