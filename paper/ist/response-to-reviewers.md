# Response to Reviewers

Dear Editor and Reviewer,

Thank you for the exceptionally thorough and constructive review of my manuscript,
now titled *A Comparability Protocol for Benchmarking Relational Database Access
Layers in Express.js*. This round (R8, the second major revision) responds to one
comprehensive review, and I have addressed every point in it: all six Essential items,
the eight numbered concerns, the minor labeling and abstract points, and the requests
on novelty discipline, contribution separation, reproducibility, and structure.

I want to be explicit about scope at the outset: **the primary measurement matrix --- the
data, harness, pinned versions, raw per-cell records, and every previously reported primary
number --- is unchanged in this round.** Most changes are prose, label, and
analysis-presentation revisions --- reframing the contribution, rewriting the same-SQL result
in non-causal terms, reweighting how the cross-engine transfer is characterized, softening the
language of the low-replicate secondary experiments, and correcting a small number of category
labels. Three points add new, clearly-scoped *supplementary* measurements that leave the primary
matrix untouched: point 6.2 adds an independent write-state validation check, point 6.4 adds a
performance-conscious co-primary deep-fetch regime, and point 6.5 adds a per-pattern capacity
sweep --- each measured on its own harness. Below I answer
each point in turn; every response quotes the current manuscript so that each change is
verifiable, and I cite sections by name and supplement floats by number, since line
numbers drift between builds.

---

## Essential 1 — A single primary contribution, clearly stated and delimited

> The paper reads as several contributions at once (a methodology, an artifact, and an
> empirical ranking); it should be reframed around one primary contribution, clearly
> separated from the others.

**Response.** I agree, and I have subordinated the entire paper to **one** primary
contribution --- a *comparability protocol* --- and explicitly distinguished it from both
the artifact and the case study. The change is carried through the title (now *A
Comparability Protocol for Benchmarking Relational Database Access Layers in Express.js*),
the abstract, the Introduction, the Related Work positioning, the Discussion, the
Conclusion, and the Highlights.

The Introduction states the contribution and its three mechanisms directly:

> "This paper's primary contribution is a **comparability protocol for access-layer
> benchmarking**: a set of controls that turn the vendor-benchmark genre --- which reports
> throughput or latency numbers whose comparability is assumed --- into a controlled
> experiment, by establishing three preconditions the genre otherwise leaves unmet."

