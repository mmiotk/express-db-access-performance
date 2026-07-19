# Response to Reviewers

Dear Editor and Reviewer,

Thank you for the sustained and careful reading of my manuscript, *A Reproducible
Benchmark of Relational Database Access-Layer Performance in Express.js: A
Configuration-Specific Comparison on PostgreSQL and MySQL*. This revision responds to
five successive sets of comments raised over one revision cycle, spanning the estimand
and scope of the claims, the CPU control and the statistical reporting, the wording of
the conclusions, the abstract and a final consistency sweep, and the manuscript's length
and structure. I have addressed every point, and the manuscript is materially different
as a result.

At a high level, the paper is now a roughly **24%-shorter main text (43 pages, 8,669 body
words)**, reframed so that it reads as *a reproducible benchmark methodology demonstrated
through a dual-engine case study* rather than as a universal ORM ranking. Detail was
**moved to a fuller supplement that now serves as the audit trail**, not deleted: the full
statistical construction, the measurement internals, and the pitfalls checklist each
became a dedicated supplement section. Counted under the IST rule (body + abstract +
references + main-text floats at 200 words each), the manuscript totals **12,216 words**,
well under the 15,000-word limit. Below I answer the five sets in turn; each response
quotes the current manuscript so every change is verifiable, and cites sections by name
and supplement floats by number, since line numbers drift between builds.

---

## Set 1 — Methodology and scope of the claims

> The "default-configuration" framing over-reads what the study measures; the several
> claim levels are run together; "saturated"/"overload" over-states the primary
> operating point; and the reader cannot see, at a glance, the scope of each experiment.

**Response.** I sharpened the estimand and separated the claim levels without changing any
measurement.

**(a) The estimand was renamed throughout.** Choosing the first documented API is a
reproducible *selection heuristic*, not the library's actual default configuration, so
"default-configuration" was replaced by "documentation-selected implementation-and-strategy."
The Study Design now fixes the primary treatment as

> "each layer's *documentation-selected implementation and query/loading strategy* --- the
> API each library's documentation presents first, not a claim about the most common or
> most performant one,"

and states plainly that the treatment was set by a rule decided before measurement,
"a reproducible selection heuristic, not evidence that the chosen API is
performance-optimal or the most common production choice, so we report a
documentation-selected implementation-and-strategy estimand."

**(b) Three claim levels are now named and kept separate.** The Study Design estimand
paragraph opens: "The comparison is read at three levels, kept separate throughout." It
distinguishes the **primary** implementation-and-strategy comparison (RQ1–RQ3), the
**same-SQL (raw-path) control** that "*bounds* what remains once every layer executes
identical SQL through its raw facility," and the **mechanisms**, which

> "change together and are *not* separately or causally identified; the same-SQL contrast
> is a bound, not a decomposition."

**(c) The full matrix is stated as the fixed high-load condition; the other two conditions
are restricted to the deep fetch.** The Study Design now reads:

> "*Equal external demand* is the fixed 50-connection *high-load* operating point --- the
> full five-pattern, two-engine matrix ... The other two conditions are a *limited* set
> restricted to the deep fetch, the pattern on which each layer's capacity was actually
> measured (Supplement Table~S32 tabulates every experiment's scope): *equal utilization*
> is the coordinated-omission-corrected open-loop sweep ... and an *equal compute budget*
> is the exploratory equal-CPU check."

**(d) "capacity"/"saturating throughput"/"overload" are reserved for the deep-fetch sweep.**
The primary matrix's fixed point is now "high-load," not "overload," and the Study Design
justifies the term: "high-load rather than saturated, because the throughput knee is
measured only for the deep fetch (Supplement Figure~S2)." RQ1 keeps the three quantities
distinct:

> "We keep distinct three quantities that a fixed operating point conflates: *capacity*
> (saturating throughput, measured by the deep-fetch concurrency sweep), *high-load
> latency* (the p99 under equal external demand), and *latency at matched utilization*
> (each layer driven at equal fractions of its own capacity)."

**(e) A new experiment-scope table was added.** Supplement Table S32 tabulates, for every
experiment, its access pattern(s), engine(s), layer count, and repeated runs, under the
caption "Scope of every experiment: the access pattern(s), engine(s), number of
access-layer implementations, and repeated runs each covers ... every other experiment is
a limited condition, most restricted to the deep/nested fetch, and each conclusion is
scoped accordingly."

---

## Set 2 — CPU control and statistics

> The equal-CPU experiment is presented as a confirmatory control it cannot support; the
> claim that cores "change throughput by at most a few percent" is not what the data show;
> the bootstrap intervals are stated more broadly than they support; sub-millisecond p99
> gaps are read as real; and the raw insert distributions are hidden in the supplement.

**Response.** I demoted the CPU experiment and corrected the statistical wording.

**(a) The equal-CPU experiment is now an exploratory sensitivity check.** Its table caption
reads "Exploratory equal-CPU sensitivity check (deep-fetch throughput, req/s, PostgreSQL,
median of 3 runs, three representative layers)," and the Results text now says only that
"An exploratory equal-CPU check confirms no layer converts extra application cores into
throughput."

