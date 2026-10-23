import { isQuoteInSource } from "../logic/evidence.js";
import styles from "./AnalysisPanel.module.css";

// A clickable citation: shows the quote and highlights it in the transcript.
export function Citation({ record, citation, onCite }) {
  const found = isQuoteInSource(record, citation);
  const where = citation.turn ? `Turn ${citation.turn}` : "Quote";
  return (
    <button type="button" className={styles.citation} onClick={() => onCite(citation)} aria-label={`${where}: show in transcript`}>
      <span className={styles.where}>{where}</span>
      <span className={styles.quote}>“{citation.quote}”</span>
      {!found && <span className="badge badge-warn">Not found in current text</span>}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function AnalysisPanel({ record, analysis, onCite }) {
  return (
    <div className={styles.panel}>
      <p className={styles.headline}>{analysis.headline}</p>
      <p>{analysis.whatHappened}</p>
      <p>
        <strong>Why it matters:</strong> {analysis.whyItMatters}
      </p>

      {analysis.needsDecision && (
        <p className={styles.decision}>
          <strong>Decision needed:</strong> {analysis.needsDecision}
        </p>
      )}

      <Section title="Evidence">
        <ul className={styles.list}>
          {analysis.evidence.map((item) => (
            <li key={item.quote}>
              <p className="small muted">{item.shows}</p>
              <Citation record={record} citation={item} onCite={onCite} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Not established by the evidence">
        <ul>
          {analysis.notEstablished.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      <Section title="Next steps">
        <ul>
          {analysis.nextSteps.map((step) => (
            <li key={step.action}>
              {step.action}{" "}
              <span className="small muted">
                — owner: {step.owner ?? "not stated"}
                {step.status ? ` · ${step.status}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {analysis.risk && (
        <Section title="Account risk">
          <p>{analysis.risk}</p>
        </Section>
      )}

      {analysis.coaching.length > 0 && (
        <Section title="Coaching">
          <ul className={styles.list}>
            {analysis.coaching.map((item) => (
              <li key={item.point}>
                <p>
                  <span className={`badge ${item.kind === "keep" ? "badge-ok" : "badge-warn"}`}>{item.kind === "keep" ? "Keep doing" : "Improve"}</span>{" "}
                  {item.point}
                </p>
                <Citation record={record} citation={item} onCite={onCite} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.productFeedback.length > 0 && (
        <Section title="Product feedback">
          <ul className={styles.list}>
            {analysis.productFeedback.map((item) => (
              <li key={item.point}>
                <p>{item.point}</p>
                <Citation record={record} citation={item} onCite={onCite} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.contactNotes.length > 0 && (
        <Section title="Contact notes">
          <ul>
            {analysis.contactNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
