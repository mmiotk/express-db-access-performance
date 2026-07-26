# Reproducing the benchmark

This file is the single entry point for reproducing the paper. It covers a one-command
smoke test, the full primary matrix, and an **archive-isolated author reconstruction from the archived
Zenodo tarball** (not this development checkout). It links, rather than duplicates, the
detailed docs: image digests in [`experiments/schema/db-config.md`](experiments/schema/db-config.md),
the table→generator→data map in [`experiments/MANIFEST.md`](experiments/MANIFEST.md),
and the raw-data hashes in [`experiments/results/checksums.sha256`](experiments/results/checksums.sha256).

## 0. What is reproduced

- **Primary** (confirmatory): throughput + closed-loop p99 across 5 access patterns ×
  2 engines at the 50-connection operating point, 25 repeated runs per cell
  (`results/rq2-campaign2.json`; normalized table-facing copy: `results/current-primary.json`). The accepted roster is exactly 90 cells times 25 runs; a pre-warm-up retry is recorded separately in `results/rq2-campaign2.startup-events.json`.
- **Same-host RQ2 validation:** 7 portable layers x 2 stacks x 3 reviewer-prioritized patterns x 25 runs (`results/rq2-validation-campaign.json`), analyzed in `results/rq2-campaign-comparison.json`. This is a whole-campaign sensitivity, not cross-host replication.
- **Secondary / exploratory**: the common-SQL raw-path sensitivity contrast, open-loop and utilization-matched
  tail, layer×engine interaction, CPU accounting, durability, fan-out, pool-size,
  cluster, mixed workload, robustness checks, the standalone canonical-constructor microbenchmark,
  and a sensitivity analysis that re-expresses the matched-utilization loads against the
  full concurrency-sweep maximum.
- **Audit evidence:** preserved pre-freeze Wayback responses for all nine treatment-selection assignments (HTML plus capture timestamps and SHA-256 manifest), text and JSON environment fingerprints, and exact 42-file source manifests plus extracted-source archives for both accepted campaigns. The primary aggregate is `532d9c7ffe946b88beca5901485540c90f0d5b273b8ed742cd053968d06cf228`; the validation aggregate is `d32a32b5b68a325425e2d30ddb6d9fab18025ade785a25f104c7b2d134d3789a`. `experiments/measurement-source-snapshots/README.md` gives the 42/42 verification commands.
- The role of every table (Primary / Secondary / Exploratory) is tabulated in the
  paper's outcomes table (`paper/tables/outcomes.tex`) and mapped to its generator and
  input data in `experiments/MANIFEST.md`.

## 1. Requirements

