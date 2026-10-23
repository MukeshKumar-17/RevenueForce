import { summarise } from "./metrics.js";
import { makeKey, sortByStartTime, toLocalDate, toLocalTime } from "./records.js";
import { REVIEW_STATES, getAnalysis, getAnalysisFreshness, getLinkedRecords, getReviewState, getRouteReasons, getRouting } from "./routing.js";
import { findSourceConflicts } from "./sourceChecks.js";

// File names keep record_ref for readability, but the source_id is what makes them unique.
function fileStem(record) {
  return record.recordRef ? `${record.recordRef}_${record.sourceId}` : record.sourceId;
}

export function recordFilePath(record) {
  return `records/${record.sourceType}/${fileStem(record)}.md`;
}

export function routeFilePath(record, routeId) {
  return `routes/${routeId}/${fileStem(record)}.md`;
}

function formatCitation(record, citation) {
  const where = record.sourceType === "meeting" ? `${record.recordRef} turn ${citation.turn}` : record.recordRef;
  return `${where}: "${citation.quote}"`;
}

function bulletList(items) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function formatNextSteps(steps) {
  return bulletList(steps.map((step) => `${step.action} — owner: ${step.owner ?? "not stated"}${step.status ? ` (${step.status})` : ""}`));
}

function evidenceSection(record, analysis) {
  return `## Evidence\n${bulletList(analysis.evidence.map((item) => `${item.shows} — ${formatCitation(record, item)}`))}`;
}

// Each route gets the part of the analysis that is useful at that destination.
function routeBody(routeId, record, analysis) {
  switch (routeId) {
    case "deal_followup":
    case "partner_channel":
      return [
        `## What happened\n${analysis.whatHappened}`,
        `## Next steps\n${formatNextSteps(analysis.nextSteps)}`,
        `## Not established\n${bulletList(analysis.notEstablished)}`,
        evidenceSection(record, analysis),
      ];
    case "customer_followup":
      return [`## What happened\n${analysis.whatHappened}`, `## Open items\n${formatNextSteps(analysis.nextSteps)}`, evidenceSection(record, analysis)];
    case "account_risk":
      return [`## Risk\n${analysis.risk ?? analysis.whyItMatters}`, evidenceSection(record, analysis)];
    case "sales_coaching":
      return [`## Coaching\n${bulletList(analysis.coaching.map((item) => `[${item.kind}] ${item.point} — ${formatCitation(record, item)}`))}`];
    case "product_feedback":
      return [`## Product items\n${bulletList(analysis.productFeedback.map((item) => `${item.point} — ${formatCitation(record, item)}`))}`];
    case "contact_update":
      return [`## Contact notes\n${bulletList(analysis.contactNotes)}`, `## Next steps\n${formatNextSteps(analysis.nextSteps)}`];
    case "internal_vendor_note":
      return [
        `## Note\n${analysis.whatHappened}\n\n${analysis.whyItMatters}`,
        `## Next steps\n${formatNextSteps(analysis.nextSteps)}`,
        `## Not established\n${bulletList(analysis.notEstablished)}`,
      ];
    default:
      return [`## Log\n${analysis.headline}`];
  }
}

function renderRouteFile(record, routeId, routing, workspace) {
  const label = (id) => workspace.routeLabels[id] ?? id;
  const otherRoutes = routing.routes.filter((id) => id !== routeId).map(label);
  const lines = [
    `# ${label(routeId)} — ${record.recordRef ?? record.sourceId}`,
    `Source record: [${recordFilePath(record)}](../../${recordFilePath(record)}) · ${record.sourceType} ${record.sourceId} · revision ${record.revision}`,
    `Route set by: ${routing.source}${otherRoutes.length ? ` · Also routed to: ${otherRoutes.join(", ")}` : ""}`,
  ];

  const why = getRouteReasons(record, workspace).find((item) => item.route === routeId);
  if (why) lines.push(`Why this route: ${why.text}${why.citation ? ` (${formatCitation(record, why.citation)})` : ""}`);
  lines.push("");

  if (getAnalysisFreshness(record, workspace) !== "current") {
    lines.push("No current analysis for this record's text. Open the source record before acting.");
  } else {
    const analysis = getAnalysis(record, workspace);
    lines.push(`**${analysis.headline}**`, "", routeBody(routeId, record, analysis).join("\n\n"));
  }
  return lines.join("\n") + "\n";
}

