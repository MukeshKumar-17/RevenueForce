import { Link } from "react-router-dom";
import { NoDataYet } from "../components/NoDataYet.jsx";
import { SectionHead, TitleChip } from "../components/SectionHead.jsx";
import { formatPercent, summarise } from "../logic/metrics.js";
import { formatLongDate, makeKey } from "../logic/records.js";
import { useAppStore } from "../store/AppStore.jsx";
import { conversationLink } from "../utils/links.js";
import styles from "./BriefPage.module.css";


export function BriefPage() {
  const { workspace } = useAppStore();
  const { brief } = workspace;
  if (!workspace.records.length) return <NoDataYet />;

  // Activity numbers are live; the written items were prepared for the post-update state.
  const stats = summarise(workspace.records, workspace);
  const matchesPreparedState = stats.total === brief.preparedFrom.records && stats.withText === brief.preparedFrom.usableTexts;

  return (
    <div className="page">
      <div className="page-head">
        <span className="label">Manager brief · {brief.timezone}</span>
        <h1>
          {formatLongDate(brief.date)} <TitleChip icon="brief" tone />
        </h1>
        <p className="lead">
          Written in advance after reviewing all {brief.preparedFrom.usableTexts} supplied conversations. {brief.preparedFrom.note} Not
          affected by dashboard filters.
        </p>
      </div>

      {!matchesPreparedState && (
        <p className={styles.warning} role="note">
          <strong>Different data loaded.</strong> The current data ({stats.total} records, {stats.withText} with text) is not the state this
          brief was written for ({brief.preparedFrom.records} records, {brief.preparedFrom.usableTexts} with text). Import the update batch
          before relying on it.
        </p>
      )}

      <div className={styles.sections}>
        <section className="card" aria-labelledby="brief-activity">
          <SectionHead id="brief-activity" title="Activity" />
          <dl className="stat-strip stat-strip-pairs">
            <div>
              <dt>Records</dt>
              <dd>{stats.total}</dd>
            </div>
            <div>
              <dt>With text</dt>
              <dd>{stats.withText}</dd>
            </div>
            <div>
              <dt>Connected calls</dt>
              <dd>
                {stats.connectedCalls} of {stats.callsWithKnownConnection}
              </dd>
            </div>
            <div>
              <dt>Need a decision</dt>
              <dd>{stats.reviewCounts.needs_decision ?? 0}</dd>
            </div>
          </dl>
          <p>
            {stats.total} selected records: {stats.calls} calls and {stats.meetings} meetings. {stats.withText} have usable text (
            {formatPercent(stats.withText, stats.total)}). {stats.connectedCalls} of {stats.callsWithKnownConnection} calls are
            source-reported as connected. {stats.reviewCounts.needs_decision ?? 0} conversations need a decision from you.
          </p>
          <p className="small muted">These counts are computed live from the current data.</p>
        </section>

        {brief.sections.map((section, index) => (
          <section className={`card ${index === 0 ? "card-highlight" : ""}`} key={section.title} aria-labelledby={`brief-section-${index}`}>
            <SectionHead
              id={`brief-section-${index}`}
              title={section.title}
              aside={<span className="tag">{section.items.length}</span>}
            />
            <ul className={styles.items}>
              {section.items.map((item) => (
                <li key={item.text}>
                  <p>{item.text}</p>
                  <p className={styles.sources}>
                    <span className="label">Evidence</span>
                    {item.refs.map((ref) => {
                      const label = ref.turn ? `${ref.ref} turn ${ref.turn}` : ref.ref;
                      return workspace.recordsByKey[makeKey(ref.sourceType, ref.sourceId)] ? (
                        <Link key={label} to={conversationLink(ref, ref.turn)} className="link-pill">
                          {label}
                        </Link>
                      ) : (
                        <span key={label} className="muted">
                          {label} (not imported)
                        </span>
                      );
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
