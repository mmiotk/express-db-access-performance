# Artifact manifest — table/figure provenance

Every table and figure is mapped below to its evidence and production path. Standalone no-database renderers, run-coupled renderers, authored analytical items, and the statement-log table with an unarchived transient input are distinguished explicitly. This prevents a committed presentation artifact from being mistaken for a clean reconstruction. To rerun the measurement-producing scripts:

```
cd experiments
npm run campaign:rq2                  # re-measures -> results/rq2-campaign2.json
npm run analyze:rq2                   # validates and writes results/current-primary.json
npm run campaign:rq2-validation       # 42-cell same-host validation campaign
npm run analyze:rq2-validation        # validates and writes cross-campaign comparison + S46
RAW_FILE=current-primary.json node scripts/stats2.mjs  # current inferential JSON
node scripts/gen-tables.mjs           # durability, equalcpu, cpu trade-off
RAW_FILE=current-primary.json SP_OUT=sameplan-corrected.json node scripts/sameplan.mjs
OL_ENGINE=postgres node scripts/openloop2.mjs   # open loop (PostgreSQL, Table S6)
OL_ENGINE=mysql    node scripts/openloop2.mjs   # open loop (MySQL);  gen-openloop-mysql.mjs -> S17
node scripts/altloading.mjs           # alt eager-loading sensitivity (S18)
node scripts/waitevents.mjs           # MySQL insert commit-path wait sensitivity (S19; root perf_schema)
# after ./scripts/db-local.sh stop && start:  node scripts/postreboot.mjs; gen-postreboot.mjs -> S20
npm run sync:tables                   # copy results/tables/*.tex -> ../paper/tables/
```

## Main-text tables and figures

| Paper label | File | Generator | Input data |
|---|---|---|---|
| `tab:deep_fetch`, `tab:write` | `deep_fetch.tex`, `write.tex` | `scripts/ci-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:prior_art` (Table 1) | inline in `sections/related_work.tex` | authored synthesis | `notes/related-work-search.md` |
| `fig:protocol` (Figure 1) | `fig_protocol.tex` | authored protocol diagram | `protocol-checklist.yaml` |
| `tab:protocol_mapping` (Table 2) | `protocol_mapping.tex` | authored analytical mapping | case-study evidence cited in cells |
| `tab:estimands` (Table 3) | `estimands.tex` | authored estimand consolidation | manuscript definitions |
| `fig:insert_dispersion` (main figure) | `fig_insert_dispersion.tex` | `scripts/gen-rq2-insert-figure.mjs` | `results/current-primary.json` |

## Supplement tables