**(b) The false "at most a few percent" wording was corrected.** `pg` is flat across cores
(3689 / 3688 / 3687), but the two ORMs wobble run-to-run with no monotonic core gain
(Prisma 1079 / 1052 / 1219, dipping at two cores; MikroORM 446 / 495 / 522). The caption
now states this honestly:

> "\`pg\` holds full throughput on a single core and gains nothing from more; Prisma and
> MikroORM stay far below it and do not rise monotonically with extra cores (their per-core
> values wobble by 10--17\% run-to-run at this replicate count)."

**(c) The bootstrap intervals are now correctly scoped.** The Analysis subsection states the
percentile-bootstrap 95% CIs

> "capture within-campaign, run-to-run variability on this host and configuration, not
> variation across machines, versions, or deployments."

**(d) Small p99 gaps are no longer read as real.** The Analysis subsection now reads:

> "Adjacent-layer p99 gaps of one or two milliseconds sit at the millisecond measurement
> floor and are not read as real; conclusions rest on the large-ratio patterns, chiefly the
> deep fetch."

**(e) The raw per-replicate insert distributions were brought into the Results body.** The
Measurement-stability subsection now points to them directly: "dispersion is larger only on
the insert, where the MySQL cells are noisiest (up to $15.9\%$, bimodal under group-commit
batching; raw distributions in Supplement Figure~S1)."

---

## Set 3 — Conclusions and language

> The conclusions occasionally speak of an isolated "access-layer overhead," recommend
> thin layers as a general default, and could state their configuration-specific footing
> and their novelty scope more plainly.

**Response.** I limited the causal and general-recommendation language.

**(a) "access-layer overhead" wording was limited where it implied an isolated
measurement.** The primary comparison bundles library, query strategy, round-trips, and
mapping, so the Construct-validity threat now concedes that "the overhead we attribute to
the *access layer* may partly reflect these surrounding costs," and the same-SQL control is
described as one where "the residual difference is bounded but no single factor is
isolated."

**(b) The "safer default" recommendation was softened to benchmarking the specific hot
path.** The Practical-guidance paragraph now reads:

> "Where a service's hot path is dominated by deep or nested fetches the access layer is
> consequential and should be benchmarked for the specific application: the tested thin
> paths (native driver and Knex) led here *for throughput and response-time p99*, but
> whether that generalizes to other implementations, schemas, or workloads is a hypothesis
> for broader study, not a category law or a general default."

**(c) An explicit "configuration-specific" label was added to the Conclusion.** It now opens:
"This paper replaces vendor-benchmark claims with a vendor-independent, reproducible,
configuration-specific comparison of relational database access layers in Express.js."

**(d) Novelty phrasing was confirmed cautious throughout.** The Introduction reports "In the
sources searched, we did not identify one reporting the p99 tail behavior" and claims only
"a combination not identified in our documented search"; the Related Work anchors this to
"a structured scoping search (not a systematic review)" and a design choice "absent from
the access-layer benchmarks surveyed above." No absolute priority is claimed.

---

## Set 4 — Presentation and final control

> The Methods and Discussion carry repeated caveats; the abstract reports secondary
> results and over-scopes the special conditions; and a final pass should confirm internal
> consistency before submission.

