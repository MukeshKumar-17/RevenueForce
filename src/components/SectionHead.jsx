import { Icon } from "./Icon.jsx";

// Card header: the section's h2, and an optional element pushed to the right.
export function SectionHead({ id, title, aside }) {
  return (
    <div className="card-head">
      <h2 id={id}>{title}</h2>
      {aside && <div className="card-aside">{aside}</div>}
    </div>
  );
}

// A rounded icon chip set inside a page heading, sized from the heading's font size.
export function TitleChip({ icon, tone = false }) {
  return (
    <span className={`title-chip ${tone ? "title-chip-tone" : ""}`}>
      <Icon name={icon} />
    </span>
  );
}
