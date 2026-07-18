# Response to Reviewer (Revision Round 7)

Dear Editor and Reviewer,

Thank you for the continued careful reading of my manuscript, *A Reproducible
Benchmark of Relational Database Access-Layer Performance in Express.js: A
Configuration-Specific Comparison on PostgreSQL and MySQL*. This round raised
fourteen points, spanning a factual inconsistency, several statistical and
reporting gaps, a set of scoping over-claims, and editorial and word-limit
compliance. I have addressed all fourteen and answer them below in the reviewer's
order. Each response quotes the revised manuscript briefly so every change is
verifiable, and cites sections by name and supplement tables by number rather than
by line number, since line numbers drift between builds.

---

## Reviewer point 1 — Contradiction in the measurement dates

> The text stated that all measurements were taken on 16–17 July 2026, yet
> elsewhere described a run performed "eight days later," an internal contradiction.

**Response.** The reviewer is right; this was a genuine inconsistency, and I have
corrected the dates to reflect what actually happened. The Study Design
(Section 3, *Experimental setup*) now reads that "the measurements were taken on
2026-07-16 to 2026-07-18 on a single host," with the secondary experiments
following "over 2026-07-16 and 2026-07-17, with the longer-window tail
re-measurement taken on 2026-07-18." The "eight days later" phrasing is gone: the
post-restart and longer-window runs are part of the same three-day campaign, and
the previously stale post-restart figures were checked against the raw data and
corrected.

## Reviewer point 2 — p99 is a primary outcome but lacked tests, CIs, and effect sizes

> p99 tail latency is declared a primary outcome, yet the promised confidence
> intervals, significance tests, and effect sizes were reported for throughput
> only, not for p99.

**Response.** I have closed this gap on both fronts. Every pattern table now carries
a per-cell bootstrap 95% CI on p99 alongside throughput; for example the
deep/nested-fetch table (Table 2) reports `pg` at "20~[18--21]" ms and MikroORM at
"116~[113--119]" ms. I also added a paired p99 significance table (Supplement
Table S30, `tab:significance_p99`) applying the same permutation, Wilcoxon,
geometric-mean-ratio, and dominance analysis to each adjacent p99 step. The main
text (Section 4, *Tail latency*) reports its outcome honestly, including the one
near-tie: "A paired p99 analysis (Supplement Table~S30) resolves every adjacent
pair on both engines except the near-tied TypeORM--Prisma step on PostgreSQL (ratio
1.03, p=0.06)."

## Reviewer point 3 — "saturated" over-claims the operating point

> Calling the primary 50-connection matrix a "saturated" measurement over-states
> what was demonstrated, since a saturation knee was shown only for one pattern.

