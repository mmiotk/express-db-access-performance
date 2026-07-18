# Revision Round 6 — triage and change-map

Sixth IST review, **major revision** (reject-and-resubmit only if the causal mechanism
claim is retained). Verdict: dataset/artifact publishable; the obstacle is
interpretation claiming more causal specificity and category generality than the design
establishes. This maps every concern to its change.

## Priority checklist (submission-critical first)

| # | Concern | Disposition | Where |
|---|---------|-------------|-------|
| **P1** | same-SQL causally attributed to eager-loading "strategy, not machinery" | **RETRACTED → bounding contrast** everywhere (both abstracts, results §Same-SQL, discussion, conclusion); "which we attribute to dispatch…" → labelled conjecture; "strategy gap" → "idiomatic-to-same-SQL gap" | `results.tex` §Same-SQL, `discussion.tex`, `conclusion.tex`, both abstracts |
| **P2** | "idiomatic" = documentation-order rule, not construct-valid | Renamed estimand: **"documented default configuration under the adapter-selection rule"**; added "documentation order is a reproducible heuristic, not evidence of performance-optimal or common production use" disclosure; kept "no maintainer review" | `methodology.tex` (idiomatic defn) |
| **P3** | category-level recommendations from single implementations | "a thinner path…is the safer default" → scoped to the tested implementations (pg/mysql2, Knex), "a hypothesis for broader study, not a category law" | `discussion.tex` Practical guidance |
| **P4** | capacity / overload-latency / matched-utilization conflated | RQ1 now names the **three distinct quantities**; abstract + methodology already separate them; matched-utilization elevated | `introduction.tex` RQ1, `methodology.tex` |
| **P5** | p99 rests on ~60 tail obs/run | **Longer-window tail re-measurement** (deep_fetch+write, 60 s, 10 reps → `taillong.json`), run-level p99 distributions, p97.5-vs-p99 ranking check; new supplement float. *(campaign running; §6/Q4 filled on completion)* | new `taillong.json`, supplement |
| **P6** | post-hoc adjacent-rank framed as ranking confirmation | "every step…statistically and practically supported" → descriptive pairwise separation, post-selection stated, deep-fetch-only scope noted | `results.tex` significance prose |
| **P7** | interaction reported as p-floor, not magnitude | New supplement **interaction-magnitude table** (`tab:interaction`): per-layer PG÷MySQL ratio + 95% paired-bootstrap CI | `supplement.tex` §Interaction, `gen-r6-tables.mjs` |
| **P8** | perishability over-generalized from one version change | "rankings ARE perishable" → "**can be version-sensitive**; one consequential example"; Prisma case study condensed (~90 words) | all 6 perishable sites, `discussion.tex` |
| **P9** | too long / repetitive | Condensed Prisma narrative, conclusion, practice caveats (~310 words gross); abstract 313→298 (<300); new floats to supplement only. Net body 11,376→11,348; total 14,894 | body-wide |
| **P10** | IST compliance | Structured abstract 298<300; total 14,894<15,000; REPRODUCE.md added; checksums regenerated; Q8 verified | — |

## §7 minors

- 7.1 vendor-independent → qualified "(authorship only; §Methodology defines the term)" at first prominent use.
- 7.3 "latest stable" → "latest stable as of / current at the July 2026 freeze" in both abstracts + discussion.
- 7.4 "native leads essentially every pattern" → **"leads all ten engine-pattern combinations"** (verified: native #1 among 9 idiomatic in all 5×2 cells).
- 7.5 significance table caveat: deep-fetch only, not the full cross-pattern ranking.
- 7.6 "intrinsic latency" **removed** everywhere → "capacity-normalized" / "at matched utilization" / "at moderate load".
- 6.5 "CRUD-spanning" → "five representative access patterns".
- 8.3 "read rankings transfer" → "the read ordering is similar across engines" + Kendall τ added.
- 8.5 insert dispersion: new supplement figure (raw per-replicate MySQL insert points).
- 8.6 TOST ±5% reframed to lead with the engineering consequence, noise demoted to a coincidence.

## Q1–Q8 (pre-drafted)

- **Q1** (documentation-first = idiomatic?): It is a *reproducible selection heuristic*, not a claim of production-representative use; we renamed the estimand accordingly (P2) and rely on byte-equivalence + the archived per-adapter protocol for validity.
- **Q2** (evidence identifying eager-loading as dominant?): None — retracted (P1). The same-SQL contrast is a compound bound.
- **Q3** (maintainers asked?): No; disclosed. Independence and external correctness review are compatible but the latter was out of scope this cycle; byte-equivalence is the correctness guarantee.
- **Q4** (p99 sensitivity to run length): *[TAIL RESULTS PENDING]* — the 60 s re-measurement shows the p99 ranking is [stable/…] vs the 12 s primary (Supplement Table Sxx).
- **Q5** (why saturated p99 primary vs matched-utilization): reframed (P4) — saturated p99 is overload behaviour; matched-utilization latency is co-primary.
- **Q6** (conclusions surviving ex-MikroORM): **Survive.** Reads still similar (deep-fetch ρ=0.77, τ=0.60; range ρ=0.83, τ=0.73), deep-fetch native-relative spread still 3.7× on both engines. Supplement note added.
- **Q7** (Zenodo regenerates every table clean-room): Yes — REPRODUCE.md §4 gives the runnable steps; tarball = git archive with all raw JSON force-added; one caveat (query_counts S2 input transient, .tex committed).
- **Q8** (all files in the immutable release): Yes — 32 tracked `results/*.json` incl. raw.json; checksums.sha256 regenerated to match the tracked set 1:1.
