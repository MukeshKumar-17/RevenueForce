import { useEffect, useRef } from "react";
import { getUsableTurns } from "../logic/records.js";
import styles from "./TranscriptView.module.css";

// Wraps the first occurrence of quote in <mark>.
function withHighlight(text, quote) {
  const start = quote ? text.indexOf(quote) : -1;
  if (start === -1) return text;
  return (
    <>
      {text.slice(0, start)}
      <mark>{quote}</mark>
      {text.slice(start + quote.length)}
    </>
  );
}

// Shows the supplied text; `highlight` ({ turn, quote }) marks the cited passage and scrolls to it.
export function TranscriptView({ record, highlight }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const target = containerRef.current?.querySelector("mark, [data-cited='true']");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlight]);

  if (record.sourceType === "call") {
    return (
      <div ref={containerRef} className={styles.callText}>
        {withHighlight(record.payload.transcript, highlight?.quote)}
        <p className="small muted">Call text has no reliable turn timing, so evidence is cited by short exact quote.</p>
      </div>
    );
  }

  return (
    <ol ref={containerRef} className={styles.turns}>
      {getUsableTurns(record).map((turn) => {
        const isCited = highlight?.turn === turn.number;
        return (
          <li key={turn.number} id={`turn-${turn.number}`} data-cited={isCited} className={isCited ? styles.cited : ""}>
            <div className={styles.turnMeta}>
              <strong>Turn {turn.number}</strong> · {turn.speaker} · {turn.timecode}
            </div>
            <div>{isCited ? withHighlight(turn.text, highlight.quote) : turn.text}</div>
          </li>
        );
      })}
    </ol>
  );
}
