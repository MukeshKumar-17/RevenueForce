// The text an analysis is written against, and a fingerprint of it.
// Shared by the app and scripts/check-analysis.js so both use the same rule.

// Calls: the transcript. Meetings: every non-blank turn as "speaker: text", one per line.
export function canonicalText(sourceType, payload, transcriptPayload) {
  if (sourceType === "call") return (payload.transcript ?? "").trim();
  const turns = Array.isArray(transcriptPayload?.turns) ? transcriptPayload.turns : [];
  return turns
    .filter((turn) => typeof turn.text === "string" && turn.text.trim() !== "")
    .map((turn) => `${turn.speaker}: ${turn.text.trim()}`)
    .join("\n");
}

// FNV-1a hash: short and stable, enough to tell when the source text has changed.
export function fingerprintText(text) {
  if (!text) return null;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}
