# Word-count declaration

Manuscript: *A Comparability Protocol for Benchmarking Relational Database Access
Layers in Express.js* (submission build `ist_main.tex`).

The journal's Guide for Authors states a **15,000-word maximum for research papers**, that **references and appendixes count against the total**, and that **figures and tables count 200 words each**. This declaration uses a deliberately conservative implementation of that rule.

| Component | Count |
|---|---:|
| Seven body sections (`texcount` sum, including section headings and caption text encountered in those files) | 11865 |
| Structured abstract (`texcount` sum) | 294 |
| Remaining front matter and required declarations (title/keywords, CRediT, competing interest, data availability, funding, and AI-use disclosures) | 443 |
| Main-text tables and figures (2 × 200) | 400 |
| Rendered reference list (65 entries after removing 12 uncited ones; `pdftotext` count from the first entry to the end, form feeds stripped) | 1,990 |
| **Conservative IST submission equivalent** | **14,992** |

The controlling total is therefore **14,992 words**, leaving **8 words of headroom** under the 15,000-word limit. The structured abstract contains 294 words under the `texcount` sum convention, below the 300-word limit.

The decomposition is reproducible in four commands, so a reader need not take the total on trust: `texcount -1 -sum -q paper/sections/*.tex` gives the body; `texcount -1 -sum -q paper/ist/ist_main.tex` gives the front matter, abstract and declarations together, from which the abstract is subtracted to avoid counting it twice; the float allowance is 2 x 200; and the reference list is counted from the built PDF with `pdftotext ... | tr -d '\f' | awk '/^References$/{f=1;next} f' | wc -w`.

The body grew by 521 words against the previous declaration. The additions are the new Study Design subsection documenting AI-assisted research tooling, which current publisher policy requires in the Methods section; a stated matched-utilization rank-inversion result; the driver-substitution caveat on the RQ2 reversals; and explicit limits on the external-audit codebook. Two offsetting reductions were made. First, prose was condensed and one redundancy removed: the residual left open by the unsatisfied implementation-review stage is now argued once, in Threats, with cross-references elsewhere. Second, two main-text floats moved to the online supplement --- the estimand table, which the body had never cited and now cites as S47, and the insert-dispersion figure, which the supplement already carried --- and removing a duplicated figure. The main text now carries two floats, Figure~1 and Table~1, so the float allowance is 400 words.

Every `tabular` in the body now sits inside a numbered, captioned float, so the float allowance cannot be disputed: an earlier unnumbered tier schematic was folded into prose for exactly that reason.

**The remaining headroom is 8 words.** Any further addition requires an offsetting cut, and this declaration must be regenerated with it.

This total is intentionally stricter than a research-content-only count. It includes all required declaration text even though such text is commonly treated as submission metadata. It also retains caption words already encountered by `texcount` and then assigns the full 200-word allowance to every rendered float, so it does not undercount captions. The paper has no manuscript appendices. The separately submitted `supplement.pdf` is online supplementary material, not an appendix embedded in the research paper.

Reproduction commands:

```sh
cd paper/ist
texcount -sum -brief ../sections/introduction.tex ../sections/related_work.tex ../sections/methodology.tex ../sections/results.tex ../sections/discussion.tex ../sections/threats.tex ../sections/conclusion.tex
sed -n "43,68p" ist_main.tex | texcount -sum -brief -
texcount -inc -sum ist_main.tex
rg -c "^\\bibitem" ist_main.bbl
rg -F "\\@writefile{lot}" ist_main.aux
rg -F "\\@writefile{lof}" ist_main.aux
pdftotext ist_main.pdf - | sed -n "/^References$/,$p" | wc -w
```

Count date: 1 August 2026, at the v1.13.18 release commit. Any later prose or float change requires this declaration to be regenerated.
