# Summary of Revisions

**Manuscript:** A Comparability Protocol for Benchmarking Relational Database Access Layers in Express.js
**Journal:** Information and Software Technology
**Revision date:** 26 July 2026

## Round 3 (26 July 2026 critical re-review)

- **Reproducibility defect repaired.** Corrections from round 2 had been applied to `paper/tables/*.tex` while the generators still emitted the old text, so the documented regeneration chain silently reverted eight tables — including the retracted instrument claim and retired terminology. The fixes are now in the generator sources; three authored tables were removed from the sync set; the chain is idempotent, and `scripts/release.sh --check` fails the release if regeneration changes anything.
- **Two false claims corrected.** A fourth "identical request stream" site survived in the Analysis subsection. And "the native implementation leads each of the ten engine--pattern comparisons" is contradicted by Table 4: on the MySQL insert the four fastest treatments span 1,766--1,816 req/s with overlapping intervals and the native driver ranks fourth. Both fixed; the second is now reported as a result.
- **Companion documents realigned** with the corrected Section 3.9 (trailer coverage, cell traceability, AI role in analysis) and with the current test count.
- Corrected the run-to-run CV claim (the 4.5% figure is the deep-fetch maximum; insert reaches 6.4%/13.6%), scoped the MySQL p99 range to policy-selected layers, fixed `MANIFEST.md` for the two floats moved to the supplement, and made the submission zip prune deleted members.

## Round 2 (26 July 2026 review)

No new benchmarking campaign; no reported number changed.

