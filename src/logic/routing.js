import { getIntakeState, makeKey } from "./records.js";

export const REVIEW_STATES = {
  analysed: { label: "Analysed", tone: "ok", description: "Usable text with a current analysis and suggested routes." },
  needs_decision: { label: "Needs decision", tone: "warn", description: "The evidence cannot settle something; a person must decide." },
  manually_routed: { label: "Manually routed", tone: "info", description: "A manager has set the routes." },
  analysis_stale: { label: "Analysis stale", tone: "warn", description: "Source text changed after the analysis was written." },
  needs_analysis: { label: "Needs analysis", tone: "warn", description: "Usable text with no prepared analysis yet." },
  text_pending: { label: "Text pending", tone: "muted", description: "Source says a transcript exists, but no text has been delivered." },
  no_speech: { label: "No speech", tone: "muted", description: "Recorded, but nobody spoke." },
  not_captured: { label: "Not captured", tone: "muted", description: "Notetaker cancelled or never scheduled; the meeting may still have happened." },
  metadata_only: { label: "Metadata only", tone: "muted", description: "Background call with no supplied text." },
};

export function getAnalysis(record, workspace) {
  return workspace.analysesByKey[record.key] ?? null;
}

// "current" only when the analysis was written for exactly the text the record now holds.
export function getAnalysisFreshness(record, workspace) {
  if (!record.hasUsableText) return "not_applicable";
  const analysis = getAnalysis(record, workspace);
  if (!analysis) return "missing";
  return analysis.textFingerprint === record.textFingerprint ? "current" : "stale";
}

// Manual routes always win over suggestions; a new source revision never clears them.
export function getRouting(record, workspace) {
  const decision = workspace.decisionsByKey[record.key] ?? null;
  const suggested = getAnalysisFreshness(record, workspace) === "current" ? getAnalysis(record, workspace).suggestedRoutes : [];

  if (decision) return { routes: decision.routes, source: "manual", suggested, decision };
  return { routes: suggested, source: suggested.length ? "suggested" : "none", suggested, decision: null };
}

// Why each route in effect applies: the manager's note for manual routes,
// otherwise the prepared reason with its supporting quote.
export function getRouteReasons(record, workspace) {
  const routing = getRouting(record, workspace);
  const analysis = getAnalysisFreshness(record, workspace) === "current" ? getAnalysis(record, workspace) : null;
  const prepared = Object.fromEntries((analysis?.routeReasons ?? []).map((item) => [item.route, item]));

  return routing.routes.map((routeId) => {
    if (routing.source === "manual") {
      return {
        route: routeId,
        by: "manager",
        text: routing.decision.note || "Chosen by the manager; no note given.",
        citation: prepared[routeId] ?? null, // supporting quote when the analysis also backs this route
      };
    }
    return { route: routeId, by: "analysis", text: prepared[routeId]?.reason ?? "No reason recorded.", citation: prepared[routeId] ?? null };
  });
}

export function getReviewState(record, workspace) {
  if (!record.hasUsableText) return getIntakeState(record);

  const freshness = getAnalysisFreshness(record, workspace);
  if (freshness === "missing") return "needs_analysis";
  if (freshness === "stale") return "analysis_stale";
  if (workspace.decisionsByKey[record.key]) return "manually_routed";
  if (getAnalysis(record, workspace).needsDecision) return "needs_decision";
  return "analysed";
}

// Records connected by a candidate-proposed (unconfirmed) relationship.
export function getLinkedRecords(record, workspace) {
  return workspace.links
    .filter((link) => link.records.some((item) => makeKey(item.sourceType, item.sourceId) === record.key))
    .map((link) => ({
      note: link.note,
      others: link.records.filter((item) => makeKey(item.sourceType, item.sourceId) !== record.key),
    }));
}
