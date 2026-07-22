# Summary of Revisions

**Manuscript:** A Comparability Protocol for Benchmarking Relational Database Access Layers
in Express.js
**Author:** Mateusz Miotk (University of Gdańsk)
**Journal:** Information and Software Technology

I thank the reviewer for a thorough, multi-part reading. This revision addresses five
successive sets of comments — on methodology and the scope of claims, on the CPU and
statistical reporting, on the conclusions and language, on presentation, and on the paper's
length. A full point-by-point reply, each with a quotation of the revised text, is in the
separate Response to Reviewers; the essential changes are summarized below. The main revision
changed no measurement — it is one of framing, scoping, and length; the deeper follow-up
points noted at the end add clearly-scoped *supplementary* measurements that leave the primary
matrix untouched.

## Scope of claims and methodology

- The estimand is renamed from "default-configuration" to **documentation-selected
  implementation-and-strategy**: choosing the first documented API is a reproducible
  selection heuristic, not the library's actual default configuration.
- The comparison is now read at **three explicit, separated levels**: the primary
  implementation-and-strategy comparison, the same-SQL raw-path standardized (diagnostic) contrast, and the
  individual mechanisms, which change together and are **not** causally isolated.
- The operating conditions are scoped: the full five-pattern, two-engine matrix is the fixed
  **high-load** point, while the equal-utilization and equal-CPU conditions are a limited set
  restricted to the deep fetch. "capacity", "saturating throughput", and "overload" are
  reserved for the deep-fetch sweep, where a throughput knee was actually measured.
- A new **experiment-scope table** (Supplement Table S32) tabulates every experiment's
  patterns, engines, layer count, and repeated runs.

## CPU and statistics

- The equal-CPU experiment is **demoted to an exploratory sensitivity check**; the earlier
  "at most a few percent" wording is corrected (the ORM per-core values wobble 10–17%
  run-to-run with no monotonic gain from more cores).
- The bootstrap intervals are stated to capture **within-campaign**, run-to-run variability
  on this host, not variation across machines or versions; adjacent-layer p99 gaps of one or
  two milliseconds sit at the millisecond measurement floor and are not read as real.
- The raw per-replicate MySQL-insert distributions (Supplement Figure S1) are brought into
  the Results body.

## Conclusions and language

- "access-layer overhead" wording is limited where it implied an isolated measurement (the
  primary comparison bundles library, query strategy, round-trips, and mapping); the "thin
  layers are a safer default" recommendation becomes **"benchmark the relation-heavy hot path
  for the specific application"**; an explicit **configuration-specific** label is added to
  the Conclusion; and novelty is scoped throughout to "the sources searched".

## Presentation, length, and consistency

- Rather than split the paper (which would read as salami-slicing, since both threads share
  one research question), the main text is **condensed by about 24% (51 → 43 pages; body
  11,356 → 8,669 words)** so the central message is not lost among the controls and
  sensitivity analyses. Detail is **moved to the supplement, not deleted**: new *Statistical
  Methods*, *Measurement Details*, and *Benchmarking-Pitfalls Checklist* sections. The
  same-SQL control, the RQ1–RQ3 answers, and Threats to Validity remain prominent in the main
  text. The manuscript is 12,216 words, well under the 15,000-word IST limit.
- A pre-submission consistency sweep confirmed that the pinned library versions match the
  lockfile, the DOI and repository link resolve, and every headline number matches its table;
  it corrected a coefficient-of-variation figure ("within 4.2%", not 4.0%, on the reads),
  removed redundant per-cell median confidence intervals from the paired significance table
  that had disagreed with the pattern table, and reconciled two loose prose phrasings.

## Deeper follow-up points (6.1–6.6)

Six deeper follow-up points were addressed after the main revision and released incrementally:

- **6.1** — the same-SQL result is renamed a **standardized (same-SQL) contrast**, not a "bound":
  absent interaction assumptions, the raw-path spread does not bound the intrinsic library effect.
- **6.2** — the semantic-equivalence gate is **strengthened to validate write state** (a new
  `bench/verify-writes.mjs` confirms exact field values, row-count changes, and transactional
  rollback through an independent native-driver connection), not merely a 2xx status.
- **6.3** — the **comparability protocol is specified normatively** and independently of the case
  study, in a new Methodology subsection (inputs; mandatory stages; pass/fail cell admission;
  output interpretation; applicability limits).
