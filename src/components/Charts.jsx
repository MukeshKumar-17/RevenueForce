import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Charts.module.css";

// Clean axis ticks: 0, step, 2·step … up to the first tick at or above the max.
function niceTicks(max) {
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : 10;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks = [];
  for (let value = 0; value <= top; value += step) ticks.push(value);
  return { ticks, top };
}

// Centre the tooltip over its column, but align it to the column's outer edge near
// either end of the chart so it never spills past the card.
function tooltipPosition(index, count) {
  const centre = (index + 0.5) / count;
  if (centre < 0.2) return { left: `${(index / count) * 100}%`, transform: "translate(0, -100%)" };
  if (centre > 0.8) return { left: `${((index + 1) / count) * 100}%`, transform: "translate(-100%, -100%)" };
  return { left: `${centre * 100}%`, transform: "translate(-50%, -100%)" };
}

/**
 * Capsule meter: a row of pills with the filled share in the data colour. Decorative; the card
 * states the exact numbers as text. A non-zero part fills at least one capsule and an incomplete
 * whole leaves at least one empty, so rounding never reads as "none" or "all".
 */
export function SegmentMeter({ part, whole, segments = 10 }) {
  const share = whole > 0 ? part / whole : 0;
  let filled = Math.round(share * segments);
  if (part > 0) filled = Math.max(1, filled);
  if (part < whole) filled = Math.min(segments - 1, filled);
  return (
    <span className={styles.segments} aria-hidden="true">
      {Array.from({ length: segments }, (_, index) => (
        <span key={index} className={styles.segment} data-filled={index < filled} />
      ))}
    </span>
  );
}

/**
 * Capsule column chart. The dashed capsule is every record in the column; the filled part from
 * the bottom is the records with usable text. Each column is focusable and shows a tooltip; only
 * the busiest column carries its total in a bubble (the rest live in the tooltip and table view).
 * columns: [{ key, label, total, filled, tooltipTitle, tooltipDetail }]
 */
export function CapsuleChart({ columns, ariaLabel }) {
  const [active, setActive] = useState(null);
  const peak = Math.max(0, ...columns.map((column) => column.total));
  const peakIndex = columns.findIndex((column) => column.total === peak);
  const { ticks, top } = niceTicks(peak);
  const activeColumn = active === null ? null : columns[active];

  return (
    <div className={styles.capsuleChart}>
      <div className={styles.yAxis} aria-hidden="true">
        {ticks.map((tick) => (
          <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }}>
            {tick}
          </span>
        ))}
      </div>

      <div className={styles.plotArea}>
        <div className={styles.grid} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }} />
          ))}
        </div>

        <ul className={styles.columns} aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
          {columns.map((column, index) => (
            <li
              key={column.key}
              className={styles.columnSlot}
              tabIndex={0}
              aria-label={`${column.tooltipTitle}: ${column.tooltipDetail}`}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              data-active={active === index}
              data-odd={index % 2 === 1}
            >
              <span className={styles.capsuleTrack}>
                {column.total > 0 && (
                  <span className={styles.capsule} style={{ height: `${(column.total / top) * 100}%` }}>
                    {column.filled > 0 && (
                      <span className={styles.capsuleFill} style={{ "--share": column.filled / column.total }}>
                        {column.filled / top >= 0.12 && <span className={styles.capsuleDot} />}
                      </span>
                    )}
                    {index === peakIndex && <span className={styles.bubble}>{column.total}</span>}
                  </span>
                )}
              </span>
              <span className={styles.xLabel} aria-hidden="true">
                {column.label}
              </span>
            </li>
          ))}
        </ul>

        {activeColumn && (
          <div className={styles.tooltip} style={tooltipPosition(active, columns.length)} aria-hidden="true">
            <strong>{activeColumn.tooltipTitle}</strong>
            <span>{activeColumn.tooltipDetail}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Concentric rings: each sweeps 270° clockwise from 9 o'clock and ends at 6 o'clock,
// where a leader line names it from the empty lower-left quarter.
const GAUGE = { cx: 130, cy: 88, radii: [80, 60, 40], sweep: 270 };

function gaugePoint(radius, degrees) {
  const angle = (degrees * Math.PI) / 180;
  return [GAUGE.cx - radius * Math.cos(angle), GAUGE.cy - radius * Math.sin(angle)];
}

function gaugeArc(radius, degrees) {
  const [startX, startY] = gaugePoint(radius, 0);
  const [endX, endY] = gaugePoint(radius, degrees);
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${degrees > 180 ? 1 : 0} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`;
}

/**
 * Arc gauge: up to three rings (outermost first), each filled by part ÷ whole.
 * Decorative beside a list that states every value. rows: [{ key, label, part, whole }]
 */
export function ArcGauge({ rows }) {
  return (
    <svg className={styles.gauge} viewBox="0 0 220 178" aria-hidden="true">
      {rows.slice(0, GAUGE.radii.length).map((row, index) => {
        const radius = GAUGE.radii[index];
        const share = row.whole > 0 ? Math.min(1, row.part / row.whole) : 0;
        const y = GAUGE.cy + radius;
        return (
          <g key={row.key}>
            <line className={styles.gaugeLeader} x1="62" y1={y} x2={GAUGE.cx} y2={y} />
            <text className={styles.gaugeLabel} x="0" y={y} dominantBaseline="middle">
              {row.label}
            </text>
            <path className={styles.gaugeTrack} d={gaugeArc(radius, GAUGE.sweep)} />
            {share > 0 && <path className={styles.gaugeFill} d={gaugeArc(radius, share * GAUGE.sweep)} />}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Labelled counts with a proportional bar under each; the count is always shown as text.
 * variant "tiles" lays the rows out as a grid of small panels.
 * rows: [{ key, label, description, count }]
 */
export function MeterList({ rows, ariaLabel, unit = "records", variant = "list" }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <ul className={styles.meterList} data-variant={variant} aria-label={ariaLabel}>
      {rows.map((row) => (
        <li key={row.key} className={styles.meterRow}>
          <span className={styles.meterLabel}>{row.label}</span>
          <strong className={styles.meterCount}>
            {row.count}
            <span className="visually-hidden"> {unit}</span>
          </strong>
          <span className={styles.meterTrack} aria-hidden="true">
            {row.count > 0 && <span className={styles.meterBar} style={{ width: `${(row.count / max) * 100}%` }} />}
          </span>
          {row.description && <span className={`small muted ${styles.meterNote}`}>{row.description}</span>}
        </li>
      ))}
    </ul>
  );
}

// Two letters for an avatar: first letters of the first two words, or of an email's name.
function initials(name) {
  const words = name.split("@")[0].split(/[\s._-]+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0].toUpperCase()).join("");
}

/**
 * People with an initials avatar, a bar and their count; each row links to their conversations.
 * Bars share one scale, so lengths stay exactly proportional.
 * rows: [{ key, name, sublabel, value, to, ariaLabel }]
 */
export function PeopleBars({ rows, ariaLabel }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className={styles.people} aria-label={ariaLabel}>
      {rows.map((row) => (
        <li key={row.key}>
          <Link to={row.to} className={styles.personRow} aria-label={row.ariaLabel}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(row.name)}
            </span>
            <span className={styles.personText}>
              {row.name}
              <span className={styles.personSub}>{row.sublabel}</span>
            </span>
            <span className={styles.personBar} aria-hidden="true">
              <span className={styles.personTrack}>
                <span className={styles.personFill} style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
              <strong>{row.value}</strong>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
