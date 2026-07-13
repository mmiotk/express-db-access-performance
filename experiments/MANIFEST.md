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
node scripts/openloop2.mjs            # (re-measures open loop)
npm run sync:tables                   # copy results/tables/*.tex -> ../paper/tables/
```

## Main-text tables and figures

| Paper label | File | Generator | Input data |
|---|---|---|---|
| `tab:point_read` … `tab:write` | `point_read.tex` … `write.tex` | `bench/runner.mjs` (`texTableCombined`) | `results/raw.json` |
| `tab:patterns`, `tab:versions` | inline in `sections/methodology.tex` | hand-authored | — |
| `tab:cv` | `cv_all.tex` | `bench/analyze.mjs` (`cvTable`, `ENGINE=postgres`) | `results/raw.json` |
| `tab:significance` | `significance_deep_fetch.tex` | `bench/analyze.mjs` (`significanceTable`, paired) | `results/raw.json` |
| `tab:resources` | `resources.tex` | `bench/analyze.mjs` (`resourceTable`) | `results/raw.json` |
| `tab:sameplan` | `sameplan.tex` | `scripts/sameplan.mjs` | `results/sameplan.json`, `results/raw.json` |
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
