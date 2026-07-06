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

## 1. Measurement design

- [x] **range-scan confound fixed**: OFFSET (collapsed on MySQL) → keyset pagination
      on the PK. Healthy on both engines.
- [x] **aggregation confound fixed**: full-table pre-aggregation (24 req/s at scale)
      → correlated subqueries touching only the author's rows (3k–8k req/s).
- [x] **write isolation**: runner deletes `id > SEED_POSTS` before every cell.
- [x] Scaled up: seed 2000/100000/1M, 50 conn, median of 3. Corrected run published.
- [ ] Concurrency sweep (1/10/50/100/200) — locate saturation per layer.
- [ ] Per-cell CPU/RSS sampling for a resource table.
- [ ] Report CV per cell in a table (harness computes it; not yet emitted).
- [ ] Investigate MikroORM's flat slowness (per-request `em.fork()` overhead?) and
      why Objection trails on aggregation — confirm idiomatic, not harness artifacts.
- [ ] Optional: k6 constant-arrival cross-run to bound coordinated omission.
- [ ] Decide same-host vs two-machine (see METHODOLOGY open questions).

## 1b. Venue (researched 2026-07-06 — see notes/venue.md)

- [ ] Decide: **two-output strategy** — harness → SoftwareX (200 MEiN pts, ~$1,560);
      study → IEEE Access (100 pts, fast, $2,160) or JSS (100 pts, free via
      subscription). Single-paper fallback: IEEE Access. Low-cost/continuity: e-Informatica (40).

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
