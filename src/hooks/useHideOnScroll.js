import { useEffect, useState } from "react";

const DESKTOP = "(min-width: 769px)";
const REVEAL_AFTER = 8; // px of upward scroll that brings the bar back

// Desktop only: hides the sticky bar while scrolling down, shows it again on a small
// scroll up. On mobile it never hides (the bar is not sticky there).
// `scrolled` is true on desktop once the page is past the bar's own height.
export function useHideOnScroll(barHeight) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    let lastY = window.scrollY;
    let upDistance = 0;

    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(desktop.matches && y > barHeight);
      if (!desktop.matches || y <= barHeight) {
        setHidden(false);
      } else if (y > lastY) {
        upDistance = 0;
        setHidden(true);
      } else {
        upDistance += lastY - y;
        if (upDistance >= REVEAL_AFTER) setHidden(false);
      }
      lastY = y;
    };

    const onViewportChange = () => {
      setHidden(false);
      setScrolled(desktop.matches && window.scrollY > barHeight);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    desktop.addEventListener("change", onViewportChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      desktop.removeEventListener("change", onViewportChange);
    };
  }, [barHeight]);

  return [hidden, setHidden, scrolled];
}
