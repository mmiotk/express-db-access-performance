# Summary of Revisions

**Manuscript:** A Comparability Protocol for Benchmarking Relational Database Access Layers in Express.js
**Author:** Mateusz Miotk
**Journal:** Information and Software Technology

This revision keeps the primary benchmark matrix unchanged and addresses the remaining conceptual, construct-validity, and artifact-auditability concerns.

## Conceptual framing

- Added and distinguished CYNTHIA (ICSE 2021) as prior cross-ORM differential-equivalence work.
- Narrowed novelty to the integrated benchmark-admission protocol rather than correctness checking or differential testing themselves.
- Removed global "complete" and universal "necessary" claims; compliance levels now state the claims they license.
- Renamed RQ2 to backend-stack transfer and removed causal attribution to the DBMS alone.
- Audited same-SQL prose so the result remains a compound standardized contrast that isolates no mechanism.

## Construct validity and experiments

- Archived the recorded pre-freeze Wayback responses for all nine selected treatments with capture timestamps, source URLs, SHA-256 hashes, evidence terms, a reproducible conflict rule, and an explicit capture-time limitation.
- Documented each canonical constructor operation.
- Added a standalone 30-block canonicalization benchmark and generated Supplement Table S44. Deep-fetch construction costs 9.32--9.40 microseconds, 0.078% of the fastest corresponding HTTP p50.
- Quantified two saturation-target sensitivities: bootstrap confidence bounds yield 48.6--51.7% and 68.0--72.4%; replacing the target with the full-sweep maximum yields 46.8--51.2% and 65.5--71.6% (Supplement Table S45).
- Restricted the matched-utilization headline to stable 50% and most 70% cells; 85--95% results are sensitivity trends.

## Artifact auditability

- Added `documentation-snapshots/manifest.json` plus nine preserved pages and an archival/validation script.
- Added machine-readable `environment.json` and a complete, corrected provenance map for every table and figure.
- Expanded the verified checksum manifest from 35 to 37 result files.
- Ran the complete standalone-renderer chain in a fresh copy without dependencies or build outputs; both table directories reproduced byte-for-byte. This was an author-run offline reconstruction, not a measurement rerun or independent-machine reproduction.
- Archived the complete revision as Zenodo-linked release v1.12.13 under concept DOI 10.5281/zenodo.21313858; the primary matrix remains unchanged from v1.12.12.

## Editorial consistency

- Standardized "deep fetch," "single-row insert," and "latest compatible stable versions as of the 15 July 2026 freeze."
- Kept the MySQL insert raw-distribution warning and the one-millisecond p99 resolution qualification prominent.
- Removed the remaining positive same-SQL "bound" claims and restricted the transactional-write discussion to its exploratory five-layer PostgreSQL subset.
- Replaced stale submission documents with the current point-by-point response and exact word-count declaration.

## Submission length

The conservative IST word-equivalent count is **13,929**: 9,962 body words, 298 abstract words, 2,069 reference-list words, and 1,600 words for eight main-text floats. This leaves 1,071 words below the 15,000-word limit.