The three preconditions are then named as **Semantic equivalence** ("Every layer must
return *byte-identical* results ... before its timing is admitted"), **Strategy
attribution** ("a *same-SQL standardized contrast* reports how much of an observed difference
remains once the SQL is held fixed --- a diagnostic contrast, not an attribution to the library's
execution machinery versus the query strategy"), and
**Operating-point separation** ("Capacity ..., tail latency under equal demand, and latency
at matched utilization are measured and reported as *distinct* quantities rather than
conflated at one arbitrary load point").

The same paragraph then separates the contribution from the two things it is easily
confused with:

> "We distinguish this contribution from two things it is easily confused with. The
> **artifact** --- an open, reusable harness ... --- *operationalizes* the protocol and is
> released so it can be re-run, but is not itself the scientific claim ... The **empirical
> case study** ... *demonstrates* the protocol and shows why each precondition is
> load-bearing."

The Conclusion opens on the same footing ("This paper's contribution is a **comparability
protocol** that makes access-layer benchmarking a controlled experiment rather than
vendor-style number-reporting"), the abstract's Objective closes with "The protocol, not
any ranking, is the contribution," and the Related Work Positioning now reads "the paper's
contribution is the *comparability protocol* it applies." The first Highlight is now "A
reusable comparability protocol turns access-layer benchmarks into experiments."

---

## Essential 4 (points 2 & 3) — The same-SQL contrast is a compound intervention

> The same-SQL comparison is presented as if it isolated the library's machinery from the
> query strategy, but it changes several things at once. Its construct validity as an
> estimand, and the fact that it cannot attribute the residual to any single mechanism,
> should be stated plainly.

**Response.** This was the most important scientific correction, and I have rewritten the
same-SQL result so that it is described consistently as a *compound* contrast that *bounds
rather than decomposes* the difference, and added a new main-text component diagram (Table
6, `tab:samesql_components`) that enumerates exactly what the intervention changes and what
it does not.

The Results "Same-SQL control" subsection now opens:

> "The *same-SQL control* ... is a *compound* intervention: replacing each layer's
> documentation-selected relational-loading path with the same hand-written SQL through its
> raw facility changes the loading API, query strategy, SQL formulation, round-trip count,
> statement preparation, and result hydration *together* (Table~6). ... It therefore
> *bounds* the combined difference these components make; it does not attribute that
> difference to any one of them, and in particular does not establish how much comes from
> SQL formulation or query count."

The result itself is stated as a bound, not a decomposition:

> "The result this supports is that the documentation-selected paths differ much more than
> the raw paths executing common SQL; it does *not* quantify how much of the original
> difference comes from SQL formulation or query count, which change together with the API,
> protocol, preparation, and hydration."

The new **Table 6** (`tab:samesql_components`) lists, component by component (Loading API,
Query strategy, SQL formulation, Round-trip count, Statement preparation, Wire protocol,
Result hydration), what the same-SQL control equalizes versus what still differs across
layers, with the caption stating that "The residual difference it leaves therefore bounds
their combined effect and cannot be attributed to any single one --- in particular, not to
SQL formulation or query count."

For the **construct validity of the treatment**, the Threats section now carries a dedicated
paragraph describing the same-SQL control as "a compound contrast that *bounds*, rather than
decomposes, how much of RQ1's spread comes from the documentation-selected loading strategy
as opposed to the library machinery," and the introductory Results sentence anchors it as "a
compound contrast that bounds rather than decomposes the difference (construct validity:
Section 6 [Threats])." A new supplement section, *Construct validity of the
documentation-selected treatment* (Supplement Table S33), records per layer that the
selected API is the library's canonical relations mechanism and disclaims representativeness:
"The construct is therefore a defined, reproducible practitioner persona ... and is *not* a
claim about performance-tuned expert usage or measured production frequency."

(The "bound / bounds" wording quoted above is the phrasing introduced by this fix; it was
subsequently refined to a "standardized (same-SQL) contrast" in response to point 6.1, so the
current manuscript reads "standardized contrast" wherever this section quotes "bound" — see the
next response.)

---

## Point 6.1 — The same-SQL result is a standardized contrast, not a "bound"

You observed that the default-path and raw-path measurements evaluate two *different*
combinations of the factors that determine throughput, so — without assumptions about
interaction effects — no ordering theorem makes the raw-path spread a bound on the intrinsic
library effect, nor makes (default minus raw) a bound on the strategy contribution; raw mode may
interact differently with each library and may bypass exactly the mechanisms one wishes to
characterize. Following your strong recommendation, we did not attempt a formal proof but
renamed the quantity throughout. Every "bound / bounds / bounded" applied to the same-SQL result
is now a **standardized (same-SQL) contrast / diagnostic** — in the abstract, introduction,
methodology, results (including the Table 6 caption and the same-SQL ratio table), threats,
discussion, conclusion, related work, and the supplement; the only remaining "bound" mentions are
explicit negations. Results now states your argument as the reason for the change:

> "Because raw mode changes several mechanisms at once and may interact differently with each library, this residual is a diagnostic contrast, not a bound on the intrinsic library effect --- no ordering theorem holds without assumptions about interaction effects."

The compound-intervention framing (the contrast changes several mechanisms together; Table 6
enumerates the components it moves) is unchanged; only the inequality/ordering implication has
been removed.

---

## Point 6.2 — The semantic-equivalence gate now validates write state, not just a 2xx

You noted (a) that byte-identical responses over a finite probe set are strong output
equivalence over the tested inputs, not a proof of full implementation equivalence, and (b) that
a non-2xx check catches a failure like the MikroORM HTTP 500 but not a *silently incorrect*
write. Following the option to strengthen (rather than rename), we added a companion check,
`bench/verify-writes.mjs`, that validates post-write database state through an independent
native-driver connection, for every adapter on both engines:

- the single-row insert wrote exactly the requested field values and generated identifier
  (exactly one `posts` row added, no stray comments);
- the transactional write inserted the post and its five comments with the exact field values
  (exactly one `posts` row and five `comments` rows added --- one intended logical operation);
- a transaction whose last comment violates the author foreign key throws and leaves no partial
  state (atomic rollback).

All adapters pass on both engines, so no throughput number changes. Methodology now describes
this and adds the honest finite-probe caveat for reads ("Byte-equality over a fixed probe set is
a strong finite-probe output-equivalence check, not a proof that the implementations agree on
every possible input"); the Discussion notes that a 2xx alone would not catch a silent write
error, so database-state validation is the write path's correctness gate as byte-equality is the
read path's. `REPRODUCE.md` and the artifact-reproducibility table (Supplement Table S31) include
the new `node bench/verify-writes.mjs` command, which must print `ALL WRITES SEMANTICALLY
CORRECT`.

---

## Point 6.3 — The protocol is now specified independently of the case study

You noted that, although the paper's contribution is a reusable comparability protocol, its
concrete definition was intertwined with the Express/access-layer case study. We added a
Methodology subsection, **"The comparability protocol"** (Section referenced as `sec:protocol`),
that states the protocol normatively and independently; the remaining subsections then instantiate
it. It is given in the five parts you asked for:

- **Inputs** — the treatments, a representative workload (not necessarily a production trace), an
  *output semantics* defining response equivalence, and an *operating-point definition* separating
  capacity, external demand, and utilization.
- **Mandatory stages, in order** — (1) correctness oracle, (2) treatment-definition rule,
  (3) strategy-control design, (4) capacity identification, (5) demand/utilization experiments.
- **Pass/fail (cell admission)** — a cell is admitted only if the oracle passes (equivalent
  non-mutating outputs and a correct post-write state, not merely a success status); non-equivalent
  output, an invalid or unsuccessful write, or a degenerate query plan (e.g. N+1) disqualifies it
  and it is excluded from timing.
- **Outputs and their interpretation** — throughput and tail latency per operating point,
  *descriptive* of the treatment-and-strategy, not a causal decomposition (the standardized
  contrast reports a residual); rankings are configuration- and version-specific, and only relative
  within-condition differences are meant to travel.
- **Applicability limits** — byte-identical comparison, our oracle here, is valid only when
  equivalent outputs are deterministic and canonically serializable; for unordered collections,
  floating-point results, timestamps, nondeterministic identifiers, or semantically equivalent but
  differently serialized responses, the oracle must instead be a semantic comparator (set equality,
  numeric tolerance, canonicalization, or field projection).

The Introduction contribution statement now points to this specification, so the protocol is
presented with the abstraction its role as the primary contribution requires.

---

## Point 6.4 — RQ1 narrowed to the *implementation strategy*, and a performance-conscious co-primary regime added

You made two requests. **(Part A, required)** that RQ1 be read as the performance of the
*selected implementation strategy* rather than the "performance cost of the access layer,"
because the native driver's default is hand-authored SQL while an ORM's is whatever loader its
documentation presents first --- an asymmetry, with Drizzle borderline and Objection's MySQL
default slower than its documented alternative. **(Part B, the stronger design you suggested)**
that the study report two co-primary regimes --- documentation-primary, and
performance-conscious-but-semantically-equivalent under a predefined tuning budget --- to
separate "what the docs lead a developer to" from "what the technology can reasonably achieve."
I have done both.

**Part A.** The GQM goal now reads "quantifying the performance of its *documentation-selected
implementation strategy*" (previously "quantifying its performance cost"). The driver-versus-ORM
asymmetry is stated explicitly in Study Design ("the native default is hand-authored SQL, the ORM
default the library's relation loader"), and the construct-validity supplement already names the
concrete cases (Drizzle's borderline builder-versus-relational-query choice; Objection's documented
select-in default being the slower option on MySQL). I verified that no "performance cost / overhead
of the access layer" phrasing remains anywhere in the manuscript; RQ1 in the Introduction already
spoke of the "difference of the benchmarked implementations."

**Part B.** The deep/nested fetch is the only one of the five patterns that exposes a documented
strategy choice (join versus select-in eager loading); on the other four each layer has a single
documented path, so the two regimes coincide there by construction. For the deep fetch I added:

- A **tuning budget**, defined in Study Design: the performance-conscious regime takes the faster of
  a layer's two *documented* deep-fetch loading strategies, admitted **only** where it is
  byte-identical to the documentation-primary output under the same `bench/verify.mjs` oracle (now
  extended to probe the alternative strategy at the three primary post ids on both engines). It never
  rewrites SQL, adds caching, or changes the schema.
- A **new harness** (`scripts/deepfetch-regimes.mjs`) that measures both regimes for the four
  data-mapper ORMs on one footing (fixed post id, a warmup pass, then 25 timed repeats each), written
  to `results/deepfetch-regimes.json` and added to the reproducibility checksum manifest.
- A **new supplement float (Table S34)** and a Results paragraph reporting the two regimes side by side.

The finding reinforces, rather than overturns, the documentation-primary reading, and I say so
plainly. For Sequelize and MikroORM the documentation-selected join is already the *faster* strategy,
so the performance-conscious regime returns the identical configuration and the two coincide. The
only cell that gains is Objection on MySQL, whose documented single-join alternative beats its
select-in default (801 → 1,262 req/s, +58%) --- the one case where the documentation leads to the
slower option. Even there the performance-conscious ORM deep fetch remains below the native driver
(1,262 versus the native \`mysql2\` baseline of 2,274 req/s on the same harness, 0.55×; Table S34
carries that reference row), so the deep-fetch gap is a property of the libraries' documented
strategies, not a poor-default artifact. TypeORM's alternative
errors on the ordered nested fetch and Objection's diverges from byte-identity on PostgreSQL; both are
disclosed as non-drop-ins (a portability caveat), and there the performance-conscious regime falls
back to documentation-primary by definition.

---

## Point 6.5 — Capacity is now characterized for all five patterns, not only the deep fetch

You observed that the operating-point protocol is strongest for the deep fetch: the full five-pattern
matrix is measured at a fixed 50 connections, but capacity sweeps existed only for the deep fetch, so
cross-pattern p99 and spread comparisons could be affected by unknown relative utilization for the
other four patterns. You offered two resolutions --- demonstrate the separation across all five
workloads, or explicitly scope it to the deep-fetch case. I took the first, and scoped honestly the
one part I did not extend.

I swept every access layer over a connection ladder (1, 4, 8, 16, 32, 50, 100, 200) on **all five
patterns** and both engines (`bench/scaling-patterns.mjs` → `results/scaling_patterns.json`), and for
each layer computed its saturating throughput (the ladder maximum), its utilization at 50 connections
(throughput at 50 / saturating), and its knee (the smallest connection count reaching 95% of
saturation). The new **Supplement Table S35** reports, per pattern and engine, the median knee and
the median and minimum utilization at 50 connections.

The result closes the gap: the knee lies at or below 50 connections for **every** pattern on both
engines, so the fixed 50-connection point places all five patterns at high utilization of their own
capacity. The relative utilization is therefore now **measured**, not assumed, and the RQ3
cross-pattern spread ranking compares the five at comparable (high) relative utilization. The binding
constraint is the ten-connection pool shared by every pattern, which is why the knee clusters well
below 50 connections regardless of a pattern's absolute throughput. Study Design and the RQ3 results
now state this; capacity identification --- a mandatory stage of the protocol --- is thus demonstrated
across all five patterns, not only the deep fetch.

I kept an explicit, honest scope on the two conditions I did **not** extend: the equal-utilization
open-loop tail and the exploratory equal-compute check each require a per-layer
saturating-throughput *target* and remain demonstrated on the deep fetch (the pattern with the
largest layer spread). The manuscript now labels that as deep-fetch-only rather than implying it is
general.

---

## Point 6.6 — "Isolate the access layer as the only variable" corrected to the configured bundle

You are right that the Controls sentence "four controls isolate the access layer as the only
variable" was too strong and inconsistent with the paper's own account of the treatment, which
bundles differing SQL, query counts, protocols, loading strategies, driver adapters, and hydration.
Those differences are the treatment, not confounds, so "isolate the library alone" mis-states the
causal interpretation. I have corrected the wording where it appeared.

The Controls subsection (Study Design) now reads: the four controls "hold the shared conditions
fixed --- connection pool, logical task, physical dataset state, and observer --- so that the
*configured access-layer implementation bundle* is the only *deliberately varied* factor; they do
not isolate the library alone, since each bundle's differing SQL, query count, protocol, loading
strategy, and hydration are intentionally part of the treatment (the documentation-selected
implementation-and-strategy estimand, Table 6), not confounds to be removed." Two related-work
sentences that used "isolates" for the study's factor were reworded to "treats … as an independent
variable" and "the driver, query builder, or ORM this study varies," so the manuscript consistently
describes a *configured-bundle* comparison rather than an isolated-library one.

I checked the remaining occurrences of "isolat*": the abstract's "reports the difference without
isolating a single mechanism," the introduction's "changing … together rather than isolating any
one," and Methodology's "not of any isolated internal mechanism" are all *disclaimers* of isolation
and are correct as written; "write isolation," the "resource-isolation" CPU-pinning run, and
"isolate the durability mechanism" (a genuine single-flag toggle holding the layer fixed) use the
term in unrelated, accurate senses. No causal claim of isolating the library alone now remains.

---

## Point 7 — Minor concerns (six wording/labeling corrections)

I addressed all six, none of which changed a measurement.

1. **Abstract overloaded — "Prisma 7 sits mid-pack" removed.** The version-specific clause is gone
   from the abstract (it remains, in context, in the Results and Discussion where it belongs). This
   de-loads the abstract and drops it from 297 to ~292 words.
2. **"Most widely used" softened and temporally qualified.** "Express.js remains the most widely used
   web framework for Node.js" now reads "Express.js *has long been among* the most widely used web
   frameworks for Node.js" — a defensible, temporally-scoped claim rather than a point-in-time
   superlative.
3. **Table 1 "Independent?" relabelled "Vendor involvement."** You are right that independent
   authorship is not a methodological property comparable to engine or measurement coverage. The
   column is now **"Vendor involvement"** (values *None* / *Vendor*), the fourth coverage axis is
   renamed "vendor involvement," and the caption states it "marks maintainer-authored studies --- a
   conflict-of-interest property of the source, not a methodological guarantee that an independently
   authored benchmark is unbiased."
4. **"Maximizes layer differences" softened.** The threats sentence now reads "a hot-cache regime
   *expected to make application/access-layer overhead more visible*" rather than "that maximizes
   layer differences," since the stronger claim is not directly demonstrated.
5. **The incomplete Drizzle cell is now noted in the primary text.** Methodology's measurement
   procedure now states that "one cell, Drizzle's MySQL insert, has 24 [runs] after a failed health
   check; the median and interval accommodate it," so the 24-of-25 disclosure is no longer
   supplement-only.
6. **"Independent runs" reworded to "repeated runs."** The body already said "repeated runs"; the
   remaining "independent runs" in three figure/table captions and `REPRODUCE.md` were changed to
   "repeated runs" (in the generators and both table copies), since, as the manuscript itself notes,
   all repetitions share one host and one campaign and are therefore not statistically independent.

To keep the manuscript under the 15,000-word limit after these additions, the point-6.6 Controls
sentence and the new Table 1 caption note were tightened; the total is 14,968 words.

---

## Point 8 — Methodological and statistical assessment (five precision/scoping fixes)

Thank you for the generous assessment ("substantially above the level of many benchmark studies …
no clear statistical error requiring rejection"). I addressed all five issues; none changed a
measurement.

1. **Estimand made explicit.** Methodology now states: "Throughout, *p99* denotes this *median
   run-level p99* — the median across replicates of each run's own p99 — not the p99 of the pooled
   request distribution across runs, which the design does not estimate." The shorthand "p99"
   elsewhere is thereby anchored to this estimand.
2. **Bootstrap intervals kept within-campaign.** Study Design already states the intervals "capture
   within-campaign, run-to-run variability on this host and configuration, not variation across
   machines, versions, or deployments." I reinforced this at the point of use in Results ("the
   bootstrap intervals behind these ratios are within-campaign, not deployment-general") and in the
   new supplement table's note, so they are not read — visually or rhetorically — as general
   deployment-uncertainty intervals.
3. **Coarse p99 resolution acknowledged for near-adjacent layers.** The tail subsection now says the
   paired p99 analysis "resolves every adjacent pair on both engines except two near-ties *that the
   millisecond p99 resolution does not finely separate*," so fine-grained ordering of near-adjacent
   layers is not claimed.
4. **Post-hoc rank tests simplified and demoted.** Following your suggestion, I moved the
   paired-significance table (former main-text **Table 7**) to the supplement (new **Table S36**) and
   the main text now **foregrounds paired effect sizes** — geometric-mean per-replicate ratios and
   per-replicate dominance — stating that "the post-hoc adjacent-pair permutation and Wilcoxon tests …
   are reported only descriptively, in the supplement, since the ranking itself selects the pairs
   tested and their inference is therefore conditional."
5. **Subset experiments labelled sensitivity evidence.** Threats now states that "the secondary
   experiments that cover only a layer subset or few replicates (open-loop tail, equal-CPU,
   pool-size, transactional write, and cluster checks; Supplement Table S32) are read as *sensitivity
   evidence* on the tested subset, not as claims about all eleven implementations."

Moving Table 7 to the supplement reduces the main-text float count from eight to seven; the total is
14,968 words.

---

## Point 9 — Reproducibility and artifact assessment

Thank you for this assessment. I verified all five checklist items before this submission and split
the AI declaration for policy precision.

1. **Zenodo matches the git tag.** The archived tarball is a `git archive` of the tagged commit, and I
   confirmed byte-identity: `sha256(git archive v1.7.4)` equals the `sha256` of the published Zenodo
   tarball. The Data-availability footnote cites the exact release tag and DOI.
2. **Raw observations complete.** Every main-text and supplement statistic traces to an archived
   `results/*.json` raw file through a committed generator (`MANIFEST.md`), and
   `results/checksums.sha256` verifies all 35 files. The single documented exception is the
   round-trip-count table (Supplement S2), which counts SQL statements from transient server logs (a
   deterministic property of the code, not a measurement) and therefore ships pre-generated — disclosed
   in `REPRODUCE.md`.
3. **Environment capture is comprehensive.** `results/environment.txt` records the kernel/runtime
   (`6.17.0-29-generic`, Node 24.18.0), CPU model and count, NUMA topology, CPU governor and turbo
   state, process affinity, virtualization (`vmware`), the git commit, and a hash of the dependency
   lockfile; database configuration (pinned engine content digests, `shared_buffers`/InnoDB settings,
   and durability) is in `experiments/schema/db-config.md`.
4. **Clean-room rebuild uses only pinned dependencies.** The table generators use Node built-ins with
   no network access, and `npm ci` installs from the committed `package-lock.json`, so every table
   regenerates from the archived raw data without reaching any mutable "latest" dependency
   (`REPRODUCE.md`, §4).
5. **Explicit dual license.** Code is MIT (`LICENSE-code`); the paper text, working notes, and
   measurement datasets are CC BY 4.0 (`LICENSE-text`).

On the **AI-declaration policy point**, I split the single declaration into two: (a) the
Elsevier-standard *Declaration of generative AI and AI-assisted technologies in the writing process*,
scoped to drafting/editing and language; and (b) a separate *AI-assisted research software* statement
covering the harness implementation and analysis, which states the author's full responsibility and
that all AI-assisted analytical code is independently inspectable and verified — the statistical
estimators pass 19 unit tests against hand-computed values and closed-form properties
(`bench/stats.test.mjs`; `npm test` reports 19/19), every table cell traces to raw data, and the
byte-level correctness cross-check gates every timing. This matches Elsevier's writing-declaration
language precisely while keeping the research-tool use fully transparent.

---

## Point 10 — Novelty and related-work assessment

Thank you; I preserved the scoped wording you endorsed and bounded the methodological-novelty claim
as you asked.

You noted that the paper risks overstating methodological novelty by implying the general
benchmarking literature does not already address comparable-work requirements. It does, and the
manuscript now says so explicitly. After the three preconditions, the Introduction adds: "These
preconditions are not new to benchmarking in general: correctness, workload equivalence, warm-up,
coordinated-omission correction, capacity curves, and reproducibility are long established in the
performance-evaluation literature (Section [Related Work]). The contribution is their *domain-specific
synthesis and operationalization* for the access-layer genre --- which assumes comparability rather
than establishing it --- not the invention of these principles." The "novel benchmark infrastructure"
phrasing became "the benchmark infrastructure --- the protocol's *domain-specific synthesis of
established benchmarking principles*, and its harness." The Related Work "Standard benchmarks and
benchmarking methodology" subsection already credits this literature (Fruth, Raasveldt, Dean &
Barroso, reproducibility surveys) and frames the paper's choices as taken *from* it.

On the other two points: the "same-SQL bound" is already renamed a "standardized (same-SQL) contrast"
(point 6.1); and the scoped novelty wording --- "in the sources searched," "we did not identify," and
the documented scoping-search protocol --- is preserved throughout, as you recommend.

---

## Point 11 — Presentation (a formal protocol box; density; word-count compliance)

Thank you. I addressed all three parts.

**A compact formal protocol box.** Because the protocol is the contribution, the *comparability
protocol* subsection of Study Design now opens with a **boxed, formal statement** --- Inputs, the five
mandatory stages in order, the cell-admission rule, and the output interpretation --- so the exact
treatment-selection and admission procedure is established in the main text at a glance, not left to
`METHODOLOGY.md` or supplementary tables. The verbose paragraph-by-paragraph prose it replaces was
condensed, which also cuts density.

**Reduced repetition.** I consolidated the most-repeated framing: the "protocol, not the ranking, is
the contribution" line is stated once per location (abstract, Introduction, the Discussion paragraph
heading, Conclusion) rather than echoed within a paragraph --- the Discussion heading and its closing
clause no longer both carry it. I should be candid about a tension: several of the recurring caveats
you list are *load-bearing for earlier points in this same review* --- the same-SQL result is "not a
bound on the intrinsic library effect" (point 6.1), the deep-fetch gap is "not a poor-default
artifact" (point 6.4), and the documentation-selected treatment is not intrinsic ORM overhead. I kept
one statement of each in its relevant context, since removing them would undo those requested caveats,
and trimmed only the gratuitous echoes.

**Word-count compliance, verified quantitatively.** Under the IST rule (references and appendices
count; each main-text float counts 200), the manuscript is body 11,373 + abstract ~292 + references
1,848 + seven main-text floats (1,400) = **14,968 words**, under the 15,000-word Research Paper limit
(an 87-word margin). Moving the paired-significance table to the supplement (point 8) reduced the
main-text float count from eight to seven; the protocol box is inline body text, not a float. The
structured abstract satisfies the five-part requirement and is ~292 words (< 300). The full
declaration is in the separate `word-count.pdf`.

---

## Point 12 — Essential, strongly recommended, and optional revisions

Every Essential item is addressed; most were carried out in the point-by-point responses above, and I
map them here.

**Essential.**

1. **Remove/justify "bound" claims (same-SQL).** Done (point 6.1): every "bound" was reworded to a
   "standardized (same-SQL) contrast"; the only remaining uses are explicit negations ("not a bound on
   the intrinsic library effect"). I verified no positive bound claim survives.
2. **Strengthen the write oracle to validate database state.** Done (point 6.2):
   `bench/verify-writes.mjs` validates post-write field values, generated identifiers, exact row-count
   changes, and transactional rollback through an independent native driver (9/9 pass) --- now the
   correctness oracle's write half, not an ad hoc check.
3. **Rewrite the protocol as an explicit reusable procedure, mandatory vs optional, with
   interpretation rules.** Done (points 6.3 + 11 + this one): Study Design carries the normative
   protocol and now a compact formal **box** that separates **mandatory** stages (correctness oracle;
   treatment-definition rule --- a comparison is valid only if both hold) from **recommended** stages
   (strategy control; capacity identification; demand/utilization --- which enrich the comparison and
   may be scoped to a representative point), with the output-interpretation and applicability rules
   stated explicitly.
4. **Replace "only variable" with the configured implementation-and-strategy treatment.** Done (point
   6.6): the four controls now hold the shared conditions fixed so the "configured access-layer
   implementation bundle" is the only deliberately varied factor; they "do not isolate the library
   alone."
5. **Align operating-point claims with the experiments.** Done (point 6.5): a per-pattern capacity
   sweep (Supplement Table S35) identifies capacity for all five patterns, while the equal-utilization
   open-loop tail and equal-CPU check are explicitly labelled deep-fetch-only.

**Strongly recommended.**

- **Alternative-strategy analysis beyond the subset.** The subset is the *complete* set of layers whose
  documented alternative is a byte-identical drop-in; the excluded cells (TypeORM's alt errors;
  Objection's PostgreSQL alt diverges) have no semantically-equivalent alternative to measure ---
  measuring them would compare non-equivalent outputs, which the correctness oracle forbids. This is
  stated in Results and Supplement Table S34.
- **Define "documentation-selected" more precisely, with tie-breaking.** Done: the selection rule now
  states the tie-breaker --- where several official paths are equally prominent (as for Drizzle's
  SQL-style builder versus its relational-query API), select the API at the library's own taxonomy tier
  and record the rest as documented alternatives.
- **Add state-level write verification to the public harness as part of the protocol.** Done (point 6.2
  and the box): the correctness oracle mandates "mutations produce the intended state," realized by
  `verify-writes.mjs`.
- **Reduce repeated version-sensitivity discussion; move peripheral sensitivity experiments to the
  supplement.** Done: the version-sensitivity echoes in the Introduction and Conclusion are trimmed to a
  single brief mention each (the full treatment stays in the Discussion); the peripheral sensitivity
  experiments (open-loop, equal-CPU, pool-size, cluster, mixed) already live in the supplement (Tables
  S21--S35) with one-line main-text pointers.
- **Report exact word count under IST rules.** Done (point 11 and `word-count.pdf`): body 11,431 +
  abstract ~292 + references 1,848 + seven main-text floats (1,400) = **14,971**, under the 15,000-word
  limit, verified quantitatively.

**Optional.** A second-host replication and an explicitly I/O-bound (larger-than-memory) condition
remain declared future work in Threats to Validity. For the visual protocol schematic, the compact
formal protocol box (point 11) already presents the treatment-definition, correctness-gating,
operating-point, measurement, and interpretation content in the main text; a graphical version is a
natural future enhancement.

---

## Point 15 — Final recommendation (major revision)

I appreciate the recommendation and the clear statement of what is required. The central concern ---
that the manuscript moved from the valid observation (differences shrink when all layers run common
SQL through their raw APIs) to the stronger *attributional* claim that this "bounds" strategy versus
library machinery, which does not follow without assumptions about interaction effects --- is exactly
the correction I have made, and it is now consistent across all three advertised pillars.

- **The same-SQL experiment is treated as a standardized diagnostic contrast** (point 6.1). Every
  "bound" on the same-SQL result was reworded to a "standardized (same-SQL) contrast"; an audit of the
  current manuscript finds no positive bound claim remaining (only explicit negations, e.g. "not a
  bound on the intrinsic library effect"). The Introduction's **Strategy attribution** pillar now reads
  "a *same-SQL standardized contrast* reports how much of an observed difference remains once the SQL
  is held fixed --- a diagnostic contrast, not an attribution to the library's execution machinery
  versus the query strategy," and Results adds that "no ordering theorem holds without assumptions
  about interaction effects." (The Essential-4 reply above quotes the intermediate "bound" phrasing
  that this fix superseded; its bridging note marks the evolution.)
- **Write correctness is strengthened** (point 6.2): `bench/verify-writes.mjs` validates post-write
  database state --- field values, generated identifiers, exact row-count changes, and transactional
  rollback --- for every adapter on both engines (9/9 pass); this is the correctness oracle's write
  half in the protocol.
- **The reusable protocol is formalized** (points 6.3, 11, 12): Study Design gives the normative
  specification and a compact formal box separating mandatory from recommended stages, with
  cell-admission, output-interpretation, and applicability rules.

These three are precisely the changes identified as making the manuscript "considerably stronger,"
and I hope the revision now reads that way.

---

## Major concern 6.1 — The protocol's novelty and validation (mapping table + retrospective)

You are right that framing the protocol as a *synthesis and operationalization* rather than an
invention raises the evidentiary bar --- it must be shown complete, necessary, distinguishable from
general benchmark methodology, and transferable. I added the two artifacts you specified.

**A formal mapping table (main-text Table 2, `tab:protocol_mapping`).** For each of the five protocol
stages it gives, across the columns you named, the benchmark decision -> the generic performance
principle it draws on -> its access-layer-specific manifestation -> the failure if the stage is
omitted -> the evidence that the stage was load-bearing *in this study*. For example, the correctness
oracle keeps a broken/fast-error layer off the top (the MikroORM MySQL write led the insert ranking
until the write-state gate excluded it); the strategy control keeps a query-strategy artifact from
being attributed to the library (the 7.15x/4.96x documentation-selected spread narrows to 1.68x/2.01x
among raw paths on common SQL); and capacity identification with demand/utilization separate a
queueing effect from intrinsic latency (the 20-to-116 ms high-load tail converges to ~2-5 ms at
matched utilization). The access-layer-manifestation column is what makes this *not* generic: each
stage is trivial or unnecessary for a pure engine benchmark (one canonical result, one query
language, one saturating throughput) and load-bearing only because access layers vary in output
shape, query strategy, and capacity. The table thus argues completeness (admission through
interpretation), individual necessity (each omission changes a conclusion), distinguishability, and
transferability directly, rather than by assertion.

**A retrospective validation (Supplement Table S37, `tab:protocol_retro`).** As you suggest, I applied
the protocol *analytically* --- re-running nothing, disputing no reported figure --- to the eight
prior benchmarks in the searched sources, naming for each the stages it omits and the one conclusion
that thereby becomes uninterpretable as a general access-layer claim. For instance, the Prisma vendor
benchmark reports only a median query latency (no percentile, no throughput, no capacity), so its
"lowest median latency" says nothing about behaviour under load; the Drizzle suite's req/s and P95
ranking sits at one k6 load point with no capacity sweep, so it is not locatable against saturation;
and Salunke and Ouda benchmark the *engines*, not access layers, so the protocol's unit of comparison
is absent by design (a fair observation, not a criticism of their valid engine result). This shows the
protocol has diagnostic power over *other* work, not only this study --- the strongest available
evidence that it is a methodological contribution rather than a checklist attached to one benchmark.

To fit the main text under the word limit, the peripheral application-tier CPU figure was moved to the
supplement (Figure S3) and the Resource-footprint paragraph condensed, so the mapping table is added
with the main-text float count unchanged at seven.

---

## Major concern 6.2 — "Documentation-selected" reframed as a case-study policy, and the performance-conscious comparison moved into the main text

You are right on both counts: "documentation-selected" is a reproducible but weak behavioural
construct, and it was made to look intrinsic to the general protocol when it is really this study's
particular treatment-selection rule; and the performance-conscious comparison that speaks directly to
that weakness was relegated to Supplement S34. I addressed each.

**The protocol now requires a predeclared, reproducible treatment-selection rule but privileges no
particular one.** The mandatory stage of the protocol box that fixes each treatment (stage 2,
"treatment-definition rule") now reads: fix each treatment's implementation and strategy by a rule
declared reproducibly in advance; the protocol requires such a rule but privileges none. The
Strategy-attribution contribution in the Introduction was genericised the same way ("the treatment is
fixed by a predeclared, reproducible selection rule --- documentation-selected here; the protocol
privileges none"). And where the Study Design defines the documentation-selected rule, a sentence now
states explicitly that this documentation-first rule is *this case study's* treatment-selection
policy --- one instance of the protocol's mandatory predeclared-and-reproducible rule, which privileges
no particular rule; a study targeting expert-tuned or most-common-production usage would substitute its
own without changing the protocol. So the protocol requirement (a fixed, reproducible rule) and the
case-study instantiation (documentation-first, with a tie-breaker) are now cleanly separated, and the
weakness of the documentation-first construct is confined to the case study, not the method.

**The performance-conscious comparison is now a main-text result, not Supplement S34.** The two
co-primary deep-fetch regimes --- documentation-primary and performance-conscious --- are now measured
and reported in the Results section beside the co-primary paragraph, as a new main-text table
(`tab:deepfetch_regimes`): each layer's documentation-selected loading strategy versus the faster of
its documented strategies where that is byte-identical, with a same-harness native reference row. This
places the evidence that the documentation-first construct does not distort the deep-fetch ranking
(the performance-conscious ORM deep fetch still sits well below the native driver; only Objection on
MySQL gains) next to the primary results rather than in the supplement. To keep the main-text float
count at seven and avoid renumbering the supplement, the swap is net-zero: the roadmap/outcomes table
(previously main-text) moved to the supplement at the vacated S34 position (new Supplement Table S34,
"Results roadmap"), so S35--S37 are unchanged.

---

## Major concern 6.3 — The semantic-equivalence gate is finite; add property-based / randomized checking

You are right that "every layer must return byte-identical results" read as a verified universal
property, whereas the case study checked only 12 fixed probes before timing. I addressed both halves
of the required revision: I sharpened the language into the four distinctions you named, and I added
a broad randomized check and ran it on both engines.

**The precondition is now stated at four explicit levels, not as a universal property.** Study Design
now establishes semantic equivalence as: (i)~*specification* — shared canonical constructors that fix
each response's intended field set, key order, and serialization; (ii)~*finite pre-measurement
conformance* — the fast 12-probe gate (`bench/verify.mjs`) run before any timing; (iii)~*exhaustive
equivalence*, which is infeasible for arbitrary code and is explicitly **not** claimed; and
(iv)~*property-based / randomized differential testing* — the new gate below. The Introduction's
Semantic-equivalence precondition was softened correspondingly to "byte-identical results **on the
protocol's conformance suite** (fixed probes plus a seeded property-based input sweep)," so the claim
is no longer readable as a proof over all inputs.

**A property-based randomized gate now exercises thousands of inputs, and it passed on both engines.**
The new `bench/verify-property.mjs` is differential property-based testing: the property is
`adapter(input) === baseline(input)` (byte-for-byte), the native driver is the oracle, and any thrown
error is captured as a comparable value so an input-dependent crash also counts as a divergence. A
fixed seed (mulberry32) draws 1,000 random post IDs and 1,000 random author IDs across the full key
range, plus an explicit edge set — nonexistent, boundary, negative, and 32-bit-overflow IDs; empty and boundary
keyset pages; limits 0/1/100 — over all five read methods (point read, deep fetch, same-SQL deep fetch,
aggregation, keyset scan). As you note, because the dataset is deterministic and finite this is
inexpensive: the whole sweep runs in well under two minutes per engine, against a ~25-hour measurement
campaign. The result: **3,800 distinct inputs per adapter, 30,400 adapter-versus-baseline comparisons
per engine, 60,800 across PostgreSQL and MySQL, with zero divergences** (new Supplement Table S38,
`tab:semantic_equivalence`; coverage recorded in `experiments/semantic-equivalence.json`). This does
not prove equivalence on every possible input — I say so explicitly — but it broadens the finite check
by more than two orders of magnitude and targets exactly the boundary and error-path inputs most likely
to expose an input-dependent divergence. The gate is committed and re-runnable against the seeded
database, alongside `verify.mjs` and `verify-writes.mjs`.

---

## Strongly recommended 6.4 — Environmental replication is absent

I agree this is the narrowest part of the empirical evidence, and I want to be transparent rather
than paper over it. In full honesty: the machine available to me for this revision is the *same*
virtualized host that produced the primary data (an Intel Xeon Gold 6140 VMware VM), so I could not
run a *genuinely independent* substrate, and I have deliberately not dressed up a same-host re-run
as environmental replication — that would be exactly the kind of false comparability this paper
argues against. What I have done instead is sharpen the External Validity treatment so it states the
limitation precisely and says which qualitative conclusions should and should not survive a substrate
change — which, as you note, is the real objective.

The Threats section now reads: the same-host checks (resource isolation, multi-worker, sustained
load, and the post-restart re-run) "bound only *within-host* drift (the post-restart re-run moved
absolute throughput up to 16% with the ranking intact, Supplement Table S20), not variation across a
different host or hypervisor." It then partitions the conclusions explicitly: "A substrate change
should preserve the *architectural* conclusions --- the within-engine relative ordering and the
operating-point separation --- while possibly moving absolute req/s, gap magnitudes, and the
cross-engine ordering of RQ2; an independent-host replication of the core deep fetch ... [is] future
work." The reasoning is that ordering and the capacity/tail/utilization separation follow from
round-trip count, hydration, and measurement design, which a faster or slower host rescales but does
not reorder, whereas absolute numbers and the CPU-versus-I/O-sensitive cross-engine ranking (RQ2)
genuinely depend on the substrate.

Finally, I distinguish the two things your comment bears on. The **protocol** validation does not
rest on this host at all: its stages are experimental-design controls whose necessity is argued
analytically over this study *and* eight prior benchmarks (main-text Table 2; Supplement Table S37),
so single-host measurement bounds the **case study's** external validity, not the protocol
contribution. The manuscript now says exactly that. I have left the independent-substrate deep-fetch
replication as clearly-scoped future work, and the harness is public and turnkey (`REPRODUCE.md`)
precisely so that a third party on a different host can perform it.

---

## Strongly recommended 6.5 — Closed-loop p99 is given more prominence than its interpretation warrants

You are right that at a fixed closed-loop concurrency near each layer's knee, throughput and p99 are
strongly coupled, and that the early framing presented them as if partially independent. I made both
changes you asked for and, per your closing remark, promoted the matched-utilization experiment.

**The primary p99 is now labelled and immediately distinguished, in both the Abstract and the
Introduction.** The Abstract's Methods now reads: "throughput with the *high-load response-time p99
under equal closed-loop demand* (a fixed 50-connection point) ... and on the deep fetch distinguish it
from the tail at *equal utilization* (an open-loop sweep, where the gap converges)." The Introduction
uses the same label and states the coupling explicitly: "At this near-saturation point the p99 largely
tracks capacity and queueing, so a lower-capacity layer looks worse on the tail even when its intrinsic
latency is not; we therefore also report the tail at *matched utilization*, where it converges --- the
more informative view of tail behavior." So a reader meets the caveat --- that a poor headline p99 can
be lower capacity, not a worse intrinsic tail --- at first contact with the metric.

**The matched-utilization experiment is now a main-text result, not only Supplement S21--S22.** A new
main-text table (`tab:tail_regimes`) places, per layer and engine, the equal-demand p99 next to the
matched-50%-utilization p99, so the collapse of the PostgreSQL ladder --- `pg` 20 to
MikroORM 116 ms at equal demand down to a 2-5 ms band at matched utilization --- is visible directly;
the caption states plainly that the high-load gap is a capacity-and-queueing effect and that "the
matched-utilization reading is the more informative one." The table is generated from the same raw data
as the headline table (`scripts/gen-tail-regimes.mjs` over `raw.json` and the utilization sweeps), so
no number is hand-entered. To keep the main-text float count at seven, the descriptive five-pattern
table moved to the supplement (new Supplement Table S39), a net-zero swap that also de-emphasizes the
headline ladder in the Results prose, which was trimmed accordingly.

---

## Strongly recommended 6.6 — The protocol is only partially exercised across the workload matrix

You are right: the mandatory core and capacity are checked matrix-wide, but the standardized-strategy,
utilization-controlled, and resource-normalized comparisons are demonstrated only on the deep fetch,
and the manuscript occasionally read as though the whole protocol had been instantiated everywhere. I
did exactly what you asked --- defined explicit compliance levels and stated precisely which cells
satisfy each.

**Five named compliance levels.** Study Design now names them, in increasing strength: the *mandatory
validity core*, *capacity characterization*, and the *standardized-strategy*, *utilization-controlled*,
and *resource-normalized* extensions (the same five levels your comment lists). The prose states that
the first two hold across all five patterns on both engines, while the three extensions are
demonstrated on the deep fetch --- the most consequential pattern --- as a *representative-point
instantiation, not full-matrix coverage*.

**A precise cell-by-level coverage map.** New Supplement Table S40 (`tab:protocol_compliance`) tabulates,
per level, the requirement it adds, the exact cells that satisfy it here (all five patterns x two
engines for the core and capacity; deep fetch x two engines for each extension), and the evidence
(Table S38 and the write gate; the per-pattern sweep S35; the same-SQL table and S14; the tail-regime
table and S21-S22; the equal-CPU tables S4/S5). Stating the levels and their coverage explicitly is
what turns the protocol into a reusable object: a later study can report its own compliance level per
cell against the same ladder. This is prose-plus-one-supplement-table only --- no measurement changed,
and the earlier coverage paragraph was tightened so the manuscript stays under the word limit.

---

## Strongly recommended 6.7 — Some mechanistic language is stronger than the design permits

You are right, and this is a matter I care about: the design supports *consistency* with a
mechanism, not its isolation, and a few passages still read as though the benchmark had established
one. I softened each flagged formulation to a "consistent with" reading, using the Prisma raw-path
sentence --- "Prisma is the slowest layer on the raw path itself; we conjecture this..." --- as the
model, exactly as you suggest.

- The native-lead sentence "the native driver's lead **comes from** issuing lean SQL that pushes work
  onto the database tier" now reads "the native driver's lead **is consistent with** its issuing
  leaner SQL that pushes more work onto the database tier."
- "so how a layer materializes a result graph **matters more than** how many statements it issues" now
  reads "**consistent with** result-graph materialization, not statement count, separating the layers
  here."
- In Results, "the native `pg` driver issues lean SQL that **drives the database harder** ---
  so the native driver leads ..." now reads "**consistent with** the native `pg` driver's
  leaner SQL, the native driver leads throughput and end-to-end compute efficiency at once," and
  "large only when it must materialize" became the descriptive "largest on patterns that materialize."

On the figure: you correctly note that the application-tier CPU figure (Supplement Figure S3) excludes
database CPU. Both places that make the compute-efficiency point now say so explicitly and point to the
combined application-plus-database accounting in Supplement Table S5, so the claim rests on the
complete accounting, not the app-only view. I re-audited the Introduction, Results, Discussion, and
Conclusion: the remaining causal statements are either experimentally supported (the durability
manipulation with direct `performance_schema` instrumentation attributes the MySQL insert
floor to the commit path) or already hedged. This is prose-only --- no measurement, table, or figure
changed.

---

## Essential 5 (point 4) — The n=7 rank correlations are given too much weight

> The cross-engine transfer rests heavily on Spearman coefficients computed over only seven
> portable layers; concrete reversals and interaction magnitudes would be more informative.

**Response.** I reweighted the RQ2 treatment to lead with concrete rank reversals and with
the layer×engine interaction magnitudes, and demoted the Spearman coefficients to coarse
descriptive summaries. The RQ2 paragraph now opens:

> "The read ordering is stable across engines, but the aggregation and insert orderings
> reverse at the top, so we characterize the transfer by these concrete rank reversals and by
> the layer×engine interaction magnitudes rather than by a correlation coefficient computed
> over only seven portable layers."

It then gives the reversals explicitly --- on the insert, "\`knex\` leads on PostgreSQL
(4,841 req/s) but drops to third on MySQL (1,670), where \`drizzle\` takes the lead (1,730);
Prisma falls furthest, from fourth on PostgreSQL (2,774) to last on MySQL (886 ...)"; on
aggregation, "\`drizzle\` leads on PostgreSQL (6,280) but falls to fourth on MySQL (3,520),
where \`knex\` leads (3,842)" --- and reports the interaction in magnitude (per-layer
PostgreSQL÷MySQL ratios: reads within ≈1.0–1.9×, insert 1.6× to 3.2×, aggregation 1.4× to
1.9×; Supplement Tables S27–S28). The coefficients now appear only "For completeness ...
(descriptive only, and coarse at n=7)," closing with:

> "but the finding rests on the reversals and interaction spreads above, not on the
> coefficients."

The abstract likewise now reports the read ordering once (Spearman ρ ≥ 0.86) and leads its
engine-dependence sentence with "the aggregation and insert orderings reverse: Prisma drops
to last on the MySQL insert, and the per-layer engine advantage scatters 1.6–3.2×."

---

## Essential 2 (point 5) — Narrow the five-pattern / synthetic-workload claims

> The Discussion generalizes from five probes on one synthetic schema to "ORM penalties" in
> general; this over-reaches.

**Response.** I narrowed the generalization. The Discussion's Practical-guidance paragraph
no longer speaks of ORM penalties as a category property; it locates the difference in the
tested probes and labels the finding a benchmark observation to be re-measured:

> "This locates the difference among the five probes on a single synthetic schema, not across
> relation-materializing workloads in general: one nested-fetch topology --- the fan-out sweep
> ... varies its breadth (0--500 children) but not its depth, its schema, or the mix of such
> queries in a production workload --- cannot establish a general distribution of ORM
> penalties across relation-materializing traffic, so this is a benchmark observation to be
> re-measured on the target workload, not an established law."

The subsequent sentence keeps the guidance conditional --- "the tested thin paths (native
driver and Knex) led here *for throughput and response-time p99*, but whether that generalizes
to other implementations, schemas, or workloads is a hypothesis for broader study, not a
category law or a general default" --- and the Conclusion was scoped to match ("concentrated
across the five tested patterns, not uniform").

---

## Essential 3 (point 6) — Weaken the horizontal-scaling claim

> "Recoverable by horizontal scaling" overstates a bounded 1→4-worker check on one host with
> no database-side saturation measurement, and it ignores the MySQL counter-case.

**Response.** I weakened the claim at every site. The unsupported "becomes database-bound"
attribution was removed, the phrasing was changed to "may be addressed by additional
application processes until another bottleneck is reached," scoped to the tested range, and
the MySQL counter-case and the absence of any database-side saturation measurement are now
stated explicitly. In the Results:

> "a layer's low per-process throughput may instead be addressed by additional application
> processes until another bottleneck is reached --- over the tested 1-to-4-worker range
> aggregate throughput rose roughly in proportion to workers, though this run measures no
> database-side saturation."

The supplement's *Multi-worker scaling* section carries the full caveat, including the MySQL
counter-case:

> "This is a bounded check, not a demonstration of general scalability: it stops at four
> workers, measures no database-side saturation (DB CPU, connections, or wait events), and on
> MySQL horizontal scaling *widens* the gap --- the native \`mysql2\` keeps scaling to
> 8,883 req/s at four workers while Prisma reaches only 2,427 ... Within these limits a
> layer's low per-process throughput may be addressed by additional application processes
> until another bottleneck is reached."

The Discussion "Compute cost and horizontal scaling" paragraph makes the same disclaimer ("it
measures no database-side saturation, on MySQL the native driver keeps scaling and the gap
does not close, and scaling further would eventually reach another bottleneck ... this run does
not locate"), and the Threats external-validity paragraph now says the multi-worker check "measures
no database-side saturation, so scaling further would eventually reach a database or connection
bottleneck it does not locate."

---

## Essential 6 (point 7) — Cautious language for the low-replicate experiments

> Several secondary experiments run only 3–5 times but are reported with confirmatory verbs
> ("confirms", "shows", "rules out").

**Response.** I matched the strength of the prose to the replicate count. Inferential verbs
in the low-replicate secondaries became consistency statements, while deterministic checks and
the primary-rigor claims kept their stronger wording. Specifically:

- **Equal-CPU (3 runs)** --- "An exploratory equal-CPU check is consistent with no layer
  converting extra application cores into throughput" (Results), and the table caption now
  reads "the ranking does not appear to be an artifact of unequal core budgets."
- **Pool-size (3 runs)** --- "a per-layer pool-size frontier ... is consistent with the
  ordering being preserved from a pool of 1 to 50 ... so the fixed pool does not appear to
  drive the ranking" (Threats), with the same softening in both supplement pool-size sections.
- **Transactional write (5 runs)** --- now labelled exploratory in the supplement:
  "for a representative layer of each tier on PostgreSQL under default durability (median of
  five runs, exploratory)."
- **Open-loop coordinated-omission cross-run** --- "is consistent with the tail ranking
  holding under that stricter model" (Threats).
- **Alternative eager-loading (5 runs)** --- "argues against a mere default-strategy artifact"
  (Results, previously "rules out"), and "does not appear to be an artifact of a poor default"
  (Threats and the construct-validity supplement section).

By contrast, the deterministic checks (byte-identity, checksums) and the primary-rigor claims
keep "confirms": the 25-run matrix and its paired permutation test, and the 25+10-run
durability secondary whose relaxed run "confirms the cross-engine gap is not an artifact of
either configuration" (Threats).

---

## Essential-support (point 8) — Better discussion of the noisy, bimodal MySQL inserts

> The insert measurements are the noisiest and appear bimodal; the raw distributions should be
> shown and discussed rather than reduced to a single CV.

**Response.** I brought the raw per-replicate insert distributions into the Results body and
added a dedicated supplement treatment. The Measurement-stability subsection now states:

> "dispersion is larger only on the insert, where the MySQL cells are noisiest (up to 15.9%,
> bimodal under group-commit batching; raw distributions in Supplement Figure~S1), so the
> insert rank correlation is reported conservatively."

The supplement's *Dispersion on MySQL* section adds Figure S1, the raw per-replicate insert
throughput behind the coefficients, and explains why a single CV is inadequate: "several cells
are visibly bimodal or heavy-tailed within a cell, structure a single CV cannot convey, which
is why the insert rank correlation and dispersion are reported conservatively."

---

## Minor concerns

**Abstract simplified (and the retired Prisma-version result removed from it).** The abstract's
Methods clause dropped the equal-compute-budget condition (an exploratory secondary), and its
Conclusion dropped the retired five-core-Prisma parenthetical --- that historical result now
lives only in the Discussion and in the temporal external-validity threat, where it belongs. The
structured abstract is 299 words, under the 300-word limit, and now reads more prominently on the
core deep-fetch result.

**"Vendor-independent" → "independently authored."** The manuscript means authorship, not design,
independence, so the study description and the coverage axis now use "independently authored" /
"independent authorship," and the Study Design states it plainly: "Vendor independence means
authorship only: no evaluated library's maintainers were involved, though the consequential author
choices (selection, schema, pool size, tuning) remain and are disclosed." The prior-art table's
"No (vendor)" column, which does concern authorship, is unchanged.

**"orm-lightweight" merged into "orm."** The interpretive, performance-implying label on an
experimentally untested taxonomy was removed: Drizzle's Category column now reads "orm" in the six
pattern/resource tables and both generators, and the methodology prose calls it "a
query-builder-style ORM."

**"documentation-selected" kept, and justified.** I retained the term rather than renaming the
estimand a second time, because it is a reproducible operational rule and the manuscript already
disclaims any typical/best/recommended connotation. The methodology states it is "a reproducible
selection heuristic, not evidence that the chosen API is performance-optimal or the most common
production choice," and the new construct-validity treatment frames it as "a defined, reproducible
practitioner persona --- the documentation-following developer." A second rename would risk
reopening the estimand discussion for no gain in precision.

---

## Novelty discipline and contribution separation

**The strongest novelty claim is scoped to the search.** The Related Work Positioning now holds the
claim to what a scoping (not systematic) search supports:

> "We therefore state the strongest novelty claim the search supports --- that we did not identify a
> prior study combining these properties in the documented search --- rather than a claim of priority
> the scoping search cannot establish."

No "first"/priority claim is made anywhere.

**Novel experimental evidence is distinguished from the novel benchmark infrastructure.** The
Introduction's contribution paragraph now frames the case study as contributing novel evidence that
is configuration-specific, distinct from --- and less durable than --- the protocol and harness:

> "The case study thus contributes novel experimental evidence ... but the resulting rankings are
> configuration-specific and version-sensitive ... so the novel benchmark infrastructure (the protocol
> and its harness), not any single ranking, is the more durable contribution."

**The four coverage axes are named, and the HTTP-framework gap is placed beyond them.** The
Introduction now names the four axes explicitly --- "access-layer taxonomy, engine, joint
throughput/tail metrics, and independent authorship" --- matching the prior-art table's four columns,
and presents the separate client-observed/HTTP-framework gap as "Beyond these four axes, no study we
found measures client-observed performance through an HTTP framework."

---

## Reproducibility and structure

**A reproducibility summary table.** The supplement now carries an *Artifact reproducibility summary*
(Supplement Table S31, `tab:reproducibility`): artifact and version, the persistent Zenodo identifier
and concept DOI, the software and hardware requirements, the smoke-test and full-campaign run commands,
the time and resources needed, and which results are regenerated automatically from the archived raw
data ("*Every* table and figure, from the archived raw data; \`results/checksums.sha256\` verifies the
35 raw-data files"). The Data-availability section points to it, and \`REPRODUCE.md\` is the single
runnable entry point.

**Structure and streamlining.** The load-bearing methodological detail was already relocated to the
supplement in an earlier condensation (the *Statistical methods*, *Measurement details*, and
*Benchmarking-pitfalls checklist* sections). This round added only a light streamlining: the duplicated
"productivity/type-safety not measured" qualification in the Practical-guidance paragraph is now stated
once, and a few redundant parenthetical "(Section …)" cross-references in the densest sections (Results,
Threats) were dropped where the same section was already cited nearby. No section was reordered, no float
was moved, and no load-bearing caveat was removed --- the caveats carry the Essential points above.

---

## Closing

These revisions leave the manuscript making one clear scientific claim --- a comparability protocol for
access-layer benchmarking --- demonstrated through a configuration-specific dual-engine case study whose
rankings are disclosed as version-sensitive, with a supplement that serves as a complete audit trail. The
manuscript remains under the journal's limit at **14,986 words** (IST rule) with a structured abstract of
**297 words** (≤ 300), and, to reiterate, **the primary measurement matrix and every previously reported
primary number are unchanged**; the only new measurements are the two clearly-scoped supplementary
additions from earlier rounds (the write-state validation and the co-primary deep-fetch regime), which
leave the primary matrix untouched, and the major-concern-6.2 revision moves an existing comparison into
the main text without re-measuring anything. The full replication package (harness, deterministic seed, all
adapters, raw per-cell measurements, and the table-generating scripts) is permanently archived at Zenodo
as release v1.11.4 (DOI 10.5281/zenodo.21485274), the version this revision describes.

I am grateful for the depth and precision of this review, which has materially sharpened the paper's central
claim, and I look forward to your assessment.

Sincerely,

Mateusz Miotk
Faculty of Mathematics, Physics and Informatics, University of Gdańsk
