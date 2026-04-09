import { DESKTOP_ICON_POPUPS } from './config';

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Extra “desktop” items Aaron can walk into (refs for proximity + reactions).
 */
export default function HotspotGadgets({ hotspotRefs, onSpawnSystem }) {
  return (
    <div className="desktop-gadgets" aria-label="Desktop gadgets">
      <button
        type="button"
        className="desktop-hotspot"
        ref={(el) => { hotspotRefs.current.plant = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onSpawnSystem(randomPick(DESKTOP_ICON_POPUPS.plant));
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>🪴</span>
        <span className="desktop-icon-label">Plant Buddy</span>
      </button>
      <button
        type="button"
        className="desktop-hotspot"
        ref={(el) => { hotspotRefs.current.oatly = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onSpawnSystem(randomPick(DESKTOP_ICON_POPUPS.oatly));
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>🥛</span>
        <span className="desktop-icon-label">Oat Milk</span>
      </button>
      <button
        type="button"
        className="desktop-hotspot"
        ref={(el) => { hotspotRefs.current.motion = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onSpawnSystem(randomPick(DESKTOP_ICON_POPUPS.motion));
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>🎬</span>
        <span className="desktop-icon-label">Motion WIP</span>
      </button>
      <button
        type="button"
        className="desktop-hotspot"
        ref={(el) => { hotspotRefs.current.turntable = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onSpawnSystem(randomPick(DESKTOP_ICON_POPUPS.turntable));
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>🎧</span>
        <span className="desktop-icon-label">Vinyl.exe</span>
      </button>
    </div>
  );
}
