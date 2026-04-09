import { DESKTOP_ICON_POPUPS } from './config';

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Floor props Aaron can walk up to — pickle jar, stovetop, snack table (proximity + click).
 */
export default function SceneEnvironment({ hotspotRefs, onSpawnSystem }) {
  return (
    <div className="scene-environment" aria-label="Kitchen and snack props">
      <button
        type="button"
        className="scene-prop"
        ref={(el) => { hotspotRefs.current.pickleJar = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onSpawnSystem(randomPick(DESKTOP_ICON_POPUPS.pickleJar));
        }}
      >
        <span className="scene-prop-glyph" aria-hidden>🥒</span>
        <span className="scene-prop-label">Pickle Jar</span>
      </button>
      <button
        type="button"
        className="scene-prop"
        ref={(el) => { hotspotRefs.current.stovetop = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onSpawnSystem(randomPick(DESKTOP_ICON_POPUPS.stovetop));
        }}
      >
        <span className="scene-prop-glyph" aria-hidden>🍳</span>
        <span className="scene-prop-label">Stovetop</span>
      </button>
      <button
        type="button"
        className="scene-prop"
        ref={(el) => { hotspotRefs.current.snackTable = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onSpawnSystem(randomPick(DESKTOP_ICON_POPUPS.snackTable));
        }}
      >
        <span className="scene-prop-glyph" aria-hidden>🧁</span>
        <span className="scene-prop-label">Snacks</span>
      </button>
    </div>
  );
}