- Node.js 24.x (the reference run used 24.18.0) and `npm`.
- PostgreSQL 18.4 and MySQL 9.7.1. Two supported paths:
  - **conda user-space (reference path, no root/Docker):**
    `conda create -n dbbench -c conda-forge postgresql mysql-server`, then
    `experiments/scripts/db-local.sh init && experiments/scripts/db-local.sh start`.
    This is the path used for the published baseline and the revised numerical campaign.
  - **Docker:** `docker compose up -d` — workflow-convenience path. It pins the same engine versions by digest, but starts them with relaxed durability and a containerized topology; it therefore does not reproduce the headline default-durability insert numbers without an equivalent default-durability configuration. Digests are in
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
node scripts/seed-fanout.mjs             # six fixed fan-out cases + safe insert floor
node scripts/make-seed-template.mjs      # PostgreSQL write-rebuild template
npm run verify:spec                      # expected results derived from the seed specification
npm run verify:campaign-state            # exact counts and exact next identifier (300001)
npm run verify:seed-parity               # identical fan-out values/IDs across engines
npm run verify:documentation             # offline hashes, source URLs, evidence terms, capture dates
npm run bench:quick                       # 4 layers, PostgreSQL, 3s runs
npm run verify:fixed                     # fixed read equivalence, both engines
npm run verify:writes                    # state-level writes, both engines
npm run verify:property                  # randomized differential gate, both engines
```

The property gate (`verify-property.mjs`) is the broadened, property-based level of the
semantic-equivalence check: a fixed-seed sweep of ~1,000 random post and ~1,000 random author IDs plus
an explicit edge set, differentially compared byte-for-byte against the native driver. Run it per
engine (`ENGINE=postgres` / `ENGINE=mysql`; regenerate the Prisma client with
`npm run prisma:generate:<engine>` when switching). It writes a coverage summary to
`experiments/semantic-equivalence.json` — a DB-derived verification artifact, re-runnable against the
seeded database and hashed with the other pre-campaign admission evidence in the exact
measurement-source manifest; it is not a timed primary result.

## 3. Full primary matrix (hours)

```bash
cd experiments
npm ci
# start engines as in section 2, then:
npm run migrate && npm run seed
node scripts/seed-fanout.mjs
node scripts/make-seed-template.mjs
node scripts/set-durability.mjs default                 # vendor-default durability
npm run verify:campaign-state
npm run verify:seed-parity
npm run campaign:rq2                                    # -> 90 cells, 25 runs/cell
npm run analyze:rq2                                     # validates -> current-primary.json
npm run tables:primary
# reviewer-prioritized whole-campaign sensitivity on the same host:
npm run campaign:rq2-validation                          # -> 42 cells, 25 runs/cell
npm run analyze:rq2-validation                           # -> campaign comparison + S46
```

Secondary experiments and the exact per-table commands are listed in
`experiments/MANIFEST.md`. Regenerate the paper afterwards with `cd paper && make`.
This is the reference numerical path. The campaign measures all five patterns
for all compatible native, tuned-native, query-builder, and ORM treatments in
one randomized-block campaign, verifies exact database state before and after,
and records the environment plus exact measurement-source hashes. The original
`results/raw.json` is retained only as superseded provenance; it is never an implicit fallback for revised primary tables.

## 4. Archive-isolated author reconstruction from the Zenodo archive

The immutable release is a `git archive` of the tagged commit, so it contains every
tracked file **including all `results/*.json` raw data and the table generators** (the
raw data is force-added past `.gitignore`). From the tarball alone:

```bash
tar xzf express-db-access-performance-<version>.tar.gz
cd express-db-access-performance-<version>/experiments
sha256sum -c results/checksums.sha256      # verify 60 archived candidate JSON files
npm ci
# regenerate every standalone no-database output mapped in MANIFEST.md:
npm run analyze:rq2 && npm run analyze:rq2-validation && npm run tables:primary && \
  RAW_FILE=current-primary.json RELAXED_FILE=raw-writes-relaxed-corrected.json node scripts/gen-tables.mjs && \
  node scripts/gen-deepfetch-table.mjs && node scripts/gen-r4-tables.mjs && \
  node scripts/gen-scaling-patterns-table.mjs && \
  RAW_FILE=current-primary.json TAIL_FILE=taillong-corrected.json node scripts/gen-tail.mjs && \
  node scripts/gen-tail-regimes.mjs && \
  RAW_FILE=current-primary.json node scripts/gen-p99-spread.mjs && \
  RAW_FILE=current-primary.json node scripts/stats2.mjs && \
  node scripts/gen-openloop-mysql.mjs && node scripts/gen-postreboot.mjs && \
  node scripts/gen-canonicalization-table.mjs && node scripts/gen-capacity-sensitivity.mjs && \
  node scripts/gen-txn-write-table.mjs && node scripts/gen-protocol-retro-table.mjs && \
  node scripts/gen-spec-oracle-table.mjs && node scripts/gen-rq2-validation-table.mjs
npm run sync:tables && (cd ../paper && make)
```

Every table with a standalone no-database renderer regenerates from the archived `results/*.json` with node built-ins and the committed generators; the estimators are seeded
(`mulberry32`), so the bootstrap intervals and permutation p-values are bit-reproducible.
**Caveats:** Seven outputs have run-coupled renderers rather than separate no-database renderers: S6, S7, S14, S18, S19, S25, and Figure S2. Their archived JSON and committed TeX support numerical audit, but reproducing the TeX through the named script also reruns the database experiment. The round-trip-count table (Supplement S2) is derived from transient
server statement logs that are not archived, so its committed `.tex`
(`results/tables/query_counts.tex`) ships pre-generated rather than regenerable from the
tarball; and the two authored protocol tables --- the stage-by-stage mapping (main-text Table 2,
`protocol_mapping.tex`), and the compliance-levels coverage map (Supplement Table S40,
`protocol_compliance.tex`) --- are *analytical* (authored, not data-derived) and likewise ship
pre-authored, as does the descriptive five-pattern table (Supplement Table S39, `patterns.tex`). A
machine-readable encoding of the whole protocol (inputs, mandatory and recommended stages, the
cell-admission gate, outputs, applicability limits, and compliance levels) ships as
`protocol-checklist.yaml`, so a benchmark can be audited against the protocol programmatically. The
manifest marks every table as standalone-generated, run-coupled, pre-generated from unarchived server logs, or authored,
and maps it to its exact inputs.

**Historical archive-isolated verification (`notes/clean-room-reproduction.md`).** The author-run v1.12.9 procedure recorded in that log verifies the raw data (35/35) and regenerates **45 of 50** committed tables
byte-for-byte, confirming the seeded estimators are bit-reproducible. Five tables differ for
presentation reasons only, not for any numeric or statistical result: `cv_all.tex` shows whichever
engine `analyze.mjs` ran **last** (that historical chain ended with `ENGINE=mysql`; the committed table was
generated PostgreSQL-last --- run `ENGINE=mysql` then `ENGINE=postgres` to reproduce the committed
view); `ranks.tex` carries a hand-added third panel; `interaction.tex` and `txn_write.tex` carry
hand-refined captions the generators do not emit; and `tail_regimes.tex` differs only in line-wrapping.

**Current revision-candidate check (26 July 2026).** The author copied the exact candidate file set to a fresh temporary directory, excluding Git metadata, installed dependencies, rejected campaigns, and build products. The installed dependency tree was then copied separately; no database server was started and no file from the development checkout was used as a data or source input. All **60/60** candidate JSON hashes verified. The complete no-database chain above regenerated **35 distinct table outputs** and four derived analysis JSON files; recursive and direct byte comparisons against the frozen candidate were empty. The command log and scope are recorded in `notes/current-candidate-reconstruction.md`. This is an author-run, same-host computational reconstruction from archived measurements, not an independent reproduction and not a re-execution of the benchmark.

## 5. Expected outputs

- `results/rq2-campaign2.json`: 90 accepted primary cells, each with 25 (`repeats`) per-run `rps_samples` / `p99_samples`, zero timed failures, and a validated 2,250-observation roster. One pre-warm-up startup retry is recorded in `rq2-campaign2.startup-events.json`; it contributed no timed sample.
- `results/rq2-validation-campaign.json`: 42 accepted same-host validation cells, each with 25 runs (1,050 observations), zero timed failures, and its own environment/source manifest. `rq2-campaign-comparison.json` reports between-campaign ranks and the four recurring material reversals.
- `bench/verify-spec.mjs`: 73,080 expected-result checks pass across both engines.
  Expected values are replayed from the deterministic seed specification without importing
  a native adapter or querying either database.
- `bench/verify.mjs`: `ALL BYTE-IDENTICAL` on the four non-mutating patterns across all
  layers and both engines.
- `bench/verify-writes.mjs`: `ALL WRITES SEMANTICALLY CORRECT` — for all nine compatible
  adapters per engine, a separate out-of-band native-driver verifier confirms that the primary
  single-row insert produces the exact field values, identifier, and row-count change. For the
  adapters exposing the secondary transactional method (five on PostgreSQL, four on MySQL), it
  also checks commit atomicity and rollback after a foreign-key violation. Per-adapter scope is
  written to `experiments/write-admission.json`.
- `bench/verify-property.mjs`: `ALL BYTE-IDENTICAL` over the randomized/edge input sweep —
  3,800 distinct inputs per adapter, 30,400 adapter-versus-baseline comparisons per engine
  (60,800 across both), zero divergences; coverage written to `experiments/semantic-equivalence.json`.
- `npm run bench:canonicalization`: re-measures constructor cost; `npm run table:canonicalization` deterministically rebuilds its table from the archived JSON.
- `npm run table:capacity-sensitivity`: re-expresses the archived utilization loads against the
  separately measured concurrency-sweep maximum; it performs no benchmark run.
- `npm run archive:documentation`: re-fetches the recorded pre-freeze Wayback captures and validates the evidence terms; review hashes before replacing committed evidence.
- `npm run verify:campaign-state`: exact base/fan-out counts and the next allocated post identifier pass on both engines.
- `npm run verify:seed-parity`: every declared fan-out value and generated
  identifier is identical across engines; DBMS-generated timestamps are
  intentionally excluded. The current 662-row fixture hashes to
  `402e0aebbbc99f6ca32f6e176182fbb4fe753fe273f2e79fb00d5b73a99fe5ca`.
- `npm run audit:protocol`: all 63 source-located external-audit judgements validate.
- `npm test`: 21/21 unit tests pass.
- The rebuilt `paper/ist/ist_main.pdf` and `paper/_build/supplement.pdf`.
