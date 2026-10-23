import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AnalysisPanel } from "../components/AnalysisPanel.jsx";
import { ReviewBadge, RouteTags } from "../components/Badges.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { RouteEditor } from "../components/RouteEditor.jsx";
import { SectionHead } from "../components/SectionHead.jsx";
import { RouteReasons } from "../components/RouteReasons.jsx";
import { Toast } from "../components/Toast.jsx";
import { TranscriptView } from "../components/TranscriptView.jsx";
import { makeKey, toLocalDate, toLocalTime } from "../logic/records.js";
import { REVIEW_STATES, getAnalysis, getAnalysisFreshness, getLinkedRecords, getReviewState, getRouteReasons, getRouting } from "../logic/routing.js";
import { findSourceConflicts } from "../logic/sourceChecks.js";
import { useAppStore } from "../store/AppStore.jsx";
import { conversationLink } from "../utils/links.js";
import styles from "./ConversationPage.module.css";

// Source fields shown as "what the previous system said", kept apart from our reading.
const CALL_FIELDS = ["observed_outcome", "is_connected", "is_conversation", "direction", "duration_seconds", "talk_time_seconds", "is_campaign_call", "classification_status", "summary_status"];
const MEETING_FIELDS = ["recording_status", "recording_detail", "has_transcript", "attendee_count", "duration_seconds", "provider", "summary_status"];

const FRESHNESS_TEXT = {
  current: "Prepared analysis matches the current text.",
  stale: "The text changed after the analysis was written. The old analysis is withheld until it is reviewed.",
  missing: "This record has text but no prepared analysis yet.",
  not_applicable: "No usable text, so there is no analysis. This is an intake record only.",
};

