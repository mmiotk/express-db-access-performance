Gdańsk, Poland, 19 July 2026

Dear Editors,

Please find enclosed the revised version of my manuscript, "A Reproducible Benchmark of Relational Database Access-Layer Performance in Express.js: A Configuration-Specific Comparison on PostgreSQL and MySQL" (Research Paper), for *Information and Software Technology*, together with a point-by-point Response to Reviewers and a Summary of Revisions.

I am grateful for the reviewer's thorough, multi-part reading. This revision addresses five successive sets of comments — on methodology and the scope of claims, on the CPU and statistical reporting, on the conclusions and language, on presentation, and on the paper's length. No measurement changed; the revision is one of framing, scoping, and length. In brief:

- The estimand is renamed to "documentation-selected implementation-and-strategy," the three claim levels (the primary comparison, the same-SQL raw-path bounding control, and the individually non-identified mechanisms) are separated, and the operating conditions together with the terms "capacity" and "overload" are scoped to the deep-fetch sweep where a throughput knee was actually measured.
- The equal-CPU experiment is demoted to an exploratory sensitivity check with corrected wording; the bootstrap intervals are stated to capture within-campaign variability rather than cross-machine generalization; and the raw MySQL-insert distributions are brought into the Results.
- "Access-layer overhead" wording is limited where it implied an isolated measurement, the practical recommendation is softened to benchmarking the relation-heavy hot path for the specific application, and every result is labelled configuration-specific.
- Following the reviewer's guidance I did not split the paper; instead I condensed the main text by about 24% (to 43 pages / 12,216 words, well under the IST 15,000-word limit) so the central message is not lost among the controls and sensitivity analyses, moving the detail — not deleting it — to the online supplement. A pre-submission consistency sweep confirmed that the pinned versions, the DOI and repository link, and every headline number are internally consistent.

The full point-by-point reply, each with a quotation of the revised text, is in the accompanying Response to Reviewers. The complete replication package remains public on GitHub and is permanently archived on Zenodo (DOI: 10.5281/zenodo.21472649); the numbered online supplement accompanies the manuscript.

The work is original, has not been published previously, and is not under consideration elsewhere. I declare no competing interests and received no funding for this research; a declaration of generative-AI use in manuscript preparation is included in the manuscript in accordance with Elsevier policy.

I look forward to your editorial decision.

Sincerely,

Mateusz Miotk
Faculty of Mathematics, Physics and Informatics, University of Gdańsk, Poland
mateusz.miotk@ug.edu.pl (corresponding author)
