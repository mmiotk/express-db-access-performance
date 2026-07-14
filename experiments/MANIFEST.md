# Artifact manifest — table/figure provenance

Every table and figure in the paper is generated from a raw result file by a
committed script. To reproduce the tables from the archived raw data:

```
cd experiments
node bench/runner.mjs                 # (re-measures; or use the archived results/raw.json)
ENGINE=postgres node bench/analyze.mjs
ENGINE=mysql    node bench/analyze.mjs   # cv_mysql copied from cv_all under ENGINE=mysql
node scripts/stats2.mjs               # inferential JSON (results/analysis2.json)
node scripts/gen-tables.mjs           # durability, equalcpu, cpu trade-off
node scripts/sameplan.mjs             # (re-measures same-SQL; or use results/sameplan.json)
OL_ENGINE=postgres node scripts/openloop2.mjs   # open loop (PostgreSQL, Table S6)
OL_ENGINE=mysql    node scripts/openloop2.mjs   # open loop (MySQL);  gen-openloop-mysql.mjs -> S17
node scripts/altloading.mjs           # alt eager-loading sensitivity (S18)
node scripts/waitevents.mjs           # MySQL insert commit-flush wait events (S19; root perf_schema)
# after ./scripts/db-local.sh stop && start:  node scripts/postreboot.mjs; gen-postreboot.mjs -> S20
npm run sync:tables                   # copy results/tables/*.tex -> ../paper/tables/
```

## Main-text tables and figures

| Paper label | File | Generator | Input data |
|---|---|---|---|
| `tab:deep_fetch`, `tab:write` | `deep_fetch.tex`, `write.tex` | `bench/runner.mjs` (`texTableCombined`) | `results/raw.json` |
| `tab:resources_main` | `resources_main.tex` | `bench/analyze.mjs` (`resourceMainTable`) | `results/raw.json` |
| `tab:outcomes` | `outcomes.tex` | hand-authored (analysis-plan map) | — |
| `tab:patterns` | inline in `sections/methodology.tex` | hand-authored | — |
| `tab:significance` | `significance_deep_fetch.tex` | `bench/analyze.mjs` (`significanceTable`, paired) | `results/raw.json` |
| `tab:prior_art` | inline in `sections/related_work.tex` | hand-authored | literature search (`notes/related-work-search.md`) |
| `fig:scaling` | `fig_scaling.tex` | `bench/scaling.mjs` | `results/scaling.json` |
| `fig:cpu_tradeoff` | `fig_cpu_tradeoff.tex` | `scripts/gen-tables.mjs` | `results/raw.json` |

## Supplement tables

