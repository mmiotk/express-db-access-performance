# Response to Reviewer — July 23, 2026 Review

Dear Editor and Reviewer,

Thank you for the detailed review and the recommendation of major revision. We treated the distinction between equivalence and task correctness as a substantive design issue, not a wording-only change. The revision adds an expected-result oracle derived independently from the deterministic seed, a state preflight, a corrected full campaign plus a separate same-host validation campaign for the three reviewer-prioritized patterns, a source-located audit of nine external benchmarks, and more precise reproduction-status labels. It also narrows the treatment, transfer, and novelty claims. No second physical host or independent human reproduction is claimed.

## 6.1 Equivalence versus absolute task correctness

We agree with the counterexample. Cross-implementation byte equality alone cannot show that a common result implements the intended task. The mandatory stage is now called **semantic admission**, and its evidence is separated into three layers:

1. `bench/verify-spec.mjs` derives expected read results by replaying the deterministic seed and fan-out fixture in memory. It does not query either DBMS, import an adapter, or use a native-driver response. It checks exact fields, values, order, graph membership, and aggregates; database-generated timestamps are checked for presence and canonical ISO-8601 representation. Fixed-seed random inputs, boundary and list cases, and all six fan-out fixtures yield 73,080 expected-result checks across the two engines.
2. Fixed and randomized differential tests establish finite mutual equivalence across implementations. The native result is described only as the differential comparator, never as the expected-result oracle.
3. Mutation checks validate the primary single-row insert's intended values, generated identifier, and exact row-count change for all nine compatible adapters per backend. For adapters implementing the secondary transactional method (five on PostgreSQL, four on MySQL), they additionally validate commit atomicity and rollback. The per-adapter scope is preserved in `write-admission.json`.

The manuscript explicitly says that these are finite conformance tests for the declared task and tested inputs, not proof of correctness for arbitrary inputs. Figure 1, Table 2, the checklist, Methods, Threats, and Supplement S38 use the same distinction.

This change exposed a real shared-state defect that differential equality had missed. After a MySQL rebuild, `AUTO_INCREMENT` could return to `MAX(id)+1` below the cleanup floor, so benchmark inserts could persist while every adapter continued to agree. The harness now installs a safe identifier sentinel, resets rows and the allocator to an exact next ID of 300001 between warm-up and measurement and after every write cell, and checks exact counts and allocator state before and after the campaign. Historical MySQL range-scan, aggregation, and insert cells are retained only as provenance; they are replaced in the revised analysis.

A subsequent seed audit also found that one advancing fan-out PRNG had generated different comment-author assignments for PostgreSQL and MySQL despite matching comment counts. The in-memory specification and seeder now materialize one fixture, reset generated comment identifiers deterministically, and load identical values into both engines. A dedicated pre/post campaign gate compares all 662 joined fixture rows after excluding only DBMS-generated timestamps (SHA-256 `402e0aebbbc99f6ca32f6e176182fbb4fe753fe273f2e79fb00d5b73a99fe5ca`). The affected pilot was rejected and preserved; every replacement campaign restarts from repetition 1.

## 6.2 Construct represented by the selected treatment

The GQM viewpoint is now the benchmark analyst comparing policy-defined configured treatments, not a developer persona. We renamed the estimand **policy-selected documented configuration** and removed claims such as “what a developer following the documentation obtains.” The manuscript repeatedly states that the policy is intentionally artificial and is not evidence of default, idiomatic, prevalent, expert-tuned, or production behavior.

The protocol does not privilege documentation-first selection. It requires a preregistered, reconstructable policy; a future study may substitute an expert-tuned, usage-frequency, vendor-recommended, or other declared policy without changing the remaining protocol stages. This abstraction is now foregrounded in Methods and the Conclusion.

For the case-study policy, the artifact preserves the exact official-page responses, capture timestamps, URLs, byte lengths, and SHA-256 hashes, plus a conflict rule and the Drizzle tie decision. Two result-blind human selection forms are shipped, but their status remains **pending**. We do not convert an unperformed human exercise into evidence. Consequently, the paper claims archival reproducibility of the rule and author assignment, not independently demonstrated human agreement.

