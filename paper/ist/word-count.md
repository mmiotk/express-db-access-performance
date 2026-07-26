# Word-count declaration

Manuscript: *A Comparability Protocol for Benchmarking Relational Database Access
Layers in Express.js* (submission build `ist_main.tex`).

The official IST journal policy confirms a **15,000-word maximum for research papers**. The current author guidance supplied with this revision additionally assigns **200 words to each figure or table** and counts references and manuscript appendices. This declaration uses a deliberately conservative implementation of that rule.

| Component | Count |
|---|---:|
| Seven body sections (`texcount` sum, including section headings and caption text encountered in those files) | 9,644 |
| Structured abstract (`texcount` sum) | 227 |
| Remaining front matter and required declarations (title/keywords, CRediT, competing interest, data availability, funding, and AI-use disclosures) | 588 |
| Main-text tables and figures (7 × 200) | 1,400 |
| Rendered reference list (65 entries; conservative `pdftotext` count including the heading and page folios) | 2,000 |
| **Conservative IST submission equivalent** | **13,859** |

The controlling total is therefore **13,859 words**, leaving **1,141 words of headroom** under the 15,000-word limit. The structured abstract contains 222 prose words (227 under the `texcount` sum convention), below 300 words.

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

Count date: 26 July 2026. Any later prose or float change requires this declaration to be regenerated.
