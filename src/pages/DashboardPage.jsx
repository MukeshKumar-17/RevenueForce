import { Link } from "react-router-dom";
import { ReviewBadge } from "../components/Badges.jsx";
import { ArcGauge, CapsuleChart, MeterList, PeopleBars, SegmentMeter } from "../components/Charts.jsx";
import { FilterBar } from "../components/FilterBar.jsx";
import { Icon } from "../components/Icon.jsx";
import { NoDataYet } from "../components/NoDataYet.jsx";
import { SectionHead, TitleChip } from "../components/SectionHead.jsx";
import { toQuery, useFilters } from "../hooks/useFilters.js";
import {
  COUNTERPARTY_LABELS,
  activityByHour,
  activityByPerson,
  countCounterparties,
  filterRecords,
  formatPercent,
  listPeople,
  summarise,
} from "../logic/metrics.js";
import { formatLongDate, toLocalTime } from "../logic/records.js";
import { REVIEW_STATES, getAnalysis, getReviewState } from "../logic/routing.js";
import { useAppStore } from "../store/AppStore.jsx";
import { conversationLink } from "../utils/links.js";
import styles from "./DashboardPage.module.css";

const ATTENTION_STATES = ["needs_decision", "analysis_stale", "needs_analysis"];

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const hourLabel = (hour) => String(hour).padStart(2, "0");

// Headline number: title, the number with a tag, a capsule meter of the share behind it,
// then the counts and the definition as text. `tone` is "highlight" or "inverse" for a coloured card.
function StatCard({ title, value, tag, meter, detail, definition, tone, children }) {
  return (
    <section className={`card ${tone ? `card-${tone}` : ""} ${styles.stat}`}>
      <h2 className="card-title">{title}</h2>
      <p className={styles.statValue}>
        {value}
        {tag && <span className="tag">{tag}</span>}
      </p>
      <SegmentMeter part={meter.part} whole={meter.whole} />
      <p className={`small ${styles.statDetail}`}>{detail}</p>
      <p className={`small muted ${styles.definition}`}>{definition}</p>
      {children}
    </section>
  );
}