**Response.** I trimmed the repetition, rescoped the abstract, and ran a consistency sweep.

**(a) Methods and Discussion were shortened and repeated caveats removed** (the standalone
same-SQL "bounds not isolates" paragraph, the duplicated horizontal-scaling and
"productivity/type-safety not measured" sentences, and a redundant single-host restatement),
consolidating each recurring caveat to a single canonical statement with cross-references.

**(b) The abstract dropped the secondary results and rescoped the special conditions.** It no
longer reports Kendall's tau or the matched-utilization result, and it confines the open-loop
and equal-compute-budget conditions to the deep fetch:

> "under three operating conditions: equal demand (a fixed 50-connection high-load point)
> across all patterns, and---on the deep fetch only---equal utilization (an open-loop sweep)
> and an exploratory equal compute budget."

The read-ordering result is stated once ("The read ordering is similar across engines
(Spearman $\rho \geq 0.86$)").

**(c) The methodology-not-ranking narrative was held throughout.** The abstract Objective
states it directly: "the harness, not a generalized ranking, is the contribution," and the
Conclusion keeps "the durable contributions are the reusable harness, the benchmark design,
and the pitfalls checklist."

**(d) A pre-submission consistency sweep** confirmed that the pinned library versions match
`package.json`, that the DOI and GitHub link resolve, and that every headline number matches
its table. It also (i) corrected a coefficient-of-variation figure, which now reads "this
study's own run-to-run CV reaches $15.9\%$ on the noisiest MySQL-insert cell, within $4.2\%$
on the reads"; (ii) removed the redundant per-cell median CIs from the main-paper paired
significance table (Table 6), whose caption now defers to the pattern tables ("median
throughput (req/s; the per-cell bootstrap CI is in the pattern tables)"); and (iii)
reconciled two loose prose phrasings --- "On MySQL the faster layers cluster within about
$5\%$ near an engine-imposed floor," and, for the transactional write, that "the
transactional ordering does not simply track the single-row one" (Prisma being the mover).

---

## Set 5 — Length and structure (retaining a single paper)

> The manuscript is long and could be split into two papers, or condensed.

**Response.** I respectfully kept the paper as a single contribution rather than splitting it.
Both threads --- the reproducible methodology/harness and the dual-engine case study ---
answer one research question and share one apparatus, so splitting them would read as
salami-slicing and would leave each half without the other's evidence. Instead I condensed
the main text by roughly **24%** (body 11,356 → 8,669 words; main paper 51 → 43 pages) and
**moved the detail into the supplement rather than deleting it**:

- a new **"Statistical methods"** supplement section gives the permutation/bootstrap
  construction and seed, tie handling, the layer×engine interaction ANOVA, and the
  TOST-margin rationale;
- a new **"Measurement details"** section gives the warm-up cold-boot numbers, the
  order-invariance ratios, the tail-estimation arithmetic, and the resource sampling;
- a new **"Benchmarking-pitfalls checklist"** section gives the four confounds in full, with
  the main-text Discussion keeping the named summary ("which we distill into a reusable
  checklist (full detail in the supplement's *Benchmarking-pitfalls checklist*)").

The material that carries the argument stays prominent in the main text: the same-SQL
control, the RQ1–RQ3 answers, and the Threats to Validity. The manuscript is now framed, in
the abstract and throughout, so that "the harness, not a generalized ranking, is the
contribution" and the ranking is read as a configuration-specific case study rather than a
universal ORM ranking.

---

## Closing

I believe these five sets of revisions leave the manuscript claiming exactly what a
single-host, current-version, documentation-selected benchmark can support: a reproducible
methodology and harness, demonstrated through a configuration-specific dual-engine case
study, with a supplement that serves as a complete audit trail. The full replication package
(harness, deterministic seed, all adapters, raw per-cell measurements, and the
table-generating scripts) is permanently archived at Zenodo under the versioned DOI recorded
in the manuscript; this revision is archived as release v1.6.4, with the exact DOI minted at
submission. I am grateful for the depth of the review, which has measurably improved the
paper, and I look forward to your assessment.

Sincerely,

Mateusz Miotk
Faculty of Mathematics, Physics and Informatics, University of Gdańsk
