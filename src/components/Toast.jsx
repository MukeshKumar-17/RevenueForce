import { useEffect } from "react";

// Short confirmation message (DESIGN.md §8). Announced politely and cleared after a few seconds.
export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  return (
    <div className="toast-area">
      <div role="status" aria-live="polite">
        {message && <div className="toast">{message}</div>}
      </div>
    </div>
  );
}
