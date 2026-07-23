# Response to Reviewer

Dear Editor and Reviewer,

Thank you for the careful assessment and the recommendation of major revision. The primary 25-run measurement matrix is unchanged. This revision changes the conceptual framing and audit trail, and adds one narrowly scoped standalone measurement of canonical-constructor cost. Each requested item is addressed below.

## 6.1 Cross-ORM differential-testing prior work

CYNTHIA is now cited in Related Work: Sotiropoulos et al., "Data-Oriented Differential Testing of Object-Relational Mapping Systems," ICSE 2021. The revised text recognizes that constructing equivalent queries across ORM implementations and using result disagreement as a differential oracle is prior art. It distinguishes CYNTHIA as a correctness-testing technique from the present benchmark-admission procedure. The novelty claim is now limited to the integrated use of a cross-implementation semantic-equivalence gate before admitting timings, a predeclared treatment-selection rule, and explicit operating-point separation. The paper no longer implies that cross-ORM equivalence checking itself is unprecedented.

## 6.2 Completeness and necessity

The universal claims were removed. The protocol now "covers the admission-through-interpretation dimensions addressed here" and explicitly does not claim a complete taxonomy of benchmark threats. Each stage is described as consequential in this case study, not universally necessary. The compliance-level text now states what each level licenses: the validity core licenses comparison of admitted, defined treatments; capacity characterization licenses interpretation relative to a measured knee; the same-SQL level licenses only a compound standardized contrast; matched utilization licenses comparisons at equal fractions of separately estimated capacity; and the resource level licenses an equal-compute sensitivity reading. A lower level does not license the claims of a higher one.

## 6.3 Documentation-selected treatment

The repository now contains `experiments/documentation-snapshots/manifest.json`, nine exact HTML files, and an archival script. For every selected treatment the manifest records the official source URL, Wayback capture timestamp at or before the 15 July 2026 freeze, final replay URL, byte count, SHA-256 digest, and evidence terms. All nine entries are archived captures; no live-page fallback was needed.

The decision rule for conflicting official pages is also explicit: a stable, version-compatible relationship or eager-loading page takes priority over a quick-start or marketing page; equally prominent alternatives invoke the predeclared taxonomy-tier tie-break; an unresolved conflict is reported as ambiguous and both treatments must be declared before measurement. The manuscript continues to describe this as an intentionally artificial reproducible policy, not typical or optimal practitioner behavior.

## 6.4 RQ2 estimand

RQ2 is renamed "backend-stack transfer." The Methods and Results state that changing PostgreSQL to MySQL may jointly change the DBMS, the supported adapter, and the lower-level driver. The rank-transfer observations are retained, but are not attributed causally to the DBMS alone. Phrases suggesting a pure "engine advantage" were replaced with PostgreSQL-to-MySQL stack ratios.

## 6.5 Canonical-constructor cost

Study Design now specifies the exact work. The point constructor copies seven fields and normalizes identifiers, counts, booleans, and timestamps; the range constructor maps it over 20 rows; the two deep-fetch constructors copy a post and author and map an already-grouped ten-comment array; they do not query, join, regroup, sort, or cache. The aggregation constructor converts four scalars. Inserts do not use a shared constructor beyond adapter-specific identifier conversion.

A new standalone benchmark uses seed-realistic inputs, 20,000 warm-up calls, and 30 timed blocks of 50,000 calls, subtracting an identity-loop median. Median net costs are 0.05--17.51 microseconds per call. The graph and flat-row deep-fetch forms cost 9.36 and 9.34 microseconds, each 0.078% of the smallest corresponding primary-campaign HTTP p50. Even the largest case is 0.146%. These development-host values are presented only as a scale check; they are not a causal decomposition and do not resolve near-ties.

## 6.6 Matched-utilization uncertainty

For each deep-fetch layer, the open-loop target is the median 50-connection throughput from the 25-run primary campaign; the concurrency sweep places 50 connections at or above every measured knee. The manuscript now acknowledges the discrete-ladder and within-campaign estimation uncertainty. Using each capacity target confidence bound as the denominator moves a nominal 50% load to 48.6--51.7% and a nominal 70% load to 68.0--72.4%. The headline inference is therefore based on the stable 50% cells and most 70% cells. The noisy 85% and 95% cells are described only as near-saturation sensitivity evidence.

## Minor and presentation concerns

- Both abstracts say "latest compatible stable versions as of the 15 July 2026 freeze."
- "Deep fetch" is used consistently for the one tested topology.
- The primary mutation remains a single-row insert; the six-statement transactional experiment remains exploratory.
- The main Results text prominently identifies the bimodal or heavy-tailed MySQL insert cells, reports the 15.9% maximum CV, and directs the reader to Supplement Figure S1.
- The p99 discussion retains the warning that approximately 1 ms differences are practically unresolved at the measurement resolution.
- Repeated contribution and limitation statements were consolidated during the earlier condensation; this revision does not reintroduce a repeated defensive discussion.

## Reproducibility and length

`environment.json` now complements the human-readable environment capture, the manifest maps the new measurement to its inputs and generated table, and the checksum set covers 37 result files. The documentation archive and canonical measurement are explicitly separated from primary data reconstructed from v1.12.12.

The exact current IST word-equivalent count is 13,786: 9,819 body words, 298 abstract words, 2,069 words in the conservatively counted 66-entry rendered reference list, and 1,600 words for eight main-text floats. This leaves 1,214 words below the 15,000-word limit.

The earlier clean-room log is author-run from an immutable v1.12.9 archive and is explicitly not an independent third-party or second-environment reproduction. The complete revised package has not been independently reproduced. The manuscript does not claim otherwise. Before submission, the current documentation snapshots and canonical-cost artifact require a new immutable release rather than being attributed to v1.12.12.

## Direct answers to the author questions

1. Exact page copies, timestamps, hashes, and selection evidence are now archived locally for all nine treatments; a new persistent release remains required before submission.
2. The constructors only copy and type-normalize already-grouped data. Their measured deep-fetch share is 0.078% of the fastest corresponding HTTP p50.
3. Yes. RQ2 is now "backend-stack transfer."
4. Saturating-throughput targets and their uncertainty are defined above; the robust conclusion is limited to 50% and most 70% loads.
5. CYNTHIA is now included and distinguished explicitly.
6. No global completeness claim remains; the protocol scope is the admission-through-interpretation dimensions treated here.
7. The final IST count is 13,786 words under the stated conservative method.
8. No independent-environment reproduction of the complete revised artifact is claimed.

Sincerely,

Mateusz Miotk
