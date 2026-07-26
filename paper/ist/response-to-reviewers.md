# Response to Reviewer — July 26, 2026 Review

Dear Editor and Reviewer,

Thank you for re-reading the revised package against your earlier concerns and for confirming that the artifact/DOI synchronization and the S19 wait-event interpretation are resolved. This round addresses all four P0 items. It also corrects a factual error in our own AI disclosure that your Question 4 prompted us to check, and it closes a gap in the review packets that your P1 recommendation exposed. No new benchmarking campaign was run, in line with your advice.

We group the response by your prioritized checklist.

## P0-1. AI-assisted research methodology moved into Methods

Adopted, and corrected. Your Question 4 asked which exact Claude and Codex models participated. Checking this against our own provenance showed that the previous disclosure was **wrong**: it named "Codex, OpenAI" alongside Claude, but the repository contains no trace of Codex. Of the commits then in the history, 159 carried `Co-Authored-By: Claude Opus 4.8 (1M context)`, 27 `Claude Fable 5`, and 8 none; the string "codex" appeared nowhere except in the two manuscript files. We have removed the Codex attribution rather than defend it.

New Section 3.9, **AI-assisted research tooling**, now states in the Methods section:

- **Tool, models, developer.** Claude (Anthropic), via the Claude Code CLI. Models: Claude Opus 4.8 (1M-token context), Claude Fable 5, and Claude Opus 5 (1M-token context) for the final revision. No other vendor's assistant contributed to software, analysis, or text.
- **Recoverable provenance.** Assistance is recorded per commit, not asserted in aggregate: the large majority of commits carry a `Co-Authored-By` trailer naming the model, and Section 3.9 states the exact count and names the untrailered exceptions, so a reviewer can re-derive the distribution by counting the trailers themselves (`git log --format='%(trailers:key=Co-Authored-By,valueonly)'`). We prefer this to a prose claim because it is checkable against the public history.
- **Affected components and division of labour.** The adapters and harness scaffolding, the table and figure generators, the statistical estimators, and manuscript prose. We identify the estimators as the one component where generated code carries *analytical* rather than scaffolding logic, since that is what your Question 5 is really about.
- **Review and independent validation.** We do not offer author review as the safeguard. Each category carries a check that does not depend on the generated code being correct: estimators unit-tested against hand-computed values and closed-form properties; every *measured* table cell traced to an archived raw record through a committed generator, with the authored analytical tables named as outside that guarantee; adapters gated by a specification-derived oracle that imports no adapter and reads no timed native-driver output.
- **Extent of assistance in analysis and interpretation (your Question 5).** We answer this in the broader direction rather than the narrower one. The assistance was **not** confined to implementation: the assistant proposed candidate statistical procedures, among which the author selected — the paired permutation test and its Wilcoxon cross-check, the geometric-mean paired ratio and bootstrap interval, Cliff's delta, the equivalence test and its ±5% margin, the blocked interaction test — and drafted prose describing what they compute; the author wrote every interpretive claim. Every one is a named, published method whose applicability the author verified against performance-evaluation guidance; none is a generated or bespoke statistic. The author reviewed, accepted, and where necessary revised each choice and each interpretive claim, verified every cited reference against its source, and takes full responsibility.

  We deliberately do not present author independence as the control here, because it is not one. The controls are mechanical and checkable by a reader who discounts our review entirely: the estimators must reproduce hand-computed values and closed-form properties; every table cell must trace to an archived measurement; every admitted cell must satisfy an oracle derived without reference to the code under test. What those checks cannot establish is that the chosen analyses were the *best* available rather than merely defensible — we disclose that judgement as jointly reached and author-approved, and note it as a further reason the protocol asks for independent implementation review.

The manuscript-preparation declaration remains separately before the references, as Elsevier requires, and now cross-references Section 3.9. We also added a short AI-provenance note to the supplement, which had none and is distributed as a separate item.

## P0-2. "Representative access patterns"

