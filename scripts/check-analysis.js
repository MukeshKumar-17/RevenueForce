// Checks the prepared analysis in src/data/analysis.json against the supplied deliveries.
//   npm run check-analysis   -> verify every quote, every route reason, and that each analysis matches the current text
//   npm run stamp-analysis   -> after a person has reviewed an analysis against new text,
//                               record which text (fingerprint + revision) it was written for
import { readFileSync, writeFileSync } from "node:fs";
import { isQuoteInSource } from "../src/logic/evidence.js";
import { applyBatch } from "../src/logic/importBatch.js";
import { makeKey } from "../src/logic/records.js";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

const shouldStamp = process.argv.includes("--stamp");
const analysisPath = "../src/data/analysis.json";
const analysis = readJson(analysisPath);
const brief = readJson("../src/data/brief.json");

// The same import code the app uses, so fingerprints match exactly.
let records = {};
for (const file of ["01_initial.json", "02_update.json"]) {
  records = applyBatch(records, readJson(`../src/data/batches/${file}`)).records;
}

const problems = [];
let quotesChecked = 0;

for (const entry of analysis.conversations) {
  const record = records[makeKey(entry.sourceType, entry.sourceId)];
  if (!record) {
    problems.push(`${entry.ref}: no source record with this identity`);
    continue;
  }
  if (record.recordRef !== entry.ref) problems.push(`${entry.ref}: record_ref in source is ${record.recordRef}`);

  if (shouldStamp) {
    entry.textFingerprint = record.textFingerprint;
    entry.analysedRevision = record.revision;
  } else if (entry.textFingerprint !== record.textFingerprint) {
    problems.push(`${entry.ref}: analysis was written for different text (stale)`);
  }

  // Every suggested route needs exactly one stated reason.
  const reasonRoutes = (entry.routeReasons ?? []).map((item) => item.route).sort().join();
  if (reasonRoutes !== [...entry.suggestedRoutes].sort().join()) problems.push(`${entry.ref}: route reasons do not match suggested routes`);

  for (const citation of [...entry.evidence, ...entry.coaching, ...entry.productFeedback, ...(entry.routeReasons ?? [])]) {
    quotesChecked++;
    if (record.sourceType === "meeting" && !citation.turn) problems.push(`${entry.ref}: meeting citation without turn number`);
    else if (!isQuoteInSource(record, citation)) problems.push(`${entry.ref}${citation.turn ? ` t${citation.turn}` : ""}: quote not found: "${citation.quote}"`);
  }
}

for (const section of brief.sections) {
  for (const item of section.items) {
    for (const ref of item.refs) {
      const record = records[makeKey(ref.sourceType, ref.sourceId)];
      if (!record) problems.push(`brief: ${ref.ref} not found`);
      else if (ref.turn && !record.transcriptPayload?.turns?.[ref.turn - 1]) problems.push(`brief: ${ref.ref} has no turn ${ref.turn}`);
    }
  }
}

if (shouldStamp) {
  writeFileSync(new URL(analysisPath, import.meta.url), JSON.stringify(analysis, null, 2) + "\n");
  console.log(`Stamped ${analysis.conversations.length} analyses.`);
}

console.log(`Analyses: ${analysis.conversations.length}, quotes checked: ${quotesChecked}, problems: ${problems.length}`);
problems.forEach((problem) => console.log(`  - ${problem}`));
process.exit(problems.length ? 1 : 0);