## 6.3 Single-author adapter construction

We agree that semantic equivalence does not detect correct-but-needlessly-slow code. The revised protocol adds **implementation-review provenance** as recommended stage R7, covering policy conformance, avoidable allocation or conversion, engine branches, pooling, mapping, and movement of work into shared constructors. The artifact includes a result-blind per-adapter review form that requires proposed changes to be recorded before any affected rerun.

No maintainer or independent human has signed that form, so the current case study is marked R7-unsatisfied in the machine-readable checklist and compliance table. Methods and Internal Validity say directly that all adapters and assignments were produced by one author. The claim is narrowed accordingly from library-intrinsic performance to the measured configured implementations. Automated semantic, state, query-count, SQL/plan, pool, and canonicalization checks reduce but do not erase this threat.

The result-blind author self-audit nevertheless found two concrete timed-path defects before accepting a corrected campaign. First, Knex's PostgreSQL-style returning option was also passed on MySQL, producing one console warning per insert; the rejected pilot emitted 44,907 warnings in fewer than two repetitions. Second, MikroORM's aggregation method obtained and discarded an unused underlying Knex handle once per request. We removed the dialect-inappropriate logging path and the unused accessor, removed only dead imports/helpers elsewhere, reran the entire semantic-admission chain, rejected every affected pilot with its log/partial data/source manifest preserved, and restarted from repetition 1. `notes/adapter-self-audit.md` records per-adapter coverage, findings, and disposition. Because the implementer performed this audit, it is not counted as R7 evidence.

This is an intentionally explicit residual limitation. The revision does not label author self-review, AI assistance, or an empty form as independent validation.

## 6.4 Same-host evidence and RQ2

A second physical machine was outside this revision. We therefore added a complete,
independently ordered campaign on the same host and narrowed the estimand.

The accepted primary campaign contains 90 cells with exactly 25 runs each (2,250
observations), zero timed request failures, passing pre/post state gates, and a
42-file source manifest. A second campaign contains the seven portable layers on
both stacks for deep fetch, aggregation, and single-row insert: 42 cells x 25 runs
(1,050 observations), zero timed failures, a new deterministic block order, a
separate environment fingerprint, and a separate 42-file source manifest. One
pre-warm-up startup retry occurred in each campaign; both are recorded separately
and contributed no timed sample. The fail-closed runner rejects any request failure
or incomplete roster.

Supplement S46 compares campaigns. Deep-fetch ranks reproduce exactly on both
stacks (Spearman rho 1.00; maximum median drift 2.3%). Aggregation reproduces 5/7
PostgreSQL and 7/7 MySQL positions (rho 0.96 and 1.00). PostgreSQL insert reproduces
7/7 positions, but MySQL insert reproduces only 3/7 (rho 0.82), changes leader from
Drizzle to Knex, and reaches 13.6% median drift. We therefore promote a reversal
only when it recurs, both stack-specific gaps exceed 5%, and paired intervals
exclude equality in opposite directions in both campaigns. Four pairs qualify:
Prisma--Objection and Prisma--Sequelize on deep fetch, Prisma--Objection on
aggregation, and Prisma--MikroORM on insert. Other close rank changes are explicitly
exploratory.

RQ2 is defined as \textbf{backend-stack transfer within the tested campaigns}.
DBMS, supported adapter, lower-level driver, protocol, and defaults can change
together; ratios are not causal DBMS effects. The post-restart drift of up to 16%
and uncontrolled hypervisor neighbors, CPU steal, and frequency behavior remain
prominent threats. The second campaign reduces dependence on one overnight order
but is not cross-host replication.

## 6.5 Scientific status and validation of the protocol

