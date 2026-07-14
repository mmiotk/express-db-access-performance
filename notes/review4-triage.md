# Review Round 4 — triage and response skeleton

Fourth external reviewer, IST, **major revision** (17 sections + 20 questions), on
`ist_main.pdf` (58 pp, R3 version). Verdict: not rejectable; "publishable empirical
core"; revision "must be substantive, not cosmetic." **The same six objections
recur** from R2/R3 — the durable fix is to **reposition the frame** (instrument +
methods + configuration-specific demonstration), propagate the R3 fixes
*uniformly*, add the feasible single-host experiments, and cut length.

Disposition: **[REPOS]** reframe title/Objective/RQs/contributions ·
**[PROP]** propagate an existing fix consistently · **[NEW]** new single-host
experiment · **[REAN]** reanalysis of existing data · **[DOC]** docs/artifact ·
**[CUT]** length · **[REBUT]** already correct, answer in the letter.

## Major concerns (§6)

- **6.1 saturated p99 ≠ intrinsic tail** → [REPOS/PROP] rename to "saturated
  client-observed response-time p99 at the 50-conn operating point" everywhere
  (frame sites inconsistent per audit); [NEW 2a] utilization-controlled open-loop
  (50/70/85/95% of each layer's own max, replicated, both engines) = the intrinsic
  latency evidence, made co-primary. **Recurring — R3 qualifier not propagated.**
- **6.2 same-SQL ≠ mechanism** → [PROP] delete "lies in / dominated by /
  raw-execution component / query-generation & result-construction path" from both
  abstracts + intro + conclusion + discussion + results; [DOC 4b] factor table.
  **Recurring — compound framing stated in methodology only, mechanistic survives
  in the frame.**
- **6.3 "idiomatic" subjective/unvalidated** → [DOC 4a] pre-specified selection
  protocol + exact doc-URL+version per API; state-flags already documented;
  [REBUT] alt-loading already covers the ORMs (native/builder/Prisma have fixed SQL
  → "where feasible"); no maintainer review = disclosed limitation (user decision).
- **6.4 equal pool ≠ equal resource** → [PROP] name the estimand "equal configured
  connection limit"; [NEW 2b] per-layer pool-size frontier (all layers, both
  engines).
- **6.5 single-host interference** → [REPOS] single-host = declared scope;
  [NEW 2c] multi-worker node-cluster (does Prisma's parity survive once idle cores
  are consumed?); separate-host/remote-DB = scoped future use (no 2nd machine, user
  decision). **Recurring — the core design attack; answered by reposition + the one
  feasible experiment.**
- **6.6 "25 independent replicates"** → [PROP] "repeated randomized-block runs" at
  all 7+ audit sites incl. a **main-text table caption**; the manuscript already
  concedes non-independence (methodology.tex:200-205) so this is a self-contradiction
  fix. **Recurring — R3 fixed the IST abstract only.**
- **6.7 workload/temporal concentration** → [PROP/REPOS] restrict recommendations to
  the tested workload; [NEW 2d] mixed read/write; [NEW 2f] 60-120s longer-run
  sensitivity; single-host + short campaign = scope.
- **6.8 selective/post-hoc statistics** → [REAN 3a] full per-cell CIs in main text;
  [NEW 2e] replicate the 1-run open-loop / 3-run fan-out; [REAN 3f] label fan-out/
  durability/strategy/open-loop exploratory; adjacent-rank already labelled post-hoc.
- **6.9 interaction p uninformative** → [REAN 3e] report cross-engine ratio effect
  sizes with intervals + a normalized layer-effects figure; de-emphasize the floor p.
- **6.10 novelty "vendor-independent"** → [PROP] "structured related-work search"
  (not systematic review); scope novelty to searched databases/dates (mostly done
  R3); archive full search strings.

## Statistics (§8) — mostly already sound (audit-confirmed)

