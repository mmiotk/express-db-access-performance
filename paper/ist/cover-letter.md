Gdańsk, Poland, 21 July 2026

Dear Editors,

Please find enclosed the revised version of my manuscript, "A Comparability Protocol for Benchmarking Relational Database Access Layers in Express.js" (Research Paper), for *Information and Software Technology*, together with a point-by-point Response to Reviewers and a Summary of Revisions.

I am grateful for the reviewer's exceptionally thorough reading and for the recommendation of major revision. The central concern was precise: the same-SQL experiment was over-claimed as *bounding* the contribution of query strategy versus library machinery — a step that does not follow without assumptions about interaction effects — and this claim was one of the three advertised pillars of the protocol. This revision corrects exactly that, together with the full set of Essential, strongly-recommended, and optional items:

- **The same-SQL experiment is now a standardized diagnostic contrast, not a bound.** Every "bound" applied to the same-SQL result was reworded to a "standardized (same-SQL) contrast"; the manuscript states plainly that, because raw mode changes several mechanisms at once and may interact differently with each library, the residual is a diagnostic contrast and *no ordering theorem holds without assumptions about interaction effects*. The "Strategy attribution" pillar now reads "a diagnostic contrast, not an attribution."
- **Write correctness is strengthened to validate database state.** A new harness check (`bench/verify-writes.mjs`) confirms, through an independent native driver, the exact field values, generated identifiers, row-count changes, and transactional rollback of every mutating pattern — the correctness oracle now validates state, not merely an HTTP 2xx.
- **The protocol is formalized as a reusable procedure.** Study Design specifies it normatively and carries a compact formal box separating the mandatory stages (correctness oracle; treatment-definition rule, with an explicit tie-breaker) from the recommended ones, with output-interpretation and applicability rules stated explicitly.

Beyond these, the operating-point claims are aligned with the experiments (a per-pattern capacity sweep now covers all five patterns; the utilization and equal-CPU checks are labelled deep-fetch-only), the "isolate the access layer as the only variable" claim is replaced by the *configured implementation-and-strategy* treatment, the methodological novelty is framed as a domain-specific synthesis of established benchmarking principles rather than an invention of them, and the reproducibility checklist (a byte-identical Zenodo-to-git-tag match, environment capture, an explicit dual license, and independently tested analytical code) is verified. No primary measurement changed; the three supplementary measurements added (write-state validation, a co-primary deep-fetch regime, and a per-pattern capacity sweep) leave the primary matrix untouched.

The manuscript is **14,997 words** under the IST counting rule (references and appendices counted, each main-text float 200 words), within the 15,000-word Research Paper limit, with a five-part structured abstract of ~292 words. The full point-by-point reply, each quoting the revised text, is in the accompanying Response to Reviewers, and a Summary of Revisions accompanies it. The complete replication package remains public on GitHub and is permanently archived on Zenodo (DOI: 10.5281/zenodo.21486707); the numbered online supplement accompanies the manuscript.

The work is original, has not been published previously, and is not under consideration elsewhere. I declare no competing interests and received no funding for this research. A declaration of generative-AI use in the writing process, and a separate statement on AI-assisted research software (with its independent tests), are included in the manuscript in accordance with Elsevier policy.

I look forward to your editorial decision.

Sincerely,

Mateusz Miotk
Faculty of Mathematics, Physics and Informatics, University of Gdańsk, Poland
mateusz.miotk@ug.edu.pl (corresponding author)
