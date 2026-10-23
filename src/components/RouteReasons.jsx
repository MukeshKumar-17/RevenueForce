import { Citation } from "./AnalysisPanel.jsx";
import styles from "./RouteReasons.module.css";

// Lists each route in effect with why it applies and the passage behind it.
export function RouteReasons({ record, reasons, routeLabels, onCite }) {
  if (!reasons.length) return null;
  return (
    <ul className={styles.list} aria-label="Why these routes">
      {reasons.map((item) => (
        <li key={item.route}>
          <p>
            <strong>{routeLabels[item.route] ?? item.route}</strong>{" "}
            <span className="small muted">· {item.by === "manager" ? "manager’s reason" : "suggested because"}</span>
          </p>
          <p className="small">{item.text}</p>
          {item.citation && <Citation record={record} citation={item.citation} onCite={onCite} />}
        </li>
      ))}
    </ul>
  );
}