function SourceFields({ record }) {
  const fields = record.sourceType === "call" ? CALL_FIELDS : MEETING_FIELDS;
  return (
    <dl className={styles.fields}>
      {fields.map((field) => (
        <div key={field}>
          <dt>{field}</dt>
          <dd>{record.payload[field] === null ? <span className="muted">null</span> : String(record.payload[field])}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ConversationPage() {
  const { sourceType, sourceId } = useParams();
  const [searchParams] = useSearchParams();
  const { workspace } = useAppStore();
  const initialTurn = Number(searchParams.get("turn")) || null;

  const record = workspace.recordsByKey[makeKey(sourceType, sourceId)];
  if (!record) {
    return (
      <EmptyState
        title="This record isn’t in the current data"
        seed={23}
        action={
          <Link className="btn btn-primary" to="/data">
            Go to Data &amp; export
          </Link>
        }
      >
        It may not have been imported yet, or the workspace was reset.
      </EmptyState>
    );
  }

  // The key resets the highlighted passage when moving to another record or turn link.
  return <ConversationDetail key={`${record.key}-${initialTurn}`} record={record} initialTurn={initialTurn} />;
}

function ConversationDetail({ record, initialTurn }) {
  const { workspace, saveRoutes, resetRoutes } = useAppStore();
  const [highlight, setHighlight] = useState(initialTurn ? { turn: initialTurn } : null);
  const [toast, setToast] = useState("");
  const clearToast = useCallback(() => setToast(""), []);

  const routing = getRouting(record, workspace);
  const reviewState = getReviewState(record, workspace);
  const freshness = getAnalysisFreshness(record, workspace);
  const analysis = freshness === "current" ? getAnalysis(record, workspace) : null;
  const conflicts = findSourceConflicts(record);
  const links = getLinkedRecords(record, workspace);
  const { person } = record;

  return (
    <div className="page">
      <Link to="/conversations" className="small">
        ← All conversations
      </Link>

      <header className="page-head">
        <span className="label">
          {record.sourceType} · {toLocalDate(record.startedAt)} {toLocalTime(record.startedAt)} IST
        </span>
        <div className="row">
          <h1 className={styles.title}>
            {record.recordRef} · {analysis ? analysis.counterpartyLabel : record.title}
          </h1>
          <ReviewBadge state={reviewState} />
        </div>
        <p className={styles.facts}>
          <span className="tag">
            {person.role}: {person.name}
            {person.name !== person.email && ` (${person.email})`}
          </span>
          <span className="tag">revision {record.revision}</span>
          <span className="tag">batch {record.batchId}</span>
          <span className="small muted">
            source ID <code>{record.sourceId}</code>
          </span>
        </p>
        {record.sourceType === "meeting" && <p className="small">Calendar title: {record.payload.title}</p>}
      </header>

      <div className={styles.layout}>
        <div className="stack">
          <section className="card" aria-labelledby="analysis-title">
            <SectionHead id="analysis-title" title="Analysis" />
            <p className={`small ${freshness === "current" ? "muted" : styles.notice}`}>
              {FRESHNESS_TEXT[freshness]}
              {analysis && ` Written for revision ${analysis.analysedRevision}; prepared before runtime.`}
            </p>
            {analysis && <AnalysisPanel record={record} analysis={analysis} onCite={(citation) => setHighlight({ ...citation })} />}
            {!record.hasUsableText && (
              <p>
                <ReviewBadge state={reviewState} /> {REVIEW_STATES[reviewState].description}
                {record.unavailableReason && <span className="muted"> Source reason: “{record.unavailableReason}”</span>}
              </p>
            )}
          </section>

          {record.hasUsableText && (
            <section className="card" aria-labelledby="transcript-title">
              <SectionHead id="transcript-title" title="Supplied text" />
              <p className="small muted">Adapted and abridged. Select any quote in the analysis to find it here.</p>
              <TranscriptView record={record} highlight={highlight} />
            </section>
          )}
        </div>

        <aside className="stack" aria-label="Routing and source details">
          <section className="card" aria-labelledby="routing-title">
            <SectionHead id="routing-title" title="Routing" />
            <RouteTags routing={routing} />
            <RouteReasons
              record={record}
              reasons={getRouteReasons(record, workspace)}
              routeLabels={workspace.routeLabels}
              onCite={(citation) => setHighlight({ ...citation })}
            />
            <RouteEditor
              key={`${record.key}-${routing.source}-${routing.decision?.decidedAt ?? ""}`}
              routes={workspace.routes}
              routeLabels={workspace.routeLabels}
              routing={routing}
              onSave={(routes, note) => {
                saveRoutes(record, routes, note);
                setToast("Manual route saved. It stays in effect through later imports.");
              }}
              onReset={() => {
                resetRoutes(record);
                setToast("Suggested routes restored.");
              }}
            />
          </section>

          <section className="card" aria-labelledby="labels-title">
            <SectionHead id="labels-title" title="Source labels" />
            <p className="small muted">Stored by the previous system. Shown as evidence, not as the answer.</p>
            <SourceFields record={record} />
            {analysis?.sourceLabelNote && (
              <p className="small">
                <strong>Our reading:</strong> {analysis.sourceLabelNote}
              </p>
            )}
          </section>

          {conflicts.length > 0 && (
            <section className="card" aria-labelledby="conflicts-title">
              <SectionHead id="conflicts-title" title="Source field conflicts" />
              <ul className="small">
                {conflicts.map((conflict) => (
                  <li key={conflict}>{conflict}</li>
                ))}
              </ul>
            </section>
          )}

          {links.map((link) => (
            <section className="card" key={link.note} aria-label="Possibly related">
              <SectionHead title="Possibly related" />
              <p className="small">
                {link.others.map((other) => (
                  <Link key={other.sourceId} to={conversationLink(other)}>
                    {other.ref}
                  </Link>
                ))}{" "}
                — {link.note}
              </p>
            </section>
          ))}

          <details className="card">
            <summary className={styles.summary}>Raw source record</summary>
            <pre className={styles.raw}>{JSON.stringify({ payload: record.payload, transcript_payload: record.transcriptPayload }, null, 2)}</pre>
          </details>
        </aside>
      </div>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
