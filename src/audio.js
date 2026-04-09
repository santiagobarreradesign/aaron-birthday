let ctx = null;
let muted = localStorage.getItem('aaron-mute') === '1';

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function playTone(freq, duration = 0.12, type = 'square', volume = 0.15) {
  if (muted) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch (_) { /* audio not supported */ }
}

export function playPopupSpawn() {
  playTone(880, 0.08, 'square');
  setTimeout(() => playTone(1100, 0.08, 'square'), 80);
}

export function playHeadClick() {
  playTone(600, 0.15, 'triangle', 0.2);
}

export function playArmClick() {
  playTone(440, 0.1, 'sawtooth', 0.12);
  setTimeout(() => playTone(660, 0.1, 'sawtooth', 0.12), 100);
}

export function playLegClick() {
  playTone(200, 0.06, 'square', 0.18);
  setTimeout(() => playTone(300, 0.06, 'square', 0.18), 60);
  setTimeout(() => playTone(400, 0.06, 'square', 0.18), 120);
}

export function playPopupClose() {
  playTone(500, 0.05, 'triangle', 0.1);
  setTimeout(() => playTone(350, 0.06, 'triangle', 0.1), 50);
}

export function playError() {
  playTone(150, 0.2, 'sawtooth', 0.2);
}

export function playKonami() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'triangle', 0.2), i * 120));
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('aaron-mute', muted ? '1' : '0');
  return muted;
}
