import { describe, expect, it } from "vitest";
import initialBatch from "../data/batches/01_initial.json";
import updateBatch from "../data/batches/02_update.json";
import { appReducer, emptyState } from "../store/reducer.js";
import { buildExport } from "./exportBuilder.js";
import { shuffleBatch } from "./importBatch.js";
import { activityByHour, summarise } from "./metrics.js";
import { makeKey } from "./records.js";
import { getAnalysisFreshness, getReviewState, getRouteReasons, getRouting } from "./routing.js";
import { buildWorkspace } from "./workspace.js";

const M07 = initialBatch.records.find((item) => item.record_ref === "M07");
const M07_KEY = makeKey(M07.source_type, M07.source_id);

const importInto = (state, batch) => appReducer(state, { type: "batchImported", batch, label: "test", at: "2026-08-22T00:00:00Z" });
const saveRoute = (state, routes, note) => appReducer(state, { type: "routesSaved", key: M07_KEY, routes, note, at: "2026-08-22T00:00:00Z" });
const textCount = (state) => Object.values(state.records).filter((record) => record.hasUsableText).length;

// The DATA_CONTRACT.md replay, returning the state after each step.
function runReplay() {
  const afterInitial = importInto(emptyState, initialBatch);
  const afterRepeat = importInto(afterInitial, shuffleBatch(initialBatch));
  const afterCorrection = saveRoute(afterRepeat, ["account_risk"], "test");
  const afterUpdate = importInto(afterCorrection, updateBatch);
  const afterLateInitial = importInto(afterUpdate, initialBatch);
  const afterRestart = JSON.parse(JSON.stringify(afterLateInitial)); // same as saving to and loading from localStorage
  return { afterInitial, afterRepeat, afterUpdate, afterLateInitial, afterRestart };
}

describe("import replay (DATA_CONTRACT.md)", () => {
  const steps = runReplay();

  it("initial import holds each record once, with 17 usable texts", () => {
    expect(Object.keys(steps.afterInitial.records)).toHaveLength(44);
    expect(textCount(steps.afterInitial)).toBe(17);
    const workspace = buildWorkspace(steps.afterInitial);
    expect(getReviewState(workspace.recordsByKey[M07_KEY], workspace)).toBe("text_pending");
  });

  it("repeating the batch in a different order adds nothing", () => {
    expect(Object.keys(steps.afterRepeat.records)).toHaveLength(44);
    expect(steps.afterRepeat.importLog.at(-1)).toMatchObject({ added: 0, updated: 0, ignored: 44 });
  });

  it("the update applies the late transcript to the existing record", () => {
    expect(Object.keys(steps.afterUpdate.records)).toHaveLength(44);
    expect(textCount(steps.afterUpdate)).toBe(18);
    expect(steps.afterUpdate.records[M07_KEY].revision).toBe(2);
    expect(steps.afterUpdate.importLog.at(-1)).toMatchObject({ added: 0, updated: 1 });
  });

  it("the update leaves every other record untouched", () => {
    for (const [key, record] of Object.entries(steps.afterRepeat.records)) {
      if (key !== M07_KEY) expect(steps.afterUpdate.records[key]).toEqual(record);
    }
  });

  it("an older revision arriving later is ignored", () => {
    expect(steps.afterLateInitial.records[M07_KEY].revision).toBe(2);
    expect(steps.afterLateInitial.importLog.at(-1)).toMatchObject({ ignored: 44 });
  });

  it("the manual route survives the update, the late import and a restart", () => {
    const workspace = buildWorkspace(steps.afterRestart);
    const record = workspace.recordsByKey[M07_KEY];
    expect(getRouting(record, workspace)).toMatchObject({ source: "manual", routes: ["account_risk"], suggested: ["customer_followup", "product_feedback"] });
    expect(getAnalysisFreshness(record, workspace)).toBe("current");
    expect(getReviewState(record, workspace)).toBe("manually_routed");
  });

  it("resetting the route returns to the suggestion", () => {
    const state = appReducer(steps.afterRestart, { type: "routesReset", key: M07_KEY });
    const workspace = buildWorkspace(state);
    expect(getRouting(workspace.recordsByKey[M07_KEY], workspace).source).toBe("suggested");
  });
});

