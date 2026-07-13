# E4 brief — propagate the E3 campaign into the manuscript (10th propagation)

Authoritative data: `experiments/results/raw.json` (PRIMARY, n=25 independent
replicates per cell, harness 2.0, DEFAULT durability), `analysis2.json`,
`raw-writes-relaxed.json` (n=10), `order-fwd.json`/`order-rev.json` (n=5),
`sameplan.json` (n=10), `openloop2.json`, `fanout.json`, `equalcpu.json`,
`warmupcurve.json`, `sameplan-evidence.{json,md}`. Tables in `paper/tables/`
are already regenerated — prose must match them.

## Framing changes (apply everywhere)

1. **Two estimands, named explicitly.** The study answers two questions and
   the text must keep them separate:
   (i) the **default-configuration (idiomatic) effect**: what a practitioner
   gets from each layer used idiomatically with defaults — this is the primary
   estimand behind RQ1–RQ3; and
   (ii) the **controlled same-SQL effect**: what remains when every layer
   executes the identical two-statement SQL with identical row mapping — the
   decomposition control. Do not blur them; results sentences should say which
   estimand they speak to.
2. **Rename "same-plan" → "same-SQL control"** everywhere (labels/refs stay
   `tab:sameplan`). Rationale: statement text is proven byte-identical across
   layers (server-side log capture, both engines), but wire protocols differ
   (see protocol evidence below), so "same SQL, protocol disclosed" is the
   honest claim. Where the old text said "identical two-statement plan",
   say "identical two-statement SQL (and, per engine, identical EXPLAIN
   plans for those statements)".
3. **Writes: DEFAULT durability is now the primary regime.** All headline
   write numbers come from the primary run under vendor-default durability
   (PG `fsync=on, synchronous_commit=on, full_page_writes=on`; MySQL
   `innodb_flush_log_at_trx_commit=1, sync_binlog=1, log_bin=ON`). The
   relaxed regime (all of those off/0) is a labelled SECONDARY
   mechanism-isolation run (n=10, write endpoint only). The old text treated
   relaxed as primary — invert that. Disclose that the previously reported
   configuration relaxed PG fully but left MySQL's binlog fsyncing
   (`sync_binlog=1`), and that the new relaxed regime is symmetric.
4. Measurement dates: primary campaign 2026-07-12/13. Same host, same pinned
   versions as before (PostgreSQL 18.4, MySQL 9.7.1).

## Primary medians (req/s, median of 25; p99 ms in parentheses)

point_read/postgres: pg-tuned=6851(9) pg=6695(9) prisma=6051(12) knex=5096(12) drizzle=4555(13) typeorm=4331(14) objection=4070(15) sequelize=3532(16) mikroorm=2185(26)
point_read/mysql: prisma=5993(11) mysql2=4337(16) mysql2-tuned=4302(14) knex=3837(15) typeorm=3517(16) objection=3222(18) drizzle=3168(20) sequelize=2746(21) mikroorm=1839(31)
range_scan/postgres: prisma=3963(17) pg-tuned=3811(17) pg=3782(18) knex=3163(19) drizzle=2905(20) objection=2669(22) typeorm=2546(25) sequelize=2426(24) mikroorm=773(74)
range_scan/mysql: prisma=3936(18) mysql2=3231(21) mysql2-tuned=3216(18) knex=2952(20) objection=2514(23) typeorm=2474(24) drizzle=2265(28) sequelize=2074(27) mikroorm=729(79)
deep_fetch/postgres: pg-tuned=3813(18) pg=3741(20) prisma=3685(18) knex=2491(27) drizzle=2080(31) typeorm=1327(45) objection=1037(55) sequelize=989(60) mikroorm=571(106)
deep_fetch/mysql: prisma=3701(18) mysql2-tuned=2436(25) mysql2=2405(29) knex=2050(30) drizzle=1446(43) typeorm=1170(50) sequelize=893(65) objection=860(67) mikroorm=535(113)
aggregation/postgres: prisma=7893(9) pg-tuned=7731(9) pg=7035(10) drizzle=6427(11) typeorm=6127(12) knex=5754(12) mikroorm=5279(14) sequelize=4807(15) objection=3775(18)
aggregation/mysql: prisma=7383(9) typeorm=4371(17) mysql2=4195(17) mysql2-tuned=4194(17) knex=3945(17) drizzle=3944(18) mikroorm=3590(19) sequelize=3390(19) objection=2963(22)
write/postgres: pg-tuned=6280(12) pg=6064(11) prisma=5465(14) knex=4693(14) drizzle=4230(14) objection=3926(15) sequelize=2668(21) typeorm=2595(24) mikroorm=1571(37)
write/mysql: mysql2=809(138) mysql2-tuned=808(135) drizzle=796(138) knex=795(135) objection=787(140) sequelize=772(135) typeorm=732(152) prisma=714(154) mikroorm=663(153)