- **6.4** — RQ1 is narrowed to the performance of each layer's **documentation-selected
  implementation strategy**, and a second **performance-conscious co-primary regime** — the faster
  of a layer's two documented deep-fetch loading strategies, admitted only where byte-identical to
  the documentation-primary output — is measured on one harness and reported (new Supplement Table
  S34). The finding reinforces rather than overturns the documentation-primary reading: the
  documented strategy is already the faster one for most layers, and where it is not (Objection on
  MySQL) the performance-conscious ORM deep fetch still sits below the native driver.
- **6.5** — **capacity is now characterized for all five patterns**, not only the deep fetch. A
  per-pattern concurrency sweep (connection ladder 1--200, every layer, both engines; new Supplement
  Table S35) locates each pattern's throughput knee at or below 50 connections, so the fixed
  50-connection operating point places all five patterns at high utilization of their own capacity ---
  making the cross-pattern p99/spread comparison one at comparable, measured relative utilization
  rather than unknown fractions of capacity. The equal-utilization open-loop tail and the exploratory
  equal-compute check remain demonstrated on the deep fetch, and the manuscript now labels those as
  deep-fetch-only.
- **6.6** — the over-strong claim that four controls "isolate the access layer as the only variable"
  is **corrected** (prose only). The controls hold the shared conditions fixed (pool, logical task,
  physical state, observer) so the *configured access-layer implementation bundle* is the only
  deliberately varied factor; they do not isolate the library alone, since the bundled differences
  (SQL, query count, protocol, loading strategy, hydration) are the treatment, not confounds. Two
  related-work "isolates" usages were reworded to "treats"/"varies"; the isolation *disclaimers*
  elsewhere were verified correct.

Points 6.2, 6.4, and 6.5 add new, clearly-scoped *supplementary* measurements (a write-state oracle, a
deep-fetch regime, and a per-pattern capacity sweep); point 6.6 is a wording correction only. The
primary measurement matrix and every previously reported primary number are unchanged.

## Point 7 (minor concerns)

Six further wording/labeling corrections, no measurement changed: the abstract's version-specific
"Prisma 7 sits mid-pack" clause was removed (de-loading it); "the most widely used" Node.js framework
was softened and temporally qualified to "has long been among the most widely used"; Table 1's
"Independent?" column was relabelled the neutral **"Vendor involvement"** (a source/conflict-of-interest
property, not a methodological one); the threats claim that a hot-cache regime "maximizes layer
differences" became "expected to make application/access-layer overhead more visible"; the primary text
now discloses the one Drizzle/MySQL-insert cell with 24 rather than 25 runs; and "independent runs" was
reworded to "repeated runs" in the captions and REPRODUCE (all repetitions share a host and campaign).

## Point 8 (methodological and statistical assessment)

