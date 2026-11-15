# Venue research (2026-07)

Candidate journals for the paper. MEiN points are the current **2024** Polish
ministerial list (source: Univ. of Szczecin library MNiSW index, per-year tables;
cross-checked where possible). Indexing / APC / scope from primary journal pages.

| Journal | **MEiN 2024** | Index / IF | APC | Fit | Acceptance realism |
|---|---:|---|---|---|---|
| **SoftwareX** | **200** | Scopus+SCIE, IF ~2.4 | ~$1,560 (gold OA) | ★ the **harness** as an Original Software Publication | High (software-descriptor format) |
| Information & Software Technology | **140** | Scopus+SCIE, IF ~4.3, Q1 | $0 subscription / $3,890 OA | empirical SE | Selective (Q1) |
| Empirical Software Engineering | **140** | Scopus+SCIE, IF 3.4 | $0 subscription | empirical, high novelty bar | Low for a benchmark |
| Journal of Systems and Software | **100** | Scopus+SCIE, IF 3.8, CiteScore 9.4 | $0 subscription / $3,670 OA | ★ explicit replication studies | Selective, slow |
| IEEE Access | **100** | Scopus+SCIE, IF 4.2 | $2,160 | "measurement techniques" | ★ High (sound-science), fast |
| Electronics (MDPI) | **100** | Scopus+SCIE, IF 2.9 | CHF 2,400 | CS & Engineering section | High/fast; MDPI caveat |
| Applied Sciences (MDPI) | **100** | Scopus+SCIE, IF 2.5 | CHF 2,400 | generic | High/fast; MDPI caveat |
| Software: Practice & Experience | **70** | Scopus+SCIE, IF 3.5, Q2 | $0 subscription / $4,880 OA | ★ "practice & experience with software" | Realistic |
| PeerJ Computer Science | **70** | Scopus+SCIE, IF ~2.5, Q2 | ~$1,395 | soundness-gated | High, fast (~5 wk) |
| Computing (Springer) | **70** | Scopus+SCIE, IF 3.6 | $0 subscription | Node.js precedent | Medium |
| e-Informatica SEJ | **40** | Scopus+WoS (ESCI), IF ~2.0 | **$0** | empirical | Highest (prior venue) |
| Future Internet (MDPI) | **40** | Scopus+WoS (ESCI), IF 4.6 | CHF 1,800 | ★ **best topical precedent** | High/fast; MDPI caveat |
| Array (Elsevier) | **40** | Scopus+WoS (ESCI), IF ~5.3 | $2,250 | SE + technical notes | Medium |

> ⚠️ **e-Informatica = 40, not 200.** Some tools show 200 — that is the **withdrawn
> July 2023 (Czarnek) list**; the binding 5 Jan 2024 wykaz reverted it to 40. There
> is no separate "2025" list (the 2024 komunikat covers 2024–2025). All 13 values
> above were independently double-verified (gov.pl PDF + OMEGA-PSIR bases at Poznań
> Tech / PW / UŁ / AMU + MOST Wiedzy).

## Free-to-author options (no APC)

"Open access" ≠ free: ComSIS charges €400, AMCS €1320, SoftwareX ~$1560. The genuinely
zero-cost routes:

**Diamond OA (free to publish AND open), all ~40 pts:**
- e-Informatica SEJ (40) — SE, CC-BY, prior venue.
- Computer Science, AGH (40) — broad CS, CC-BY 4.0, non-profit, Scopus. ISSN 2300-7036.
- Foundations of Computing and Decision Sciences (40) — Sciendo/Poznań, no APC, Scopus. ISSN 0867-6356.

**Subscription = free for the author (paywalled; self-archive a preprint for green OA):**
- Information & Software Technology (**140**), Empirical Software Engineering (**140**),
  Journal of Systems and Software (**100**), Software: Practice & Experience (70), Computing (70).

Best free + points: **IST (140)** or **JSS (100)** via subscription + arXiv preprint.
Free + open + continuity: e-Informatica or Computer Science AGH (40).

## Topical precedent (Crossref-verified)

- **Future Internet** 2024 — Salunke & Ouda, *A Performance Benchmark for the
  PostgreSQL and MySQL Databases* (10.3390/fi16100382) — closest analogue.
- **Computing** (Springer) 2014 — Chaniotis et al., *Is Node.js a viable option…*
  (10.1007/s00607-014-0394-9).
- **Procedia CS** 2025 — Prisma vs raw SQL (10.1016/j.procs.2025.09.061).
- Conferences: ACM SBSI 2024 (back-end frameworks), ISD/LNISO 2025 (Node.js backends).