describe("analysis freshness", () => {
  it("changed text makes the analysis stale and drops its suggestion, but keeps the manual route", () => {
    const changedTurns = [{ speaker: "Customer A", text: "Different text." }];
    const revision3 = {
      batch_id: "test-003",
      revision: 3,
      records: [{ ...updateBatch.records[0], transcript_payload: { ...updateBatch.records[0].transcript_payload, turns: changedTurns } }],
    };
    const workspace = buildWorkspace(importInto(runReplay().afterRestart, revision3));
    const record = workspace.recordsByKey[M07_KEY];

    expect(getAnalysisFreshness(record, workspace)).toBe("stale");
    expect(getReviewState(record, workspace)).toBe("analysis_stale");
    expect(getRouting(record, workspace)).toMatchObject({ source: "manual", suggested: [] });
  });
});

describe("dashboard numbers after both batches", () => {
  const workspace = buildWorkspace(importInto(importInto(emptyState, initialBatch), updateBatch));
  const stats = summarise(workspace.records, workspace);

  it("matches hand-checked counts", () => {
    expect(stats).toMatchObject({ total: 44, calls: 30, meetings: 14, withText: 18, callsWithText: 10, meetingsWithText: 8 });
    expect(stats).toMatchObject({ connectedCalls: 11, callsWithKnownConnection: 30, callsWithUnknownConnection: 0 });
    expect(stats).toMatchObject({ routedRecords: 18, routeAssignments: 32 });
  });

  it("hourly chart data covers every record, with quiet hours kept as zero", () => {
    const hours = activityByHour(workspace.records);
    expect(hours.reduce((sum, bucket) => sum + bucket.total, 0)).toBe(44);
    expect(hours.reduce((sum, bucket) => sum + bucket.withText, 0)).toBe(18);
    expect(hours.map((bucket) => bucket.hour)).toEqual(Array.from({ length: hours.length }, (_, i) => hours[0].hour + i));
  });

  it("gives every record exactly one review state", () => {
    expect(Object.values(stats.reviewCounts).reduce((sum, count) => sum + count, 0)).toBe(44);
  });

  it("gives every route in effect a stated reason", () => {
    for (const record of workspace.records) {
      for (const item of getRouteReasons(record, workspace)) expect(item.text).not.toBe("No reason recorded.");
    }
  });
});

describe("export", () => {
  const workspace = buildWorkspace(runReplay().afterRestart);
  const { files, manifest } = buildExport(workspace, "test");

  it("lists every record once and every listed output exists", () => {
    expect(manifest.record_count).toBe(44);
    expect(new Set(manifest.records.map((row) => `${row.source_type}:${row.source_id}`)).size).toBe(44);
    for (const row of manifest.records) {
      expect(files[row.record_path]).toBeDefined();
      for (const path of row.output_paths) expect(files[path]).toBeDefined();
    }
    for (const output of manifest.shared_outputs) expect(files[output.path]).toBeDefined();
  });

  it("writes only the manual route for a corrected record, with the manager's reason", () => {
    const row = manifest.records.find((item) => item.source_id === M07.source_id);
    expect(row).toMatchObject({ manual_override: true, routes: ["account_risk"], route_reasons: ["account_risk: test"], applied_revision: 2 });
    expect(Object.keys(files).some((path) => path.startsWith("routes/customer_followup/M07_"))).toBe(false);
  });

  it("produces identical paths when exported twice", () => {
    expect(Object.keys(buildExport(workspace, "again").files).sort()).toEqual(Object.keys(files).sort());
  });
});