The reviewer's assessment was favourable ("substantially above the level of many benchmark studies …
no clear statistical error requiring rejection"). Five precision/scoping fixes, no measurement
changed: (1) Methodology now states explicitly that **"p99" throughout is the *median run-level p99***
(median across replicates of each run's p99), not the p99 of the pooled request distribution; (2) the
within-campaign scope of the bootstrap intervals is reinforced where they are used, so they are not
read as deployment-general; (3) the coarse millisecond p99 resolution is noted not to finely separate
near-adjacent layers; (4) following the reviewer's suggestion to foreground effect sizes, the
paired-significance table (former main-text **Table 7**) was **moved to the supplement (new Table
S36)**, the main text now leading with paired geometric-mean ratios and per-replicate dominance and
noting the post-hoc tests' inference is conditional on the ranking that selects the pairs; (5) the
secondary experiments on layer subsets or few replicates (Supplement Table S32) are labelled
*sensitivity evidence* on the tested subset, not claims about all eleven implementations. Moving Table
7 drops the main-text float count from eight to seven.

## Point 9 (reproducibility and artifact assessment)

The reviewer rated this "one of the manuscript's strongest dimensions." I verified the five-item
pre-submission checklist — all satisfied: (1) the Zenodo tarball byte-matches `git archive` of the
tag (identical sha256); (2) every statistic traces to archived raw data (`MANIFEST.md`, 35 files),
the one disclosed exception being the deterministic S2 query-count table; (3) `environment.txt` and
`db-config.md` capture kernel/runtime, CPU/NUMA topology, governor/turbo, virtualization, lockfile
hash, and database configuration; (4) tables rebuild from raw data with pinned dependencies and no
network; (5) an explicit dual license (MIT code, CC BY 4.0 paper/data). For the AI-declaration policy
point, the declaration was **split** into the Elsevier-standard writing declaration and a separate
*AI-assisted research software* statement (author responsibility; the AI-assisted analytical code
passes 19/19 estimator unit tests). No body change; the AI declarations are excluded metadata.

## Point 10 (novelty and related-work assessment)

The reviewer found the novelty case "credible but should remain carefully bounded" and endorsed the
scoped wording. I bounded the *methodological*-novelty claim: the Introduction now states explicitly
that the three preconditions "are not new to benchmarking in general" (correctness, workload
equivalence, warm-up, coordinated-omission correction, capacity curves, and reproducibility are long
established), and that the contribution is their **domain-specific synthesis and operationalization**
for the access-layer genre, not the invention of these principles; "novel benchmark infrastructure"
was reworded accordingly. The scoped "in the sources searched" novelty wording is preserved, and the
same-SQL "bound" is already a "standardized contrast" (point 6.1).

## Point 11 (presentation)

The reviewer found the manuscript "generally well written, technically mature, unusually careful about
claim scope," the main weakness being density. Because the protocol is the contribution, Study Design
now opens the *comparability protocol* subsection with a **compact formal protocol box** (Inputs; the
five mandatory stages in order; cell-admission; output interpretation), replacing the verbose
paragraph prose and establishing treatment selection/admission in the main text rather than in
`METHODOLOGY.md` and supplementary tables; the box is inline body text, not a float. The most-repeated
"protocol, not the ranking, is the contribution" framing was consolidated to one statement per
location. Several recurring caveats are load-bearing for earlier points (same-SQL "not a bound", 6.1;
deep-fetch "not a poor-default artifact", 6.4) and were kept once each. Word-count compliance was
verified quantitatively under the IST rule: body 11,373 + abstract ~292 + references 1,848 + seven
main-text floats (1,400) = **14,913**, under the 15,000-word limit.

## Point 12 (Essential / strongly-recommended / optional list)

The reviewer's consolidated list. All five **Essential** items were already carried out in the
follow-up points above: (1) "bound" → standardized contrast (6.1); (2) write-state oracle (6.2); (3)
normative reusable protocol (6.3, 11); (4) configured-bundle treatment, not "only variable" (6.6); (5)
per-pattern capacity, deep-fetch-only utilization labelled (6.5). This pass closed the one remaining
Essential-3 gap by separating the protocol box's **mandatory** stages (correctness oracle;
treatment-definition rule) from its **recommended** stages (strategy control; capacity;
demand/utilization), and added a **tie-breaking rule** for "documentation-selected" (equally-prominent
official paths, as for Drizzle, resolved toward the library's own taxonomy tier). Strongly-recommended:
the alternative-strategy subset is the *complete* byte-equivalent-drop-in set (the rest have no
semantically-equivalent alternative); version-sensitivity echoes in Introduction and Conclusion were
trimmed; word count reported quantitatively (14,971). Optional (visual schematic, second host,
I/O-bound run) declined as future work — the formal protocol box already carries the schematic content.

## Point 15 (final recommendation: major revision)

The reviewer's central reason for major revision was the same-SQL "bound" attribution claim, one of the
three advertised pillars. It is fully corrected: every "bound" on the same-SQL result is a "standardized
(same-SQL) contrast" (point 6.1), the Strategy-attribution pillar reads "a diagnostic contrast, not an
attribution," and an audit finds no positive bound claim remaining. The other two changes the reviewer
named as making the manuscript "considerably stronger" — a strengthened write-correctness oracle (6.2)
and a formalized reusable protocol (6.3, 11, 12) — are in place. This pass reconciled the submission
package to that state: a stale "bounds" quotation in the Response's Essential-1 pillar was corrected, one
Results word changed ("bounds" → "caps" for the tuning-budget ceiling), and the cover letter was
refreshed to the current title, the three major-revision changes, and the current 14,971-word count.

## Major concern 6.1 (protocol novelty and validation)

The reviewer noted that framing the protocol as a synthesis/operationalization raises the evidentiary
bar (it must be shown complete, necessary, distinguishable, transferable) and required a formal
mapping table, ideally with a retrospective application to prior benchmarks. Both were added. A
**main-text mapping table (Table 2)** maps each of the five protocol stages to its generic principle,
access-layer-specific manifestation, failure-if-omitted, and the evidence it was load-bearing here. A
**supplement retrospective table (Table S37)** applies the protocol *analytically* (nothing re-run, no
figures disputed) to the eight prior benchmarks in the sources searched, naming each study's absent
stages and the one conclusion that becomes uninterpretable without them --- showing the protocol has
diagnostic power over other work, not only this study. To fit the main text, the peripheral CPU figure
moved to the supplement (Figure S3) and the Resource-footprint paragraph was condensed; the main-text
float count is unchanged at seven. Both new tables are analytical (authored, not data-derived; noted in
`REPRODUCE.md`), so the primary data and checksums are unchanged.

Addressing reviewer **major concern 6.2**, the "documentation-selected" treatment was reframed as
*this case study's* selection policy rather than something intrinsic to the general protocol: the
protocol now requires only a predeclared, reproducible treatment-selection rule and privileges none
(the mandatory protocol-box stage, the Strategy-attribution contribution, and the Study-Design
definition were genericised accordingly). The performance-conscious comparison that speaks to the
construct's weakness was promoted from Supplement S34 to a new main-text table beside the co-primary
paragraph in Results; to keep the main-text float count at seven and avoid renumbering the supplement,
the roadmap/outcomes table moved the other way into the vacated S34 slot (net-zero swap). No raw data
changed.

Addressing reviewer **major concern 6.3** (the semantic-equivalence gate is finite), Study Design now
distinguishes four levels of the precondition rather than asserting a universal property ---
specification, finite pre-measurement conformance (the 12-probe `verify.mjs`), exhaustive equivalence
(infeasible and not claimed), and property-based/randomized differential testing --- and the
Introduction's byte-identical claim was softened to hold "on the protocol's conformance suite." A new
gate (`bench/verify-property.mjs`) draws a fixed-seed sample of thousands of random and edge-case
inputs across the full key range and asserts every adapter is byte-identical to the native-driver
oracle on all five read methods: 30,400 comparisons per engine, 60,800 across both, zero divergences
(new Supplement Table S38). It is inexpensive because the dataset is deterministic and finite.

Addressing reviewer **strongly-recommended point 6.4** (environmental replication is absent), the
External Validity treatment was sharpened rather than backed by a fabricated second environment: the
only host available for this revision is the same virtualized machine that produced the primary data,
so no same-host re-run is presented as environmental replication. The Threats section now states that
the same-host checks bound only *within-host* drift (post-restart re-run: up to 16% absolute change,
ranking intact, Supplement Table S20), and partitions the conclusions --- a substrate change should
preserve the *architectural* ones (within-engine relative ordering, operating-point separation) while
possibly moving absolute req/s, gap magnitudes, and the cross-engine RQ2 ordering; an independent-host
replication of the core deep fetch is named as future work. It also notes that the protocol's stages
are experimental-design controls argued necessary analytically (Table 2, Supplement Table S37), so
single-host measurement bounds the case study, not the protocol. This was offset by tightening the
paragraph, so the manuscript is 14,993 words, under the 15,000-word limit.

Addressing reviewer **strongly-recommended point 6.5** (closed-loop p99 is over-prominent relative to
its interpretation), the primary p99 is now labelled *high-load response-time p99 under equal
closed-loop demand* in both the Abstract and the Introduction and immediately distinguished from the
tail at *equal utilization*, with the coupling stated at first contact (near saturation the p99 tracks
capacity and queueing, so a lower-capacity layer looks worse on the tail without a worse intrinsic
tail). The matched-utilization experiment was promoted to a new main-text table (`tab:tail_regimes`,
generated from the same raw data) that places the equal-demand p99 beside the matched-50%-utilization
p99 per layer, making the collapse of the PostgreSQL ladder (`pg` 20 to MikroORM 116 ms down to
a 2-5 ms band) visible directly; to keep the main-text float count at seven, the descriptive
five-pattern table moved to the supplement (new Supplement Table S39, net-zero swap). No raw data
changed.

Addressing reviewer **strongly-recommended point 6.6** (the protocol is only partially exercised
across the workload matrix), Study Design now names five explicit *compliance levels* --- the mandatory
validity core, capacity characterization, and the standardized-strategy, utilization-controlled, and
resource-normalized extensions --- and states that the first two hold across all five patterns on both
engines while the three extensions are demonstrated on the deep fetch as a representative-point
instantiation, not full-matrix coverage. New Supplement Table S40 maps each cell to the levels it
satisfies precisely, turning the protocol into a reusable object against which a later study can report
its own per-cell compliance. Prose-plus-one-supplement-table only; the earlier coverage paragraph was
tightened, so the manuscript is 14,991 words.

Addressing reviewer **strongly-recommended point 6.7** (some mechanistic language is stronger than the
design permits), the flagged formulations were softened to "consistent with" readings, using the
already-hedged Prisma raw-path conjecture as the model. The native-lead sentence no longer "comes from"
lean SQL but "is consistent with" it; "how a layer materializes a result graph matters more than how
many statements it issues" became "consistent with result-graph materialization, not statement count,
separating the layers here"; and the Results compute-efficiency claim is now "consistent with the
native driver's leaner SQL." Both compute-efficiency passages now note that the application-tier CPU
figure (Supplement Figure S3) excludes database CPU and point to the combined accounting in Supplement
Table S5. The remaining causal statements are either experimentally supported (the durability
manipulation) or already hedged. Prose-only, no data changed; the manuscript is 14,986 words.

Two presentation follow-ups were also addressed. For the reviewer's terminology remark (the
alternation among "nine layers," "eleven implementations," "seven portable," and "four native/tuned"),
Section 3 now opens with a compact schematic --- a tier table (native driver; tuned native baseline;
query builder; ORM) with the implementations and their engine coverage, followed by the arithmetic in
one place (11 = 9 documentation-selected + 2 tuned; 7 portable on both engines, 4 engine-specific, so
90 configurations). It replaces the previous inline enumeration and is non-floating, so the main-text
float count stays at seven. For the repetition remark, the fullest redundant restatement of
"configuration-specific and version-sensitive" (in the Discussion) was reduced to a back-reference,
keeping the caveat in the abstract, Introduction, and Conclusion. Prose-only, no data changed; the
manuscript is 14,994 words.

