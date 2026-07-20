# Summary of Revisions

**Manuscript:** A Reproducible Benchmark of Relational Database Access-Layer Performance
in Express.js: A Configuration-Specific Comparison on PostgreSQL and MySQL
**Author:** Mateusz Miotk (University of Gdańsk)
**Journal:** Information and Software Technology

I thank the reviewer for a thorough, multi-part reading. This revision addresses five
successive sets of comments — on methodology and the scope of claims, on the CPU and
statistical reporting, on the conclusions and language, on presentation, and on the paper's
length. A full point-by-point reply, each with a quotation of the revised text, is in the
separate Response to Reviewers; the essential changes are summarized below. No measurement
changed — the revision is one of framing, scoping, and length.

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

The replication package for this revision is archived at Zenodo,
DOI 10.5281/zenodo.21456366 (release v1.6.6). Every table reproduces from the archived raw
data, whose checksum manifest verifies 33/33.
