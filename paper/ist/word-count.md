# Word-count declaration

Manuscript: *A Reproducible Benchmark of Relational Database Access-Layer Performance
in Express.js: A Configuration-Specific Comparison on PostgreSQL and MySQL*
(submission build `ist/ist_main.tex`).

Counted with `texcount` on the seven body sections plus the structured abstract.
The IST *Guide for Authors* sets the limit for a research paper at **15,000 words**, and
states that **"references and appendices are part of the submission and count against the
total number of words, and figures and tables count 200 words each."** This count applies
that rule exactly: the reference list is included and each of the seven main-text floats
counts 200 words. The paper has **no appendices** — all supplementary material is in the
separate `supplement.pdf`, which under Elsevier's policy is online supplementary material,
not an appendix, and is not part of the manuscript word count. The mandatory declaration
sections (CRediT, Declaration of competing interest, Funding, Data availability, and the
generative-AI declaration, ~300 words) are required metadata, not article content or
appendices, and are excluded per Elsevier convention.

| Component | Count |
|---|---|
| Body text (7 sections) | 11,216 |
| Structured abstract | 299 |
| Tables and figures in the main text (7 × 200) | 1,400 |
| Reference list (62 entries) | 1,848 |
| **Total (IST rule)** | **14,763** |

This is under the journal's 15,000-word limit (with the abstract counted; excluding
the abstract it is 14,464). The structured abstract is 299 words (under the journal's
300-word structured-abstract limit). Thirty-two tables and two figures are placed in the
numbered online supplement (`supplement.pdf`, Supplement Tables S1–S32 and Supplement
Figures S1–S2), which is submitted with the manuscript and archived under the same Zenodo
DOI as the code and data; supplement floats are not part of the main-text count. A later
revision added per-cell bootstrap 95% CIs to the p99 column of every pattern table and a
paired p99 significance table (Supplement Table S30), delivering the p99 inference the
outcomes table lists as primary; these widen existing tables and add one supplement float,
not a main-text float.

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

Revision round 6 retracted the causal same-SQL attribution (now a bounding contrast),
renamed the "idiomatic" estimand, separated the capacity/overload/matched-utilization
quantities, tempered the perishability claim, and added the required statistical
disclosures (Kendall's τ, an ex-MikroORM robustness note, a layer×engine interaction
table, and an insert-dispersion figure, all in the supplement). The condensed Prisma
case study and the removal of repeated restatements offset most of these additions, so the
body changed marginally (11,376 to 11,388) and the abstract was tightened from 313 to 298
words; the total is 14,934. The longer-window tail sensitivity (Table S23), interaction
magnitude (Table S28), and insert dispersion (Figure S1) are the new supplement floats.

A subsequent round-6 clarification renamed the primary 50-connection matrix from
"saturated" to a "fixed 50-connection high-load operating point," since the throughput
knee is demonstrated (Supplement Figure S2) only for the deep fetch, while the
ten-connection pool---not a per-pattern knee---is the binding high-load constraint
(Section 3, Controls); the per-layer/pool/open-loop "saturat*" uses are unchanged. The
rename plus its one-clause justification added a net 15 body words (offset by tightening
three tail-latency sentences) and one abstract word, taking the body to 11,444 and the
total to 14,991.