- **AI disclosure moved into Methods** (new Section 3.9) per Elsevier's June 2026 policy: tool, models, developer, affected components, the scaffolding-versus-analytical split, how generated code was reviewed, and what independently validates it. Provenance is recorded per commit via `Co-Authored-By` trailers, so the distribution is re-derivable from the public history. **The prior disclosure's attribution to "Codex, OpenAI" was found to be unsupported by any repository evidence and has been removed**; the assistant was Claude (Anthropic) throughout. The section also discloses that assistance extended to selecting the statistical procedures and to drafting interpretation, not implementation alone, and argues that the mechanical checks rather than author independence are what a sceptical reader should rely on. The manuscript-preparation declaration stays before the references and cross-references Section 3.9. An AI-provenance note was added to the supplement, which had none.
- **"Five representative access patterns" → "five selected access patterns"**, with an explicit statement in both places that the five stress distinct aspects of the access layer and are not a sample of a workload population. Weaker subset uses swept to "one layer of each tier" / "a selected subset".
- **"Controlled case study" → "controlled benchmarking experiment"** throughout (~17 sites, both abstracts, table captions), with the design properties that justify the term stated in Section 3.
- **Figure 1 bound to the six compliance levels.** Figure nodes relabelled `(M1)`–`(R7)`; the tokens defined once in the main text; a bridging sentence maps M1+M2 to the mandatory validity core and R3–R7 to five extensions, citing Supplement Table S40, which the body had never referenced. One canonical stage-name set now spans the figure, both tables, and the machine-readable checklist, replacing three competing sets. The compliance table's first column names the stage each level requires.
- **Independent-review packets made completable.** Added the missing result-blind form for the 63 external-audit judgements; restructured the audit record so a second rater's codings attach without editing the author's (all 63 primary judgements verified unchanged); added a committed agreement scorer (percent agreement, Cohen's kappa per stage, full disagreement list) with nine new unit tests; created `completed/`; registered the packets in `MANIFEST.md` and `REPRODUCE.md`. R7 remains **unsatisfied** and the scorer reports agreement as not computable while one rater is recorded.
- **Claims hardened against pending validation.** Threats now states what the automated evidence and the result-blind self-audit bound, and names the residual they cannot exclude; the Discussion separates what is demonstrated (the protocol is executable) from what is not (reusability by another person).
- **Editorial.** "Estimated saturating throughput" at every ladder-maximum site; two dangling supplement claims corrected; a caption quoting a phrase absent from Figure 1 reconciled; two invalid cross-references fixed; the stale `TODO.md` reconciled against shipped work.

## Semantic admission

- Added an expected-result oracle derived from the deterministic seed and fan-out specification, independent of all adapters and both DBMSs.
- Kept differential comparison as a separate equivalence layer and renamed the protocol stage accordingly.
- Added exact campaign-state and allocator preflight checks.
- Added a 662-row cross-engine seed-parity gate; it caught differing fan-out comment-author assignments hidden by equal counts, and the affected pilot was rejected before the campaign restarted from repetition 1.
- Corrected a MySQL reset defect discovered by the new oracle and remeasured all affected patterns.

## Treatment and implementation validity

- Renamed the case-study estimand “policy-selected documented configuration” and removed the behavioral developer persona.
- Made the selection policy substitutable at the protocol level.
- Preserved exact documentation responses, timestamps, hashes, conflict resolution, and alternatives.
- Added implementation-review provenance as recommended stage R7 and result-blind review packets.
- Marked independent human selection and adapter review as pending rather than claiming agreement.
- Recorded a result-blind author self-audit covering every adapter. It caught and removed per-insert Knex/MySQL warning I/O and an unused per-request MikroORM aggregation accessor; every affected pilot was preserved and rejected, the full admission chain was rerun, and measurement restarted from repetition 1. This is not counted as independent R7 evidence.

## RQ2 and new measurements

- Ran one coherent corrected-state primary campaign covering all 18 compatible treatment--backend pairs for all five access patterns: 90 complete cells x 25 runs, zero timed request failures, and pre/post state checks.
- Ran a second independently ordered same-host campaign on 7 portable layers x 2 stacks x 3 prioritized patterns: 42 complete cells x 25 runs, zero timed failures. Deep-fetch ranks reproduce exactly; MySQL insert reproduces only 3/7 ranks and is reported as unstable.
- Predeclared persistence criteria retain four material cross-stack reversals and classify all close/nonrecurring changes as exploratory.
- Defined RQ2 as backend-stack transfer within the tested same-host campaigns.
- Removed causal DBMS attribution and made close rank reversals exploratory.
- Retained the explicit limitation that the second campaign is same-host, not cross-host replication.

## Protocol contribution

- Narrowed novelty to a concrete domain-specific operational discipline built from established controls.
- Cited and distinguished CYNTHIA and retained the direct prior-art boundary.
- Added the 2023 Node-Bench comparison as a direct coverage precedent and a ninth source in the protocol audit.
- Added a seven-stage, nine-source retrospective protocol audit with 63 source-located judgments and a machine validator.
- Described that audit as a one-rater bounded applicability demonstration, not independent validation.
- Removed universal completeness and necessity language; each level now states the interpretation it licenses.

## Fresh secondary analyses

- Reran common-SQL (16 cells x 10), all-pattern capacity (720 points), matched-utilization (64 cells x 5), longer-tail (18 cells x 10 x 60 s), relaxed durability (18 cells x 5), wait-event, and canonical-constructor analyses with zero accepted request failures.
- Updated all numerical claims: selected deep-fetch spread 7.01x/5.12x; common-SQL 1.71x/2.03x; stable 50% p99 bands 2.3--4.9/1.9--5.5 ms.
- Reframed concurrent wait sums and durability changes as compound sensitivity evidence, not a DBMS floor or causal share.

## Reproducibility

- Reconciled the main paper with Supplement S31.
- Completed an isolated current-candidate reconstruction: 60/60 JSON hashes verified, and 35 table outputs plus four derived analysis JSON files regenerated byte-for-byte without starting either DBMS.
- Preserved and verified exact 42-file source archives for each accepted campaign, so later harness maintenance cannot overwrite the code provenance of completed measurements.
- Fixed the standalone write-admission cleanup to restore post and comment allocators even after failure; the corrected verifier passes all 18 adapter--engine admissions and leaves both campaign states exact.
- Named the five presentation-only differences in the historical 45/50 reconstruction.
- Separated author-run offline reconstruction, historical archive-isolated reconstruction, current measurement re-execution, and independent reproduction.
- Marked the Docker path as workflow reproduction because its durability and topology differ from the reference numerical path.
- Updated the manifest so every revised output maps to its exact data and generator.

## Presentation

- Replaced “strategy standardization” with “common-SQL raw-path sensitivity contrast.”
- Restricted matched-utilization conclusions to stable 50% and most 70% cells.
- Regenerated the MySQL insert distribution from corrected state.
- Standardized “deep fetch” and “single-row insert.”
- Consolidated repeated qualifications and moved exploratory interpretation out of the main argument.
