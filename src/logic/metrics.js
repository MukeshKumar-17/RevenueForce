import { toLocalDate, toLocalHour } from "./records.js";
import { getAnalysis, getAnalysisFreshness, getReviewState, getRouting } from "./routing.js";

// filters.person is an email; it matches call reps and meeting organisers alike.
export function filterRecords(records, filters) {
  return records.filter((record) => {
    if (filters.sourceType !== "all" && record.sourceType !== filters.sourceType) return false;
    if (filters.person !== "all" && record.person.email !== filters.person) return false;
    return true;
  });
}

// Everyone who appears as a call rep or meeting organiser, with the roles they appear in.
export function listPeople(records) {
  const people = new Map();
  for (const { person } of records) {
    const entry = people.get(person.email) ?? { email: person.email, name: person.name, roles: new Set() };
    entry.roles.add(person.role);
    if (person.role === "call rep") entry.name = person.name; // prefer the display name over the email
    people.set(person.email, entry);
  }
  return [...people.values()]
    .map((entry) => ({ ...entry, roles: [...entry.roles].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function summarise(records, workspace) {
  const calls = records.filter((record) => record.sourceType === "call");
  const meetings = records.filter((record) => record.sourceType === "meeting");

  const reviewCounts = {};
  const routeCounts = Object.fromEntries(workspace.routes.map((route) => [route.id, 0]));
  let routedRecords = 0;
  let routeAssignments = 0;
  let manualRecords = 0;

  for (const record of records) {
    const state = getReviewState(record, workspace);
    reviewCounts[state] = (reviewCounts[state] ?? 0) + 1;

    const routing = getRouting(record, workspace);
    if (routing.routes.length) routedRecords++;
    if (routing.source === "manual") manualRecords++;
    for (const routeId of routing.routes) {
      routeCounts[routeId] = (routeCounts[routeId] ?? 0) + 1;
      routeAssignments++;
    }
  }

  // Connection rate uses only calls where the source gave a value (null is "unknown", not false).
  const knownConnection = calls.filter((call) => call.payload.is_connected !== null && call.payload.is_connected !== undefined);
  const withText = (list) => list.filter((record) => record.hasUsableText).length;

  return {
    total: records.length,
    calls: calls.length,
    meetings: meetings.length,
    withText: withText(records),
    callsWithText: withText(calls),
    meetingsWithText: withText(meetings),
    connectedCalls: knownConnection.filter((call) => call.payload.is_connected === true).length,
    callsWithKnownConnection: knownConnection.length,
    callsWithUnknownConnection: calls.length - knownConnection.length,
    reviewCounts,
    routeCounts,
    routedRecords,
    routeAssignments,
    manualRecords,
  };
}

// One row per person per role, with a column per local (IST) date.
export function activityByPerson(records) {
  const rows = new Map();
  const dates = new Set();

  for (const record of records) {
    const date = toLocalDate(record.startedAt);
    dates.add(date);

    const rowKey = `${record.person.email}|${record.person.role}`;
    const row = rows.get(rowKey) ?? { ...record.person, byDate: {}, total: 0, withText: 0, connected: 0 };
    row.byDate[date] = (row.byDate[date] ?? 0) + 1;
    row.total++;
    if (record.hasUsableText) row.withText++;
    if (record.sourceType === "call" && record.payload.is_connected === true) row.connected++;
    rows.set(rowKey, row);
  }

  // Alphabetical within each role, so the order never reads as a performance ranking.
  return {
    dates: [...dates].sort(),
    rows: [...rows.values()].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
  };
}

// Records per local (IST) hour, from the first to the last active hour,
// so quiet hours show as empty columns rather than disappearing.
export function activityByHour(records) {
  const buckets = new Map();
  for (const record of records) {
    const hour = toLocalHour(record.startedAt);
    const bucket = buckets.get(hour) ?? { hour, total: 0, withText: 0, calls: 0, meetings: 0 };
    bucket.total++;
    if (record.hasUsableText) bucket.withText++;
    if (record.sourceType === "call") bucket.calls++;
    else bucket.meetings++;
    buckets.set(hour, bucket);
  }
  if (!buckets.size) return [];

  const first = Math.min(...buckets.keys());
  const last = Math.max(...buckets.keys());
  const hours = [];
  for (let hour = first; hour <= last; hour++) {
    hours.push(buckets.get(hour) ?? { hour, total: 0, withText: 0, calls: 0, meetings: 0 });
  }
  return hours;
}

export const COUNTERPARTY_LABELS = {
  prospect: "Prospects",
  customer: "Existing customers",
  partner: "Partners",
  vendor: "Vendors (SpendNest buying)",
  internal: "Internal",
  unreached: "Nobody reached",
  unknown: "Not yet analysed",
  no_text: "No usable text",
};

// Who each conversation was with, taken from a current analysis only.
export function countCounterparties(records, workspace) {
  const counts = {};
  for (const record of records) {
    let kind = "no_text";
    if (record.hasUsableText) {
      kind = getAnalysisFreshness(record, workspace) === "current" ? getAnalysis(record, workspace).counterparty : "unknown";
    }
    counts[kind] = (counts[kind] ?? 0) + 1;
  }
  return counts;
}

export function formatPercent(part, whole) {
  if (!whole) return "–";
  return `${((part / whole) * 100).toFixed(1)}%`;
}
