# Summary of Revisions (Round 6)

**Manuscript:** A Reproducible Benchmark of Relational Database Access-Layer Performance
in Express.js: A Configuration-Specific Comparison on PostgreSQL and MySQL
**Author:** Mateusz Miotk (University of Gdańsk)
**Journal:** Information and Software Technology

I thank the reviewer for a sixth careful reading and for the clear framing that the
dataset and artifact are publishable, the remaining obstacle being interpretation that
claimed more causal specificity and category generality than a single-host,
default-configuration design can establish. I have made that framing the organizing
principle of this revision. A full point-by-point reply (every P1–P10 item, the §7
minors, the §8 statistical points, and questions Q1–Q8, each with a quotation of the
revised text) is provided in the separate Response to Reviewers. The essential changes
are summarized below.

## Governing change: the same-SQL causal claim is withdrawn

The earlier text read the same-SQL control as a causal decomposition — that the
eager-loading *strategy*, not the execution machinery, drove most of the idiomatic
spread. Because collapsing every layer onto identical SQL changes query strategy,
statement count, prepared-statement behaviour, the raw-versus-ORM API, and result
marshalling together, the design cannot support that attribution. I have **retracted it
everywhere** (both abstracts, Results, Discussion, Conclusion) and reworded the control
as a pure compound **bounding contrast**: it bounds the combined
query-strategy-and-formulation contribution without isolating any single mechanism. The
one remaining mechanistic remark (Prisma's slow raw path) is now labelled an explicit
conjecture the contrast cannot confirm.

## New experiment: longer-window tail-latency validation

Addressing the concern that the primary p99 rests on ~60 tail observations per run, I
added a 60-second re-measurement of the deep fetch on both engines (five times the
requests, ~300 tail observations per run) at the same operating point. The p99 ranking
is **preserved exactly (Spearman rho = 1.00 per engine)**, each cell's p99 barely moves
from the 12-second value, the p97.5 ordering matches the p99 ordering, and the
run-level p99 coefficient of variation stays at most 6.0% (PostgreSQL) / 3.8% (MySQL).
The 12-second window is therefore adequate for the tail ranking (new Supplement Table
S23).

## Interpretation and framing

- **Estimand renamed.** "Idiomatic" is now a *documented default configuration under a
  reproducible adapter-selection rule*, explicitly not a claim of performance-optimal or
  typical production use.
- **Three quantities separated.** RQ1 keeps capacity, overload latency (saturated p99 at
  equal demand), and matched-utilization latency distinct.
- **Category claims scoped.** Practical guidance now applies to the tested
  implementations and configuration, offered as a hypothesis rather than a category law.
- **Perishability tempered** from a general law to one observed version-sensitivity
  example; the historical Prisma narrative is condensed to a single paragraph.

## Statistics and reporting

- Kendall's tau added alongside Spearman's rho; "read rankings transfer" softened to "the
  read ordering is similar across engines."
- Post-hoc adjacent-rank comparisons reported descriptively, not as ranking confirmation.
- A layer-by-engine **interaction-magnitude** table (PostgreSQL÷MySQL ratios with
  bootstrap intervals) reports effect size rather than a p-value floor.
- An **ex-MikroORM robustness check**: the read ordering and the deep-fetch spread
  (3.7x) survive excluding the largest outlier.
- Raw per-replicate points for the noisiest (MySQL insert) cells shown as a figure.
- The TOST margin is motivated by the engineering consequence, not by measurement noise.
- "Intrinsic latency" replaced by capacity-normalized / matched-utilization wording;
  "CRUD-spanning" replaced by "five representative access patterns"; "native leads all
  ten engine-pattern combinations" stated exactly; "latest stable" dated to the freeze.

## Reproducibility and length

- A new top-level **REPRODUCE.md** gives one-command smoke, full-matrix, and
  clean-room-from-Zenodo-tarball recipes; the archive is a git archive containing all 33
  raw-data JSON files with a regenerated checksum manifest.
- The manuscript is 14,936 words (references and floats included, under 15,000); the
  structured abstract is 298 words. New analyses are placed in the supplement; the
  condensed Prisma narrative and removed repetition offset the additions.

The replication package for this revision is archived at Zenodo,
DOI 10.5281/zenodo.21433223 (release v1.6.2). An independent adversarial re-review
reproduced every headline number from the raw data and returned a minor-revision
verdict.