| Paper label | Supp. | File | Generator | Input data |
|---|---|---|---|---|
| `tab:cv_mysql` | S1 | `cv_mysql.tex` | `scripts/gen-analysis-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:query_counts` | S2 | `query_counts.tex` | `scripts/capture-plans.mjs` | server statement logs |
| `tab:durability` | S3 | `durability.tex` | `scripts/gen-tables.mjs` | `results/current-primary.json`, `results/raw-writes-relaxed-corrected.json` |
| `tab:equalcpu` | S4 | `equalcpu.tex` | `scripts/gen-tables.mjs` | `results/equalcpu.json` |
| `tab:cpu_efficiency` | S5 | `cpu_efficiency.tex` | `scripts/gen-analysis-tables.mjs` | `results/current-primary.json` |
| `tab:openloop` | S6 | `openloop.tex` | `scripts/openloop2.mjs` (run-coupled renderer) | `results/openloop2.json` |
| `tab:poolsize` | S7 | `poolsize.tex` | `scripts/poolsize.mjs` (run-coupled renderer) | `results/poolsize.json` |
| `tab:txn_write` | S8 | `txn_write.tex` | `scripts/gen-txn-write-table.mjs` | `results/txn-write.json` |
| `tab:cv` | S9 | `cv_all.tex` | `scripts/gen-analysis-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:resources` | S10 | `resources.tex` | `scripts/gen-analysis-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:versions` | S11 | inline in `supplement.tex` | hand-authored (lockfile) | — |
| `tab:point_read` | S12 | `point_read.tex` | `scripts/ci-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:range_scan` | S13 | `range_scan.tex` | `scripts/ci-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:sameplan` | S14 | `sameplan.tex` | `scripts/sameplan.mjs` (run-coupled renderer) | `results/sameplan-corrected.json`, `results/current-primary.json` |
| `tab:aggregation` | S15 | `aggregation.tex` | `scripts/ci-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:adapter_choices` | S16 | `adapter_choices.tex` | hand-authored (from `src/adapters/*`, verified) | `METHODOLOGY.md` |
| `tab:openloop_mysql` | S17 | `openloop_mysql.tex` | `scripts/gen-openloop-mysql.mjs` | `results/openloop2.mysql.json` |
| `tab:altloading` | S18 | `altloading.tex` | `scripts/altloading.mjs` (run-coupled renderer) | `results/altloading.json` |
| `tab:waitevents` | S19 | `waitevents.tex` | `scripts/waitevents.mjs` (run-coupled renderer) | `results/waitevents.json` |
| `tab:postreboot` | S20 | `postreboot.tex` | `scripts/gen-postreboot.mjs` | `results/postreboot.json` |
| `tab:utilization` | S21 | `utilization.tex` | `scripts/gen-r4-tables.mjs` | `results/utilization-corrected.postgres.json` |
| `tab:utilization_mysql` | S22 | `utilization_mysql.tex` | `scripts/gen-r4-tables.mjs` | `results/utilization-corrected.mysql.json` |
| `tab:taillong` | S23 | `taillong.tex` | `scripts/gen-tail.mjs` | `results/taillong-corrected.json`, `results/current-primary.json` |
| `tab:cluster` | S24 | `cluster.tex` | `scripts/gen-r4-tables.mjs` | `results/cluster.json` |
| `tab:poolsize_mysql` | S25 | `poolsize_mysql.tex` | `scripts/poolsize.mjs` (`PS_ENGINE=mysql`; run-coupled renderer) | `results/poolsize.mysql.json` |
| `tab:mixed` | S26 | `mixed.tex` | `scripts/gen-r4-tables.mjs` | `results/mixed.json` |
| `tab:ranks` | S27 | `ranks.tex` | `scripts/gen-rq2-corrected-tables.mjs` | `results/current-primary.json` |
| `tab:interaction` | S28 | `interaction.tex` | `scripts/gen-rq2-corrected-tables.mjs` | `results/current-primary.json` |
| `tab:factors` | S29 | `factors.tex` | hand-authored | — |
| `tab:significance_p99` | S30 | `significance_p99.tex` | `scripts/gen-p99-significance.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:reproducibility` | S31 | inline in `supplement.tex` | hand-authored | `REPRODUCE.md`, `results/checksums.sha256` |
| `tab:scope` | S32 | inline in `supplement.tex` | hand-authored | per-experiment table captions |
| `tab:construct` | S33 | inline in `supplement.tex` | authored construct-validity record | documentation manifest, `METHODOLOGY.md` |
| `tab:outcomes` | S34 | `outcomes.tex` | authored analysis-role map | manuscript definitions |
| `tab:scaling_patterns` | S35 | `scaling_patterns.tex` | `scripts/gen-scaling-patterns-table.mjs` | `results/scaling_patterns_corrected.json` |
| `tab:significance` | S36 | `significance_deep_fetch.tex` | `scripts/gen-analysis-tables.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:protocol_retro` | S37 | `protocol_retro.tex` | `scripts/gen-protocol-retro-table.mjs` | `external-protocol-audit.json` |
| `tab:semantic_equivalence` | S38 | `semantic_equivalence.tex`; unnumbered `spec_oracle.tex` panel | differential table authored from gate summary; `scripts/gen-spec-oracle-table.mjs` | `semantic-equivalence.json`, `spec-oracle.json` |
| `tab:patterns` | S39 | `patterns.tex` | authored workload definition | endpoint contract |
| `tab:protocol_compliance` | S40 | `protocol_compliance.tex` | authored compliance mapping | `protocol-checklist.yaml`, case-study evidence |
| `tab:native_contrasts` | S41 | `native_contrasts.tex` | `scripts/gen-native-contrasts.mjs` (`RAW_FILE=current-primary.json`) | `results/current-primary.json` |
| `tab:samesql_components` | S42 | `samesql_components.tex` | authored component enumeration | `results/sameplan.*`, server capture |
| `tab:tail_regimes` | S43 | `tail_regimes.tex` | `scripts/gen-tail-regimes.mjs` | `results/current-primary.json`, `results/utilization-corrected.{postgres,mysql}.json` |
| `tab:canonicalization_cost` | S44 | `canonicalization_cost.tex` | `scripts/gen-canonicalization-table.mjs` | `results/canonicalization-cost.json` |
| `tab:capacity_sensitivity` | S45 | `capacity_sensitivity.tex` | `scripts/gen-capacity-sensitivity.mjs` | `results/utilization-corrected.{postgres,mysql}.json`, `results/scaling-corrected.json`, `results/current-primary.json` |
| `tab:rq2_cross_campaign` | S46 | `rq2_cross_campaign.tex` | `scripts/gen-rq2-validation-table.mjs` | `results/current-primary.json`, `results/rq2-validation-campaign.json` |
| `fig:insert_dispersion` | Fig. S1 | `fig_insert_dispersion.tex` | `scripts/gen-rq2-insert-figure.mjs` | `results/current-primary.json` |
| `fig:scaling` | Fig. S2 | `fig_scaling.tex` | `bench/scaling.mjs` (run-coupled renderer) | `results/scaling-corrected.json` |
| `fig:cpu_tradeoff` | Fig. S3 | `fig_cpu_tradeoff.tex` | `scripts/gen-tables.mjs` | `results/current-primary.json` |
| `fig:p99_spread` | Fig. S4 | `fig_p99_spread.tex` | `scripts/gen-p99-spread.mjs` | `results/current-primary.json` |

### Regeneration modes

