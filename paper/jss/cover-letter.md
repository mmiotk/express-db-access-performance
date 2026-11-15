Gdańsk, Poland, 4 September 2026

Dear Editors,

Please find enclosed the manuscript, "A Comparability Protocol for Benchmarking Relational Database Access Layers in Express.js," submitted as a full-length paper to the Journal of Systems and Software.

**Fit to the journal.** The manuscript is an empirical software-engineering study, and it addresses the journal's requirement that articles provide evidence for their claims through empirical study. Its subject falls under "methods and tools for empirical software engineering research": the contribution is a protocol for deciding when a performance comparison between competing implementations is valid, and what its measurements license. I note the journal's requirement that a submission contribute knowledge independently of a specific application domain, because it bears on how this paper should be read. The protocol is stated in terms of estimands, equivalence checks, and operating points, none of which is tied to Node.js or to relational databases; the Express.js service over PostgreSQL and MySQL is one instantiation, included because a protocol asserted without being exercised is untested advice. The paper accordingly claims no ranking of the libraries it measures. The measured system is single-host, and that boundary is stated in the article as a threat to validity rather than left implicit.

**Contribution.** The paper proposes an executable protocol for deciding when two configured implementations are comparable for a stated estimand, and what their measurements license. It requires task-derived read checks, cross-implementation differential equivalence, post-write state validation, a predeclared configuration-selection policy, and separately located capacity and latency operating points. The protocol is exercised in one instantiation: nine policy-selected configurations and two tuned native references, across two engines and five access patterns, in a 25-run randomized-block campaign, with a reduced second campaign on the same host testing rank stability, and a single-rater audit applying the protocol's codebook to nine external benchmarks.

**What the results do and do not establish.** The widest measured spread is a deep fetch at 7.01x on PostgreSQL and 5.12x on MySQL; forcing the same SQL through raw facilities leaves 1.71x and 2.03x, which is a compound contrast and isolates no single mechanism. Four cross-stack rank reversals recur in both campaigns, all involving the one treatment whose MySQL driver differs, and the experiment does not identify the database engine as the cause. The protocol is offered as a candidate with one worked instantiation, not as a validated methodology. The paper supports no universal ranking of the libraries it measures and no estimate of their intrinsic overhead.

**Residual limitations, stated in the article.** All adapters and treatment assignments are single-author; both campaigns run on the same virtualized host; the external audit has one rater, so it demonstrates bounded application of the protocol rather than inter-rater reproducibility. Result-blind review packets ship with the artifact, but no unperformed review is counted as evidence: the recommended stage is reported as unsatisfied in both the compliance table and the machine-readable checklist, and the agreement scorer returns "not computable" while one rater is recorded.

**JSS Open Science Initiative.** I indicate participation. The material listed below is already public and versioned, and includes the study protocol, raw data, analysis and table generators, source code, and the audit codebook. Nothing is withheld under an NDA or any other restriction.

**Reproducibility.** The artifact contains pinned dependencies, immutable documentation snapshots and hashes, exact source archives for both accepted campaigns, the seed oracle, the campaign-state validator, raw per-repetition measurements, a machine-readable protocol checklist, the external-audit dataset, and generators mapping every reported table and figure to its inputs. It is archived at Zenodo, concept DOI 10.5281/zenodo.21313858, which also carries an immutable per-version DOI. Author-run isolated reconstruction regenerates the reported tables byte-for-byte from archived data without starting either database; independent third-party reproduction has not occurred and is not claimed.

**Formatting.** The manuscript uses the Elsevier `elsarticle` class with numbered references, is 16 double-column pages including the reference list, within the journal's 18-page guidance for a full-length paper, and has a 250-word abstract. `supplement.pdf` is submitted as online supplementary material rather than as an embedded appendix.

[CONFIRM BEFORE SENDING: the declaration in the next paragraph is yours to make. The manuscript was previously submitted to Information and Software Technology and to the Journal of Parallel and Distributed Computing, and was rejected by both; JPDC offered a transfer to Array, which was declined. Check that no submission remains formally open before sending, and decide whether to disclose the prior submission history to the editors. Delete this bracket after checking.]

The work is original, has not been published previously, and is not under consideration elsewhere. I declare no competing interests and received no funding. The manuscript includes declarations covering generative-AI assistance in writing and in research software; I accept responsibility for all content and results.

Sincerely,

Mateusz Miotk
Faculty of Mathematics, Physics and Informatics, University of Gdańsk, Poland
mateusz.miotk@ug.edu.pl