## Inferential results (analysis2.json; seeded bootstrap, 95% CI)

- Native-relative spreads (native driver ÷ slowest, medians of 25):
  point 3.06x [2.97,3.16] PG / 2.36x [2.31,2.43] MySQL;
  range 4.89x [4.77,4.99] / 4.43x [4.34,4.52];
  deep 6.55x [6.43,6.66] / 4.50x [4.42,4.59];
  aggregation 1.86x [1.83,1.89] / 1.42x [1.40,1.44] (slowest = objection);
  write 3.86x [3.77,3.98] / 1.22x [1.20,1.24].
  (Old numbers 6.3/4.4, 3.5/2.6, 5.5/4.9, 1.6/1.5, 4.7/1.3 — replace all.)
- pg–prisma deep fetch on PG: formal **TOST equivalence at ±5%**
  (ratio 0.985, 90% CI [0.974, 0.998]) — report as an equivalence test now,
  not only a failed-difference test.
- RQ2 cross-engine rank stability (Spearman rho with bootstrap CI, Kendall tau;
  Freedman–Lane permutation F for layer×engine interaction, all p_perm=0.0005):
  point 0.89 [0.89,0.96] tau 0.81; range 0.89 [0.86,0.89] tau 0.81;
  deep 0.96 [0.96,0.96] tau 0.90; aggregation 0.89 [0.89,0.96] tau 0.81;
  **write 0.43 [0.36,0.61] tau 0.43** — read rankings transfer across engines,
  the write ranking does not.
- Efficiency (req per CPU-second, deep/PG): pg 3741, knex 2491, drizzle 2080,
  typeorm 1264, objection 1037, sequelize 989, prisma 740, mikroorm 571.
- Dispersion: max CV 7.6% (PG, pg/write) and 6.6% (MySQL, knex/write);
  max relative MAD 5.4% (pg/write/postgres).
- One lost replicate: knex/postgres/write has n=24 (replicate 16's dedicated
  write boot hit a health-check timeout right after the physical rebuild;
  449/450 write boots succeeded; the runner records and skips).

## Same-SQL control (n=10 medians; table regenerated)

