# Word-count declaration

Manuscript: *A Comparability Protocol for Benchmarking Relational Database Access
Layers in Express.js*
(submission build `ist/ist_main.tex`).

Counted with `texcount` on the seven body sections plus the structured abstract.
The IST *Guide for Authors* sets the limit for a research paper at **15,000 words**, and
states that **"references and appendices are part of the submission and count against the
total number of words, and figures and tables count 200 words each."** This count applies
that rule exactly: the reference list is included and each of the eight main-text floats
counts 200 words. The paper has **no appendices** — all supplementary material is in the
separate `supplement.pdf`, which under Elsevier's policy is online supplementary material,
not an appendix, and is not part of the manuscript word count. The mandatory declaration
sections (CRediT, Declaration of competing interest, Funding, Data availability, and the
generative-AI declaration, ~300 words) are required metadata, not article content or
appendices, and are excluded per Elsevier convention.

| Component | Count |
|---|---|
| Body text (7 sections) | 9,819 |
| Structured abstract | 298 |
| Tables and figures in the main text (8 × 200) | 1,600 |
| Reference list (66 entries) | 2,069 |
| **Total (IST rule)** | **13,786** |

The total is **13,786 words**, leaving **1,214 words of headroom** under the 15,000-word Research Paper limit. The structured abstract is 298 words, below its 300-word limit. The separate online supplement contains 44 tables and four figures; it is supplementary material, not a manuscript appendix.

The count is reproducible with `texcount -brief` over the seven included body-section files and the extracted structured abstract. The rendered 66-entry reference list was counted conservatively from `pdftotext` output (including numbered entry labels and page folios). The eight main-text floats contribute 8 × 200 = 1,600 words. Required author declarations are submission metadata and are excluded.

Count date: 22 July 2026. Any later prose or float change requires this declaration to be regenerated.