Adopted. The Introduction and Section 3.3 now read **"five selected access patterns"**, each followed by an explicit statement that the five are chosen to stress distinct aspects of the access layer and are *not* a representative sample of Express/database workloads — the substance of your objection. We also swept the weaker subset uses ("a representative layer of each tier", "a representative subset") to "one layer of each tier" and "a selected subset".

We retained "representative-point instantiation" and "representative workload point" in the compliance table, where the word means a point in the measured matrix rather than a sample of a population. Auditing this exposed a defect: that caption quoted the protocol figure as licensing recommended stages "scoped to a representative workload point", but the figure contained no such phrase. The figure caption now states it, so the quotation is real.

## P0-3. "Controlled case study"

Adopted throughout, not only at the definitional sentence. Section 3 now opens with **"a controlled benchmarking experiment on one synthetic service, dataset, and environment"** and answers your Question 2 directly: we use *experiment* in the sense of the Wohlin and Kitchenham guidance already cited in that sentence, because treatments are assigned and executed automatically rather than observed in situ, factors are fixed by design, run order is randomized in blocks, and each cell is measured repeatedly — and because that design is what licenses the paired within-campaign analysis.

Since a half-measure would reproduce exactly the inconsistency you flagged on "representative", we swept all ~17 occurrences across the Introduction, Related Work, Study Design, Discussion, Conclusion, both abstracts, and the table captions, rephrasing compounds ("case-study ablation" → "in-experiment ablation"). The load-bearing "non-vendor-authored" claim is preserved.

## P0-4. Figure 1's stages and the six compliance levels

Adopted, and the problem was worse than the review could see. Auditing the mapping found:

1. **Figure 1 labelled its stages `(1)`–`(7)` with no M/R prefixes at all**, so the tokens the text uses were invisible in the figure.
2. **The tokens were never defined in the main text.** The only place the mapping appeared was a footnote to a supplement table.
3. **Three competing name sets** were in circulation: the figure said *Capacity identification* and *Demand & utilization*; the supplement footnote said *capacity characterization* and *operating-point separation*; the compliance table said *Capacity characterization*.
4. **The main text never cited the compliance table at all.**

All four are fixed. Figure 1's nodes are relabelled `(M1)`, `(M2)`, `(R3)`…`(R7)`; the tokens are defined once in the main text immediately after the figure; a bridging sentence in your suggested form states that M1 and M2 form one mandatory validity-core level and R3–R7 five claim-specific extensions, yielding the six-level scheme of Supplement Table S40, which the body now cites; and one canonical name set is used across the figure, both tables, and the machine-readable checklist. The compliance table's first column now names the stage each level requires, so the mapping is legible without the main text.

This answers your Question 6: the six levels are defined in the manuscript, and the supplement records coverage rather than establishing the taxonomy.

Two dangling statements in the supplement were corrected in passing: it asserted that the main text "names six protocol compliance levels" when it did not (now true), and it still called the deep fetch "the most consequential pattern", phrasing we had deliberately retired elsewhere (now "the widest-spread tested pattern").

## P1. Independent review — infrastructure completed, human review still pending

We agree this is the largest remaining scientific improvement, and we will not report it as done when it is not. Your Question 3 asked whether the packets had been distributed. **They had not**, and auditing them for this round showed that one of the three could not have been completed as shipped.

Specifically: the codebook claimed the packets let an independent replication estimate agreement, but the two shipped packets covered *treatment selection* and *adapter code* — neither re-codes the 63 external-audit judgements. There was no blank form for those judgements; the audit record had no rater dimension at all (`agreement_statistic` was `null` with no code path that could ever write it); and the `completed/` directory the packet README gates on did not exist.

That is now closed:

