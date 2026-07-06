# TODO

Ordered roughly by priority. `[ ]` open, `[x]` done.

## 0. Validate the harness against live databases (BLOCKER)

The adapters are written to each layer's idiomatic API but have **not** run against
a real PostgreSQL/MySQL yet (this env had no Docker/DB). Before any measurements:

- [ ] `npm run db:up && npm run migrate && npm run seed` on both engines.
- [ ] Boot each adapter (`ADAPTER=… ENGINE=… npm start`) and hit all 5 endpoints;
      fix driver-specific quirks (BigInt serialization, `db.execute` result shape
      for Drizzle, MikroORM `populate` ordering, Prisma raw-SQL param placeholder).
- [ ] **Correctness cross-check**: assert every adapter returns the *same* JSON for
      the same id (a script that diffs `/posts/1/thread` etc. across adapters) — this
      is what proves no adapter is cheating via N+1 or a wrong query. Add as a test.
- [ ] `npm run bench:quick` end-to-end; then the full matrix.

## 1. Measurement design

- [ ] Decide same-host vs two-machine (see METHODOLOGY open questions).
- [ ] Add a concurrency sweep (1/10/50/100/200) — locate saturation per layer.
- [ ] Add per-cell CPU/RSS sampling for a resource table.
- [ ] Optional: k6 constant-arrival cross-run to bound coordinated omission.

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