The novelty claim is now: **a concrete, access-layer-specific discipline for establishing and reporting comparability**, integrating established controls. The paper no longer claims invention of correctness testing, differential equivalence, fair benchmarking, capacity analysis, coordinated-omission correction, or reproducibility. CYNTHIA is cited as direct cross-ORM differential-testing prior art. A renewed targeted search also added Pratama and Raharja (2023), which crosses five Node.js access products with eleven frameworks and three environments. We treat that as a direct coverage precedent while distinguishing its jointly varying framework--library--environment cells from a fixed access-layer estimand.

To evaluate the protocol as a protocol, Supplement S37 applies a fixed codebook to nine external published or vendor benchmarks. The machine-readable dataset contains 63 stage judgments, each with a source locator and paraphrased evidence; a validator checks completeness and allowed codes. The audit shows which interpretations each source can and cannot support under the proposed levels. It also shows that the stages are discriminating rather than automatically satisfied.

One author coded the audit. We therefore call it a **bounded applicability demonstration**, not independent validation or inter-rater reproducibility, and we report no kappa. The claim that the protocol “turns the vendor-benchmark genre into a controlled experiment” was replaced by the narrower “provides a concrete discipline for establishing and reporting comparability.” The checklist and blind rater packet allow a later independent replication.

The words “complete” and “individually necessary” remain removed. M1 and M2 are normative admission requirements for the protocol-defined estimand; R3–R7 license additional interpretations. Table 2 states exactly what each level permits. The case-study ablation shows consequence in this study, not universal necessity.

## 6.6 Reproduction-status discrepancy

The main paper, Supplement S31, `REPRODUCE.md`, and the historical log now distinguish four statuses:

- **current-candidate author-run isolated reconstruction (26 July 2026):** 60/60 JSON hashes verified; 35 table outputs and four derived analysis JSON files regenerated byte-for-byte without starting the DBMSs or rerunning measurements;
- **historical author-run archive-isolated reconstruction of v1.12.9:** 35/35 input hashes and 45/50 then-committed tables reproduced byte-for-byte;
- **current measurement re-execution:** the corrected-state same-host campaign added in this revision;
- **independent third-party reproduction:** not performed and not claimed.

The five historical 45/50 differences are named: `cv_all.tex` used the opposite engine-emission order; `ranks.tex` contained a manually added panel; `interaction.tex` and `txn_write.tex` had hand-refined captions; and `tail_regimes.tex` differed only in wrapping. None changed a numerical or statistical result.

Both accepted campaigns also ship exact archives of the 42 source, schema, configuration, and admission-evidence files named by their manifests. Fresh extraction verifies 42/42 members and the aggregate SHA-256 for each campaign, so later harness maintenance remains distinct from measurement-time provenance.

The Docker path is now labelled workflow reproduction. Although it pins the same engine versions by digest, its relaxed durability and container topology do not reproduce the headline default-durability insert condition. The exact numerical path is presented first.

## Fresh measurement results

- All headline and sensitivity tables were regenerated against the accepted primary data or fresh corrected-state secondary runs. The deep-fetch spread is 7.01x/5.12x; the common-SQL residual is 1.71x/2.03x.
- A fresh all-pattern concurrency sweep covers 720 points (18 compatible treatment--stack cells x five patterns x eight connection levels, three runs each). Median utilization at 50 connections is 98--100%; 85--95% matched-utilization cells remain secondary.
- Fresh matched-utilization runs contain 32 cells per stack x five repetitions and zero request failures. At nominal 50%, p99 is 2.3--4.9 ms on PostgreSQL and 1.9--5.5 ms on MySQL; denominator sensitivity places the target at 46.2--52.2% over repeated sweep curves.
- Ten fresh 60-second runs per deep-fetch cell give 12-versus-60-second p99 rank correlation 1.00/1.00, maximum median shift 5.6%/3.8%, and maximum p99 CV 7.3%/3.2%. The paper no longer says every value barely moves.
- The canonical-constructor microbenchmark uses 30 x 50,000 calls. The largest constructor is 17.57 microseconds for the 20-row range (0.146% of the fastest HTTP p50); the deep-fetch forms are 9.35--9.36 microseconds (0.072%).
- The relaxed-durability sensitivity was rerun for all 18 compatible cells (five repetitions). The MySQL wait-event experiment now rejects failed writes and labels summed concurrent waits as an aggregate ratio that may exceed 100%, not a causal wall-time share.