- Idiomatic deep-fetch spread collapses on the identical SQL:
  PG max/min 1.76x (top prisma 4342, bottom sequelize 2472);
  MySQL 2.21x (top prisma 4220, bottom sequelize 1912).
  (The table's caption states the native-relative same-SQL spread — quote the
  caption's numbers when referring to the table.)
- MikroORM: idiomatic 571 vs same-SQL 2868 on PG → ratio 0.20 (a 5.0x
  strategy+hydration cost); MySQL 535 vs 2172 → 0.25 (4.1x).
- Prisma's raw path is the fastest same-SQL cell on both engines (4342/4220).
- New low end: sequelize's raw facility (`sequelize.query`) is the slowest
  same-SQL path on both engines — statement dispatch/marshalling overhead in
  the raw API itself, worth one sentence, no over-claiming.
- No-DB Express+JSON floor: 10909 (PG server) / 10921 (MySQL server) req/s.

## Wire-protocol evidence (results/sameplan-evidence.{json,md})

Captured server-side (PG `log_statement=all`; MySQL `general_log=TABLE`),
marker-synchronized so connection handshakes are excluded; per layer exactly
the two control statements, byte-identical across layers on both engines.
Protocols: PostgreSQL — all layers use the extended protocol with prepared
statements EXCEPT MikroORM (simple protocol, client-side literal inlining).
MySQL — all layers use the text protocol except mysql2-tuned and Prisma
(binary protocol / server-side prepared statements). EXPLAIN ANALYZE plans
of both control statements recorded per engine (identical statements →
identical plans per engine). Cite as evidence, tie to the same-SQL rename.

## Durability pair (primary vs relaxed; tab:durability regenerated)

Relaxed÷default write throughput ratios (n=10 vs n=25 medians):
PG: pg 1.14, pg-tuned 1.14, knex 1.11, drizzle 1.11, objection 1.08,
prisma 1.04, typeorm 1.03, mikroorm 1.02, sequelize 0.99 (median +8%).
MySQL: 1.19–1.24 across all layers (median +20%).
Mechanism sentence: at 50 concurrent connections group commit amortizes
per-commit flushes, so default durability costs PG at most 14% (native) and
~0–4% on layer-bound ORMs; MySQL pays ~20% for its double flush path
(redo + binlog) yet remains ~7.5x below PG absolutely (809 vs 6064 native).
The engine contrast is therefore NOT an artifact of relaxed durability; under
defaults it is slightly larger. MySQL write p99 under defaults is ~135–155 ms
across layers (per-commit binlog+redo fsync), versus 11–24 ms on PG.

## Order-invariance A/B (order-fwd/order-rev.json)

Write endpoint, n=5 forward vs n=5 reversed cell order: rev/fwd throughput
ratio across all 18 cells min 0.970, max 1.021, median 1.004 → no detectable
history effects; supports the shuffled-order protocol.

## Warm-up justification (warmupcurve.json)

Per-second throughput from cold boot (PG): pg stabilizes after ~3 s, Prisma
~4 s, MikroORM ~13 s (criterion: 5 s rolling mean within ±2% of last-10 s
mean). The primary protocol therefore uses a 15 s warm-up per endpoint —
exceeding the slowest measured stabilization with margin. (Old text said 3 s
warm-up chosen by convention — replace with this evidence-based choice.)

## Fan-out sweep (fanout.json; PG numbers, medians of 3)

Deep fetch on posts with exactly 0/1/10/50/100/500 comments; max/min layer
spread grows monotonically: 5.9x, 5.8x, 7.1x, 9.8x, 11.4x, 16.1x.
Leader flips from Prisma (small graphs, ≤10) to pg (≥50 comments) — hydration
cost scales with materialized rows. The primary workload's ~10-comment graph
sits near the LOW end: the headline spreads are conservative with respect to
graph size. MySQL sweep also measured (same qualitative shape).

## Equal-CPU control (equalcpu.json; deep/PG, medians of 3)

Server confined with taskset to 1/2/4 cores (DB and load generator on
disjoint cores): pg 3663/3277/3700; prisma 896/1726/3025; mikroorm
463/577/542. pg reaches full throughput on ONE core; Prisma needs ~4 to
approach it (4.1x slower than pg on an equal one-core budget). This directly
quantifies the CPU subsidy behind Prisma's throughput parity: cores-for-
throughput, corroborating the 498% CPU reading and the efficiency column.

## CO-corrected open loop (openloop2.json; PG, 5 layers x 250–4000 req/s)

Native undici-based constant-arrival harness; latency measured from the
INTENDED send time (coordinated-omission-corrected), timeouts (>10 s hard
cap) clipped into the distribution. Below saturation the corrected tails are
flat and small: pg/prisma p99 ≤ 2–4 ms up to 2000 req/s (both achieve the
offered rate to 1999x); knex p99 33 ms at 2000. Saturation: pg achieves 3697
of 4000 (p99 1.20 s), prisma 3501 (2.11 s), knex 2448 (9.4 s), sequelize
collapses at 2000 (achieves 772, half the requests time out; at 4000 achieves
536 with 46489/60000 timeouts), mikroorm collapses at 1000 (achieves 488,
2484 timeouts; at 4000 achieves 259 with 53315 timeouts). Message: rank
order matches the closed-loop result and the penalty for the heavy data-mapper
ORMs is catastrophic under constant arrival once offered load crosses their
capacity. Replaces the old autocannon overallRate table (openloop.tex already
regenerated; old caveat "not formally CO-corrected" must be REMOVED —
this one is).

## Pool/GC observability (new columns in raw.json)

Per-cell GC count/pause totals and pool sampler aggregates (200 ms cadence):
e.g. deep/PG native shows pool_used_avg ≈ 10 (pool fully utilized) and
pool_pending_max ≈ 39–40 with 50 generator connections — direct evidence of
the closed-loop pool queue (50 conns > pool 10) already discussed as a design
property. Use one sentence in methodology (observability) + one in the
pool-queue discussion; do not build a table.

## Harness 2.0 disclosures (methodology/threats)

- **Byte-identical canonical responses**: every adapter funnels rows through
  shared canonical constructors; `bench/verify.mjs` asserts full JSON byte
  equality of 12 probes per adapter (incl. thread == thread-raw) against the
  native baseline on BOTH engines before any measurement. Response payloads
  are byte-identical across layers AND engines (fixed TZ=UTC, ISO-8601
  timestamps).
- **Drizzle defect found by the byte check** (disclose as 4th cross-check
  catch): the PG schema declared `created_at` as timestamp WITHOUT time zone
  while the column is timestamptz, so drizzle/PG responses carried instants
  shifted by the host's UTC offset — invisible to throughput, caught only by
  byte-level verification. Fixed before the campaign (`withTimezone: true`).
- **Paired request streams**: the id sequence for every (endpoint, replicate)
  is generated by a seeded PRNG keyed on (endpoint, replicate) only, so every
  layer and engine serves the IDENTICAL request stream in every replicate
  (blocking/pairing); first ids of each stream are archived
  (traces-sample.json).
- **Physical write-state rebuild**: before every write measurement the
  database is rebuilt physically — PG `DROP DATABASE` + `CREATE DATABASE ...
  TEMPLATE bench_seed` (file-level copy of the seeded state), MySQL `DELETE`
  of benchmark rows + `OPTIMIZE TABLE` (InnoDB rebuild) + `AUTO_INCREMENT`
  pin, a disclosed approximation. The write endpoint is measured in a
  DEDICATED server boot after the rebuild.
- **Treatment-level CPU accounting**: server CPU is the full process TREE
  (parent + descendants) sampled from /proc; database and load-generator CPU
  are reported separately. Prisma 5.22's engine is an in-process Node-API
  library (no child processes; ~30 native threads), so its 498% is genuinely
  the treatment's cost.
- **Port allocator** skips 3306/5432 (a prior replicate loss traced to a
  server landing on the MySQL port); one write boot still failed its health
  check (the n=24 cell above).
- **Virtualized host disclosure**: the host is a 16-vCPU single-NUMA VM
  (cloud instance); absolute numbers reflect that substrate. Threats must say
  this plainly (new).
- Teardown-phase connection errors appear in logs AFTER measurement windows
  (server SIGTERM races the last keep-alive requests); in-window error/
  timeout/non-2xx counters are all zero across the campaign — state this.

## Style rules (unchanged from IST pass)

American spelling; past tense for the performed campaign; no em-dashes; no
informalisms; "Fig.~" non-initial; neutral vendor tone; hedge only where the
data hedges. Do not touch Related Work or citations. Keep \tabledir, labels,
and refs intact. Prefer REPLACING sentences over adding; the body budget is
~15,000 words and is already tight — where a new experiment needs space, cut
the superseded text (the old pinned-cores table/prose is REPLACED by
equalcpu; the old 3-regime durability table/prose is REPLACED by the
default-vs-relaxed pair; the old open-loop caveats are REPLACED).
The `pinned.tex` table is dropped from the manuscript.
