// Helpers for a single stored record (see logic/importBatch.js for its shape).
// Usable text, fingerprint, person and start time are worked out once at import.

export const TIME_ZONE = "Asia/Kolkata";

// Identity is the pair (source_type, source_id), never names, refs or array positions.
export function makeKey(sourceType, sourceId) {
  return `${sourceType}:${sourceId}`;
}

// Meeting turns that contain words, numbered by their 1-based position in the supplied array.
export function getUsableTurns(record) {
  const turns = record.transcriptPayload?.turns ?? [];
  return turns
    .map((turn, index) => ({ ...turn, number: index + 1 }))
    .filter((turn) => typeof turn.text === "string" && turn.text.trim() !== "");
}

// Why a record has no usable text. Only called when record.hasUsableText is false.
export function getIntakeState(record) {
  if (record.sourceType === "call") return "metadata_only";
  if (record.payload.recording_status !== "recorded") return "not_captured";
  if (/nobody spoke|no speech/i.test(record.unavailableReason ?? "")) return "no_speech";
  // Recorded and flagged as having a transcript, but no turns delivered yet.
  return record.payload.has_transcript ? "text_pending" : "no_speech";
}

const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false });

export function toLocalDate(isoTime) {
  return dateFormat.format(new Date(isoTime)); // en-CA gives YYYY-MM-DD
}

export function toLocalTime(isoTime) {
  return timeFormat.format(new Date(isoTime));
}

const hourFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hourCycle: "h23" });

// Local (IST) hour of the day, 0–23.
export function toLocalHour(isoTime) {
  return Number(hourFormat.format(new Date(isoTime)));
}

// "2026-08-21" -> "Friday 21 August 2026"
export function formatLongDate(localDate) {
  const noonInIndia = new Date(`${localDate}T12:00:00+05:30`); // noon avoids any date-boundary shift
  return noonInIndia.toLocaleDateString("en-GB", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function sortByStartTime(records) {
  return [...records].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}