## Decision (superseded 2026-08-10)

**Current target: Journal of Parallel and Distributed Computing (JPDC), Elsevier.**
Changed by the author on 10 August 2026. JPDC is not in the table below because it was
not among the candidates screened in July: it is not an empirical-SE venue, and the
scope question that raises is recorded in `notes/jpdc-author-biography.md` section 2.0
rather than resolved here. MEiN points, IF, and APC for JPDC have **not** been verified
against the official list, so do not quote a figure for it from this file.

The analysis below is the July screening and is kept as the record of what was
considered then.

## Decision (July 2026 screening)

**Two outputs from one body of work (maximises MEiN points):**
1. Harness → **SoftwareX** (200 pts, ~$1,560) — Original Software Publication; artifact
   is already reproducible and open-source, exactly their format.
2. Empirical study → **IEEE Access** (100 pts, fast, realistic, $2,160) *or*
   **JSS** (100 pts, $0 via subscription, higher bar) *or* **IST** (140 pts, $0, Q1-selective).

**Single paper:** SoftwareX (artifact emphasis) or IEEE Access (study emphasis).
**Zero-cost / continuity:** e-Informatica (40 pts, free — but low points).
**Safe fallback after a rejection:** Future Internet (40 pts, best precedent, fast).

Note: e-Informatica (the react-performance venue) is only 40 pts; SPE — the best
pure topical fit — is only 70. Confirm the final pick against the official gov.pl
XLSX for the exact ISSN.

## Decision (supersedes everything above) — 4 September 2026

**Current target: Journal of Systems and Software (JSS), Elsevier.**

Venue history, as reported by the author on 4 September 2026:

1. **Information and Software Technology — rejected.** The 10 August retarget recorded
   below as an author preference followed a rejection at IST. `paper/ist/` is kept and
   still builds.
2. **Journal of Parallel and Distributed Computing — rejected**, with an editorial
   transfer offer to **Array** (Elsevier). Array declined by the author: gold OA,
   APC ~$2,250, not covered for the University of Gdansk. The scope risk that led to
   this outcome was recorded in advance in `notes/jpdc-author-biography.md` section 2.0.
3. **JSS chosen.** Hybrid: the subscription route costs the author nothing, and the
   journal explicitly solicits replication and benchmark studies, which is the scope the
   manuscript was written for. MEiN 2024: 100. IF ~3.8, CiteScore 9.4.

**Open item [unverified]:** the 2026 Elsevier open-access programme under Wirtualna
Biblioteka Nauki launched 20 May 2026 with a MNiSW-funded pool of 1084 articles. Whether
JSS is in scope of that pool for a University of Gdansk affiliation is a question for the
UG library's local programme administrator, not something verified here. If it is, the
gold-OA route is free as well. Do not quote this as settled.

### JSS guide for authors, as used to build `paper/jss/` (retrieved 4 September 2026)

ScienceDirect blocks automated retrieval of both the aims-and-scope and the guide-for-authors
pages (HTTP 403, then a bot wall on a text-extraction proxy). The values below therefore come
from exact-phrase searches resolving against the official guide URL, not from a rendered read
of the page. **[unverified by direct read]** The author should confirm them once by hand.

| Item | JSS | Manuscript now | Status |
|---|---|---|---|
| Scope condition | "All articles should provide evidence to support their claims, e.g. through empirical studies, simulation, formal proofs or other types of validation" | 25-run randomized-block campaign + replication campaign + audit | fits |
| Named topic | "Methods and tools for empirical software engineering research" (best fit); secondarily "Metrics and evaluation of software development resources" | the comparability protocol *is* a method for empirical SE research | fits |
| Domain independence | "Submissions should contribute new knowledge for software engineering research and practice, **independently of specific application domains**" | the protocol is stack-independent; Express.js/PostgreSQL/MySQL is the instantiation, not the contribution | **the one scope risk: see below** |
| Replications, negative results | explicitly welcomed | the reduced same-host campaign is a rank-stability retest; several contrasts are reported as not isolating a mechanism | fits |
| Full-length paper | <36 single-column / <18 double-column pages (soft: longer allowed with a justification) | 16 double-column | fits, 2 pages of slack |
| Abstract | <=250 words | 250 | at the limit |
| Keywords | 1-7 | 6 | fits |
| Author biography | <=100 words per author | 98-word version drafted | fits |
| Highlights | required at submission | 5 bullets, each <=85 characters | fits |

