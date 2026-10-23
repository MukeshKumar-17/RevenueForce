# Revenue Inbox export

- manifest.json / manifest.csv — one row per source record (all records, including those without text).
- records/<source_type>/<ref>_<source_id>.md — the full picture for one record. This is the home of each conversation.
- routes/<route>/<ref>_<source_id>.md — the part of the analysis that matters for that destination.
  A conversation with several routes has one file per route; each links back to its record file and names the other routes.
- daily/<date>_manager-brief.md — shared daily brief that references several records.

Every export is a full rebuild of the current state, so paths are stable and a route that was removed has no active file.
Routes in each manifest row show whether they were suggested (prepared analysis) or set manually.
