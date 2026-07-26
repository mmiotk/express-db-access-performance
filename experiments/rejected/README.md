# Rejected measurement pilots

Files here are excluded from every analysis, table, and checksum manifest for
accepted results.

- `rq2-campaign2-aborted-knex-warning.partial.json` is the checkpoint from the
  first four-pattern pilot. Knex/MySQL emitted 44,907 per-insert warnings in
  fewer than two repetitions because a PostgreSQL-only returning option was
  passed on MySQL. The adapter branch was corrected, all write-state checks were
  rerun, and this pilot was rejected.
- `rq2-campaign2-aborted-four-pattern-mix.log` is the next incomplete pilot. It
  was stopped without an error after 30 of 90 would-be cells when the audit
  established that retaining historical point-read data would mix instrument
  versions. The accepted campaign therefore remeasures all five patterns.
- `rq2-campaign2-aborted-fanout-seed-mismatch.partial.json` and its matching
  `.log`, environment records, and source manifest are the third rejected
  pilot. A cross-engine seed audit found that the six fan-out posts had the
  intended comment counts on both engines but different comment-author
  assignments: one advancing PRNG had been consumed first for PostgreSQL and
  then for MySQL. The seeder now materializes the fixture once, resets comment
  identifiers deterministically, and loads identical values into both engines.
  `npm run verify:seed-parity` compares all 662 joined fan-out rows (excluding
  DBMS-generated timestamps) before and after the accepted campaign.

The accepted campaign starts from repetition 1, has a distinct pre/post state
check, and writes only to `results/rq2-campaign2.json`.