- **Standalone reconstruction from archived JSON (no database):** rows whose production path is `scripts/ci-tables.mjs`, `bench/analyze.mjs`, or a `scripts/gen-*.mjs` renderer. These are covered by the archive-isolated author-reconstruction chain in `REPRODUCE.md`.
- **Run-coupled renderer:** S6 (`openloop.tex`), S7 (`poolsize.tex`), S14 (`sameplan.tex`), S18 (`altloading.tex`), S19 (`waitevents.tex`), S25 (`poolsize_mysql.tex`), and Figure S2 (`fig_scaling.tex`). The named script both measures and writes TeX. The archived JSON and committed TeX support cell-level numerical audit, but the no-database chain does not claim byte regeneration of these files.
- **Pre-generated or authored:** S2 is preserved from unarchived statement logs; all rows labelled authored are analytical or declarative rather than reconstructed measurements. The S37 external-audit table and the specification panel beside S38 are deterministic renders from their committed JSON inputs.

The treatment-selection evidence is separately archived under `documentation-snapshots/`:
`manifest.json` maps every treatment to the recorded pre-freeze Wayback response, capture timestamp,
SHA-256, byte length, and evidence terms; `scripts/archive-documentation.mjs` validates those terms when regenerating. A capture establishes page state at its timestamp, not continuous lack of change through the freeze. The accepted corrected primary campaign records `results/environment-rq2-campaign2.txt` and `results/source-manifest-rq2-campaign2-corrected-state.json` (42 files; aggregate `532d9c7ffe946b88beca5901485540c90f0d5b273b8ed742cd053968d06cf228`). The accepted validation campaign records a separate environment fingerprint and `results/source-manifest-rq2-validation-campaign.json` (42 files; aggregate `d32a32b5b68a325425e2d30ddb6d9fab18025ade785a25f104c7b2d134d3789a`). Exact tar archives of both 42-file source states are preserved under `measurement-source-snapshots/`; `scripts/verify-source-snapshot.mjs` verifies every member and the aggregate against the embedded manifest. Both campaigns have startup-event logs; the primary and validation accepted rosters contain 2,250 and 1,050 observations, respectively. The source manifests also hash `campaign-state.json`, `seed-parity.json`, `spec-oracle.json`, `semantic-equivalence.json`, and `write-admission.json`, so the exact pre-campaign admission evidence is tied to the measured source state.

The five per-pattern tables (`point_read`…`write`) carry a 95% bootstrap CI on
**both** throughput and p99, regenerated by `scripts/ci-tables.mjs` from `results/current-primary.json`;
`scripts/gen-p99-significance.mjs` emits the paired p99 significance table (S30). The
new-experiment scripts (review round 4): `utilization.mjs` (utilization-controlled
open loop), `cluster.mjs` + `cluster-server.mjs` (multi-worker), `mixed.mjs` (mixed
read/write), and the parameterized `poolsize.mjs`/`fanout.mjs`.

## Per-cell provenance (run id → table cell)

`results/current-primary.json` is the table-facing 90-cell corrected-state campaign containing all five patterns and all compatible treatments. Every record is keyed by `(adapter, engine, endpoint)`, carries `rps_samples` and `p99_samples`, and retains campaign metadata. A printed cell is the median of the matching sample array; its interval is recomputed by the mapped seeded generator. `results/rq2-historical-provenance-comparison.json` preserves the superseded historical mapping and flags its ineligible MySQL cells. After the separate same-host validation campaign, `scripts/gen-rq2-validation-table.mjs` validates all 42 validation cells and creates `results/rq2-campaign-comparison.json` for the two clean corrected-state campaigns. The database schema and settings are in `schema/db-config.md`; treatment choices are in `METHODOLOGY.md`; estimators are unit-tested by `npm test`.

## Inferential results (`results/analysis2.json`, `results/significance_paired_*.json`)

`results/analysis2.json` is regenerated from `current-primary.json`; deep-fetch adjacent-pair, p99, native-contrast, rank, and backend-stack-ratio tables all use the accepted corrected campaign through the mapped scripts. The estimators compute on the paired/blocked design (paired permutation and
Wilcoxon signed-rank on per-replicate log-ratios, paired bootstrap ratio CIs,
paired TOST, blocked layer×engine interaction), seeded (`mulberry32`) so every
resample and permutation is bit-reproducible.

## Raw data files and checksums

`results/checksums.sha256` lists the SHA-256 of every tracked or explicitly
unignored candidate `results/*.json` dataset. Regenerate from `experiments/`
with:

```bash
git ls-files --cached --others --exclude-standard 'results/*.json' |
  LC_ALL=C sort |
  xargs -r sha256sum > results/checksums.sha256
```
Per-cell records in `rq2-campaign2.json` carry 25-value `rps_samples` and `p99_samples` arrays for every accepted cell, plus `errors`, `timeouts`, `non2xx`, and the CPU
and pool fields; the measurement environment (CPU, governor, NUMA, virtualization,
affinity, git commit, lockfile hash) is captured by `bench/environment.mjs` in the corrected campaign files named above.
