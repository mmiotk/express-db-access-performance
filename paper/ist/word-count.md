# Word-count declaration

Manuscript: *A Reproducible Benchmark of Relational Database Access-Layer Performance
in Express.js: A Configuration-Specific Comparison on PostgreSQL and MySQL*
(submission build `ist/ist_main.tex`).

Counted with `texcount` on the seven body sections plus the structured abstract.
Following the IST author guidelines, each table and figure counts as 200 words, and
**the reference list is included in the total**.

| Component | Count |
|---|---|
| Body text (7 sections) | 11,376 |
| Structured abstract | 299 |
| Tables and figures in the main text (7 × 200) | 1,400 |
| Reference list (62 entries) | 1,848 |
| **Total (IST rule)** | **14,923** |

This is under the journal's 15,000-word limit (with the abstract counted; excluding
the abstract it is 14,556). Twenty-seven tables and one figure are placed in the
numbered online supplement (`supplement.pdf`, Supplement Tables S1–S27 and Supplement
Figure S1), which is submitted with the manuscript and archived under the same Zenodo
DOI as the code and data; supplement floats are not part of the main-text count.

In this revision (round 5) the entire benchmark was re-run on the latest stable
library versions (Prisma 7, Express 5, etc.); the manuscript was repositioned as a reproducible benchmark
and a configuration-specific comparison; the body prose was cut by roughly 1,800 words
to remove repeated conclusions and filler (the five recurring findings are now stated
once, in the results section, and cross-referenced elsewhere); the secondary access
patterns (point read, keyset range scan) were reduced to lean summaries with their full
tables in the supplement; the controlled/varied/uncontrolled factor table was moved to
the supplement (Table S27); and five peripheral citations (general NoSQL and OLTP
benchmark context) were dropped, taking the reference list from 70 to 62 entries. Six
single-host experiments added earlier in the round (utilization-controlled open-loop,
multi-worker cluster, per-layer pool frontier on both engines, mixed read/write,
replicated fan-out, and a longer-run sensitivity check) remain as Supplement Tables
S21–S26 with a one-sentence pointer each in the body.

Two later patch revisions left the reference list at 62 entries: the re-review
revision (v1.5.1) dropped one peripheral citation, and v1.5.2 added one methodological
citation (Papadopoulos et al. 2021, *IEEE Transactions on Software Engineering*, on
reproducible performance-evaluation principles) anchoring the paper's perishability
thesis. That citation adds no body prose (a bare `\cite`), so the only change to the
count is the single reference entry (reference list 1,842 → 1,848 words, total 14,917 →
14,923).

Highlights (5 bullets, each ≤ 85 characters) are in `highlights.tex`.
