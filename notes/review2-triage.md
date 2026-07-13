# Review Round 2 — triage and rebuttal skeleton

External reviewer, IST, "major revision" (17 sections). Reviewed
`express_db_access-3.pdf` = the **generic build**, NOT the IST submission build.
Confidence 4/5; did not run the artifact or recompute statistics.

Disposition key: **[DONE-IST]** already satisfied in `paper/ist/ist_main.tex` ·
**[REAN]** reanalysis of existing paired data · **[LANG]** wording only ·
**[NEW]** new measurement (user opted into 3 items) · **[REBUT]** answer/clarify,
no change.

## Fatal / compliance

- §5.1 structured abstract — **[DONE-IST]** ist_main.tex:43–74. Reviewer read the
  generic build. Fix: bring generic build to parity; recount IST abstract <300.
- §7.2 keywords — **[DONE-IST]** ist_main.tex:76–79.
- §15 CRediT / competing-interest / funding / GenAI — **[DONE-IST]** 93–122.
- §9 data-availability statement — **[DONE-IST]** 104–111; add artifact manifest.

## Major (scientific)

- §6.1 unpaired tests on a paired design — **[REAN]** paired permutation +
  Wilcoxon signed-rank on per-replicate log-ratios; paired TOST. Stage 1. **May
  move the pg–Prisma equivalence conclusion.**
- §6.2 "independent replicates" overstated — **[LANG]** → process-state isolation.
- §6.3 same-SQL attributed to "eager loading + hydration" — **[LANG]** → composite
  upstream-path contrast (strategy + count + protocol + raw API + marshalling +
  hydration).
- §6.4 app-only CPU efficiency — **[REAN]** add combined app+db CPU/req from
  existing `cpu_pct`+`db_cpu_pct`. **Softens the efficiency gap (813 vs 596, not
  3741 vs 740). "498% app CPU" fact stays.**
- §6.5 single-host interference — **[NEW 5c]** taskset isolation re-run +
  **[LANG]** disclose affinity/NUMA/governor/quiescence/virtualization.
- §6.6 "neutral" — **[LANG]** → "vendor-independent" + explicit design-choice
  disclosure.
- §6.7 "everyday CRUD" — **[LANG]** → "five selected access patterns" +
  **[NEW 5b]** one transactional/multi-row write pattern.
- §6.8 pool=10 fairness — **[NEW 5a]** pool-size sensitivity + **[LANG]** frame
  equal-config vs default vs tuned.
- §6.9 p99 estimand / counts / uncertainty — **[REAN]** p99 CIs from p99_samples;
  median-of-run vs pooled note; request counts; per-cell errors/timeouts.
- §6.10 over-reliance on supplement — **[compliance]** number S1–S5, formal refs,
  ship + archive with same DOI. Stage 4.

## Minor

- 7.1 title "for"→"Across" — **[REBUT]** keep "for" (deliberate); note in reply.
- 7.3 "full taxonomy" — **[LANG]** survives only in generic abstract.
- 7.4 ORM labels — **[LANG]** state inclusion criteria.
- 7.5 version currency — **[LANG]** "versions installed on the measurement date"
  + lockfile/registry evidence.
- 7.6 Express 4 — **[LANG]** frame as a shared floor + acknowledge interaction risk.
- 7.7 no-DB baseline — **[LANG]** "fixed-payload endpoint baseline".
- 7.8/7.10 CV vs robust dispersion — **[LANG]** report rMAD consistently.
- 7.9 "conventionally powered" — **[LANG]** delete; lead with effect sizes + CIs.
- 7.11 rank-CI degeneracy (n=7) — **[REAN/LANG]** state method; present as
  descriptive agreement, not population inference.
- 7.12 p=0.0005 floor — **[REAN]** report B and p=(ge+1)/(B+1).
- 7.13 multiplicity — **[LANG]** label confirmatory vs exploratory + hypothesis family.
- 7.14 TOST "prespecified" — **[LANG]** → "a-priori chosen ±5%" + justification.
- 7.15 fig_scaling caption contradicts body — **[LANG]** fig_scaling.tex:30,
  threats.tex:140, conclusion.tex:42–44 → "≥32 connections".
- 7.16 practical recommendations — **[LANG]** bound to tested workload/versions.
- 7.17 "catastrophic" — **[LANG]** quantitative overload criterion.
- 7.18 references — **[Stage 6]** machine-verify all 70.

## §13 reviewer questions — answers we already hold

1. Margin/comparisons prespecified? — No preregistration; ±5% is an a-priori
   practical-equivalence threshold chosen before analysis, stated as "chosen"
   (not "prespecified").
2. Why unpaired MWU? — Oversight; corrected to paired in this revision.
3. Freedman–Lane permutation unit — was pooled residuals; corrected to replicate
   blocks; full model stated.
4. #permutations / p-floor — B stated; p=(ge+1)/(B+1); report p ≤ that floor.
5. Core pinning in primary? — Not pinned in primary (shared host); isolation
   re-run added (5c); disclosed.
6. CPU% over process trees — parent + descendants from /proc; Prisma engine is an
   in-process Node-API library (0 child procs, ~30 threads).
7. Combined app+db CPU-seconds/req — added (§6.4 reanalysis).
8. Errors/timeouts in primary 90 cells — all zero in-window; reported per cell.
9. Requests per run-level p99 — ≈ rps×12 s; reported.
10. autocannon histogram — hdr-histogram-js (sub-ms); p99 rounded to ms in tables.
11. Same-SQL parameter/prepared/autocommit parity — same probe id, same two
    statements (byte-identical, captured); protocols disclosed; autocommit path.
12. "idiomatic" determination — each layer's documented recommended eager-loading
    idiom; maintainers not formally invited (note as limitation).
13. Why tuned native but not tuned ORM — tuned native = lower-bound baseline;
    ORM tuning space is open-ended; framed as equal-config vs tuned (5a helps).
14. Prisma 5.22 vs 7 — measured 5.22 (Rust engine); v7 = TS rewrite; disclosed.
15. Artifact contains supplement? — will, after Stage 4/6.
16. Licenses — MIT (code) / CC-BY (text/data).
17. GenAI use — declared (ist_main.tex:117–122).

## Rebuttal backbone

1. Clarify the wrong-PDF: the submission build already carries the structured
   abstract, keywords, and all declarations.
2. The central statistical fix (paired analysis) is done on the existing data and
   reported honestly, including any change to the pg–Prisma conclusion.
3. Combined-CPU reframing strengthens honesty.
4. Three new experiments added; remaining optional items declined with reasons.
