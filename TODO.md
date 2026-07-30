# TODO

> Historical pre-protocol planning log from the first two weeks of the project.
> Retained as development provenance, **not** as current status or terminology.
> Current status lives in `README.md`, `REPRODUCE.md`, and `experiments/MANIFEST.md`.
>
> Reviewed 2026-07-26: items that were still marked open here had in fact been
> completed and shipped, which made this file misleading to an artifact reviewer.
> Each is now marked done with a pointer to where the result actually lives.
> Items that were genuinely superseded are marked `[~]`.

`[ ]` open, `[x]` done, `[~]` superseded.

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
- [x] Concurrency sweep (ladder 1–200, both engines) — protocol stage R4.
      → Supplement Table S35; deep-fetch curve Figure S2.
- [x] Per-cell CPU/RSS sampling for a resource table — protocol stage R6.
      → Supplement Tables S4, S5, S10.
- [x] Report CV per cell in a table. → Supplement Tables S1 (MySQL), S9 (PostgreSQL);
      insert replicate dispersion in Figure S1.
- [x] Investigate MikroORM's flat slowness and Objection's aggregation position.
      → result-blind adapter self-audit; two avoidable timed-path operations found
      and removed before campaign acceptance (`notes/adapter-self-audit.md`).
      Round-trip count alone does not explain the ordering (Discussion; Table S2).
- [x] Constant-arrival cross-run to bound coordinated omission — done with an
      open-loop sweep rather than k6. → Supplement Tables S6, S17.
- [x] Decide same-host vs two-machine: **same-host**, disclosed as a validity
      threat. A second same-host validation campaign was run instead; a physically
      independent host remains future work (Threats; Conclusion).

## 1b. Venue

- [x] Decided: **Information and Software Technology** (Elsevier), single output.
      Submission build is `paper/ist/ist_main.tex`; see `notes/venue.md` for the
      superseded two-output analysis.

## 2. Secondary studies (differentiators vs prior art)

- [x] Connection-pool-size sweep (isolated from the main comparison).
      → Supplement Tables S7 (PostgreSQL), S25 (MySQL).
- [x] N+1 penalty study: the adapter contract now forbids N+1 by construction and
      the fan-out sweep varies breadth 0–500 children. → Study Design (adapter
      contract and N+1 control); Results.
- [~] Cold-start / first-query latency per layer. Superseded: warm-up phases are
      designed to *absorb* cold-start so it cannot confound steady-state throughput.
      Listed as future work (cold-cache regimes) rather than an open task here.

## 3. Paper

- [x] Sections written; related work covers the peer-reviewed prior art and the
      vendor benchmarks, with a structured coverage table.
- [x] Venue picked (see 1b).
- [x] Statistical treatment: medians, CV, seeded percentile bootstrap CIs, paired
      sign-flip permutation cross-checked with Wilcoxon signed-rank, geometric-mean
      paired ratios, paired TOST, blocked layer×engine interaction, Mann–Whitney U
      and Cliff's delta. Estimators in `experiments/bench/stats.mjs`, unit-tested in
      `bench/stats.test.mjs`; construction detail in `notes/supplement-methods`.

## 4. Packaging

- [x] `git remote add origin …`, first push. (`origin/master` tracks GitHub.)
- [x] Zenodo v1.12.17 deposit prepared under version DOI 10.5281/zenodo.21610058.

## 5. Open before submission

- [ ] **Deposit the next version on Zenodo**, then `scripts/release.sh <version> <doi> --publish`.
      Until this is done the manuscript's Data Availability statement points at a
      release that does not contain the revision; `scripts/release.sh --check` fails
      and `make ist-package` refuses to build. This is the only item blocking submission.
- [ ] Obtain at least one completed independent review packet
      (`notes/reviewer-packets/`, register rows TS-01/TS-02, AD-01, PA-01).
      Protocol stage R7 is reported as **unsatisfied** until one is returned.
- [ ] Replicate the reduced RQ2 matrix on a physically independent host
      (ranked below independent human review; not required for submission).
- [ ] **After the next commit: refresh the two AI-provenance figures, then re-verify the word count.**
      `\subsection{AI-assisted research tooling}` states **201 of 209** trailered commits
      (159 Opus 4.8, 27 Fable 5, 15 Opus 5), correct as of HEAD `fd32276`; both totals move with each
      commit and must be re-derived, not carried forward:
      `git rev-list --count HEAD` and
      `git log --format='%(trailers:key=Co-Authored-By,valueonly)' | grep -c .`.
      `paper/ist/word-count.tex` is current at **14,934 / 66 headroom** (30 July); regenerate it with
      the verbatim command block inside that file if the provenance edit changes the body count.
      IST limit is 15,000 including references and 200 words per float, so headroom is thin.