export function DashboardPage() {
  const { workspace } = useAppStore();
  const [filters, updateFilters] = useFilters();

  if (!workspace.records.length) return <NoDataYet />;

  const records = filterRecords(workspace.records, filters);
  const stats = summarise(records, workspace);
  const activity = activityByPerson(records);
  const hours = activityByHour(records);
  const counterparties = countCounterparties(records, workspace);
  const listLink = (extra) => `/conversations${toQuery({ person: filters.person, sourceType: filters.sourceType, ...extra })}`;

  const needsAttention = records.filter((record) => ATTENTION_STATES.includes(getReviewState(record, workspace)));
  const highPriority = records.filter(
    (record) => ["analysed", "manually_routed"].includes(getReviewState(record, workspace)) && getAnalysis(record, workspace)?.priority === "high",
  );
  const attentionCount = ATTENTION_STATES.reduce((total, key) => total + (stats.reviewCounts[key] ?? 0), 0);
  const latestStart = records.map((record) => record.startedAt).sort().at(-1);
  const busiest = hours.reduce((best, bucket) => (bucket.total > (best?.total ?? 0) ? bucket : best), null);

  const hourColumns = hours.map((bucket) => ({
    key: bucket.hour,
    label: hourLabel(bucket.hour),
    total: bucket.total,
    filled: bucket.withText,
    tooltipTitle: plural(bucket.total, "record"),
    tooltipDetail: `${hourLabel(bucket.hour)}:00–${hourLabel(bucket.hour)}:59 IST · ${bucket.withText} with text · ${plural(bucket.calls, "call")}, ${plural(bucket.meetings, "meeting")}`,
  }));

  const textBySource = [
    { key: "all", label: "All", part: stats.withText, whole: stats.total },
    { key: "calls", label: "Calls", part: stats.callsWithText, whole: stats.calls },
    { key: "meetings", label: "Meetings", part: stats.meetingsWithText, whole: stats.meetings },
  ];

  const personRows = activity.rows.map((row) => ({
    key: `${row.email}-${row.role}`,
    name: row.name,
    sublabel: `${row.role} · ${row.withText} of ${row.total} with text`,
    value: row.total,
    to: `/conversations${toQuery({ person: row.email })}`,
    ariaLabel: `${row.name}, ${row.role}: ${plural(row.total, "record")}, ${row.withText} with text. Show these conversations.`,
  }));

  return (
    <div className="page">
      <section className={styles.hero} aria-labelledby="dashboard-title">
        <div className={styles.heroCopy}>
          <span className="label">Selected activity · Asia/Kolkata</span>
          <h1 id="dashboard-title" className={styles.heroTitle}>
            Calls <TitleChip icon="phone" /> and meetings <TitleChip icon="calendar" tone />
            <span className={styles.heroDate}>
              {activity.dates.length ? `on ${activity.dates.map(formatLongDate).join(", ")}` : "No activity in this filter"}
            </span>
          </h1>
          <p className="muted">
            A deliberate sample of calls and meetings, not the whole team’s day. Each record is counted once by source type and source ID,
            after applying the latest revision.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link to="/data" className="btn btn-secondary btn-icon" aria-label="Data and export" title="Data & export">
            <Icon name="download" />
          </Link>
          <Link to="/brief" className="btn btn-primary">
            Read the manager brief <Icon name="arrowRight" />
          </Link>
        </div>
      </section>

      <FilterBar people={listPeople(workspace.records)} filters={filters} onChange={updateFilters} />

      <div className={styles.bento}>
        <StatCard
          title="Selected records"
          value={stats.total}
          tag={`${stats.calls} calls`}
          meter={{ part: stats.calls, whole: stats.total }}
          detail={`${stats.calls} calls · ${stats.meetings} meetings`}
          definition="Distinct records after revisions. Re-importing a batch never adds to this."
        />
        <StatCard
          tone="highlight"
          title="Usable text coverage"
          value={formatPercent(stats.withText, stats.total)}
          tag={`${stats.withText} of ${stats.total}`}
          meter={{ part: stats.withText, whole: stats.total }}
          detail={`calls ${stats.callsWithText}/${stats.calls} · meetings ${stats.meetingsWithText}/${stats.meetings}`}
          definition="Records with a non-blank call transcript or at least one non-blank meeting turn, ÷ selected records."
        />
        <StatCard
          title="Connected calls"
          value={formatPercent(stats.connectedCalls, stats.callsWithKnownConnection)}
          tag={`${stats.connectedCalls} of ${stats.callsWithKnownConnection}`}
          meter={{ part: stats.connectedCalls, whole: stats.callsWithKnownConnection }}
          detail={`Source-reported · unknown: ${stats.callsWithUnknownConnection}`}
          definition="is_connected = true ÷ calls where is_connected is not null. A stored label, not checked against text."
        />
        <StatCard
          tone="inverse"
          title="Needs attention"
          value={attentionCount}
          tag={`of ${stats.withText} with text`}
          meter={{ part: attentionCount, whole: stats.withText }}
          detail={`${stats.reviewCounts.needs_decision ?? 0} need a decision · ${stats.reviewCounts.analysis_stale ?? 0} stale`}
          definition="Records with text where a person must decide, or whose analysis no longer matches the text."
        >
          <Link to={listLink({ state: "needs_decision" })} className={`btn btn-surface ${styles.statAction}`}>
            Open the decisions <Icon name="arrowRight" />
          </Link>
        </StatCard>

        <section className={`card ${styles.span3}`} aria-labelledby="by-hour">
          <SectionHead
            id="by-hour"
            title="Activity through the day"
            aside={
              <ul className={styles.legend} aria-label="Chart key">
                <li>
                  <span className={styles.keyFilled} aria-hidden="true" />
                  With usable text
                </li>
                <li>
                  <span className={styles.keyOutline} aria-hidden="true" />
                  No usable text
                </li>
              </ul>
            }
          />
          <p className="small muted">Selected records per hour, Asia/Kolkata. Hover or focus a column for the breakdown.</p>
          {hourColumns.length ? (
            <CapsuleChart columns={hourColumns} ariaLabel="Selected records per hour" />
          ) : (
            <p className="muted">No records in this filter.</p>
          )}
          <dl className="stat-strip">
            <div>
              <dt>Calls</dt>
              <dd>{stats.calls}</dd>
            </div>
            <div>
              <dt>Meetings</dt>
              <dd>{stats.meetings}</dd>
            </div>
            <div>
              <dt>With text</dt>
              <dd>{stats.withText}</dd>
            </div>
            <div>
              <dt>Busiest hour</dt>
              <dd>{busiest ? `${hourLabel(busiest.hour)}:00 · ${busiest.total}` : "–"}</dd>
            </div>
          </dl>
          <details className={styles.tableView}>
            <summary>Table view</summary>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Hour (IST)</th>
                    <th scope="col" className="number">Records</th>
                    <th scope="col" className="number">With text</th>
                    <th scope="col" className="number">Calls</th>
                    <th scope="col" className="number">Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((bucket) => (
                    <tr key={bucket.hour}>
                      <td>{hourLabel(bucket.hour)}:00</td>
                      <td className="number">{bucket.total}</td>
                      <td className="number">{bucket.withText}</td>
                      <td className="number">{bucket.calls}</td>
                      <td className="number">{bucket.meetings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <div className={styles.rail}>
          <section className="card" aria-labelledby="text-by-source">
            <SectionHead id="text-by-source" title="Text by source" />
            <ArcGauge rows={textBySource} />
            <ul className={styles.gaugeKey}>
              {textBySource.map((row) => (
                <li key={row.key}>
                  <span>{row.label}</span>
                  <span>
                    <strong>
                      {row.part} of {row.whole}
                    </strong>{" "}
                    <span className="muted">{formatPercent(row.part, row.whole)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <div className={styles.tiles}>
            <Link to={listLink()} className={`card link-card ${styles.tile}`}>
              <strong>Conversations</strong>
              <span className="small muted">{plural(stats.total, "record")}</span>
            </Link>
            <Link to="/brief" className={`card link-card ${styles.tile}`}>
              <strong>Manager brief</strong>
              <span className="small muted">With evidence</span>
            </Link>
          </div>
        </div>

        <section className={`card ${styles.span2}`} aria-labelledby="needs-decision">
          <SectionHead id="needs-decision" title="Needs your decision" aside={<span className="tag">{needsAttention.length}</span>} />
          {needsAttention.length ? (
            <ol className={styles.queue}>
              {needsAttention.map((record, index) => (
                <li key={record.key}>
                  <span className={styles.queueIndex} aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className={styles.queueBody}>
                    <div className={styles.itemHead}>
                      <Link to={conversationLink(record)}>{record.recordRef}</Link>
                      <ReviewBadge state={getReviewState(record, workspace)} />
                    </div>
                    <p className="small">{getAnalysis(record, workspace)?.needsDecision ?? "Text changed or has no analysis — review before acting."}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Nothing is waiting for a decision in this filter.</p>
          )}
        </section>

        <section className={`card ${styles.span2}`} aria-labelledby="high-priority">
          <SectionHead id="high-priority" title="High-priority conversations" aside={<span className="tag">{highPriority.length}</span>} />
          {highPriority.length ? (
            <ul className={styles.contacts}>
              {highPriority.map((record) => (
                <li key={record.key}>
                  <span className={styles.refAvatar}>{record.recordRef}</span>
                  <div>
                    <Link to={conversationLink(record)} className={styles.contactName}>
                      {getAnalysis(record, workspace).counterpartyLabel}
                    </Link>
                    <p className="small muted">{getAnalysis(record, workspace).headline}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No high-priority conversations in this filter.</p>
          )}
        </section>

        <section className={`card ${styles.span2}`} aria-labelledby="by-person">
          <SectionHead id="by-person" title="Records by person" />
          <p className="small muted">
            Listed alphabetically within each role: activity in a selected sample, not a performance ranking. Call reps own calls;
            meeting organisers own calendar entries. An organiser is not assumed to be the salesperson or a speaker, so the same email
            can appear in both roles. Select a row to see those conversations.
          </p>
          <PeopleBars rows={personRows} ariaLabel="Selected records per person and role" />
          <details className={styles.tableView}>
            <summary>Table view by person and day</summary>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th scope="col">Role</th>
                    {activity.dates.map((date) => (
                      <th key={date} scope="col" className="number">
                        {date}
                      </th>
                    ))}
                    <th scope="col" className="number">With text</th>
                    <th scope="col" className="number">Connected (calls)</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.rows.map((row) => (
                    <tr key={`${row.email}-${row.role}`}>
                      <td>
                        <Link to={`/conversations${toQuery({ person: row.email })}`}>{row.name}</Link>
                      </td>
                      <td>{row.role}</td>
                      {activity.dates.map((date) => (
                        <td key={date} className="number">
                          {row.byDate[date] ?? 0}
                        </td>
                      ))}
                      <td className="number">{row.withText}</td>
                      <td className="number">{row.role === "call rep" ? row.connected : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <div className={`${styles.span2} ${styles.stack}`}>
          <section className="card" aria-labelledby="counterparties">
            <SectionHead id="counterparties" title="Who the conversations were with" />
            <p className="small muted">From the analysis of each text. Only prospects count as sales opportunities.</p>
            <MeterList
              ariaLabel="Records per counterparty group"
              rows={Object.entries(COUNTERPARTY_LABELS)
                .filter(([key]) => counterparties[key])
                .map(([key, label]) => ({ key, label, count: counterparties[key] }))}
            />
          </section>

          <section className="card" aria-labelledby="review-states">
            <SectionHead id="review-states" title="Review states" />
            <p className="small muted">Every record has exactly one state; these add up to {stats.total}.</p>
            <MeterList
              ariaLabel="Records per review state"
              rows={Object.keys(REVIEW_STATES)
                .filter((key) => stats.reviewCounts[key])
                .map((key) => ({
                  key,
                  label: (
                    <Link to={listLink({ state: key })} aria-label={`${REVIEW_STATES[key].label}: show these records`}>
                      <ReviewBadge state={key} />
                    </Link>
                  ),
                  description: REVIEW_STATES[key].description,
                  count: stats.reviewCounts[key],
                }))}
            />
          </section>
        </div>

        <section className={`card ${styles.span4}`} aria-labelledby="routes">
          <SectionHead id="routes" title="Routes" />
          <div className={styles.routeSummary}>
            <p className={styles.statValue}>
              {stats.routeAssignments}
              <span className="tag">route assignments</span>
            </p>
            <p className="small muted">
              Across {stats.routedRecords} records · {stats.manualRecords} set manually. A record can go to several routes, so assignments
              can exceed records. Records without usable text get no route.
            </p>
          </div>
          <MeterList
            variant="tiles"
            ariaLabel="Records per route"
            rows={workspace.routes.map((route) => ({
              key: route.id,
              label: <Link to={listLink({ route: route.id })}>{route.label}</Link>,
              description: route.description,
              count: stats.routeCounts[route.id],
            }))}
          />
        </section>
      </div>

      <p className="small muted">
        Latest activity in this view: {latestStart ? toLocalTime(latestStart) : "–"} IST. No deal values or rankings are shown: the data has
        no opportunity table, and the sample is not representative of performance.
      </p>
    </div>
  );
}
