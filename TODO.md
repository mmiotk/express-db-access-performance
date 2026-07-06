# TODO

Ordered roughly by priority. `[ ]` open, `[x]` done.

## 0. Validate the harness against live databases — DONE (2026-07-06)

- [x] User-space PostgreSQL 18.4 + MySQL 9.7.1 via conda (`scripts/db-local.sh`),
      migrated + seeded both engines.
- [x] **Correctness cross-check** (`bench/verify.mjs`): all 8 adapters per engine
      return identical normalized JSON to the native baseline. It caught two real
      bugs, now fixed: (a) a `SUM(views)` **fan-out** inflation in the aggregation
      of every join-based adapter (objection's subquery form was the correct one);
      (b) Drizzle's `db.execute` result-shape parsing for mysql2.
- [x] First full matrix run: 9 layers × 2 engines × 5 patterns = 80 rows →
      `results/{raw.json,summary.csv}` + 10 LaTeX tables, wired into the paper (9pp).

## 1. Measurement design (next)

- [ ] **Fix range-scan confound**: current `ORDER BY created_at DESC` sorts over
      near-identical seed timestamps with large random OFFSET → dominates MySQL and
      is not an access-layer signal. Switch to keyset pagination and/or spread
      `created_at` in the seed; re-run.
- [ ] Scale up: default seed (1k/20k/200k), DURATION≥10, REPEATS≥5, then report
      medians + CV (harness already computes these).
- [ ] Concurrency sweep (1/10/50/100/200) — locate saturation per layer.
- [ ] Per-cell CPU/RSS sampling for a resource table.
- [ ] Investigate MikroORM's flat slowness (per-request `em.fork()` overhead?) —
      confirm it's idiomatic and not a harness artifact.
- [ ] Optional: k6 constant-arrival cross-run to bound coordinated omission.
- [ ] Decide same-host vs two-machine (see METHODOLOGY open questions).

## 2. Secondary studies (differentiators vs prior art)

- [ ] Connection-pool-size sweep (isolated from the main comparison).
- [ ] N+1 penalty study: naive vs eager loading per ORM (quantify the trap).
- [ ] Cold-start / first-query latency per layer (bundle-size proxy from the notes).

## 3. Paper

- [ ] Fill sections (skeleton in `paper/sections/`). Related work: cite the 3
      peer-reviewed prior-art items + the vendor benchmarks from `notes/prior-art.md`.
- [ ] Pick a venue. Candidates from the react-performance line: e-Informatica SE
      Journal, or an empirical-SE / systems-performance venue.
- [ ] Statistical treatment: medians + CV now; consider Mann–Whitney U + Cliff's
      delta between adapters (as in the react-performance paper).

## 4. Packaging

- [ ] `git remote add origin …`, first push.
- [ ] Zenodo deposit (adapt scripts from react-rendering-performance if reused).
