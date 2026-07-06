# Internal peer review — revision checklist (pre-IST)

Evidence-backed critical review (numbers verified against `results/raw.json`).
Verdict: **major revision** — empirical core sound, harness reproducible, numbers
match data, but the items below block submission. Ordered by priority.

## Needs a (cheap) re-run

- [ ] **M1 (critical): Prisma is not held to pool=10.** `prisma.mjs` uses
      `new PrismaClient()`; `config.mjs connectionUrl()` appends no `connection_limit`.
      Prisma's default pool = `num_cpus*2+1` ≈ **33** on the 16-core host, not 10 — a
      ~3× larger pool for the adapter carrying both headline findings (near-native
      throughput + 485% CPU). **Fix:** append `?connection_limit=10` to the Prisma URL,
      re-run Prisma matrix + scaling cells, reconcile numbers. Stop claiming the pool is
      constant until fixed.
- [ ] **M2: Prisma "5× CPU via Rust engine + threads" is asserted, not measured**, and
      entangled with M1 (bigger pool → more in-flight queries → more CPU). Also DB-side
      CPU is excluded for ALL layers (lives in the postgres/mysqld process). **Fix:** after
      the pool=10 re-run, reframe as correlational app-process CPU; drop/soften the
      "separate engine" mechanism (Prisma 5.22's engine is in-process Node-API + Tokio).

## Text / data fixes (no re-run)

- [ ] **M3: "curves do not cross" is false** (`scaling.json`): at 1 connection the order
      differs (objection 2nd, typeorm 7th) and pg/Prisma swap the lead at 64–128. **Fix:**
      restrict claim to the saturated regime (≥8 conns); keep the true "thin layers reach a
      higher ceiling."
- [ ] **M4: joint p50/p90/p99 is advertised but not delivered.** No p50/p90 table exists;
      p99 shown for only 2/5 patterns (`point_read_p99`, `aggregation_p99`, `write_p99`
      generated but never `\input`). **Fix:** add the 3 missing p99 tables + a p50/p90
      appendix, or reword every "p50/p90/p99 jointly" to "p99 (p50/p90 in the package)."
- [ ] **M5: RQ3 silently drops range_scan** (spread 5.4×/4.6×, larger than point read),
      and "range scan healthy on both engines" is false for MikroORM (PG 676 rps, p99
      263 ms). **Fix:** include range_scan in RQ3 with the MikroORM-collapse caveat.
- [ ] **M6: pitfalls provenance inconsistent** — discussion says the cross-check "caught
      four confounds", methodology/threats say "two defects". OFFSET-slowness and
      write-growth return *correct* results, so a result-equality check can't catch them
      (found via perf debugging). **Fix:** reconcile 2 vs 4; separate correctness catches
      (fan-out, result-shape, aggregation-formulation) from perf-debugging catches.
- [ ] **M7: reproducibility in-paper.** Add a setup + **pinned library-versions** table
      (pg 8.22.0, mysql2 3.22.5, knex 3.3.0, drizzle 0.36.4, prisma 5.22.0, sequelize
      6.37.8, typeorm 0.3.30, objection 3.1.5, mikro-orm 6.6.15, express 4.22.2, autocannon
      7.15.0; Node 24.16.0); acknowledge version currency; deposit + cite Zenodo DOI.

## Minor

- [ ] m1: 10 runs are repeated measures within one server boot (pseudoreplication);
      frame MWU as within-process stability, or reboot per replicate.
- [ ] m2: define "spread" (currently native/slowest); fix "aggregation ranges only 1.8×
      (8,181 … 4,047)" — 8181/4047 = 2.0×.
- [ ] m3: CV/significance/resources tables are PG-only but cited for "all 80 cells" (MySQL
      CV max 7.1%); add MySQL or reword.
- [ ] m4: `highlights.tex` says "6.4x" — must be **6.2×** (Elsevier highlights are published).
- [ ] m5: fill `Authors TBD` in `references.bib` (prisma_rawsql_2025, orm_compare_jcct_2025);
      fritz2021tail "and others".
- [ ] m6: abstract "point reads near layer-agnostic" overstates (3.2×/2.4×); reserve for aggregation.
- [ ] m7: "flat across all nine layers" for MySQL writes → **eight**.
- [ ] m8: `verify.mjs` checks 4/5 endpoints (not write) and key-field projections, not full
      deep equality; reword threats "identical … for every access pattern".
- [ ] m9: `METHODOLOGY.md` stale (PG16/MySQL8.4 → 18.4/9.7.1; durability lives in
      `scripts/db-local.sh`, not docker-compose for the published run).
- [ ] m10: percentile drift — methodology lists p97.5 but it's never reported; pick one set.
- [ ] m11: "full factorial" imprecise (native drivers not crossed with both engines).
- [ ] m12: state per-run duration (4 s), repeats (10), warm-up (2 s), autocannon closed-loop.

## Repetition to trim (verbatim across sections)
deep-fetch description; nine-layer taxonomy list; four-axis gap (intro + related work);
stats-method description; write-isolation; pitfalls list. Keep each once, cross-reference.
Also: `threats.tex` Data-availability paragraph duplicates the frontmatter declaration — drop it.