- p99 test unit = run-level (25 values) ✓ [REBUT+DOC 3b state it]; bootstrap =
  percentile, replicate-unit, seeded 0x57a75 ✓ [DOC 3b]; ms-quantized p99 ties get
  generic Wilcoxon correction [DOC 3b note].
- TOST "are equivalent" → [PROP 3c] "met the ±5% equivalence criterion."
- Rank correlations: coefficients shown, [REAN 3d] add the per-layer PG-vs-MySQL
  rank table.
- Equivalence margin a-priori not preregistered — already disclosed.

## Artifact (§9) — mostly done (audit-confirmed)

Digest-pinned images ✓, lockfile ✓, declarations ✓, checksums ✓, MANIFEST ✓ →
[DOC 4d] archive DB config/runtime vars, extend MANIFEST for new experiments,
refresh checksums, confirm clean-machine reproduction.

## Presentation (§11) — [CUT] 25-35%

14,996/15,000 now → [CUT 5a] move all secondary experiments to supplement; [CUT 5b]
collapse the five recurring conclusions + synthesis figure; [CUT 5c] recount.

## Minors (§7, 25 items) — [PROP/CUT 5d]

req/s consistency; "physically rebuilt"→accurate reset wording; "collapse"
pre-specify+disambiguate; "heaviest ORM"→"slowest measured layer in this cell";
abstract "25"→note one cell 24; response-size distributions; DB isolation level;
keep-alive/serialization settings; indexes/FK/collation table; "query-engine ORM"→
precise architectural description; figure axis ticks; "framework floor" weak
inference softened; Postgres/PostgreSQL already clean; author name already
consistent (no "Miotka").

## §13 — answers to the 20 questions (held)

1. **Idiomatic selection rule** → pre-specified: first eager-loading API in each
   library's official guide for the pinned version; documented per adapter (4a).
2. **Maintainer/expert review?** → No; disclosed as a limitation (user decision).
3. **Equivalent tracking/hooks/validation/lifecycle?** → library defaults, off or
   request-scoped on the read path; documented per adapter (METHODOLOGY.md:16-190).
4. **Same-SQL mappers identical machine code?** → source-level equivalent, not
   identical code paths; disclosed (the same-SQL control is a compound intervention).
5. **Prepared-statement caches over fresh-process runs?** → fresh process per run →
   cold statement cache each run; tuned baselines reuse within a run.
6. **Bootstrap resampling unit?** → replicate index (25 run-level values), seeded.
7. **p99 tests on 25 run-level p99 values?** → yes.
8. **Why saturated p99 primary vs replicated open-loop at controlled utilization?**
   → both now reported; 2a adds the utilization-indexed open-loop as co-primary.
9. **Processes CPU-pinned?** → DB/server/generator on the same host; equal-CPU
   control pins the server (taskset); single-host limitation disclosed.
10. **Steal time / frequency / neighbors?** → uncontrolled on the virtualized host;
    disclosed as scope; 2f longer-run + post-restart (S20) bound the drift.
11. **Load generator co-located every run?** → yes (single host); disclosed.
12. **Buffer pools / OS caches between cells?** → warm by design; randomized order +
    fresh boot; post-restart check (S20) confirms cold-start ranking.
13. **Exact IST word count (200/float, refs)?** → recomputed in word-count.md (5c).
14. **Zenodo archive = submitted version?** → v1.4.0 tarball is `git archive HEAD`.
15. **Fan-out "robust" with 3 reps?** → relabelled exploratory + replicated to ≥10
    (2e); "robust" softened.
16. **Uncertainty for MySQL commit-path %?** → add CI from waitevents replicates.
17. **Stable public versions + immutable ids?** → digest-pinned (compose) + lockfile.
18. **Miotk or Miotka?** → Miotk everywhere (verified; no Miotka).
19. **AI generate/modify adapters or stats code?** → assisted; verified by
    byte-identical cross-check + unit tests; disclosed (GenAI declaration).
20. **Raw logs reconstruct failed/excluded runs (knex n=24)?** → yes; raw JSON +
    partial files + status logs archived.