Four further presentation refinements were made. (4) Every throughput/p99 table caption now states that
p99 is reported at 1 ms resolution, so cells differing by at most 1 ms are practically unresolved and
the reader is pointed to the paired significance analysis rather than encouraged to rank
within-resolution differences. (5) The main text no longer leans on the coefficient of variation for
the bimodal insert cells; it reads the write dispersion from the replicate plot (Supplement Figure S1)
and the per-cell bootstrap spread instead. (6) Verifying every caption, the "within-campaign" qualifier
was added to the two paired-ratio captions that lacked it and to the Conclusion-validity sentence, so
all 95% bootstrap intervals are consistently labelled as within-campaign repeatability, not
population-general. (7) The protocol box's Inputs now read "a declared workload model (stated access
patterns, not a production trace)" instead of "a representative workload." All four are
prose/caption-only; the added prose was offset by trimming a duplicated post-restart robustness clause,
so the manuscript is 14,997 words.

Reviewer point 8 (a follow-up statistical assessment) was addressed across its five sub-points. For the
conditional adjacent-pair tests, the manuscript now leads with a *predefined* contrast set fixed before
analysis --- each portable layer against the native-driver reference (new Supplement Table S41, from
`scripts/gen-native-contrasts.mjs`): geometric-mean paired ratio, within-campaign bootstrap interval,
and paired dominance, with every layer trailing the native driver in all 25 replicates (dominance 1.00);
the ranking-selected adjacent-pair tests are demoted to a descriptive supplement check. The +-5% TOST
margin now carries its author-selected, application-dependent, not-preregistered, never-universal caveat
at first use in the main text (the supplement already did). Rank correlations remain subordinated to the
concrete reversals and interaction magnitudes (no change needed). For p99 estimation, a full per-request
HDR recorder is not available in the archived data (the load generator records percentiles only), so a
new Supplement Figure S4 (from `scripts/gen-p99-spread.mjs`) shows the run-to-run spread of the 25
per-run p99 values behind each deep-fetch cell, and the main text states that each run-level p99 is a
noisy top-1% estimate handled by the median-of-run-level estimator; HDR reconstruction is future work.
An adversarially-verified audit of inferential phrasing found one genuine over-reach ("confirm" applied
to a general claim), now softened to "consistent with." The new table and figure are supplement floats
(the main-text float count is unchanged at seven); no primary measurement changed. The manuscript is
14,991 words.

