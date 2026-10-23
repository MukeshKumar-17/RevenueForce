import { REVIEW_STATES } from "../logic/routing.js";
import { useAppStore } from "../store/AppStore.jsx";

// Review-state tone -> design-system badge variant.
const TONE_CLASS = { ok: "badge-ok", warn: "badge-warn", info: "badge-accent", muted: "" };

export function ReviewBadge({ state }) {
  const info = REVIEW_STATES[state];
  return (
    <span className={`badge ${TONE_CLASS[info.tone]}`} title={info.description}>
      {info.label}
    </span>
  );
}

// Shows the routes in effect and whether a person set them.
export function RouteTags({ routing }) {
  const { workspace } = useAppStore();
  if (!routing.routes.length) return <span className="muted small">No route</span>;
  return (
    <span className="row">
      {routing.routes.map((routeId) => (
        <span key={routeId} className="badge badge-route">
          {workspace.routeLabels[routeId] ?? routeId}
        </span>
      ))}
      {routing.source === "manual" && <span className="badge badge-accent">manual</span>}
    </span>
  );
}
