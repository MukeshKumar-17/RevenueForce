import { makeKey } from "./records.js";
import { canonicalText, fingerprintText } from "./sourceText.js";

// Checks the delivery envelope before anything is applied.
export function findBatchProblems(batch) {
  const problems = [];
  if (!batch || typeof batch !== "object" || Array.isArray(batch)) return ["File is not a JSON object."];
  if (typeof batch.batch_id !== "string") problems.push("Missing batch_id.");
  if (!Number.isInteger(batch.revision)) problems.push("revision must be a whole number.");
  if (!Array.isArray(batch.records)) problems.push("records must be an array.");
  return problems;
}

function startTimeOf(item) {
  // Calls use started_at, meetings use starts_at (see data dictionary).
  return item.source_type === "call" ? item.payload?.started_at : item.payload?.starts_at;
}

function isValidSourceRecord(item) {
  return (
    (item?.source_type === "call" || item?.source_type === "meeting") &&
    typeof item.source_id === "string" &&
    item.payload?.id === item.source_id &&
    Boolean(startTimeOf(item))
  );
}

// Fields every screen needs, worked out once when the record is stored.
function toStoredRecord(item, batch) {
  const isCall = item.source_type === "call";
  const transcriptPayload = item.transcript_payload ?? null;
  const text = canonicalText(item.source_type, item.payload, transcriptPayload);

  return {
    key: makeKey(item.source_type, item.source_id),
    sourceType: item.source_type,
    sourceId: item.source_id,
    recordRef: item.record_ref ?? null,
    revision: batch.revision,
    batchId: batch.batch_id,
    payload: item.payload, // replaced whole on a newer revision
    transcriptPayload, // replaced whole, nulls included
    startedAt: startTimeOf(item),
    // Call reps and meeting organisers are different roles; an organiser is not assumed to be the seller.
    person: isCall
      ? { email: item.payload.rep_email ?? "unknown", name: item.payload.rep_name ?? item.payload.rep_email ?? "unknown", role: "call rep" }
      : { email: item.payload.organizer_email ?? "unknown", name: item.payload.organizer_email ?? "unknown", role: "meeting organiser" },
    title: isCall ? `${item.payload.direction ?? "unknown"} call` : item.payload.title ?? "Untitled meeting",
    hasUsableText: text !== "",
    textFingerprint: fingerprintText(text),
    unavailableReason: transcriptPayload?.unavailable_reason ?? null,
  };
}

// Applies one delivery and returns new records plus a summary (DATA_CONTRACT.md):
// key by (source_type, source_id); a higher revision replaces the whole record;
// the same or an older revision is ignored, so repeats never add records.
export function applyBatch(currentRecords, batch) {
  const records = { ...currentRecords };
  const summary = { batchId: batch.batch_id, revision: batch.revision, received: batch.records.length, added: 0, updated: 0, ignored: 0, rejected: 0 };

  for (const item of batch.records) {
    if (!isValidSourceRecord(item)) {
      summary.rejected++;
      continue;
    }

    const key = makeKey(item.source_type, item.source_id);
    const existing = records[key];
    if (existing && existing.revision >= batch.revision) {
      summary.ignored++;
      continue;
    }

    records[key] = toStoredRecord(item, batch);
    if (existing) summary.updated++;
    else summary.added++;
  }

  return { records, summary: { ...summary, totalAfter: Object.keys(records).length } };
}

// Fisher–Yates shuffle, used to show that record order does not matter.
export function shuffleBatch(batch) {
  const shuffled = [...batch.records];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { ...batch, records: shuffled };
}
