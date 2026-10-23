// URL of a conversation's detail page; turn (meetings) opens with that passage highlighted.
export function conversationLink(record, turn) {
  const base = `/conversations/${record.sourceType}/${record.sourceId}`;
  return turn ? `${base}?turn=${turn}` : base;
}
