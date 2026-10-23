// Confirms a cited quote still exists in the record's current text.
// Meetings cite a 1-based position in the supplied turns array; calls cite a short exact quote.
export function isQuoteInSource(record, citation) {
  if (record.sourceType === "call") {
    return (record.payload.transcript ?? "").includes(citation.quote);
  }
  const turn = record.transcriptPayload?.turns?.[citation.turn - 1];
  return typeof turn?.text === "string" && turn.text.includes(citation.quote);
}
