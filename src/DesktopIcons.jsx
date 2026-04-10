import { VEGGIE_RECIPES } from './config';

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Windows-style desktop shortcuts. Parent owns refs for proximity detection.
 */
export default function DesktopIcons({
  iconRefs,
  onOpenPortfolio,
  onOpenMemories,
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
        ref={(el) => { iconRefs.current.memories = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenMemories();
        }}
      >
        <span className="desktop-icon-glyph" aria-hidden>📔</span>
        <span className="desktop-icon-label">Book of Memories</span>
      </button>
      <button
        type="button"
        className="desktop-icon"
        ref={(el) => { iconRefs.current.recipes = el; }}
        onClick={(e) => {
          e.stopPropagation();
          onVeggieRecipes(randomPick(VEGGIE_RECIPES));
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
