# Summary of Revisions

**Manuscript:** A Reproducible Benchmark of Relational Database Access-Layer Performance
in Express.js: A Configuration-Specific Comparison on PostgreSQL and MySQL
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
  implementation-and-strategy comparison, the same-SQL raw-path **bounding** control, and the
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

The replication package for this revision is archived at Zenodo,
DOI 10.5281/zenodo.21470361 (release v1.7.2). Every table reproduces from the archived raw
data, whose checksum manifest verifies 35/35.