## Minor, statistical, and presentation points

- “Strategy standardization” is replaced by **common-SQL raw-path sensitivity contrast**. The text lists SQL, API level, protocol, preparation, round trips, and mapping as jointly changing components.
- The sample is called a broad product cross-section, not a balanced taxonomy.
- Abstract and Conclusion state that handwritten native SQL versus relation APIs is a practical configured-treatment comparison, not a library-intrinsic overhead experiment.
- The matched-utilization headline is restricted to stable 50% and most 70% targets. The 85–95% cells are near-saturation sensitivity evidence.
- MySQL insert conclusions and Figure S1 are regenerated from corrected state; the replicate distribution is foregrounded rather than summarized only by a median and CV.
- Differences of approximately 1 ms at the p99 resolution are treated as practically unresolved.
- The primary mutation is consistently a **single-row insert**. The six-statement transaction remains exploratory and subset-specific, not evidence about writes generally.
- “Deep fetch” is used for the one tested topology.
- Repeated qualifications were consolidated: definitions and estimand limits are established in Methods, empirical consequences in Results, and transfer limits in Threats.
- CPU, cluster, transactional-write, and detailed sensitivity material remains in the supplement rather than carrying the main argument.
- `INDEP=1` is now defined exactly: adapter–engine blocks are randomized per replicate; each block starts a fresh application process for the read endpoints, which run sequentially; the write uses another fresh process after the declared state rebuild (PostgreSQL template restore; disclosed MySQL in-place rebuild). No process crosses an adapter, engine, or replicate boundary. Teardown waits for tracked handler promises before closing the pool and then awaits process exit; database buffers and the host are not reset.

## Direct answers to the questions

1. **Independent expected result for reads?** Yes. The seed-specification oracle derives expected results without a DBMS or adapter. Native-driver output is used only in the separate differential layer.
2. **What does `INDEP=1` isolate?** It randomizes blocks and restarts application processes as described above; it does not restart the DBMS or host between cells.
3. **Independent adapter review?** No independent human sign-off is claimed. R7 is marked unsatisfied, the limitation is explicit, and a result-blind audit packet is provided.
4. **Can two readers reproduce the selection?** The frozen evidence and rule make this testable, but two independent human decisions have not yet been collected; the paper does not report agreement.
5. **Which five tables differed historically?** `cv_all.tex`, `ranks.tex`, `interaction.tex`, `txn_write.tex`, and `tail_regimes.tex`, for the presentation-only reasons listed above.
6. **Why was the older 45/50 result previously overstated?** The earlier wording collapsed an author-run reconstruction, an older release, and current measurement reproduction. Those statuses are now separated everywhere.
7. **Whole-campaign RQ2 sensitivity?** The revision replaces the contaminated historical primary cells with a complete corrected-state 25-repetition campaign, then adds a separate 25-repetition same-host validation campaign for the seven portable layers and the deep-fetch, aggregation, and insert patterns. The comparison is descriptive across campaigns because dates are not paired; no cross-host transfer is inferred.
8. **Why are stages mandatory or recommended?** M1 and M2 define admission to the protocol comparison: a declared task result and stable configured treatment. R3–R7 are recommended extensions whose omission removes the corresponding licensed interpretation. This is a normative protocol boundary, not an empirically proven universal necessity.
9. **Does the contribution survive another treatment policy?** Yes. The protocol requires preregistration and reconstruction of the policy but does not prescribe documentation-first selection. The case study is one instantiation.

## Remaining boundaries

The revision deliberately leaves two status statements visible: no second physical host was run, and no independent human adapter/treatment audit or third-party reproduction has occurred. The empirical claims are narrowed so neither missing activity is silently assumed. The artifact makes both follow-up exercises executable without exposing future reviewers to benchmark rankings before their decisions.

Sincerely,

Mateusz Miotk