- **`notes/reviewer-packets/protocol-audit-blind.md`** — a new result-blind form covering exactly the 63 judgements (9 sources × 7 stages), with the codebook's codes and stage definitions, a locator and evidence field per cell, and a disagreement policy fixed *before* comparison: disagreements are reported, never reconciled away.
- **A rater-extensible audit record.** A second rater's codings attach under `studies[].additional_codings[<rater-id>]`; the author's `coding` block is never edited. We verified that all 63 primary judgements are unchanged after the migration.
- **A committed scorer**, `npm run audit:agreement`, reporting percent agreement and Cohen's kappa overall and per stage, plus every disagreeing cell. Its estimators live in the tested estimator module with eleven new unit tests (32/32 pass), including a hand-computed kappa and the degenerate cases where kappa is undefined and the function returns `null` rather than a misleading number. We verified the path end-to-end against a synthetic second rater, then discarded that data.
- With only the author's codings present the scorer reports `not_computable` and no statistic. An unperformed exercise cannot be silently counted as validation.
- The packets, register, and `completed/` are now listed in `MANIFEST.md` and `REPRODUCE.md`, where they were absent.

**Claim hardening.** Following your point that disclosure does not replace validation, we reduced the paper's dependence on the pending outcome rather than only restating it. Threats now states what the automated evidence and the result-blind self-audit *do* bound — adapters returning wrong or unequal results, reaching the wrong database state, issuing undeclared statement counts, or carrying the two avoidable timed-path operations we found and removed — and names the residual they cannot exclude: a correct, policy-conformant adapter that is uniformly slower than a differently written one. R7 would narrow that residual; it is not what establishes the validity of the admitted measurements. The Discussion now separates what is demonstrated (the protocol is executable, changed five interpretations here, and codes an external corpus reproducibly) from what is not (reusability by another person), and asks the reader to treat the contribution as a structured, testable proposal with one worked instantiation rather than a validated methodology.

R7 remains **unsatisfied** in Table S40 and in the checklist. All four register rows are `pending`.

## P2. Minor points

- **"Estimated saturating throughput."** Adopted at every ladder-maximum site: Introduction, Figure 1, the protocol-mapping and compliance tables, the estimands table, the scaling table, and the supplement. No unqualified use remains.
- Two invalid cross-references introduced while drafting the new Methods subsection were caught and fixed; all three documents build with zero undefined references.
- `TODO.md`, a historical planning log, carried open checkboxes for work that had in fact been completed and shipped (the concurrency sweep, CPU/RSS sampling, the CV tables, the pool-size sweep). It was misleading to an artifact reviewer and is now reconciled, with a new section listing what genuinely remains open before submission.

## Direct answers to your questions

1. **Why retain "representative access patterns"?** We have not. They are "five selected access patterns", with the scope statement made explicit in both places.
2. **What makes the design a "case study" rather than a controlled benchmarking experiment?** Nothing. It is a controlled benchmarking experiment; Section 3 now says so and gives the design properties that justify the term.
3. **Were the reviewer packets distributed, and if not, what prevents completing one?** They were not. Nothing prevented it except that one of the three could not have been completed as shipped — there was no coding form for the 63 judgements and no way to score a returned one. That is now fixed, and any one of the three can be completed independently of the others.
4. **Which exact models participated, and in which components?** Claude Opus 4.8 (1M context), Claude Fable 5, and Claude Opus 5 (1M context) — all Anthropic, via Claude Code. Not Codex; that attribution was an error and is removed. Components and per-model commit counts are in Section 3.9 and re-derivable from the git trailers.
5. **Did AI participate in statistical-method selection or scientific interpretation, or only code implementation?** Both, and we say so rather than claim the narrower position. The assistant contributed substantively to procedure selection and to drafting interpretation, not only to implementation. All procedures are named published methods, none generated; the author verified their applicability against the cited guidance, verified every reference against its source, revised where necessary, and takes full responsibility. Section 3.9 states this plainly and explains why the mechanical checks — not author independence — are what a sceptical reader should rely on.
6. **Can the six levels be defined in the main manuscript?** Yes; they now are, together with their mapping to the seven stages, and the supplement records coverage rather than establishing the scheme.

## Remaining boundaries

Two statements remain visible and unresolved: no second physical host, and no completed independent human review. We have made the second executable in a single sitting rather than merely promised, and we have narrowed what the paper claims so that neither missing activity is silently assumed.

Sincerely,

Mateusz Miotk