The scope fit is materially better than JPDC's: the single-host boundary that JPDC's scope made
into a defect is, at JSS, an ordinary threat to validity. No re-angling of the framing sections is
needed, and none was done.

**The one scope risk, stated plainly.** JSS asks for knowledge that holds independently of a
specific application domain. A desk-rejecting editor could read this manuscript as a comparison of
nine Node.js libraries, which is domain-specific. The defence is already the paper's own structure:
the contribution is the protocol, and the Express.js campaign is one instantiation of it. That
reading has to be made explicit in the cover letter and it now is; it does not require changing the
manuscript, whose Introduction already frames the methodological gap as the problem taken up.

**JSS Open Science Initiative.** Authors indicate participation at submission; after acceptance the
manuscript goes to the JSS Open Science Board (chaired by Christoph Treude) for a review of
availability and usability that **does not affect acceptance**, and a successful review adds a
validation statement and inclusion in the JSS Open Science collection. **Opt in.** The artifact
(Zenodo concept DOI 10.5281/zenodo.21313858) already contains the study protocol, raw
per-repetition data, analysis and table generators, source code, and the audit codebook, which is
exactly the material the Board asks for. This is upside with no acceptance risk attached.

**Article type: regular paper.** Not *In Practice* (Practitioner Insights caps at four pages and
requires an industry first author; Applied Research Reports want an industrial setting, which this
is not). Not a *New Ideas and Trends Paper*, which is for emerging-area position work that need not
be fully validated: the opposite of this manuscript's claim to be fully measured.

**Correction to the earlier retrieval.** The aims-and-scope text used before the author supplied the
page (via LetPub) was stale: it described the journal as covering "software engineering and related
hardware-software-systems issues" and listed cloud/fog/edge among the topics. The current official
text says "all aspects of software engineering", drops the hardware framing, and adds the domain-
independence sentence, the empirical-methods topic, and the ethics/AI/sustainability topics. The
table above reflects the official text, supplied by the author on 4 September 2026.

### JSS guide for authors: compliance pass (guide text supplied by the author, 4 September 2026)

Checked against the full guide, not against search snippets. Everything below is the state of
`paper/jss/` after this pass.

| Requirement | JSS | State | |
|---|---|---|---|
| Length | <18 double-column pages (soft) | 16 | `make jss-pagecheck` |
| Abstract | <=250 words, no references | 250, none | `make -C paper/jss abstract-wordcount` |
| Keywords | 1-7, avoid multi-word keys joined by "and"/"of" | 6, none joined that way | ok |
| Highlights | 3-5 bullets, <=85 chars, separate editable file named `*highlights*` | 5 bullets, longest 71 | `make -C paper/jss highlights-check` |
| Numbered sections, 1.1 subsections | required | already | ok |
| CRediT statement | required | present | ok |
| Declaration of competing interest | required in text **and** via the declarations tool as a .doc/.docx upload | in text; **the Word upload is not generated here** | author action |
| Funding | recommended sentence when none | present verbatim | ok |
| Generative-AI declaration | new section immediately before the reference list | present, in that position | ok |
| Research data | **Option C: deposit in a repository, cite and link it** | Zenodo concept DOI cited in Data availability | ok |
| Data statement at submission | required | to be entered in the submission system | author action |
| Vitae | <=100 words, **editable format, not PDF** | 98-word version in `author-biography.md`; only .tex/.pdf are built | author action |
| Reference format | any consistent style at submission | `elsarticle-num` | ok |
| Double-column layout | permitted for LaTeX submissions | `review` single-column is used for the PDF, two-column only for the page probe | ok either way |
| Graphical abstract | encouraged, optional | none | optional |

**Author actions that cannot be done from this repository.** The competing-interest declaration must
come out of Elsevier's declarations tool as a Word file; the biography must be uploaded in an
editable format, and neither `pandoc` nor LibreOffice is installed here, so the 98-word text has to
be pasted into Word by hand; the data statement is entered in the submission form.

**Two decisions the guide opens up.**

1. **SSRN preprint.** JSS offers free preprint posting on SSRN at submission, public once the paper
   passes desk review, with no effect on the editorial outcome. Since the subscription route makes
   this paper paywalled, a preprint is the green-OA path. The author decides.
2. **MethodsX co-submission.** JSS explicitly supports co-submitting a methods paper to MethodsX
   alongside the regular manuscript, linked on ScienceDirect if both are accepted. The MethodsX
   draft is already written and was being held for the IST decision, which has now happened.
   **Caution: MethodsX carries its own APC**, quoted only after acceptance, so this is not a free
   addition and the University of Gdansk coverage question applies to it exactly as it did to Array.
