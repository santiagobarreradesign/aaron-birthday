import { DESKTOP_ICON_POPUPS } from './config';
import { playError } from './audio';

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Windows-style desktop shortcuts. Parent owns refs for proximity detection.
 */
export default function DesktopIcons({
  iconRefs,
  onOpenPortfolio,
  onRecycle,
  onVeggieRecipes,
  onGuestbookFocus,
}) {
  return (
    <div className="desktop-icons" aria-label="Desktop shortcuts">
      <button
        type="button"
        className="desktop-icon"
        ref={(el) => { iconRefs.current.portfolio = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenPortfolio();
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>🎨</span>
        <span className="desktop-icon-label">Portfolio</span>
      </button>
      <button
        type="button"
        className="desktop-icon"
        ref={(el) => { iconRefs.current.recycle = el; }}
        onClick={(e) => {
          e.stopPropagation();
          playError();
          onRecycle(randomPick(DESKTOP_ICON_POPUPS.recycle));
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>🗑️</span>
        <span className="desktop-icon-label">Recycle Bin</span>
      </button>
      <button
        type="button"
        className="desktop-icon"
        ref={(el) => { iconRefs.current.recipes = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onVeggieRecipes(randomPick(DESKTOP_ICON_POPUPS.recipes));
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>🥗</span>
        <span className="desktop-icon-label">Veggie Recipes</span>
      </button>
      <button
        type="button"
        className="desktop-icon"
        ref={(el) => { iconRefs.current.guestbook = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onGuestbookFocus();
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>📖</span>
        <span className="desktop-icon-label">Guestbook</span>
      </button>
    </div>
  );
}