For reviewer point 9 (reproducibility), the one actionable qualification --- that the convenience Docker
path pins older database engines and so does not reproduce the exact published environment, disclosed
only in the supplement/`REPRODUCE.md` --- is now conspicuous in the main-text Data-availability section
of both builds: "Exact reproduction requires the reference engines (PostgreSQL 18.4 and MySQL 9.7.1) ...
the convenience Docker path pins older engines (PostgreSQL 16, MySQL 8.4) and reproduces the workflow but
not the published numbers." The Data-availability section is a declaration, so this does not change the
manuscript length (then 14,991 words).

For reviewer point 10 (novelty and related work), the Positioning subsection now separates coverage
novelty (the four-axis Table 1 claim, stated as the strongest the scoping search supports) from
methodological novelty, and adds a paragraph posing the reviewer's exact question --- which existing
benchmark-quality or experimental-design framework, applied carefully, would already *generate* this
protocol --- and answering, with an adversarially-verified literature analysis, "none." It names the
closest frameworks (Kounev et al.'s systems-benchmarking criteria, Hasselbring's software-engineering
benchmarking standard, and Raasveldt and Mühleisen's database fair-benchmarking guidance) and shows they
supply generic principles but operationalize neither the documentation-selected treatment definition nor
the semantic-equivalence-gated admission for access layers; correctness-before-timing precedents (SPEC,
TPC, SQLancer) validate one program or engine against its own reference, not equivalence across
competing implementations. A final pre-submission search past the 2026-07-15 freeze surfaced no new
access-layer prior art. Three references were added (Kounev et al.; Hasselbring; Rigger and Su); the
paragraph was offset by tightening the survey subsections, so the manuscript is 14,985 words.

**Point 11 (presentation).** The manuscript's density was addressed by realizing the reviewer's
three-layer structure (protocol, then case-study instantiation, then evidence the controls matter)
through concrete artifacts rather than a section reorder. The verbose framed protocol box became a
one-page **protocol flow figure** (Figure 1); a new **estimands table** (Table 3) consolidates every
estimand and what it does and does not identify; a new **analysis-roster table** (Table 6) separates
the primary analyses from the robustness/sensitivity ones. The repeated same-SQL "not a bound" defense
was reduced to one canonical statement with back-references, and three secondary result tables (same-SQL
components, deep-fetch regimes, matched-utilization tail) were moved to the supplement (Tables S42--S44),
catalogued in the roster. The main-text float count is unchanged at seven (six tables plus one figure);
converting the box to a figure and trimming over-defensive prose cut the body from 11,389 to 10,938
words, so the exact IST total is body 10,938 + abstract ~292 + references ~1,900 + seven floats (1,400)
= ~14,530 words, well under 15,000. No data changed (checksums 35/35); the supplement now holds
forty-four tables (S1--S44) plus four figures.

**Point 12 (Essential / strongly-recommended / optional list).** The consolidated list was closed:
the six Essential items were already implemented (E1 novelty framing; E2 protocol-versus-policy
separation; E3 high-load p99 reframe; E4 moderated language; E5 four-level correctness oracle; E6
primary-versus-secondary via the point-11 roster table), with the Abstract now stating explicitly that
the near-saturation high-load p99 is chiefly a capacity-and-queueing outcome (E3 reinforcement). For the
strongly-recommended items, the two deep-fetch regimes were brought back into the main text as a
side-by-side table (Table 7, reversing the point-11 declutter, per S2); S3 (protocol-to-failure-mode
table) is Table 2 plus the Supplement S37 retrospective; S4 (predefined contrasts and effect sizes) and
S5 (material shortening) were done in points 8 and 11; S1 (independent environment) remains future work
for want of a second host. A machine-readable protocol checklist (protocol-checklist.yaml, O1) now ships
in the artifact; coverage statistics for the property-based sweep are reported (O2, Supplement S38); and
a cold/I/O-heavier workload (O3) is declared future work. Returning the regimes table takes the
main-text float count to eight, so the total is body 10,934 + abstract 299 + references ~1,900 + eight
floats (1,600) = ~14,733 words, under 15,000. No data changed (checksums 35/35); the supplement now
holds forty-three tables (S1--S43) plus four figures.

The replication package for this revision is archived at Zenodo,
**Point 6.1 (follow-up).** The most important scientific correction: every formulation reading a mechanistic interpretation into the compound same-SQL contrast was removed. Table 2 no longer concludes ''most spread is query strategy, not raw execution''; it now states that most of the documentation-selected spread disappears under the compound raw-SQL standardization, with the responsible component not identified. The causal-sounding name ''strategy attribution'' is renamed ''strategy standardization'' throughout (Introduction, Study Design, Conclusion, Figure 1, Table 2, checklist), and Results notes that mechanistic attribution would require a factorial or staged ablation, left as future work. Layer-specific strategy claims rest on a separate controlled A/B (Supplement S18) and stay. Prose-only (checksums 35/35); body 10,934 to 10,958, total ~14,757.

DOI 10.5281/zenodo.21493555 (release v1.12.2). Every table reproduces from the archived raw
data, whose checksum manifest verifies 35/35.
