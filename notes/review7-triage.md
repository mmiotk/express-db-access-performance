# Revision Round 7 — two independent pre-submission reviews, collated

Two reviews of the **v1.13.2** submission build, run on the same brief, neither aware of the
other: **R-A = OpenAI Codex**, **R-B = Claude (paper-reviewer agent)**. Both returned
**major revision**. Neither proposed new measurements; every fix below is text, a
cross-reference, or a re-analysis of archived data.

Verification column: **[verified]** = re-checked against source or archived results by the
assistant on 2026-07-31; **[open]** = a judgement call for the author, not mechanically
checkable.

## A. Found independently by both reviews

Convergence across two independent readings is the strongest evidence a concern is real.

| # | Concern | R-A | R-B | Status |
|---|---|---|---|---|
| **A1** | `introduction.tex:36` garbled sentence, present in the compiled and deposited PDF; the lost clause introduced the RQ1--RQ3 primary estimand | MINOR | **CRITICAL** | [verified] **FIXED** |
| **A2** | R7 carries incompatible definitions and compliance states across the paper | MAJOR | MAJOR | [verified] open |
| **A3** | "unambiguous" / "direct evidence" on the matched-utilization inversion, from five-run min--max ranges the table itself calls not an interval estimate | MAJOR | MAJOR | [open] |
| **A4** | `supplement.tex:608` says 1.48x; `native_contrasts.tex:20` says 1.49 | MINOR | MODERATE | [verified] open |
| **A5** | `results.tex:63` `p<5e-5` vs `interaction.tex:27` `0.0000500`, the Monte Carlo floor | MINOR | NIT | [verified] open |

A1 was quoted verbatim by R-B from the pre-fix file, so the two findings are genuinely
independent. Restored from `v1.12.17`: "The study separates two estimands: the
*policy-selected documented configuration*". Net +9 words, leaving 5 words of headroom
under the 15,000 limit.

## B. Raised by R-B only, mechanically verified

| # | Concern | Evidence | Status |
|---|---|---|---|
| **B1** | **TOST and Cliff's delta are named in Methods and reported nowhere.** Methods promises a TOST "for the closest pair"; `analysis2.json` shows it was run on `pg / prisma`, a **3.10x** contrast. The closest PostgreSQL pair (TypeORM 1219 vs Prisma 1175, 1.037x) was never tested. `TOST` and `Cliff` occur only in `methodology.tex`; tables report `winFraction`, a different statistic | `experiments/results/analysis2.json`; grep across `paper/` | [verified] open |
| **B2** | 73,080 spec-oracle checks cited to **Supplement Table S38**, which reports 60,800 differential comparisons: a different check with a different number | `methodology.tex:164`, `threats.tex:19`, `semantic_equivalence.tex:29` | [verified] open |
| **B3** | `results.tex:94` says "the recurring aggregation and insert reversals"; **no insert reversal recurs**. Primary `knex\|drizzle`, `knex\|objection`; validation `sequelize\|objection`; intersection empty. Aggregation does recur (4 pairs) | `rq2-leave-prisma-out.json`, `reduced[2]` | [verified] open |

The zero-promotion conclusion is unaffected by B3; only the sentence describes a set that
does not exist.

## C. Raised by R-B only, not yet re-checked

| # | Concern | Where |
|---|---|---|
| C1 | Fan-out sweep result asserted with no table, figure, or supplement section; data exist as `results/fanout.json`. Table S32 ("scope of every experiment") also omits fan-out, the order-invariance check, and the concurrency sweep | `results.tex:135`, `discussion.tex:99` |
| C2 | R6 resource accounting claimed as exercised, but no CPU/RSS number appears in the body, and the supplement makes three cross-references to main-text passages that do not exist | `supplement.tex:80,150,552` |
| C3 | Stale "the two layers issuing four statements sit at opposite ends of the throughput ladder": Prisma 1,175 and Objection 1,017 are adjacent, ranks 4 and 5 | `supplement.tex:58-63` |
| C4 | MySQL insert p99 is 105--129 ms, the largest tail in the study, and is never mentioned, though the paper's thesis is that throughput and tail must be reported jointly | `write.tex`, `results.tex:113` |
| C5 | Adjacent-pair significance table exists for MySQL only, while Conclusion validity cites it generically | `threats.tex:113` |
| C6 | `word-count.md` was stamped at the v1.13.0 commit and declared 14,986. **Superseded**: the round-7 fixes moved the body by +10 `texcount` words, so the declaration and the cover letter now read **14,996, headroom 4**, regenerated via `make -C paper/ist docs` | `paper/ist/word-count.md`, `cover-letter.md` |

## D. Raised by R-A only

| # | Concern | Where |
|---|---|---|
| D1 | Common-SQL table juxtaposes a 25-run column with a 10-run column from a separate campaign; per-layer ratios are unpaired cross-campaign contrasts, and no dispersion is reported for a headline result | `results.tex:46`, `sameplan.tex` |
| D2 | "compresses rather than manufactures" overstates what the fixed-payload control shows: throughput headroom, not attenuation of between-layer effects | `threats.tex:19-25` |
| D3 | "may be met by adding application processes" outruns a check covering three layers, three replicates, one workload, four workers | `discussion.tex:97` |
| D4 | Outcomes table classifies the layer-by-stack interaction as "Secondary" while RQ2 carries headline claims | `outcomes.tex`, `methodology.tex:245` |
| D5 | Exchangeability across the 25 sequential blocks is assumed rather than diagnosed for the read workloads | `methodology.tex:258` |

## E. Where the two reviews disagree

**Multiplicity.** R-A calls the absent familywise correction on the RQ2 promotion screen a
MAJOR defect and disputes that recurrence across campaigns constitutes error control, noting
the campaigns share a host and replay the same identifier draws. R-B reads the same policy as
explicitly stated and defensible, and instead faults the **other** family (seven adjacent
pairs x two engines, on throughput and on p99) for having no stated policy anywhere in the
submission, though `notes/supplement-methods.tex:103` states a Bonferroni conservatism check
that does not ship.

Both descriptions of the facts are correct. The disagreement is whether recurrence substitutes
for a correction. Author's call; note that adopting R-B's fix (carry the Bonferroni sentence
into the Analysis subsection) is cheap and partially answers R-A.

## F. Confirmed correct by R-B, useful against a future reviewer

Recomputed from generated tables and archived JSON: both deep-fetch spreads (7.01x, 5.12x);
common-SQL residuals (1.71x, 2.03x); all ten RQ3 per-pattern spreads; the nine-of-ten
engine-pattern statement and its MySQL-insert exception; tuned-vs-untuned tracking; both tail
Spearman coefficients and the native driver's 3rd/8 and 7th/8 positions; all CV claims (4.5%,
6.4%, 13.6%); utilization medians 98--100%; interaction F range; every leave-Prisma-out rho;
both campaign arithmetics. Bootstrap generators pass `level: 0.95` explicitly despite the
function default of 0.90, so the "95%" captions are accurate. Every main-text reference to
Supplement Tables S1--S52 resolves correctly except S38 (B2). A repeated-7-gram scan found no
actionable duplication.

## G. Disposition

Fixed: **A1**.

Purely factual, no judgement needed, recommended next: **B1**, **B2**, **B3**, **A4**, **A5**.

Author judgement required: **A2**, **A3**, **C1--C5**, **D1--D5**, **E**.

All outstanding items must land in a single release; `master` is at `v1.13.2` and the
submission gate refuses a package build whenever it runs ahead of the tag.