**Response.** I have renamed the primary operating point accordingly. The Study
Design (Section 3) now describes the fixed 50-connection matrix as a "high-load"
point, stating it is "high-load rather than saturated, the throughput knee being
demonstrated only for the deep fetch (Supplement Figure~S2) while the ten-connection
pool, not a per-pattern knee, is the binding constraint." The Introduction and the
tail-latency prose adopt the same term ("fixed 50-connection high-load operating
point"). Legitimate per-layer, pool, and open-loop uses of "saturat*" — where a
genuine capacity limit is being described — are retained.

## Reviewer point 4 — "single-/multi-core-bound" is a causal over-claim

> Describing layers as "single-core-bound" or "multi-core-bound" asserts a causal
> CPU bottleneck the controls do not establish.

**Response.** I replaced the causal label with the observation the controls actually
support, at every prose site and in two captions. The Results now state that "no
layer buys throughput with extra application cores," and the Discussion that "the
equal-CPU control confirms extra application cores do not raise a process's
throughput," with the Conclusion noting "no layer's throughput scales with
additional application cores." The equal-CPU and cluster controls "rule out unequal
core access" as the cause of the ranking without claiming single-core CPU is the
bottleneck. I also corrected the factual error in the equal-CPU caption
(`equalcpu.tex`, Supplement Table S4), which now reads that "a layer's low
per-process throughput is recovered by more processes, not more cores."

## Reviewer point 5 — Prisma version sensitivity conflates fact and hypothesis

> The claim that a Prisma architecture change caused the retired five-core result is
> asserted more strongly than the evidence allows.

**Response.** I now separate the fact from the hypothesis explicitly. The Discussion
(*Access-layer rankings can be version-sensitive*) states: "The non-reproduction is
a fact; its cause is a hypothesis: the vanished premium was Prisma-specific and only
Prisma changed architecture, so its Rust-free rewrite is the likeliest driver, but
the re-freeze moved the whole toolchain at once, so we cannot isolate it." The
Introduction and Conclusion headline sentences now attribute the retirement to a
re-run "on newer versions" rather than to any single library change (Conclusion: "an
earlier version's headline did not survive re-running the same harness on newer
versions").

## Reviewer point 6 — "idiomatic" over-claims representativeness

> Labelling each configuration "idiomatic" implies it is the most typical or optimal
> production choice, which the study cannot support.

**Response.** I replaced "idiomatic" with "documentation-selected" throughout (about
53 occurrences in the manuscript, plus the supplement and the replication package's
`METHODOLOGY.md`), and made the selection rule reproducible rather than
representative. The Study Design (Section 3) fixes the treatment as "the
eager-loading API each layer's official documentation presents first for the pinned
version" and states plainly that "Documentation order is a reproducible selection
heuristic, not evidence that the chosen API is performance-optimal or the most common
production choice." The estimand name "default-configuration" is retained.

## Reviewer point 7 — Simplify the statistical analysis

> The statistical presentation is heavier than necessary; lead with effect sizes and
> demote the post-hoc pairwise tests.

**Response.** I restructured the analysis to that hierarchy. The results subsection is
renamed "Measurement stability and effect sizes" (Section 4) and now leads with
geometric-mean ratios, bootstrap CIs, and practical significance: "Magnitude, not bare
separation, is the point: the narrowest step (Sequelize over Objection, ratio 1.05,
dominance 0.88) sits essentially at the ±5% practical-equivalence margin ---
distinguishable yet practically marginal." The permutation, Wilcoxon, and Bonferroni
tests are compressed to a secondary, descriptive note: "the pairs were chosen after
observing the ranking, so the p-values are a post-hoc robustness check on the deep
fetch only, not independent confirmation of the cross-pattern ranking." The
Methodology, Threats, and Conclusion were aligned to the same primary/secondary
split; no statistic was added or removed.

## Reviewer point 8 — Report the magnitude of the layer×engine interaction

> The interaction is reported only as a significance floor, which conveys nothing
> about its size.

**Response.** The RQ2 paragraph (Section 4) now leads with the magnitude, drawn from
the new Supplement Table S28 (`tab:interaction`, per-layer PostgreSQL÷MySQL throughput
ratios): "across the three reads it holds a narrow band (≈1.0--1.6×, near-parallel),
but the insert scatters from 1.6× (MikroORM) to 3.2× (Prisma), reordering the layers
across engines." The blocked permutation test is demoted to its proper role: "The
blocked permutation test only confirms this interaction is nonzero; its floor p says
nothing about size."

## Reviewer point 9 — Novelty claims exceed the scoping search

> Claims that the design is "missing from prior art" or "absent from every benchmark"
> over-reach a search the authors describe as non-systematic.

**Response.** I softened the two bald claims to match the search. The Introduction now
describes the design as "a combination not identified in our documented search," and
the Related Work as "a design choice not found in the access-layer benchmarks surveyed
above." These sit alongside the already-scoped statement that the literature was
located with "a structured scoping search (not a systematic review)" (Section 2), so
every gap claim is now confined to the sources searched.

## Reviewer point 10 — State library selection criteria

> The rationale for the specific libraries included and others omitted is not stated.

**Response.** I added explicit inclusion criteria and named the exclusions in the
Study Design (Section 3): each library "is maintained, used, and --- for the portable
tiers --- runs against both engines. That excludes PostgreSQL-only Slonik and
pg-promise as non-portable, and Kysely as a query builder already covered by Knex
(METHODOLOGY.md gives the full criteria)." The full criteria and a per-candidate
decision table are in the replication package's `experiments/METHODOLOGY.md`.

## Reviewer point 11 — Add an artifact-reproducibility summary

> The submission would benefit from a structured summary of what is needed to
> reproduce the study and which results regenerate automatically.

**Response.** I added Supplement Table S31 (`tab:reproducibility`), an artifact-
reproducibility summary giving the version and commit (release v1.6.2), the Zenodo DOI
(`10.5281/zenodo.21433223`), the software and hardware requirements, the run commands,
and the time and resources — smoke test "≈5--10~min," full campaign "≈25~h wall-clock,"
and table regeneration in "≈minutes, no database." It records which results are
auto-reproduced: "Every table and figure, from the archived raw data;
results/checksums.sha256 verifies the 33 raw-data files." A one-line pointer was added
to the Data Availability section, and `REPRODUCE.md` is named as the single runnable
entry point.

## Reviewer point 12 — Shorten and reduce repetition

> Several conclusions are restated multiple times; the manuscript can be tightened.

**Response.** I consolidated the three most-repeated conclusions — the retired Prisma
headline, the version-sensitivity thesis, and the same-SQL "bounds but does not
isolate" caveat — to one canonical statement each with cross-references, and compressed
the most duplicative auxiliary prose (the open-loop/utilization tail block and the
thrice-told multi-worker cluster result) to a conclusion plus a supplement pointer.
Every trimmed number still appears once in its supplement table. This cut the body by
232 words (11,448 to 11,216).

## Reviewer point 13 — Editorial: double period on run-in headings

> The run-in paragraph headings render a doubled period under the journal class.

**Response.** Fixed. Under `elsarticle` the run-in `\paragraph` headings that already
ended in a period had a second period auto-appended (rendering, for example, "the
instrument is the contribution.."); I removed the trailing period from all twelve
headings, so each now renders a single period (see Section 5, Discussion). Terminology
was also unified across the manuscript ("documentation-selected," "high-load").

## Reviewer point 14 — Confirm compliance with the word limit

> Please confirm the manuscript meets the journal's word limit under its counting rule.

**Response.** Confirmed against the IST *Guide for Authors* (research paper maximum
15,000 words; "references and appendices are part of the submission and count against
the total number of words, and figures and tables count 200 words each"). Applying that
rule exactly, the manuscript is **14,763 words**: body 11,216 + structured abstract 299
+ reference list 1,848 + seven main-text floats × 200 = 1,400. There are no appendices
(the supplement is separate online supplementary material under Elsevier policy, not an
appendix), and the mandatory declaration sections are excluded per Elsevier convention.
This is under the limit with 237 words of headroom, and the structured abstract (299
words) is under the 300-word cap. The full declaration is in `word-count.md`.

---

## Summary of changes

For the editor's convenience: I corrected the measurement dates to 2026-07-16 through
2026-07-18 and fixed the stale post-restart figures (1); added per-cell bootstrap p99
CIs to all five pattern tables and a paired p99 significance table, Supplement Table S30
(2); renamed the primary matrix a "fixed 50-connection high-load operating point" (3);
replaced the "single-/multi-core-bound" causal label with a controlled observation and
corrected the equal-CPU caption (4); separated the fact of the non-reproduction from the
version/architecture hypothesis (5); replaced "idiomatic" with "documentation-selected"
throughout (6); led the statistical analysis with effect sizes and demoted the post-hoc
tests, renaming the subsection "Measurement stability and effect sizes" (7); reported the
layer×engine interaction as a magnitude in new Supplement Table S28 (8); softened the
novelty claims to the documented scoping search (9); stated explicit library
inclusion/exclusion criteria (10); added the artifact-reproducibility summary, Supplement
Table S31 (11); consolidated repeated conclusions and cut the body by 232 words (12);
removed the doubled period from all twelve run-in headings (13); and confirmed the
14,763-word total against the IST rule (14). I believe these revisions resolve every
point raised and leave the manuscript claiming exactly what a single-host, current-
version, default-configuration benchmark can support. I look forward to your assessment.

Sincerely,

Mateusz Miotk
Faculty of Mathematics, Physics and Informatics, University of Gdańsk
