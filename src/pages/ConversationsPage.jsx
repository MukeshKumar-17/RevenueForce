import { Link } from "react-router-dom";
import { ReviewBadge, RouteTags } from "../components/Badges.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { FilterBar } from "../components/FilterBar.jsx";
import { NoDataYet } from "../components/NoDataYet.jsx";
import { SectionHead, TitleChip } from "../components/SectionHead.jsx";
import { useFilters } from "../hooks/useFilters.js";
import { filterRecords, listPeople } from "../logic/metrics.js";
import { sortByStartTime, toLocalTime } from "../logic/records.js";
import { REVIEW_STATES, getAnalysis, getAnalysisFreshness, getReviewState, getRouting } from "../logic/routing.js";
import { useAppStore } from "../store/AppStore.jsx";
import { conversationLink } from "../utils/links.js";
import styles from "./ConversationsPage.module.css";

export function ConversationsPage() {
  const { workspace } = useAppStore();
  const [filters, updateFilters] = useFilters();

  if (!workspace.records.length) return <NoDataYet />;

  const rows = sortByStartTime(filterRecords(workspace.records, filters))
    .map((record) => ({
      record,
      routing: getRouting(record, workspace),
      reviewState: getReviewState(record, workspace),
      analysis: getAnalysisFreshness(record, workspace) === "current" ? getAnalysis(record, workspace) : null,
    }))
    .filter((row) => filters.route === "all" || row.routing.routes.includes(filters.route))
    .filter((row) => filters.state === "all" || row.reviewState === filters.state);

  return (
    <div className="page">
      <div className="page-head">
        <span className="label">All source records</span>
        <h1>
          Conversations <TitleChip icon="chat" tone />
        </h1>
        <p className="muted">Every imported record, including those without text. Times are Asia/Kolkata.</p>
      </div>

      <div className={styles.filters}>
        <FilterBar people={listPeople(workspace.records)} filters={filters} onChange={updateFilters} />
        <div className={`field ${styles.select}`}>
          <label htmlFor="filter-route">Route</label>
          <select id="filter-route" className="select select-pill" value={filters.route} onChange={(event) => updateFilters({ route: event.target.value })}>
            <option value="all">Any route</option>
            {workspace.routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.label}
              </option>
            ))}
          </select>
        </div>
        <div className={`field ${styles.select}`}>
          <label htmlFor="filter-state">Review state</label>
          <select id="filter-state" className="select select-pill" value={filters.state} onChange={(event) => updateFilters({ state: event.target.value })}>
            <option value="all">Any state</option>
            {Object.entries(REVIEW_STATES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No conversations match"
          seed={22}
          action={
            <button type="button" className="btn btn-primary" onClick={() => updateFilters({ person: "all", sourceType: "all", route: "all", state: "all" })}>
              Clear filters
            </button>
          }
        >
          None of the {workspace.records.length} records fit this combination of person, source, route and review state.
        </EmptyState>
      ) : (
        <section className="card" aria-labelledby="conversation-list">
          <SectionHead
            id="conversation-list"
            title="Source records"
            aside={
              <span className="tag" aria-live="polite">
                Showing {rows.length} of {workspace.records.length}
              </span>
            }
          />
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Ref</th>
                  <th scope="col">Time</th>
                  <th scope="col">Person</th>
                  <th scope="col">With / about</th>
                  <th scope="col">Routes</th>
                  <th scope="col">Review</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ record, routing, reviewState, analysis }) => (
                  <tr key={record.key}>
                    <td>
                      <Link to={conversationLink(record)}>{record.recordRef ?? record.sourceId.slice(0, 8)}</Link>
                      <p className="small muted">{record.sourceType}</p>
                    </td>
                    <td>{toLocalTime(record.startedAt)}</td>
                    <td>
                      {record.person.name}
                      <p className="small muted">{record.person.role}</p>
                    </td>
                    <td className={styles.about}>
                      {analysis ? analysis.counterpartyLabel : record.title}
                      {analysis && <p className="small muted">{analysis.headline}</p>}
                    </td>
                    <td>
                      <RouteTags routing={routing} />
                    </td>
                    <td>
                      <ReviewBadge state={reviewState} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
