# Reproducing the benchmark

This file is the single entry point for reproducing the paper. It covers a one-command
smoke test, the full primary matrix, and a **clean-room reproduction from the archived
Zenodo tarball** (not this development checkout). It links, rather than duplicates, the
detailed docs: image digests in [`experiments/schema/db-config.md`](experiments/schema/db-config.md),
the table→generator→data map in [`experiments/MANIFEST.md`](experiments/MANIFEST.md),
and the raw-data hashes in [`experiments/results/checksums.sha256`](experiments/results/checksums.sha256).

## 0. What is reproduced

- **Primary** (confirmatory): throughput + closed-loop p99 across 5 access patterns ×
  2 engines at the 50-connection operating point, 25 repeated runs per cell
  (`results/raw.json`).
- **Secondary / exploratory**: the same-SQL bound, open-loop and utilization-matched
  tail, layer×engine interaction, CPU accounting, durability, fan-out, pool-size,
  cluster, mixed workload, and robustness checks.
- The role of every table (Primary / Secondary / Exploratory) is tabulated in the
  paper's outcomes table (`paper/tables/outcomes.tex`) and mapped to its generator and
  input data in `experiments/MANIFEST.md`.

## 1. Requirements

- Node.js 24.x (the reference run used 24.18.0) and `npm`.
- PostgreSQL 18.4 and MySQL 9.7.1. Two supported paths:
  - **conda user-space (reference path, no root/Docker):**
    `conda create -n dbbench -c conda-forge postgresql mysql-server`, then
    `experiments/scripts/db-local.sh init && experiments/scripts/db-local.sh start`.
    This is the path that produced the published numbers.
  - **Docker:** `docker compose up -d` — convenience only; it pins PostgreSQL 16 /
    MySQL 8.4, which are *older* than the reference engines and will not reproduce the
    published numbers exactly. Digests for the reference images are in
    `experiments/schema/db-config.md`.
- Disk: ~1 GB for the seeded databases; the seed is 2,000 authors / 100,000 posts /
  1,000,000 comments from a deterministic PRNG.

## 2. Smoke test (~5–10 minutes)

```bash
cd experiments
npm ci
# start engines — conda path (reference): scripts/db-local.sh init && scripts/db-local.sh start
#                 or Docker path:          npm run db:up
npm run migrate && npm run seed          # deterministic seed (2k/100k/1M rows)
npm run bench:quick                       # 4 layers, PostgreSQL, 3s runs
node bench/verify.mjs                     # read byte-equivalence (12 fixed probes) -> ALL BYTE-IDENTICAL
node bench/verify-writes.mjs              # write-state correctness -> ALL WRITES SEMANTICALLY CORRECT
ENGINE=postgres node bench/verify-property.mjs   # randomized differential gate (thousands of inputs + edge cases) -> ALL BYTE-IDENTICAL
```

The property gate (`verify-property.mjs`) is the broadened, property-based level of the
semantic-equivalence check: a fixed-seed sweep of ~1,000 random post and ~1,000 random author IDs plus
an explicit edge set, differentially compared byte-for-byte against the native driver. Run it per
engine (`ENGINE=postgres` / `ENGINE=mysql`; regenerate the Prisma client with
`npm run prisma:generate:<engine>` when switching). It writes a coverage summary to
`experiments/semantic-equivalence.json` — a DB-derived verification artifact, re-runnable against the
seeded database and therefore kept outside the 35-file `results/` measurement manifest.

## 3. Full primary matrix (hours)

```bash
cd experiments
npm ci
# start engines as in section 2, then:
npm run migrate && npm run seed
node scripts/set-durability.mjs default                 # vendor-default durability
INDEP=1 REPEATS=25 DURATION=12 WARMUP=15 node bench/runner.mjs   # -> results/raw.json
npm run sync:tables                                     # results/tables -> paper/tables
```

Secondary experiments and the exact per-table commands are listed in
`experiments/MANIFEST.md`. Regenerate the paper afterwards with `cd paper && make`.

## 4. Clean-room reproduction from the Zenodo archive

The immutable release is a `git archive` of the tagged commit, so it contains every
tracked file **including all `results/*.json` raw data and the table generators** (the
raw data is force-added past `.gitignore`). From the tarball alone:

```bash
tar xzf express-db-access-performance-<version>.tar.gz
cd express-db-access-performance-<version>/experiments
sha256sum -c results/checksums.sha256      # verify the 35 archived raw-data files
npm ci
# regenerate every table from the archived raw data (no database needed):
node scripts/ci-tables.mjs && node scripts/gen-tables.mjs && \
  node scripts/gen-r4-tables.mjs && node scripts/gen-r6-tables.mjs && node scripts/gen-tail.mjs && node scripts/gen-tail-regimes.mjs && node scripts/gen-p99-significance.mjs && \
  ENGINE=postgres node bench/analyze.mjs && ENGINE=mysql node bench/analyze.mjs && \
  node scripts/stats2.mjs
npm run sync:tables && (cd ../paper && make)
```

Every main-text and supplement table regenerates from the archived `results/*.json`
with node built-ins and the committed generators; the estimators are seeded
(`mulberry32`), so the bootstrap intervals and permutation p-values are bit-reproducible.
**Caveats:** the round-trip-count table (Supplement S2) is derived from transient
server statement logs that are not archived, so its committed `.tex`
(`results/tables/query_counts.tex`) ships pre-generated rather than regenerable from the
tarball; and the three protocol tables --- the stage-by-stage mapping (main-text Table 2,
`protocol_mapping.tex`), the retrospective application to prior benchmarks (Supplement Table S37,
`protocol_retro.tex`), and the compliance-levels coverage map (Supplement Table S40,
`protocol_compliance.tex`) --- are *analytical* (authored, not data-derived) and likewise ship
pre-authored, as does the descriptive five-pattern table (Supplement Table S39, `patterns.tex`). Every
other table regenerates from the archived `results/*.json` (the tail-regime table, `tail_regimes.tex`,
from `raw.json` plus the utilization sweeps).

## 5. Expected outputs

- `results/raw.json`: 90 primary cells, each with 25 (`repeats`) per-run
  `rps_samples` / `p99_samples`.
- `bench/verify.mjs`: `ALL BYTE-IDENTICAL` on the four non-mutating patterns across all
  layers and both engines.
- `bench/verify-writes.mjs`: `ALL WRITES SEMANTICALLY CORRECT` — for every adapter on both
  engines, an independent native-driver verifier confirms the single-row insert and the
  transactional write produce the exact field values, identifiers, and row-count changes, and
  that a foreign-key-violating transaction rolls back with no partial state.
- `bench/verify-property.mjs`: `ALL BYTE-IDENTICAL` over the randomized/edge input sweep —
  3,800 distinct inputs per adapter, 30,400 adapter-versus-baseline comparisons per engine
  (60,800 across both), zero divergences; coverage written to `experiments/semantic-equivalence.json`.
- `npm test`: 19/19 estimator unit tests pass (`bench/stats.test.mjs`).
- The rebuilt `paper/ist/ist_main.pdf` and `paper/supplement.pdf`.
