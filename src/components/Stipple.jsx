import { useEffect, useRef } from "react";
import { stipple } from "../design/stipple.js";

// Dot artwork from the design system (DESIGN.md §3, §7). Decorative only: hidden from
// screen readers, redrawn on resize and when the theme or light/dark mode changes.
export function Stipple({ preset = "blob", seed = 1, className = "", style }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const art = stipple(element, { preset, seed });
    const resizeWatcher = new ResizeObserver(() => art.redraw({ animate: false }));
    resizeWatcher.observe(element);
    const themeWatcher = new MutationObserver(() => art.redraw({ animate: false }));
    themeWatcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });
    return () => {
      resizeWatcher.disconnect();
      themeWatcher.disconnect();
    };
  }, [preset, seed]);

  return <div ref={ref} className={`stipple ${className}`} style={style} aria-hidden="true" />;
}
