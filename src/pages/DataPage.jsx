import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ReviewBadge, RouteTags } from "../components/Badges.jsx";
import { SectionHead, TitleChip } from "../components/SectionHead.jsx";
import { Toast } from "../components/Toast.jsx";
import { buildExport } from "../logic/exportBuilder.js";
import { applyBatch, findBatchProblems, shuffleBatch } from "../logic/importBatch.js";
import { summarise } from "../logic/metrics.js";
import { getReviewState, getRouting } from "../logic/routing.js";
import { BUNDLED_BATCHES, useAppStore } from "../store/AppStore.jsx";
import { downloadZip } from "../utils/download.js";
import { conversationLink } from "../utils/links.js";
import styles from "./DataPage.module.css";

const EXPORT_FOLDER = "revenue-inbox-export";

function DotLoader() {
  return (
    <span className="dot-loader" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function DataPage() {
  const { workspace, importBatch, loadDemo, resetEverything, resetRoutes } = useAppStore();
  const [uploadError, setUploadError] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState("");
  const clearToast = useCallback(() => setToast(""), []);

  const stats = summarise(workspace.records, workspace);
  const revisedRecords = workspace.records.filter((record) => record.revision > 1);
  const manualRecords = workspace.decisions.map((decision) => workspace.recordsByKey[decision.key]).filter(Boolean);
  // The contract's replay uses M07; record_ref is only used here to offer a shortcut link.
  const replayExample = workspace.records.find((record) => record.recordRef === "M07");

  // Runs the import, then reports what it did. The summary is worked out the same way the store applies it.
  const importAndReport = (batch, label) => {
    const { summary } = applyBatch(workspace.recordsByKey, batch);
    importBatch(batch, label);
    setToast(`${label}: ${summary.added} added, ${summary.updated} updated, ${summary.ignored} ignored. ${summary.totalAfter} records.`);
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    event.target.value = ""; // allow choosing the same file again
    if (!file) return;
    setIsReadingFile(true);
    try {
      const batch = JSON.parse(await file.text());
      const problems = findBatchProblems(batch);
      if (problems.length) {
        setUploadError(`${file.name}: ${problems.join(" ")} Choose a delivery file with batch_id, revision and records.`);
        return;
      }
      setUploadError("");
      importAndReport(batch, `Uploaded file ${file.name}`);
    } catch {
      setUploadError(`${file.name} is not valid JSON. Choose a delivery file exported as JSON.`);
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Clear all imported records, manual routes and the import log?")) {
      resetEverything();
      setToast("Workspace cleared. Import a batch to start again.");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadZip(buildExport(workspace, new Date().toISOString()).files, EXPORT_FOLDER);
    } finally {
      setIsExporting(false);
    }
  };

  const exportPreview = workspace.records.length ? buildExport(workspace, "preview") : null;

  return (
    <div className="page">
      <div className="page-head">
        <span className="label">Imports, replay and export</span>
        <h1>
          Data <TitleChip icon="database" tone /> &amp; export
        </h1>
        <p className="muted">
          Imports follow the data contract: records are keyed by source type and source ID, a higher revision replaces the whole source
          record, and the same or an older revision is ignored. Manual routes are stored separately and are never touched by an import.
          Everything is saved in this browser.
        </p>
      </div>

      <div className={styles.columns}>
        <section className="card" aria-labelledby="replay-title">
          <SectionHead id="replay-title" title="Replay the import test" />
          <ol className={styles.steps}>
            <li>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => importAndReport(BUNDLED_BATCHES.initial, "Initial batch")}>
                Import initial batch
              </button>
            </li>
            <li>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => importAndReport(shuffleBatch(BUNDLED_BATCHES.initial), "Initial batch again (shuffled order)")}
              >
                Import initial again, shuffled
              </button>
            </li>
            <li>
              Change a route by hand:{" "}
              {replayExample ? <Link to={conversationLink(replayExample)}>open M07</Link> : <span className="muted">import the initial batch first</span>}
            </li>
            <li>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => importAndReport(BUNDLED_BATCHES.update, "Update batch")}>
                Import update batch
              </button>
            </li>
            <li>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => importAndReport(BUNDLED_BATCHES.initial, "Initial batch again (older revision)")}
              >
                Import initial again
              </button>
            </li>
            <li>Refresh the browser. Everything on this page should be unchanged.</li>
          </ol>

          <div className={`field ${uploadError ? "is-error" : ""}`}>
            <label htmlFor="batch-upload">Upload a batch file</label>
            <input
              id="batch-upload"
              className="input"
              type="file"
              accept=".json,application/json"
              onChange={handleUpload}
              aria-describedby="batch-upload-help"
              aria-invalid={uploadError ? "true" : undefined}
              aria-busy={isReadingFile}
            />
            <span id="batch-upload-help" className="help">
              {uploadError || "A JSON delivery with batch_id, revision and records, like the two supplied files."}
            </span>
          </div>

          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={handleReset}>
              Reset everything
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                loadDemo();
                setToast("Demo state loaded: both supplied deliveries imported.");
              }}
            >
              Load demo state
            </button>
          </div>
        </section>

        <section className="card" aria-labelledby="state-title">
          <SectionHead id="state-title" title="Current state" />
          <dl className="stat-strip stat-strip-pairs">
            <div>
              <dt>Unique source records</dt>
              <dd>{stats.total}</dd>
            </div>
            <div>
              <dt>With usable supplied text</dt>
              <dd>{stats.withText}</dd>
            </div>
            <div>
              <dt>Records at revision 2 or later</dt>
              <dd>{revisedRecords.length}</dd>
            </div>
            <div>
              <dt>Records with a manual route</dt>
              <dd>{manualRecords.length}</dd>
            </div>
          </dl>

          {revisedRecords.length > 0 && (
            <>
              <h3>Updated records</h3>
              <ul className="small">
                {revisedRecords.map((record) => (
                  <li key={record.key}>
                    <Link to={conversationLink(record)}>{record.recordRef}</Link> — revision {record.revision} from {record.batchId}{" "}
                    <ReviewBadge state={getReviewState(record, workspace)} />
                  </li>
                ))}
              </ul>
            </>
          )}

          {manualRecords.length > 0 && (
            <>
              <h3>Manual routes</h3>
              <ul className={styles.manualList}>
                {manualRecords.map((record) => (
                  <li key={record.key} className="row">
                    <Link to={conversationLink(record)}>{record.recordRef}</Link>
                    <RouteTags routing={getRouting(record, workspace)} />
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        resetRoutes(record);
                        setToast(`${record.recordRef}: suggested routes restored.`);
                      }}
                    >
                      Use suggestion
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="log-title">
        <SectionHead
          id="log-title"
          title="Import log"
          aside={workspace.importRuns.length > 0 && <span className="tag">{workspace.importRuns.length} imports</span>}
        />
        {workspace.importRuns.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Import</th>
                  <th scope="col">Batch</th>
                  <th scope="col" className="number">Revision</th>
                  <th scope="col" className="number">Received</th>
                  <th scope="col" className="number">Added</th>
                  <th scope="col" className="number">Updated</th>
                  <th scope="col" className="number">Ignored</th>
                  <th scope="col" className="number">Rejected</th>
                  <th scope="col" className="number">Records after</th>
                </tr>
              </thead>
              <tbody>
                {workspace.importRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{new Date(run.importedAt).toLocaleTimeString("en-GB")}</td>
                    <td>{run.label}</td>
                    <td>{run.batchId}</td>
                    <td className="number">{run.revision}</td>
                    <td className="number">{run.received}</td>
                    <td className="number">{run.added}</td>
                    <td className="number">{run.updated}</td>
                    <td className="number">{run.ignored}</td>
                    <td className="number">{run.rejected}</td>
                    <td className="number">{run.totalAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Nothing imported yet. Start with “Import initial batch” above.</p>
        )}
      </section>

      <section className="card" aria-labelledby="export-title">
        <SectionHead id="export-title" title="Export" />
        <p className="small muted">
          Downloads <code>{EXPORT_FOLDER}.zip</code>: a manifest (JSON and CSV) with one row per record, one file per record, one file per
          route assignment, and the daily brief. Each export is a full rebuild of the current state.
        </p>
        {exportPreview ? (
          <>
            <p className="small">
              {Object.keys(exportPreview.files).length} files · {exportPreview.manifest.record_count} records ·{" "}
              {exportPreview.manifest.route_assignment_count} route outputs
            </p>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={handleExport} disabled={isExporting} aria-busy={isExporting}>
                {isExporting && <DotLoader />}
                {isExporting ? "Preparing zip…" : "Download export (.zip)"}
              </button>
            </div>
            <details>
              <summary className={styles.summary}>Preview manifest rows</summary>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Ref</th>
                      <th scope="col">Rev</th>
                      <th scope="col">Review state</th>
                      <th scope="col">Routes</th>
                      <th scope="col">Manual</th>
                      <th scope="col">Analysis</th>
                      <th scope="col">Outputs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportPreview.manifest.records.map((row) => (
                      <tr key={`${row.source_type}:${row.source_id}`}>
                        <td>{row.record_ref}</td>
                        <td>{row.applied_revision}</td>
                        <td>{row.review_state}</td>
                        <td>{row.routes.join(", ") || "–"}</td>
                        <td>{row.manual_override ? "yes" : "no"}</td>
                        <td>{row.analysis_freshness}</td>
                        <td className={`small ${styles.paths}`}>{[row.record_path, ...row.output_paths].join("\n")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <p className="muted">Import data to enable the export.</p>
        )}
      </section>

      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