| Paper label | Supp. | File | Generator | Input data |
|---|---|---|---|---|
| `tab:cv_mysql` | S1 | `cv_mysql.tex` | `bench/analyze.mjs` (`ENGINE=mysql`, copied) | `results/raw.json` |
| `tab:query_counts` | S2 | `query_counts.tex` | `scripts/capture-plans.mjs` | server statement logs |
| `tab:durability` | S3 | `durability.tex` | `scripts/gen-tables.mjs` | `results/raw.json`, `results/raw-writes-relaxed.json` |
| `tab:equalcpu` | S4 | `equalcpu.tex` | `scripts/gen-tables.mjs` | `results/equalcpu.json` |
| `tab:cpu_efficiency` | S5 | `cpu_efficiency.tex` | `bench/analyze.mjs` (`cpuEfficiencyTable`) | `results/raw.json` |
| `tab:openloop` | S6 | `openloop.tex` | `scripts/openloop2.mjs` | `results/openloop2.json` |
| `tab:poolsize` | S7 | `poolsize.tex` | `scripts/gen-tables.mjs` | `results/poolsize.json` |
| `tab:txn_write` | S8 | `txn_write.tex` | `scripts/gen-tables.mjs` | `results/txn-write.json` |
| `tab:cv` | S9 | `cv_all.tex` | `bench/analyze.mjs` (`cvTable`, `ENGINE=postgres`) | `results/raw.json` |
| `tab:resources` | S10 | `resources.tex` | `bench/analyze.mjs` (`resourceTable`) | `results/raw.json` |
| `tab:versions` | S11 | inline in `supplement.tex` | hand-authored (lockfile) | — |
| `tab:point_read` | S12 | `point_read.tex` | `bench/runner.mjs` (`texTableCombined`) | `results/raw.json` |
| `tab:range_scan` | S13 | `range_scan.tex` | `bench/runner.mjs` (`texTableCombined`) | `results/raw.json` |
| `tab:sameplan` | S14 | `sameplan.tex` | `scripts/sameplan.mjs` | `results/sameplan.json`, `results/raw.json` |
| `tab:aggregation` | S15 | `aggregation.tex` | `bench/runner.mjs` (`texTableCombined`) | `results/raw.json` |
| `tab:adapter_choices` | S16 | `adapter_choices.tex` | hand-authored (from `src/adapters/*`, verified) | `METHODOLOGY.md` |
| `tab:openloop_mysql` | S17 | `openloop_mysql.tex` | `scripts/gen-openloop-mysql.mjs` | `results/openloop2.mysql.json` |
| `tab:altloading` | S18 | `altloading.tex` | `scripts/altloading.mjs` | `results/altloading.json` |
| `tab:waitevents` | S19 | `waitevents.tex` | `scripts/waitevents.mjs` | `results/waitevents.json` |
| `tab:postreboot` | S20 | `postreboot.tex` | `scripts/gen-postreboot.mjs` | `results/postreboot.json` |
| `tab:utilization` | S21 | `utilization.tex` | `scripts/gen-r4-tables.mjs` | `results/utilization.postgres.json` |
| `tab:utilization_mysql` | S22 | `utilization_mysql.tex` | `scripts/gen-r4-tables.mjs` | `results/utilization.mysql.json` |
| `tab:cluster` | S23 | `cluster.tex` | `scripts/gen-r4-tables.mjs` | `results/cluster.json` |
| `tab:poolsize_mysql` | S24 | `poolsize_mysql.tex` | `scripts/poolsize.mjs` (`PS_ENGINE=mysql`) | `results/poolsize.mysql.json` |
| `tab:mixed` | S25 | `mixed.tex` | `scripts/gen-r4-tables.mjs` | `results/mixed.json` |
| `tab:ranks` | S26 | `ranks.tex` | hand-authored (ranks from `raw.json`) | `results/raw.json` |

The five per-pattern throughput tables (`point_read`…`write`) carry a 95% bootstrap
CI on throughput regenerated by `scripts/ci-tables.mjs` from `results/raw.json`. The
new-experiment scripts (review round 4): `utilization.mjs` (utilization-controlled
open loop), `cluster.mjs` + `cluster-server.mjs` (multi-worker), `mixed.mjs` (mixed
read/write), and the parameterized `poolsize.mjs`/`fanout.mjs`.

## Per-cell provenance (run id → table cell)

Each record in `results/raw.json` is keyed by `(adapter, engine, endpoint)` and
carries the full `rps_samples`/`p99_samples` arrays plus the CPU, memory, and pool
fields for that cell. A table cell — e.g. the deep-fetch PostgreSQL Prisma
throughput in `tab:deep_fetch` — is the median of the `rps_samples` of the
`raw.json` record with `adapter="prisma"`, `engine="postgres"`,
`endpoint="deep_fetch"`; its p99 is the median of that record's `p99_samples`. The
generators listed above perform exactly this lookup, so any printed number can be
traced to one raw record. The database schema, index DDL, and effective server
configuration for both engines are in `schema/db-config.md` (and `schema/*.sql`);
the per-adapter idiomatic deep-fetch choices are in `METHODOLOGY.md`. The
statistical estimators are unit-tested in `bench/stats.test.mjs` (`npm test`).

## Inferential results (`results/analysis2.json`, `results/significance_paired_*.json`)

`scripts/stats2.mjs` and the paired block of `bench/analyze.mjs` compute all
inferential quantities on the paired/blocked design (paired permutation and
Wilcoxon signed-rank on per-replicate log-ratios, paired bootstrap ratio CIs,
paired TOST, blocked layer×engine interaction), seeded (`mulberry32`) so every
resample and permutation is bit-reproducible.

## Raw data files and checksums

`results/checksums.sha256` lists the SHA-256 of every tracked `results/*.json`
dataset. Regenerate with `sha256sum results/*.json > results/checksums.sha256`.
Per-cell records in `raw.json` carry `rps_samples` and `p99_samples` (25 per cell,
24 for `knex`/postgres/insert), plus `errors`, `timeouts`, `non2xx`, and the CPU
and pool fields; the measurement environment (CPU, governor, NUMA, virtualization,
affinity, git commit, lockfile hash) is captured by `bench/environment.mjs` into
`results/environment.txt`.
