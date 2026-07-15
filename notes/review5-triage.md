# Review Round 5 — triage and response skeleton

Fifth external reviewer, IST, **major revision** (17 sections + 8 questions + a
17-item prioritized checklist), on `ist_main.pdf` (51 pp, the v1.4.1 build). Verdict:
not rejectable; "credible publication path in IST"; issues "major but potentially
correctable." Credits the R4 reposition. **User decisions (all maximal): full
re-freeze + re-run; full estimand restructure; full program.**

Disposition tags: **[RERUN]** answered by re-measuring on current versions ·
**[REFRAME]** framing/estimand restructure · **[STATS]** reanalysis · **[NOVEL]**
novelty-search auditability · **[LANG]** wording · **[MINOR]** §7 minor ·
**[ARTIFACT]** clean-room repro · **[REBUT]** already correct, answer in letter.

## Priority-1 — version currency (potentially fatal) → [RERUN]

The headline was Prisma **5.22** (in-process Rust engine, the ~498%/5-core CPU
anomaly). **Prisma 7.0 went GA 2025-11-19** (Rust-free TypeScript rewrite) — the
contemporary stable at the July-2026 freeze. Current freeze rule is only "install on
measurement date" (`methodology.tex:322-326`), which does not justify a superseded
version. **Fix:** re-freeze every library to the latest stable compatible release and
re-run; document a per-layer freeze rule. Expected: the Prisma CPU anomaly disappears
under v7 → retire/replace that headline honestly (evidence for the "rankings
perishable, methodology durable" thesis).

**Version landscape (freeze reconnaissance, 2026-07-15):** MAJOR bumps needing adapter
/harness work — `@prisma/client` 5.22→7.8 (new arch), `drizzle-orm` 0.36→0.45,
`typeorm` 0.3.30→1.1, `@mikro-orm/core` 6→7, `express` 4→5 (shared server),
`autocannon` 7→8 (load gen). Already latest stable (no change): `pg` 8.22, `knex`
3.3, `sequelize` 6.37.8 (v7 still alpha → 6 is latest stable, document), `objection`
3.1.5. Minor: `mysql2` 3.22→3.23.

## The pre-specified freeze rule (Stage 0 deliverable → methodology.tex + METHODOLOGY.md)

> Each library is pinned to the latest stable release compatible with the harness
> adapter contract as of the freeze date (2026-07-15), recorded from the committed
> lockfile. A library is pinned to an earlier release only where the latest stable
> breaks the adapter contract or the byte-equivalence cross-check; any such deviation
> is documented per layer with its reason. Prereleases/alphas are excluded (e.g.
> Sequelize 7 alpha → the 6.x stable line is used and this is stated).

## Major concerns (§6)

- **6.1 saturated p99 = capacity, not intrinsic latency** → [REFRAME] the caveat
  exists at `results.tex:222` + `supplement.tex:268-271` but is **absent from the
  abstract, intro, conclusion** — propagate it; demote saturated p99 to
  overload/queueing behaviour. Elevate matched-utilization (S21/S22) to co-primary in
  the MAIN text with a figure. **Recurring; propagation gap again.**
- **6.2 no external rationale for the 50-connection point** → [REFRAME] name the
  three estimands (equal external demand / equal utilization / equal resource budget)
  and map each experiment to one; stop privileging equal-demand implicitly.
- **6.3 "idiomatic" not construct-valid; "abstraction cost"** → [LANG] replace
  "abstraction cost" with "observed implementation-and-strategy difference"; keep the
  no-maintainer-review disclosure. (alt-loading S18 already gives ORM variants.)
- **6.4 same-SQL compound; residual overreach** → [LANG] fix `results.tex:70-72`
  ("abstraction is cheap when a layer merely forwards") and `discussion.tex:129`
  ("recovers most of the deep fetch's cost").
- **6.5 RQ1 "overhead" presupposes direction (Prisma exceeds native)** → [REFRAME]
  RQ1 "overhead"→"performance difference relative to native"; results heading
  `results.tex:26`.
- **6.6 broad RQ statistics uneven** → [STATS] extend paired effect-size+CI tables
  (only `significance_deep_fetch` exists) to writes + a cross-engine comparison; add
  p99 CIs to `deep_fetch`/`write` (bare p99 today); keep rank-transfer descriptive.
- **6.7 novelty search not auditable** → [NOVEL] add exact strings, per-DB dates,
  record counts, eligibility list; soften "we found none."

## Statistics (§8)

- [STATS] relabel CIs "within-campaign / within-environment repeated-run"
  (bare "95% CI" today, methodology + captions).
- [STATS] permutation exchangeability justification + compact blocked-permutation
  math spec (supplement).
- [STATS] weaken adjacent-rank "statistically and practically supported" → descriptive
  (post-selection stated).
- [REBUT+sharpen] TOST already framed as deployment-relevance SESOI chosen before
  analysis (`methodology.tex:306-313`) → sharpen to "author-selected SESOI for this
  study, not a general threshold."
- [STATS] report approx request count contributing to p99 in slowest cells + histogram
  resolution.

## Artifact (§9) → [ARTIFACT]

Clean-room reproduce from the archived Zenodo tarball (not the dev checkout): one-command
setup, checksums, exact table regeneration, completeness, container defaults, licenses
→ reproduction note (answers Q7). Digest pins + lockfile + declarations already present.

## Presentation (§11) → [REFRAME/cut]

Too long and too defensive; restructure around three findings (workload-dependent
differences; read-vs-write engine transfer; capacity-vs-utilization). Move defensive
sensitivity prose to the supplement; optional estimand-map figure. Keep < 15,000 (IST
counts refs + floats×200).

## Minors (§7) → [MINOR]

"pipelined query engine" (`results.tex:90-91`) → hypothesis; open-loop "collapse"
(`results.tex:215-217`) → numeric threshold or descriptive; byte-identical *data* vs
identical physical state (`methodology.tex:80-82`); soften RAM working-set "reflect
access-layer cost" (`:82-85`); state tuned-control exclusion each time "native leads";
stop treating the three-tier taxonomy as explanatory; drop "small" from abstract
"1.5×… residual is small"; note Knex n=24 rule is prespecified (already is).

## §13 — the 8 questions (pre-drafted)

1. **Why Prisma 5.22 in July 2026?** → under the old install-on-date rule it was
   installed then; the revision re-freezes to the latest stable (Prisma 7) and
   documents the per-layer rule → now moot.
2. **Exact version rule, fixed before results?** → yes, the Stage-0 latest-stable rule,
   applied uniformly; deviations (Sequelize 7 alpha) documented.
3. **Why 50 connections primary?** → it is the equal-external-demand estimand; no
   longer privileged — utilization + resource estimands are co-primary now.
4. **Would conclusions change if matched-utilization were primary?** → the restructure
   makes it co-primary; the answer is stated: the large saturated gaps largely reflect
   capacity, so yes the interpretation changes (and we now foreground it).
5. **Adapters reviewed by maintainers?** → no; disclosed limitation; alt-loading
   variants + byte-equivalence bound representativeness.
6. **Requests contributing to each run-level p99 in slowest cells?** → report the count
   + histogram resolution (Stage 4).
7. **Zenodo regenerates every table clean-room?** → verified by the Stage-6 clean-room
   reproduction.
8. **Which claims survive anonymizing product names A–I?** → answer explicitly: the
   durable claims (workload-dependence, engine read/write transfer asymmetry,
   capacity-vs-utilization) survive; the specific leaderboard does not — this is the
   methodology-as-contribution point.
