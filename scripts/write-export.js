// Writes the export for the post-update demo state to sample-export/, using the
// same code as the app's "Download export" button.
//   npm run export
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initialBatch from "../src/data/batches/01_initial.json";
import updateBatch from "../src/data/batches/02_update.json";
import { buildExport } from "../src/logic/exportBuilder.js";
import { buildWorkspace } from "../src/logic/workspace.js";
import { appReducer, emptyState } from "../src/store/reducer.js";

const outputFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "sample-export", "revenue-inbox-export");
const at = new Date().toISOString();

let state = appReducer(emptyState, { type: "batchImported", batch: initialBatch, label: "Initial batch", at });
state = appReducer(state, { type: "batchImported", batch: updateBatch, label: "Update batch", at });

const { files, manifest } = buildExport(buildWorkspace(state), at);

rmSync(outputFolder, { recursive: true, force: true }); // full rebuild: no stale files left behind
for (const [path, content] of Object.entries(files)) {
  const target = join(outputFolder, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

console.log(`Wrote ${Object.keys(files).length} files (${manifest.record_count} records, ${manifest.route_assignment_count} route outputs) to sample-export/`);
