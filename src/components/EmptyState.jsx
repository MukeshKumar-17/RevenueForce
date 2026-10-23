import { Stipple } from "./Stipple.jsx";

// Design-system empty state: art, a one-line title, one sentence of why, one action (DESIGN.md §8).
export function EmptyState({ title, children, action, seed = 21 }) {
  return (
    <div className="card">
      <div className="empty">
        <Stipple preset="blob" seed={seed} className="empty-art" />
        <h2>{title}</h2>
        <p>{children}</p>
        {action}
      </div>
    </div>
  );
}
