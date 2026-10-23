# Revenue Inbox

A workspace for a sales manager. It has:

- a dashboard of the day's selected calls and meetings;
- routing of each conversation to where its output belongs, with a stated reason and manual corrections;
- a manager brief for 21 Aug 2026;
- safe re-imports that never double count;
- a zipped export with a manifest.

**Live app:** https://revenueforce.vercel.app

React 18 + Vite, deployed as a static site on Vercel. Styled with the **Optical Garden** theme from the design kit in [`src/design/`](src/design/DESIGN.md) (tokens, `ui.css` components, `stipple.js` dot artwork), with light and dark mode. No backend: the brief says "No database is required", and the app keeps its state in the browser's `localStorage`, which the data contract allows.

## Run it

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # replay, numbers, routing and export tests (Vitest)
npm run check-analysis   # every quoted passage still exists in the source text
npm run export           # writes the post-update export to sample-export/
npm run build            # static build in dist/
```

The first visit opens in the final post-update state (both deliveries imported). For a clean start, go to **Data & export → Reset everything**, then replay the steps below. Each browser keeps its own workspace.

## Reproduce the replay checks

On **Data & export**:

1. **Reset everything**, then **Import initial batch** → 44 records, 17 with text.
2. **Import initial again, shuffled** → the import log shows 0 added, 44 ignored. Still 44.
3. **open M07** → tick a route, **Save manual route**.
4. **Import update batch** → 0 added, 1 updated. 18 with text. M07 is at revision 2.
5. **Import initial again** → 44 ignored (older revision). M07 stays at revision 2.
6. Refresh the browser → counts, M07's text and its manual route are unchanged. M07 shows the new suggested routes next to the manual route still in effect. **Use suggestion** resets it.

The same sequence runs automatically in `src/logic/logic.test.js`.

## Where outputs go

**Data & export → Download export (.zip)** produces `revenue-inbox-export/`. A generated copy of the post-update state is included in [`sample-export/revenue-inbox-export/`](sample-export/revenue-inbox-export/), written by `npm run export` with the same code.

```
manifest.json, manifest.csv              one row per source record (all 44)
records/<type>/<ref>_<source_id>.md      everything about one record
routes/<route>/<ref>_<source_id>.md      the part of the analysis that destination needs, with why the record is there
daily/2026-08-21_manager-brief.md        shared brief; its source records are listed in the manifest
README.md                                explains the structure
```

A conversation with several routes gets one file per route. Each route file links back to the record file and names the other routes. Every export is a full rebuild with stable paths, so a removed route leaves no active file behind.

The manifest has these fields:
- identity and revision: `source_type`, `source_id`, `record_ref`, `applied_revision`, `batch_id`;
- context: `local_start`, `person`, `person_role`, `usable_text`;
- routing and review: `review_state`, `routes`, `route_reasons`, `route_source`, `manual_override`, `suggested_routes`;
- analysis: `analysis_freshness`, `analysis_revision`;
- files: `record_path`, `output_paths`.

## Metric definitions

All counts are **selected records**: distinct `(source_type, source_id)` after applying the latest revision. All activity falls on 21 Aug 2026, Asia/Kolkata.

| Metric | Definition |
|---|---|
| Selected records | Distinct records in the current filter. Re-imports never add. |
| Usable text coverage | Non-blank call `transcript`, or ≥1 non-blank meeting turn, ÷ selected records. |
| Connected calls (source-reported) | `is_connected = true` ÷ calls where `is_connected` is not null. Unknowns are shown separately. This is a stored label, not checked against the text. |
| Needs attention | Records with text whose state is *needs decision*, *analysis stale* or *needs analysis*. |
| Route assignments | Sum of routes over records. One record can have several, so this can exceed the record count. |
| Activity by person | Call reps (`rep_email`) and meeting organisers (`organizer_email`) are separate roles. An organiser is not assumed to be the seller. |
| Activity through the day (chart) | Selected records per local hour (Asia/Kolkata), from the first to the last active hour; empty hours show as zero. Each capsule's dashed outline is every record in that hour; the filled part is the records with usable text. |
| Text by source (gauge) | Usable text coverage for all records, calls and meetings, one ring each; the exact counts are listed beside it. |
| Records by person (chart) | Selected records per person and role; the label adds how many have usable text. Listed alphabetically within each role: activity in a selected sample, not a performance ranking. |

Charts use one data colour, mapped from theme tokens and checked with a palette validator for light and dark mode. The two activity charts have a table view; every other mark (capsule meters, rings, bars) sits beside its numbers written as text.

## What is prepared in advance vs computed

**Prepared in advance** (`src/data/analysis.json`, `src/data/brief.json`):
- the analysis for each conversation: summary, evidence quotes, next steps and coaching;
- the suggested routes, each with a one-line reason and a supporting quote;
- the written items in the brief.

These were drafted with AI before runtime and checked against the source with `npm run check-analysis`, which verifies all 120 quotes.

**Computed in the app:**
- imports and revision handling;
- all metrics, review states, and intake states for records without text;
- source-field conflict flags, and whether each cited quote still exists;
- routing (manual routes beat suggestions);
- the export and manifest.

**When source text changes:** each analysis stores a fingerprint of the exact text it was written for. If a newer revision changes the text, the app marks the analysis **stale**. It withholds the old analysis and its suggested routes, but keeps any manual route. After someone has reviewed or rewritten the analysis, `npm run stamp-analysis` records it against the new text.

## Three most important findings

**1. Customers ask for credit and are offered prepaid, in a new deal and in an existing account.**
- **Noticed:** the Asterloom prospect was surprised the cards are prepaid. Cedarwave, an existing customer facing a forced card migration, says credit is its main issue.
- **Evidence:** M03 turn 6 "Wait, these are prepaid?" and M04 turn 11 "At some stage we will have to consider another option for that."
- **Where it shows in the product:**
  - M04 gets the **Account risk** route; its reason cites turn 11.
  - Both meetings get **Product feedback**, with reasons citing M03 turn 6 and M04 turn 10.
  - The manager brief has a "Product themes" item and a coaching line on stating the funding model first.
  - M04 is in the dashboard's "Needs your decision" list.

**2. Stored outcome labels overstate intent, so routing never uses them.**
- **Noticed:**
  - C10 is labelled `follow_up`, but the contact refused a follow-up call.
  - C05 is labelled `follow_up` for a polite brush-off.
  - C02 is `is_conversation = true`, yet only a receptionist was reached.
- **Evidence:**
  - C10: "No. I said I will contact you if there is anything to discuss."
  - C05: "If we ever decide to change the providers we already have, we could consider it then."
  - C02: "It looks as though she isn't in the office today."
- **Where it shows in the product:**
  - Suggested routes come only from the reading of the text (`getRouting` in `src/logic/routing.js`), never from `observed_outcome`.
  - The conversation page shows **Source labels** next to **Our reading**.
  - C10 is routed to **Contact update** ("refused outbound follow-up"), and C02 to **Log only**.
  - The dashboard labels the connection rate "source-reported".

**3. Only half the text-covered conversations are sales to prospects, so counting them all as pipeline would be wrong.**
- **Noticed:** 9 of the 18 are prospects. The rest are customers (M04, M07, M09), partners (M01, C07), a supplier SpendNest is buying from (M02), internal training (M10) and calls where nobody was reached (C02, C04). M02 even mentions pipeline.
- **Evidence:** M02 turn 10 "We are seeing larger prospects in our pipeline", in a meeting where SpendNest is the buyer (turn 1).
- **Where it shows in the product:**
  - The dashboard panel **Who the conversations were with** breaks the conversations down by type.
  - M02 and M10 are routed to **Internal / vendor**, with reasons citing M02 turn 1 and M10 turn 3.
  - The brief has a section "Not counted as sales activity".
  - No deal values are shown anywhere.

## Decision deliberately rejected: merging M13 into M04

- **The alternative:** treat M13 ("SpendNest <> Cedarwave Distribution – Migration discussion") as a duplicate of M04 and count one meeting. They share the company, the organiser (`team09@example.com`), an overlapping time slot (M13 14:00–15:00 IST, M04 14:30–15:00 IST) and the migration topic.
- **Why I rejected it:** the source IDs differ, and the data contract says identity is `(source_type, source_id)` and titles are not a dedup key. M13 has no transcript to compare against, and its times and duration differ from M04's. A silent merge would hide a real calendar record.
- **The trade-off:** meeting activity shows 14, and may count one real-world meeting twice.
- **What the product does instead:**
  - M04 and M13 each show a **Possibly related (unconfirmed)** panel.
  - M13 is marked *Not captured*.
  - M04's "decision needed" note asks the manager to judge the link.
  - The export's record files carry the same note.

A second choice: the brief says "No database is required", so the app keeps its state in `localStorage` rather than on a server. I built and then removed a hosted-database version. Each reviewer gets their own clean workspace and the dataset is not exposed through an API. The cost is that state does not follow you to another device.

## Project layout

```
src/
  data/        the two supplied deliveries, prepared analysis, brief, route list
  logic/       plain functions: import rules, metrics, routing, export, checks (+ tests)
  store/       reducer and localStorage persistence
  pages/       Dashboard, Conversations, Conversation detail, Brief, Data & export
  components/  filter bar, badges, route editor and reasons, transcript, analysis panel
  hooks/       URL-backed filters
  utils/       links, zip download
scripts/       check-analysis.js (verify quotes / stamp fingerprints), write-export.js (sample export)
sample-export/ generated export for the post-update state
```

## Known limitations

- State is per browser. A reviewer on another device starts from the demo state.
- New text with no prepared analysis shows as *needs analysis*. There is no in-app editor for writing a new analysis.
- Turn citations use the 1-based position in the supplied `turns` array. Timecodes are shown but not used as IDs.

## AI usage and time spent

_To be completed by the candidate: how AI tools were used, what was checked by hand, and approximate hours._
