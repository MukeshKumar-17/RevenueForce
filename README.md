# Revenue Inbox

A sales manager's workspace for the selected calls and meetings of 21 Aug 2026: a dashboard, routing with stated reasons and manual corrections, a manager brief, safe re-imports and a zipped export.

**Live app:** https://revenueforce.vercel.app · Findings, the rejected decision, AI usage and known limits: [DECISIONS.md](DECISIONS.md)

## Setup and run

Needs Node 18 or later.

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # replay, numbers, routing and export tests
npm run check-analysis   # every quoted passage still exists in the source text
npm run build            # static build in dist/
```

No backend: state is kept in the browser's `localStorage`. The app opens in the final post-update state (both deliveries imported). For a clean start: **Data & export → Reset everything**. **Load demo state** imports both batches again.

## Reproduce the replay checks

On **Data & export**:

1. **Reset everything**, then **Import initial batch** → 44 records, 17 with text.
2. **Import initial again, shuffled** → 0 added, 44 ignored. Still 44.
3. **Open M07** → tick a route, **Save manual route**.
4. **Import update batch** → 0 added, 1 updated. 18 with text; M07 is at revision 2.
5. **Import initial again** → 44 ignored (older revision). M07 stays at revision 2.
6. Refresh the browser → counts, M07's text and its manual route are unchanged.

The same sequence runs automatically in `src/logic/logic.test.js` (`npm test`).

## Where outputs are written

**Data & export → Download export (.zip)** downloads `revenue-inbox-export.zip`. `npm run export` writes the same export for the post-update state to [`sample-export/revenue-inbox-export/`](sample-export/revenue-inbox-export/).

```
manifest.json, manifest.csv              one row per source record (all 44)
records/<type>/<ref>_<source_id>.md      everything about one record
routes/<route>/<ref>_<source_id>.md      what that destination needs, and why the record is there
daily/2026-08-21_manager-brief.md        the manager brief
```

## Metric definitions

Each dashboard card also shows its definition under the number. All counts are distinct `(source_type, source_id)` records after applying the latest revision, in Asia/Kolkata time.

| Metric | Definition |
|---|---|
| Selected records | Distinct records in the current filter. Re-imports never add. |
| Usable text coverage | Non-blank call `transcript`, or ≥1 non-blank meeting turn, ÷ selected records. |
| Connected calls | `is_connected = true` ÷ calls where `is_connected` is not null. A stored source label, not checked against the text; unknowns shown separately. |
| Needs attention | Records with text whose state is *needs decision*, *analysis stale* or *needs analysis*. |
| Route assignments | Sum of routes over records; one record can have several. |
| Activity through the day | Records per local hour; the filled part of each column is records with usable text. |
| Records by person | Records per call rep or meeting organiser, listed alphabetically: activity in a sample, not a ranking. |

## Analysis: pre-generated, not generated at runtime

The per-conversation analysis, suggested routes with reasons, and the brief's written items are **prepared in advance** in `src/data/analysis.json` and `src/data/brief.json`. They were drafted with AI and checked with `npm run check-analysis`, which verifies all 120 quotes against the source. Nothing calls AI at runtime.

**Computed in the app:** imports and revisions, all metrics and review states, routing (manual routes beat suggestions) and the export. If a newer revision changes a conversation's text, its analysis is marked **stale** and withheld until reviewed.

## Time spent

About 8 hours.
