import { useState } from "react";
import styles from "./RouteEditor.module.css";

// Lets the manager replace the suggested routes. A saved choice stays in effect
// through later imports until "Use suggestion" is pressed.
export function RouteEditor({ routes, routeLabels, routing, onSave, onReset }) {
  const [selected, setSelected] = useState(routing.routes);
  const [note, setNote] = useState(routing.decision?.note ?? "");

  const toggle = (routeId) =>
    setSelected((current) => (current.includes(routeId) ? current.filter((id) => id !== routeId) : [...current, routeId]));

  // Keep the catalogue order so saved routes read the same everywhere.
  const orderedSelection = routes.map((route) => route.id).filter((id) => selected.includes(id));

  return (
    <div className={styles.editor}>
      <p className="small">
        <strong>Suggested:</strong>{" "}
        {routing.suggested.length ? routing.suggested.map((id) => routeLabels[id] ?? id).join(", ") : "none (no current analysis)"}
      </p>
      {routing.source === "manual" && (
        <p className={`small ${styles.manual}`}>
          Manual routes in effect since {new Date(routing.decision.decidedAt).toLocaleString("en-GB")}. They survive re-imports and
          updates until you use the suggestion again.
        </p>
      )}

      <fieldset className={styles.options}>
        <legend className="label">Routes</legend>
        {routes.map((route) => (
          <label key={route.id} className="check" title={route.description}>
            <input type="checkbox" checked={selected.includes(route.id)} onChange={() => toggle(route.id)} /> {route.label}
          </label>
        ))}
      </fieldset>

      <div className="field">
        <label htmlFor="route-note">Reason for this route (optional)</label>
        <textarea id="route-note" className="textarea" rows={2} value={note} onChange={(event) => setNote(event.target.value)} aria-describedby="route-note-help" />
        <span id="route-note-help" className="help">
          Shown as the manager’s reason and written to the export.
        </span>
      </div>

      <div className="row">
        {routing.source === "manual" && (
          <button type="button" className="btn btn-secondary" onClick={onReset}>
            Use suggestion
          </button>
        )}
        <button type="button" className="btn btn-primary" disabled={!orderedSelection.length} onClick={() => onSave(orderedSelection, note.trim())}>
          Save manual route
        </button>
      </div>
      {!orderedSelection.length && <p className="help">Choose at least one route to save.</p>}
    </div>
  );
}
