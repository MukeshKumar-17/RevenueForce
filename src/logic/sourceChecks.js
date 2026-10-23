// Flags where stored source fields disagree with each other.
// These are shown to the manager, never silently corrected.
export function findSourceConflicts(record) {
  if (record.sourceType !== "call") return [];

  const call = record.payload;
  const conflicts = [];

  if (call.talk_time_seconds != null && call.talk_time_seconds > call.duration_seconds) {
    conflicts.push(`Talk time (${call.talk_time_seconds}s) is longer than call duration (${call.duration_seconds}s).`);
  }
  if (call.is_connected === true && call.is_conversation === false && call.observed_outcome === "unresponsive") {
    conflicts.push("Marked connected, but also unresponsive and not a conversation.");
  }
  if (call.first_connect_ever === true && call.is_connected === false) {
    conflicts.push("first_connect_ever is true while this call is not connected.");
  }
  return conflicts;
}
