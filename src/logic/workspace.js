import analysisData from "../data/analysis.json";
import briefData from "../data/brief.json";
import routeCatalogue from "../data/routes.json";
import { makeKey } from "./records.js";

// Prepared analyses keyed like records ("type:id").
const analyses = analysisData.conversations.map((entry) => ({
  ...entry,
  key: makeKey(entry.sourceType, entry.sourceId),
  recordRef: entry.ref,
}));

// Combines the saved state with the bundled reference data into one object the screens read.
export function buildWorkspace(state) {
  const byKey = (items) => Object.fromEntries(items.map((item) => [item.key, item]));
  const records = Object.values(state.records);
  const decisions = Object.entries(state.routeOverrides).map(([key, decision]) => ({ key, ...decision }));

  return {
    records,
    recordsByKey: state.records,
    analysesByKey: byKey(analyses),
    decisions,
    decisionsByKey: byKey(decisions),
    importRuns: [...state.importLog].reverse(), // newest first
    routes: routeCatalogue,
    routeLabels: Object.fromEntries(routeCatalogue.map((route) => [route.id, route.label])),
    links: analysisData.links,
    brief: briefData,
  };
}