A further round-6 clarification softened the causal claim that each layer is
"single-core-bound" / "multi-core-bound": the equal-CPU and multi-worker controls show
that extra application cores do not raise a process's throughput (so the ranking is not a
core-budget artifact), but do not prove single-core CPU is the causal bottleneck. The
label was replaced by that observation at every prose site and in the equal-CPU and
cluster table captions (the latter also corrected: its own data shows Prisma flat across
1/2/4 cores, so "Prisma requires roughly four cores to approach pg" was wrong---the four
are cluster workers, not cores). Merging a now-redundant sentence offset the reframe, so
the body is 11,443 and the total 14,990; the CPU-utilization measurements ("$\approx$110\%
of one core") are unchanged.

A final round-6 clarification separated the *fact* that an earlier Prisma result did not
reproduce on the re-run from the *hypothesis* that Prisma's version/architecture change
caused it: the Discussion now states the non-reproduction as a fact and its cause as an
explicitly hedged hypothesis (the vanished premium was Prisma-specific and only Prisma
changed architecture, so its Rust-free rewrite is the likeliest driver, but the re-freeze
advanced the whole toolchain at once, so it cannot be isolated), and the intro/conclusion
headline sentences now say the result was retired "on newer versions" rather than
attributing it to "Prisma's Rust-free successor." Trimming the paragraph's lead-in and a
parenthetical offset most of the hedge, taking the body to 11,447 and the total to 14,994.

A final round-6 terminology change replaced the over-claiming label "idiomatic"
(~53 occurrences) with "documentation-selected" throughout, with lighter synonyms
("documented default", "default") where it read clunkily. The methodology already
disclaimed the connotation ("Documentation order is a reproducible selection heuristic,
not evidence that the chosen API is performance-optimal or the most common production
choice"); this makes the terminology consistent with that definition. The
"default-configuration" estimand name is unchanged; the generated table captions
(sameplan, altloading, insert-dispersion) and the replication-package `METHODOLOGY.md`
were updated to match. Dropping the now-redundant "used idiomatically" disclaimer clause
took the body to 11,437 and the total to 14,984.

A final round-6 change simplified the statistical emphasis: the results subsection
"Measurement stability and significance" was renamed "…and effect sizes" and rewritten
to lead with geometric-mean ratios, bootstrap CIs, and practical significance (the
narrowest adjacent step, 1.05, sits at the ±5% equivalence margin — statistically
distinguishable yet practically marginal; the up-to-7× spread is decisive), with the
post-hoc adjacent-pair permutation/Wilcoxon/Bonferroni tests compressed to a secondary,
descriptive robustness note. The conclusion, methodology, and threats sentences were
aligned to the same hierarchy (effect sizes and intervals primary; adjacent-rank tests
secondary and descriptive). No statistic was added or removed; the significance table
(Table 6) stays in the main text. Compressing the p-value enumeration offset the added
practical-significance prose, so the body is 11,435 and the total 14,982.

A follow-on round-6 change reported the layer×engine interaction by its magnitude
rather than its p-value: the RQ2 paragraph now leads with the per-layer
PostgreSQL÷MySQL throughput ratios (reads a narrow $\approx$1.0--1.6× band, the insert
scattering 1.6--3.2× and reordering layers across engines), with the blocked
permutation test demoted to confirming the interaction is nonzero (its floor p says
nothing about size); the outcomes-table row foregrounds the effect ratios (Table S28).
The added magnitude detail took the body to 11,444 and the total to 14,991.

A final round-6 change softened the novelty claims to match the (explicitly
non-systematic) scoping search: the one bald claim, "the combination missing from prior
art" (introduction), became "a combination not identified in our documented search," and
"a design choice absent from every access-layer benchmark surveyed above" (related work)
became "not found in the access-layer benchmarks surveyed above." The four-axis gap
statement and the related-work positioning were already scoped ("In the sources we
searched…"; "a structured scoping search (not a systematic review)"). Net +3 words; the
body is 11,447 and the total 14,994.

A final round-6 change stated explicit library inclusion/exclusion criteria in the
methodology (each layer is maintained, in common use, occupies a distinct taxonomy tier,
and — for the portable tiers — runs against both engines), with the reasons the named
candidates were omitted: PostgreSQL-only clients (Slonik, pg-promise) are non-portable,
and Kysely is a query builder already represented by Knex. The full criteria and a
per-candidate table are in the replication package (`experiments/METHODOLOGY.md`, not
word-counted). The addition was offset by removing a redundant tier-classification clause
(Drizzle's placement, already given in the layer list) and tightening the
vendor-independence sentence, so the net change is +1 word: the body is 11,448 and the
total 14,995.

A final round-6 change added a short **artifact-reproducibility table** (Supplement Table
S31: version/commit and DOI, software and hardware requirements, the run commands, the time
and resources, and which results are regenerated automatically from the archived raw data),
with a one-line pointer in the Data Availability section. Both are outside the counted body
— the table is a supplement float (uncounted) and Data Availability is back-matter, not one
of the seven counted sections — so the declared total is unchanged at 14,995. That round-6
change brought the supplement to thirty-one tables (S1–S31); the table was placed last, so
S1–S30 kept their numbers.

A final round-6 pass shortened the manuscript and fixed editorial errors. Repeated
conclusions were consolidated to one canonical statement each with cross-references —
the Prisma retired-headline story, the version-sensitivity thesis, and the same-SQL
"bounds but does not isolate" caveat were each stated once and cross-referenced elsewhere
— and the most duplicative auxiliary prose (the open-loop/utilization tail block and the
thrice-told multi-worker cluster result) was compressed to its conclusion plus the
Supplement table pointer; every trimmed number still appears once in its Supplement table.
This cut the body by 232 words, from 11,448 to 11,216, and the total from 14,995 to
**14,763** (237 words of headroom under the 15,000 limit). Editorially, the run-in
`\paragraph` headings were rendering a double period under `elsarticle` (which auto-appends
a period to a heading that already ended in one — "the instrument is the contribution..");
the trailing period was removed from all twelve headings so each now renders a single
period.

A round-7 methodology-and-scope pass sharpened the claims without changing any measurement:
the estimand was renamed from "default-configuration" to "documentation-selected
implementation-and-strategy" (choosing the first documented API is not the library's default
configuration); the three claim levels — the primary implementation-and-strategy comparison,
the same-SQL raw-path bounding control, and the individually non-identified mechanisms — were
named and kept separate; "capacity", "saturating throughput", and "overload" were reserved
for the deep-fetch sweep, where a throughput knee was actually measured, and the primary
matrix's fixed point is described as "high-load" rather than "overload"; and a compact
**experiment-scope table** (Supplement Table S32: each experiment's access pattern(s),
engine(s), layer count, and repeated runs) was added last, so S1–S31 keep their numbers. The
supplement now holds thirty-two tables (S1–S32). A companion CPU-and-statistics pass in the
same round demoted the equal-CPU experiment to an exploratory sensitivity check and corrected
its "at most a few percent" wording (the ORM per-core values wobble 10–17% run-to-run);
added that the bootstrap intervals capture within-campaign variability, not cross-machine
generalization; noted that 1–2 ms p99 gaps sit at the millisecond measurement floor; and
brought the raw MySQL-insert distributions (Supplement Figure S1) into the body. A final
conclusions-and-language pass then limited "access-layer overhead" wording to the combined
implementation-and-strategy quantity the design actually measures, replaced the "thin layers
are a safer default" recommendation with "benchmark the relation-heavy hot path for the
specific application", and added an explicit "configuration-specific" label to the
Conclusion (the cautious "in the sources searched" novelty phrasing was already in place).
A closing presentation-and-control pass then removed repeated caveats — the standalone
same-SQL "bounds not isolates" Discussion paragraph (already stated in Results, the abstract,
and the Conclusion), the duplicated horizontal-scaling and "productivity/type-safety not
measured" sentences in Practical Guidance, and a redundant single-host restatement — and, in
the abstract, dropped the secondary Kendall-tau and matched-utilization results while scoping
the open-loop and equal-compute-budget conditions to the deep fetch. A pre-submission
consistency sweep confirmed the pinned library versions match `package.json`, the DOI and
GitHub link resolve, and every headline number matches its table. That sweep also corrected a
CV figure ("within 4.2%", not 4.0%, on the reads), removed the redundant per-cell median CIs
from the main-paper paired significance table (Table 6) that had disagreed with the pattern
table's bounds, and reconciled two loose prose phrasings ("the faster layers" cluster within
5%; the transactional ordering "broadly tracks" the single-row insert apart from Prisma). These
are all rewordings, so the manuscript total was **14,903** words (11,356 body, 97 under the
15,000 limit); the structured abstract is 292 words.

A subsequent editorial pass condensed the main text by roughly **24%** (body 11,356 → 8,669
words; main paper 51 → 43 pages) so it reads as "a reproducible benchmark methodology
demonstrated through a dual-engine case study," with the full audit trail in the supplement.
Nothing was deleted: the detailed statistical construction (permutation/bootstrap/TOST/ANOVA)
became the supplement's *Statistical methods* section, the measurement internals (warm-up,
order-invariance, tail estimation, resource sampling) its *Measurement details* section, and
the four-pitfall checklist its *Benchmarking-pitfalls checklist* section (main text keeps a
named summary); Methodology, Results, Discussion, and Threats were tightened and repeated
single-host/version-sensitivity caveats consolidated. The manuscript total is now **12,216**
words (8,669 body + 299 abstract + 1,848 references + seven main floats), well under the 15,000
limit; the supplement grew from 26 to 29 pages. All citations were kept in the main text (the
supplement has no bibliography), so the reference list is unchanged.
The last published release is v1.6.3 (DOI 10.5281/zenodo.21440942); this revision will be
archived as v1.6.4.

Highlights (5 bullets, each ≤ 85 characters) are in `highlights.tex`.