function renderRecordFile(record, workspace) {
  const label = (id) => workspace.routeLabels[id] ?? id;
  const routing = getRouting(record, workspace);
  const freshness = getAnalysisFreshness(record, workspace);
  const analysis = getAnalysis(record, workspace);
  const reviewState = getReviewState(record, workspace);
  const { person } = record;

  const lines = [
    `# ${record.recordRef ?? ""} ${record.title}`.trim(),
    "",
    `- Identity: ${record.sourceType} / ${record.sourceId}`,
    `- Applied revision: ${record.revision} (batch ${record.batchId})`,
    `- Start: ${toLocalDate(record.startedAt)} ${toLocalTime(record.startedAt)} Asia/Kolkata`,
    `- ${person.role}: ${person.name}${person.name !== person.email ? ` <${person.email}>` : ""}`,
    `- Usable supplied text: ${record.hasUsableText ? "yes" : "no"}`,
    `- Review state: ${REVIEW_STATES[reviewState].label} — ${REVIEW_STATES[reviewState].description}`,
    `- Analysis freshness: ${freshness}`,
    `- Routes (${routing.source}): ${routing.routes.map(label).join(", ") || "none"}`,
  ];
  if (routing.source === "manual") {
    lines.push(`- Suggested routes (not in effect): ${routing.suggested.map(label).join(", ") || "none"}`);
    if (routing.decision.note) lines.push(`- Manager note: ${routing.decision.note}`);
  }
  for (const routeId of routing.routes) lines.push(`- Output: [${routeFilePath(record, routeId)}](../../${routeFilePath(record, routeId)})`);

  const conflicts = findSourceConflicts(record);
  if (conflicts.length) lines.push("", "## Source field conflicts", bulletList(conflicts));

  for (const link of getLinkedRecords(record, workspace)) {
    lines.push("", "## Possibly related", `${link.others.map((item) => item.ref).join(", ")} — ${link.note}`);
  }

  if (freshness === "current") {
    lines.push(
      "",
      `## Summary\n**${analysis.headline}**\n\n${analysis.whatHappened}\n\nWhy it matters: ${analysis.whyItMatters}`,
      "",
      evidenceSection(record, analysis),
      "",
      `## Not established\n${bulletList(analysis.notEstablished)}`,
      "",
      `## Next steps\n${formatNextSteps(analysis.nextSteps)}`,
    );
    if (analysis.needsDecision) lines.push("", `## Decision needed\n${analysis.needsDecision}`);
    if (analysis.sourceLabelNote) lines.push("", `## Source labels\n${analysis.sourceLabelNote}`);
  } else if (freshness === "stale") {
    lines.push("", "## Analysis", "The prepared analysis was written for different text and is withheld until reviewed.");
  }
  return lines.join("\n") + "\n";
}

function renderBrief(brief, workspace) {
  const stats = summarise(workspace.records, workspace);
  const lines = [
    `# Manager brief — ${brief.date} (${brief.timezone})`,
    "",
    `Prepared in advance. ${brief.preparedFrom.note}`,
    "",
    `Activity at export time: ${stats.total} selected records (${stats.calls} calls, ${stats.meetings} meetings); ${stats.withText} with usable supplied text.`,
  ];
  for (const section of brief.sections) {
    lines.push("", `## ${section.title}`);
    for (const item of section.items) {
      const sources = item.refs.map((ref) => {
        const record = workspace.recordsByKey[makeKey(ref.sourceType, ref.sourceId)];
        const label = ref.turn ? `${ref.ref} turn ${ref.turn}` : ref.ref;
        return record ? `[${label}](../${recordFilePath(record)})` : label;
      });
      lines.push(`- ${item.text} (${sources.join(", ")})`);
    }
  }
  return lines.join("\n") + "\n";
}

function toCsv(rows) {
  const columns = Object.keys(rows[0] ?? {});
  const escape = (value) => {
    const text = Array.isArray(value) ? value.join(" | ") : String(value ?? ""); // reasons can contain ";" so use " | "
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n") + "\n";
}

const README = `# Revenue Inbox export

- manifest.json / manifest.csv — one row per source record (all records, including those without text).
- records/<source_type>/<ref>_<source_id>.md — the full picture for one record. This is the home of each conversation.
- routes/<route>/<ref>_<source_id>.md — the part of the analysis that matters for that destination.
  A conversation with several routes has one file per route; each links back to its record file and names the other routes.
- daily/<date>_manager-brief.md — shared daily brief that references several records.

Every export is a full rebuild of the current state, so paths are stable and a route that was removed has no active file.
Routes in each manifest row show whether they were suggested (prepared analysis) or set manually.
`;

// Builds every export file from the current workspace. Returns { files: { path: text }, manifest }.
export function buildExport(workspace, generatedAt) {
  const files = {};
  const rows = [];

  for (const record of sortByStartTime(workspace.records)) {
    const routing = getRouting(record, workspace);

    files[recordFilePath(record)] = renderRecordFile(record, workspace);
    const routePaths = routing.routes.map((routeId) => {
      const path = routeFilePath(record, routeId);
      files[path] = renderRouteFile(record, routeId, routing, workspace);
      return path;
    });

    rows.push({
      source_type: record.sourceType,
      source_id: record.sourceId,
      record_ref: record.recordRef,
      applied_revision: record.revision,
      batch_id: record.batchId,
      local_start: `${toLocalDate(record.startedAt)} ${toLocalTime(record.startedAt)}`,
      person: record.person.email,
      person_role: record.person.role,
      usable_text: record.hasUsableText,
      review_state: getReviewState(record, workspace),
      routes: routing.routes,
      route_reasons: getRouteReasons(record, workspace).map((item) => `${item.route}: ${item.text}`),
      route_source: routing.source,
      manual_override: routing.source === "manual",
      suggested_routes: routing.suggested,
      analysis_freshness: getAnalysisFreshness(record, workspace),
      analysis_revision: getAnalysis(record, workspace)?.analysedRevision ?? null,
      record_path: recordFilePath(record),
      output_paths: routePaths,
    });
  }

  const sharedOutputs = [];
  if (workspace.brief) {
    const briefPath = `daily/${workspace.brief.date}_manager-brief.md`;
    files[briefPath] = renderBrief(workspace.brief, workspace);
    const briefSources = workspace.brief.sections.flatMap((section) =>
      section.items.flatMap((item) => item.refs.map((ref) => makeKey(ref.sourceType, ref.sourceId))),
    );
    sharedOutputs.push({ path: briefPath, kind: "manager_brief", source_records: [...new Set(briefSources)] });
  }

  const manifest = {
    generated_at: generatedAt,
    timezone: "Asia/Kolkata",
    record_count: rows.length,
    route_assignment_count: rows.reduce((total, row) => total + row.routes.length, 0),
    records: rows,
    shared_outputs: sharedOutputs,
  };

  files["manifest.json"] = JSON.stringify(manifest, null, 2) + "\n";
  files["manifest.csv"] = toCsv(rows);
  files["README.md"] = README;

  return { files, manifest };
}
