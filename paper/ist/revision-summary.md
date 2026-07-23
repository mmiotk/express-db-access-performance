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

- Archived exact documentation HTML for all nine selected treatments with capture timestamps, source URLs, SHA-256 hashes, evidence terms, and a reproducible conflict rule.
- Documented each canonical constructor operation.
- Added a standalone 30-block canonicalization benchmark and generated Supplement Table S44. Deep-fetch construction costs 9.34--9.36 microseconds, 0.078% of the fastest corresponding HTTP p50.
- Quantified saturation-target uncertainty: nominal 50% becomes 48.6--51.7%, and nominal 70% becomes 68.0--72.4% under the target confidence bounds.
- Restricted the matched-utilization headline to stable 50% and most 70% cells; 85--95% results are sensitivity trends.

## Artifact auditability

- Added `documentation-snapshots/manifest.json` plus nine preserved pages and an archival/validation script.
- Added machine-readable `environment.json` and provenance entries for the new measurement and generated table.
- Expanded the verified checksum manifest from 35 to 37 result files.
- Clarified that Zenodo v1.12.12 archives the primary campaign, while the new revision artifacts require a new persistent release before submission.

## Editorial consistency

- Standardized "deep fetch," "single-row insert," and "latest compatible stable versions as of the 15 July 2026 freeze."
- Kept the MySQL insert raw-distribution warning and the one-millisecond p99 resolution qualification prominent.
- Replaced stale submission documents with the current point-by-point response and exact word-count declaration.

## Submission length

The conservative IST word-equivalent count is **13,786**: 9,819 body words, 298 abstract words, 2,069 reference-list words, and 1,600 words for eight main-text floats. This leaves 1,214 words below the 15,000-word limit.
