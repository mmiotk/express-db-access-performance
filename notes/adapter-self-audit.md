# Result-blind author adapter self-audit

Status: author review only; this is not the independent R7 review.

On 23 July 2026, before accepting any corrected-state campaign result, the
author inspected adapter warnings, query construction, logging settings,
serial request patterns, and canonicalization boundaries without consulting
the emerging rankings.

## Finding ASA-01 — Knex MySQL insert warning on the timed path

- File: `experiments/src/adapters/knex.mjs`
- Finding: passing Knex's PostgreSQL-style returning argument to MySQL caused
  `.returning() is not supported by mysql` to be emitted once per insert.
- Evidence: the rejected pilot produced 44,907 warnings in fewer than two
  campaign repetitions.
- Disposition: construct the same parameterized insert for both engines, call
  `.returning('id')` only on PostgreSQL, and use MySQL's returned insert ID on
  MySQL. The treatment and SQL operation are unchanged; per-request console I/O
  is removed.
- Validation: write-state admission passed for all nine compatible adapters on
  each engine; exact campaign-state preflight passed afterwards.
- Measurement disposition: the pilot was rejected, its partial JSON preserved
  with an `aborted-knex-warning` name, and the 25-repetition campaign restarted
  from repetition 1.

The first restart was also rejected before completing one repetition. It
remeasured only four patterns and would therefore have combined corrected
server instrumentation with historical point-read measurements. Its log is
preserved as `experiments/rejected/rq2-campaign2-aborted-four-pattern-mix.log`.
The next campaign restarted from repetition 1 and remeasured all five
patterns in one campaign; ASA-02 below caused that partial campaign to be
rejected as well.

## Finding ASA-02 — unused raw-builder lookup on MikroORM aggregation path

- File: `experiments/src/adapters/mikroorm.mjs`
- Finding: `authorSummary` obtained the underlying Knex handle with
  `getKnex?.()` and immediately discarded it before executing the declared raw
  aggregation. The lookup was not needed for semantics, SQL construction, or
  pooling and was performed once per timed request.
- Disposition: remove the lookup and associated dead comment; remove dead
  imports/helpers from the other adapter modules without changing any executed
  query path. The selected API, SQL, round-trip count, mapping, and output remain
  unchanged.
- Measurement disposition: reject the partial campaign after one complete block
  and part of repetition 2, preserve its log, partial JSON, environment record,
  and source manifest under `experiments/rejected/`, rerun all admission gates,
  and restart the full campaign from repetition 1.
- Validation: 21 unit tests, 73,080 specification-derived checks, 60,800
  randomized differential comparisons, fixed probes, write-state admission, exact
  campaign-state preflight, and the 662-row seed-parity gate all passed before
  the restarted campaign entered repetition 1.

## Finding ASA-03 — independent runner accepted a missing replicate

- File: `experiments/bench/runner.mjs`
- Finding: a pre-warm-up server-health timeout for the MySQL native-driver write
  block in replicate 16 was logged, but the independent runner caught the error,
  continued, and returned exit code 0. The resulting row carried 24 rather than
  25 samples.
- Disposition: reject the complete campaign; do not append a late sample. The
  runner now retries only a failed server start before warm-up once, records the
  rejected start, fails closed after a second startup failure or any timed
  request failure, and validates the exact roster and sample count after every
  replicate and before final output.
- Validation: a one-cell positive smoke test completed with the correct roster,
  and a negative test with two deliberately occupied ports recorded both failed
  starts and exited code 1 without writing a final results JSON. Both engineering
  tests are preserved under `experiments/rejected/runner-failclosed-tests-20260724`.

## Post-campaign reproduction finding ASA-04 — write verifier advanced allocators

- File: `experiments/bench/verify-writes.mjs`
- Finding: the state-level verifier removed every temporary row but did not
  restore the PostgreSQL post sequence (or either engine's comment allocator).
  A post-verification campaign-state check therefore observed `300020` instead
  of the declared next post identifier `300001`.
- Impact: none on the accepted measurements. Their campaign runner performs an
  exact row-and-post-allocator reset before and after every insert block, and
  both accepted campaign manifests preserve the earlier verifier bytes.
- Disposition: the current standalone verifier now restores both post and
  comment allocators in a `finally` block, including after a failed check.
  Exact 42-file archives under `experiments/measurement-source-snapshots/`
  preserve the code and admission evidence actually used by each campaign.
- Validation: after explicit normalization, all 18 adapter--engine write
  admissions passed and a subsequent campaign-state check passed on both
  engines with zero stray posts and next identifier `300001`.

## Result-blind coverage record

| Adapter family | Deep-fetch treatment checked | Engine branch / pool / logging checked | Avoidable per-request work found | Disposition |
|---|---|---|---|---|
| pg / pg-tuned | two parameterized joins; named preparation only in tuned baseline | PostgreSQL pool 10; no query logging | none | pass |
| mysql2 / mysql2-tuned | two parameterized joins; binary preparation only in tuned baseline | MySQL pool 10; no query logging | none | pass |
| Knex | two builder joins | pg/mysql2 clients; pool 10 | MySQL insert warning path (ASA-01) | corrected; pilot rejected |
| Drizzle | core-builder joins under the frozen tie-break | node-postgres/mysql2; pool 10 | none | pass |
| Prisma | documented `include`; raw path checked separately | official pg/MariaDB adapters; pool 10 | one unused module-local helper | dead helper removed; no timed path changed |
| Sequelize | documented `include`, `separate: false` | PostgreSQL/MySQL; logging false; pool 10 | none | pass |
| TypeORM | documented `relations` join loading | PostgreSQL/MySQL; logging false; pool 10 | none | pass |
| Objection | documented `withGraphFetched` | Knex pg/mysql2; pool 10 | none | pass |
| MikroORM | documented `populate` joined strategy; per-request EM fork | PostgreSQL/MySQL; debug false; pool 10 | discarded `getKnex?.()` lookup in aggregation (ASA-02) | corrected; partial campaign rejected |

The audit also checked request-local identity maps, ordering, raw-path parameter
binding, graph construction boundaries, transaction APIs, and dialect-specific
insert-ID handling. No other adapter-local logging, debug mode, unconditional
cross-dialect `returning`, redundant graph regrouping, or serial per-row loop was
found on a primary timed path. Transactional-write loops are declared secondary
treatments, not part of the single-row insert result. This author audit reduces
identified confounds but does not satisfy R7, which requires a reviewer other
than the implementer.
