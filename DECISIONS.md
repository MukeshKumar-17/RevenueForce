# Decisions, findings and AI usage

Supporting notes for the [README](README.md).

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

## Known limitations

- State is per browser. A reviewer on another device starts from the demo state.
- New text with no prepared analysis shows as *needs analysis*. There is no in-app editor for writing a new analysis.
- Turn citations use the 1-based position in the supplied `turns` array. Timecodes are shown but not used as IDs.

## AI usage

**Tool:** Claude (Anthropic), through Claude Code in the Claude desktop app. No AI runs inside the app: everything it shows is computed from the two deliveries or read from files prepared before runtime.

**What the AI did:**
- Read the brief, the data contract and all 18 text-covered conversations, then drafted the routing, the per-conversation analysis, the evidence quotes, the three findings and the manager brief (`src/data/analysis.json`, `src/data/brief.json`).
- Wrote most of the code: import rules, metrics, routing, export, the React pages, the tests and `scripts/check-analysis.js`.
- Applied the design kit, drafted this README and the slides, and ran the Vercel deploys.

**What I decided and directed:**
- The stack (React, Vite, Vercel) and the scope. An AI-built hosted backend was removed because the brief does not need one, and an AI-proposed "coaching by person" view was rejected as an extra.
- Changes after clicking through the app myself: people listed alphabetically so the list never reads as a ranking, light mode by default, the dashboard layout, the navigation and the wording of the slides.
- Checking the work against the assignment PDF, section by section.

**How the AI output was checked:**
- `npm run check-analysis` confirms that each of the 120 quotes in the prepared analysis appears word for word in the cited turn of the source text. It does not prove that the reading of a conversation is right; that relies on review.
- `npm test` (15 tests) replays the import contract: a shuffled repeat, the update, a late older batch, and a manual route that survives later imports.
- The full replay was repeated by hand on the deployed site: 44 records throughout, 17 then 18 with text, repeats ignored, M07 replaced by the update, the manual route kept after a refresh.
- [Add anything else you checked by hand, for example which conversations you read yourself against the AI's analysis.]

**Limits of the AI-prepared content:**
- Priority, counterparty type and route choices are judgements drafted by the AI. The quotes behind them are verified; the judgements are not independently validated.
- New or changed text gets no analysis until someone writes one (it shows as *needs analysis* or *stale*).

**Unfinished:** the phone layout of the redesigned dashboard is stacked but not tuned, and there is no in-app editor for writing a new analysis.
