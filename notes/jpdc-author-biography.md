# JPDC — author biography, guide-for-authors delta, submission gate

Target venue changed to *Journal of Parallel and Distributed Computing* (Elsevier).
This file holds (1) the author-biography draft, (2) the delta against the JPDC guide for
authors, (3) the submission-gate verdict, (4) open questions, (5) corrections made to the
first version of this report, and (6) the log of the fix pass.

Status tags per CLAUDE.md §7. The biography in §1 has **not** entered `paper/`; the fixes
in §6 have, and are listed there file by file.

Last revised 10 August 2026, after the fix pass in §6.

---

## 1. Author biography

Written from verified public records, not from placeholders. Sources and what each one
supports are in §1c. The degree was the one open item and it is now closed: the author
confirmed on 10 August 2026 that he holds a master's degree, which is what both drafts
say.

### 1a. Long form (123 words)

> **Mateusz Miotk** is an assistant in the Division of Combinatorial Optimisation,
> Institute of Informatics, Faculty of Mathematics, Physics and Informatics, University
> of Gdansk, Poland, where he holds an M.Sc. His earlier work is in structural and
> algorithmic graph theory: disjoint dominating and 2-dominating sets, graphs with equal
> domination and covering numbers, bipartization, and spanning trees with disjoint
> dominating sets, published in Discrete Optimization, the Journal of Combinatorial
> Optimization, Graphs and Combinatorics, and Discussiones Mathematicae Graph Theory,
> and more recently on constructing certified dominating sets in social networks. His
> current research applies the same concern with exact, checkable statements to the
> empirical performance measurement of server-side software: benchmark comparability,
> measurement validity, and reproducible experimental protocols for database access
> layers in Node.js services. ORCID: 0000-0003-2768-7861.

### 1b. Short form (52 words)

> **Mateusz Miotk** is an assistant in the Division of Combinatorial Optimisation,
> Institute of Informatics, University of Gdansk, Poland. He has published on domination
> and related problems in structural and algorithmic graph theory, and works now on
> empirical performance measurement of server-side software: benchmark comparability,
> measurement validity, and reproducible experimental protocols. ORCID:
> 0000-0003-2768-7861.

Use "Gdansk" or "Gdańsk" to match whatever the submission system accepts; the manuscript
uses the diacritic.

### 1c. Verification status

| Element | Status |
|---|---|
| Position "asystent" (assistant), Division of Combinatorial Optimisation, Institute of Informatics, Faculty of Mathematics, Physics and Informatics | [verified] — University of Gdansk knowledge base, profile `UOG3b27ab...`, retrieved 10 August 2026; the same fields appear on the UG staff page and ResearchGate |
| Degree "mgr" (M.Sc.), no doctorate | [verified] — confirmed by the author on 10 August 2026, and independently consistent with the UG knowledge base, the UG staff page, and ResearchGate |
| ORCID 0000-0003-2768-7861 | [verified] — stated on the UG knowledge-base profile itself, and matches `CITATION.cff`. This is now an external confirmation, not just a repository record |
| Graph-theory publication list | [verified] — DBLP, retrieved 10 August 2026: Discret. Optim. 35 (2020) 100553; J. Comb. Optim. 39 (2020) 55-71; Graphs Comb. 35 (2019) 1169-1177; Discuss. Math. Graph Theory 42 (2022) 299-308; IEEE Access 13 (2025) 17495-17505 (certified dominating sets, with Raczek) |
| Name spelling "Miotk" | [verified] — consistent across DBLP, UG, and the repository |
| Degree year | [unverified] — not stated on any source retrieved; both drafts are written so that no year is needed |
| The characterization of current research | [inferred] — from this manuscript and the publication record, not from a CV statement |

Note: **the JPDC guide for authors as supplied contains no "author biography" section.**
Elsevier collects biographies for some journals through the submission system rather than
the guide. Have this ready, but check Editorial Manager before adding it to the
manuscript file.

Prompt-injection note per CLAUDE.md §8: the fetched pages were read as data. Nothing in
them was treated as an instruction, and nothing resembling one appeared.

---

## 2. Delta against the JPDC guide for authors

### 2.0 Scope — the one thing worth deciding before anything else

[inferred, and the reason I am raising it first] JPDC's stated aims are the theory,
design, evaluation, and use of *parallel and/or distributed* computing systems. This
manuscript measures nine database-access layers of a single-host Express.js service
against two DBMSs; the campaigns share one host by design and this is stated as a
limitation. The nearest in-scope headings are "performance analysis of parallel
applications" and "data-intensive platforms and applications", but the study has no
parallel algorithm, no distributed system, and no multi-node deployment. This is a
real desk-reject risk at the editor-screening stage, larger than any formatting item
below. Two honest options: (a) reframe the framing sections around concurrency and
saturation behavior of a data-intensive server, i.e. the load-generation, matched-
utilization, and operating-point machinery, which *is* the parallel-systems-adjacent
part of the work; or (b) reconsider the venue. This is your call, not mine.

### 2.1 What already complies

Line references are to `paper/jpdc/jpdc_main.tex`, which is now the JPDC source.

| Requirement | Current state |
|---|---|
| Keywords 1–7 | 6 keywords (`jpdc_main.tex:71-74`) [verified] |
| Highlights 3–5 bullets, ≤ 85 characters | 5 bullets, longest 71 characters [verified, measured per bullet]; now also at `paper/jpdc/highlights.tex` |
| Reference style: numbered `[n]`, cited in order of appearance | `elsarticle-num` (`jpdc_main.tex:133`) [verified] |
| Journal names abbreviated per LTWA | all 17 `journal =` fields already abbreviated (`Inf. Softw. Technol.`, `Proc. VLDB Endow.`, …); `Future Internet` and `Computing` are correct unabbreviated [verified] |
| LaTeX, editable sources, Elsevier template | `elsarticle`, template files unmodified |
| CRediT statement | present (`jpdc_main.tex:89`) |
| Competing interests, funding, GenAI declaration | present in the manuscript (the separate Word upload is a distinct requirement, item 6 below) |
| Research data Option C (deposit + cite + link) | Zenodo DOI 10.5281/zenodo.21313858, cited as `miotk2026artifact` |
| Data availability statement | present; the truth-gate now also guards `make jpdc-package` |
| Page limit, 16 double-column pages | exactly 16 [verified, item 2 below] |
| SI units, editable tables and math, captions | unchanged from the IST build |

### 2.2 What must change

1. **Build directory — done.** `paper/jpdc/` now exists: `jpdc_main.tex` (the IST
   source with `\journal{}` retargeted, body identical) and a Makefile with `pdf` and
   `pagecheck`. Root targets `make jpdc` and `make jpdc-pagecheck` added. `paper/ist/`
   is untouched and still builds. What is still missing from the directory is listed
   in B6.
2. **Page limit — measured, and there is no margin.** JPDC Regular Paper: 16
   double-column pages. `make jpdc-pagecheck` builds the `5p` two-column layout and
   reports the count. Result on 10 August 2026: **16 pages, references included,
   0 undefined citations** [verified]. The 43-page figure from the `review` build is
   single-column double-spaced and says nothing about this limit. The paper fits
   exactly, so any addition now costs a deletion in the strict sense: a page over is
   a desk-return. Note this interacts with B8: cutting the abstract to 250 words frees
   no body space, because the abstract sits in the front matter either way.
3. **Wide table in two columns — done.** The five per-pattern throughput/p99 tables
   were `table` with `adjustbox{max width=\textwidth}`. In a two-column layout
   `\textwidth` is the full page, so the box overran its column by 202 pt. Fixed in
   the generator `experiments/scripts/ci-tables.mjs` (`table` → `table*`, `[htbp]` →
   `[tp]`, since double-column floats may only take `t`/`p`), not by hand-editing
   `paper/tables/*.tex`, and the five tables were regenerated from
   `current-primary.json`. The diff is 2 lines per table, float environment only, no
   number changed [verified: `git diff --numstat paper/tables`]. `table*` degrades to
   `table` in the one-column IST and generic builds, both of which still compile
   clean. Remaining overfulls are 2.2 pt and 0.8 pt, i.e. cosmetic.
4. **Cover letter — done.** `paper/jpdc/cover-letter.md` written for this venue. It
   addresses the scope question to the editors directly instead of hiding it, and carries
   one `[CONFIRM BEFORE SENDING]` marker over the "not under consideration elsewhere"
   declaration, which is true only once the IST submission is withdrawn.
5. **Abstract — done at 250 words (§6.1). Framing — still open.** Both highlights and
   abstract sell an empirical-software-engineering methodology contribution. If you take
   option (a) in §2.0, both need re-angling toward saturation and utilization behavior,
   and there is no page budget for growth.
6. **Declaration of competing interests as a separate `.doc/.docx` upload.** JPDC
   requires the declarations-tool Word document at the "attach/upload files" step,
   in addition to the in-manuscript statement. This is a submission-system artifact,
   not a repository one.
7. **SSRN preprint choice.** JPDC offers free SSRN preprint posting at submission.
   The venue notes in `notes/venue.md` assume an arXiv green-OA route; decide which,
   and keep the Data Availability statement consistent with whatever is posted.
8. **`notes/venue.md` and `notes/ist-style.md`.** Neither mentions JPDC. Once the
   venue decision is settled, both need a row/section, and `DECISIONS.md` needs the
   venue change recorded.

### 2.3 Not applicable

SAGER sex- and gender-based analysis: the study has no human, animal, or
eukaryotic-cell subjects, so there is nothing to report or to declare as a limitation.
Also not applicable: the jurisdictional guidance on maps (no maps), video and
animation, and the color-vision guidance beyond what the existing figures already
satisfy.

---

## 3. Submission gate — verdict: three blockers left, all needing you

Re-run 10 August 2026 after the fix pass described in §6. Five of the eight blockers are
closed. What remains cannot be closed by me: two need permissions I do not have, one is a
judgement about the paper.

### Still open

| # | Item | Why it is still open |
|---|---|---|
| B1 | `make release-check` fails: the regeneration chain cannot run because `experiments/node_modules` is empty (`table:altloading` and `table:poolsize` need `autocannon`). Everything else in the gate passes. | Needs `npm ci` in `experiments/`; installing packages requires your approval. |
| B2 | The tree has uncommitted work: the `table*` fix, the abstract, the audit locators, `release.sh`, the new `paper/jpdc/`. The gate's drift check compares regenerated output against `git diff`, so it cannot pass until this is committed and a release cut. | Committing and tagging require your say-so. Cutting the release also clears B3, since `refresh_counts` now works (§6.3). |
| B7 | Scope: JPDC is a parallel/distributed-computing journal, this is a single-host study. §2.0. | Your judgement. The cover letter now states the limitation to the editors rather than hiding it, which is the honest version of proceeding, but it does not remove the desk-reject risk. |

### Closed in this pass

| # | Was | Now |
|---|---|---|
| B8 | Abstract 294 words against a 250 limit | 250 words, all fourteen caveats retained, verified individually. `make -C paper/jpdc abstract-wordcount` exits non-zero above 250 |
| B3 | Manuscript stuck at "236 of 244 commits" | Root cause found and fixed: `refresh_counts` pointed at `methodology.tex` after the sentence moved to `supplement.tex`, and its regex additionally required a line break in one specific place. It had been silently updating nothing. Now scans both files, tolerates the reflow, and errors out instead of no-opping. Manuscript reads 239 of 247 (159 / 27 / 53) |
| B4 | `CLAIMS_EVIDENCE.md` C18 frozen at "201 of 209" | Rewritten to quote no frozen number, name the generator, and record that it has gone stale three times |
| B5 | Two audit locators were live URLs | `drizzle_benchmarks` points at the 2026-07-24 capture, one day after the audit, so that coding is re-checkable. `prisma_benchmarks` points at the 2026-07-31 capture with an explicit `inspected_copy_caveat` recording that the page had already changed and that the copy does **not** evidence the recorded coding. `imdbench` now agrees with `references.bib` on `geldata/`. Validator passes, 63 judgements |
| B6 | No JPDC submission materials | `paper/jpdc/` has `jpdc_main.tex`, a JPDC-specific cover letter, highlights, and `package` / `docs` / `abstract-wordcount` targets. `make jpdc-package` carries the same Data-Availability refusal as the IST target and additionally enforces the page and abstract limits. The flattened package compiles standalone |

### Minor, still open

- `chktex` / `textidote` not run.
- DOI resolution not re-verified online; the ledger's confirmations are carried forward.
- No `latexdiff` against the IST version.
- `CLAUDE.md` §6 and `REVIEW_CHECKLIST.md` prescribe `bibtex-tidy --check`, which the
  installed binary rejects. The documented command cannot be run as written.
- `prisma_benchmarks` still needs re-coding against a dated capture, or the row's R5
  judgement should be marked provisional. The caveat now says so in the data; the
  supplement now says so in prose. Neither is a substitute for re-coding it.

### Superseded gate run (first pass, before the fixes)

Kept so the fix pass can be checked against what it claimed to fix.

`REVIEW_CHECKLIST.md` mechanical items, re-run against the current working tree.

### Blockers

| # | Item | Evidence |
|---|---|---|
| B8 | **Abstract is over the limit: 294 words against JPDC's 250.** This is the Elsevier-submission abstract in `jpdc_main.tex:43-69`, which is a different and longer text than the 230-word abstract in the generic `paper/express_db_access.tex`. About 45 words have to come out of a five-part structured abstract in which each part carries a caveat, so this is an editing job on your judgement, not a mechanical trim. | word count over `jpdc_main.tex`, LaTeX markup stripped |
| B1 | `make release-check` **fails**: "table regeneration chain failed to run". Cause is environmental: `experiments/node_modules` is empty, so `table:altloading` and `table:poolsize` abort on `ERR_MODULE_NOT_FOUND: autocannon`. Every other generator and `analyze:stats2` run clean. With `SKIP_REGEN=1` the rest of the gate passes (version and DOI self-consistent everywhere). Needs `npm ci` in `experiments/`, which I did not run: installing packages requires your approval. | `make release-check`; `SKIP_REGEN=1 ./scripts/release.sh --check` |
| B2 | Even once the dependencies exist, the drift check runs `git diff` over `REGEN_PATHS`, and the `table*` fix leaves 10 files modified inside those paths (14 modified in the tree overall, plus 2 untracked). The gate cannot pass until they are committed and a release is cut. | `git status --porcelain`; `git diff --name-only` over `REGEN_PATHS` |
| B3 | AI-provenance count is stale: `paper/supplement.tex:909` says "236 of 244 commits", actual at HEAD is **239 of 247**. `scripts/release.sh` refreshes this itself via `refresh_counts` (defined line 62, called at 79, 327, 365); do not hand-edit. Committing the pending work moves the number again. | `git rev-list --count HEAD` = 247; trailer count = 239 |
| B4 | `CLAIMS_EVIDENCE.md` row C18 reads "201 of 209 commits" and pins itself to commit `fd32276`. The manuscript says 236 of 244 and the tree says 239 of 247, so the control file is two revisions behind the manuscript it is supposed to evidence. | `CLAIMS_EVIDENCE.md:39` |
| B5 | Audit locators still unarchived: `drizzle_benchmarks` and `prisma_benchmarks` carry live URLs as `inspected_copy`, so two of nine codings do not reproduce, and the `prisma_benchmarks` R5 evidence sentence is false against the current page. The supplement promises the audit "preserves all 63 judgements with source locators". The drizzle fix is already decided (Wayback snapshot 20260724112047); prisma needs your browser, as Wayback is unreachable from this sandbox. | `experiments/external-protocol-audit.json` |
| B6 | JPDC submission materials incomplete: no cover letter for this venue, no highlights file under `paper/jpdc/` (the only copy is `paper/ist/highlights.tex`), and `paper/jpdc/Makefile` has no `package` target. Consequence beyond convenience: the Data-Availability truth-gate lives in the root `ist-package` target, so there is currently no gate standing between you and a JPDC package with a false statement. | `ls paper/jpdc`; root `Makefile` |
| B7 | Scope, §2.0 above, unresolved. | — |

### Minor, but on the checklist

- `imdbench` `inspected_copy` says `edgedb/imdbench`, `references.bib` says
  `geldata/imdbench`; same repository after the org rename, make the two agree.
- The audit date `2026-07-23` appears in `external-protocol-audit.json` but in no
  manuscript sentence beside Table S37.
- `CLAUDE.md` §6 and `REVIEW_CHECKLIST.md` both prescribe `bibtex-tidy --check`, but
  the installed `~/.local/bin/bibtex-tidy` rejects that flag ("Unknown option"). The
  documented command cannot be run as written; either the flag name or the docs are
  wrong. Reported, not silently worked around.
- `chktex` / `textidote` not run this pass.
- DOI resolution not re-verified online this pass; the ledger's confirmations are
  carried forward, not re-checked. `scripts/verify_refs.py` needs a path argument.
- No `latexdiff` against the IST version.

### Clean

`make pdf` and `make ist` build with 0 errors, 0 undefined references, 0 undefined
citations. No `\todo`, `TODO`, `XXX`, or `CITE:` placeholder anywhere in
`paper/sections/`, `paper/tables/`, or either main file. 51 bib entries, 51 distinct
cite keys, all cited, all 17 journal names LTWA-abbreviated. `SOURCE_LEDGER.md` has 65
rows with no blank confirmation column. Two-column layout is 16 pages against the
16-page limit, references included. Highlights are 5 bullets, longest 71 of 85
characters. Required statements (CRediT, competing interests, funding, GenAI, data
availability) all present.

### Suggested order (as written in the first pass; §6 executed most of it)

---

## 4. Open questions for the author

- Position, degree, degree year, and second research area for the biography.
- §2.0: reframe for JPDC, or change venue?
- **Approve or reject the shortened abstract** (§6.1). It is 250 words with every caveat
  intact, but it is still 44 words of your prose rewritten, and CLAUDE.md §5 makes that
  yours to sign off. The 294-word original is untouched in `paper/ist/ist_main.tex`.
- **`npm ci` in `experiments/`**, which I did not run: installing packages needs approval.
- **Commit and cut the release.** That is what actually closes B1, B2 and B3.
- MethodsX co-submission: `notes/methodsx-cosubmission.md` says it waits for the IST
  decision. JPDC also supports MethodsX co-submission, so that dependency now needs
  restating in terms of the new venue.

---

## 5. Corrections applied to the first version of this report

Recorded because a report that was wrong once should say where.

1. **Abstract word count was wrong, and hid a blocker.** The first version reported
   "233 words, complies", counted from `paper/express_db_access.tex`. That is the
   generic build's abstract (230 words by a corrected count). The abstract actually
   being submitted is the one in the Elsevier source, and it is **294 words, over the
   250-word limit**. Now B8.
2. **"Journal names currently mixed" was unverified and false.** All 17 `journal =`
   fields are already LTWA-abbreviated. The item is removed from "must change" and
   moved to "complies".
3. **Highlights length was asserted, not measured.** Now measured per bullet: longest
   is 71 characters.
4. **Item 1 of §2.2 described `paper/jpdc/` as work to be done** after it had been
   created. Marked done, with the genuinely outstanding parts moved into B6.
5. **File-count in B2 was wrong** (said 12 modified). Correct: 14 modified in the
   tree, of which 10 fall inside the gate's `REGEN_PATHS`, plus 2 untracked.
6. **`refresh_counts` was asserted from memory**; now verified in `scripts/release.sh`
   with line numbers.
7. **B4 said "two counts behind"**, which stated no fact. Replaced with the three
   actual numbers and the pinned commit.
8. **Structure**: the open-questions section had been left nested inside §3, and the
   §2.2 list contained an item numbered "2b". Both fixed.
9. **Line references** pointed at `paper/ist/ist_main.tex` for content now sourced
   from `paper/jpdc/jpdc_main.tex`.
10. **§2.1 claimed the Data Availability statement is gated**, while B6 said no JPDC
    gate exists. The two now agree: the gate exists, but only on the IST target.
11. **`bibtex-tidy --check` failure was observed and then omitted.** Now recorded.

---

## 6. Fix pass, 10 August 2026

What I changed, so it can be checked rather than trusted.

### 6.1 Abstract, 294 → 250 words

`paper/jpdc/jpdc_main.tex` only; `paper/ist/ist_main.tex` keeps the 294-word original.
Made unstructured (the five `\textbf{Context:}`-style labels removed), which is idiomatic
for JPDC and returns five words. All fourteen caveat clauses were listed before editing and
each was checked as present afterwards: the compound-contrast disclaimer, the five-run and
secondary status of matched utilization, "not one optimized against the other",
whole-ordering imperfection, "does not identify the DBMS as the cause", candidate-not-
validated-methodology, no universal ranking, no library-intrinsic overhead estimate, one
rater, no independent adapter review, one shared host, untested applicability, the
same-host second campaign, and single-instantiation. What was cut is connective prose and
one duplicate: the Objectives sentence said "rather than validating it independently" and
the Conclusion said "not a validated methodology"; the Conclusion keeps it.
`make -C paper/jpdc abstract-wordcount` now fails above 250.

### 6.2 Wide tables in two columns

Generator fix, described in §2.2 item 3. Not a hand-edit of generated files.

### 6.3 `refresh_counts` was dead code

This is the interesting one. `scripts/release.sh` hard-coded
`paper/sections/methodology.tex`, but the AI-provenance sentence had moved to
`paper/supplement.tex`, so the function reported git-derived numbers and changed nothing.
Its own comment warns about exactly this failure from v1.12.17. A second instance of the
same bug sat inside the regex: it required a literal space between "trailer" and "naming
the model", where the source has a line break. Both fixed; the function now scans both
files and returns non-zero if it matches nowhere. Manuscript now reads 239 of 247.

### 6.4 Audit locators

`drizzle_benchmarks` → 2026-07-24 capture (one day after the audit, so it evidences the
coding). `prisma_benchmarks` → 2026-07-31 capture, plus a new `inspected_copy_caveat` field
stating that the page had already changed and that this copy does not evidence the recorded
scope or the R5 judgement. `imdbench` `inspected_copy` moved from `edgedb/` to `geldata/` to
match `references.bib`. `npm run audit:protocol` passes, 63 judgements.

### 6.5 Supplement disclosure

`sup:protocol-retro` now states the 23 July 2026 audit date and distinguishes the eight
re-checkable locators from the one that is not. Net **+112 words in the supplement**, which
is not page-limited; the main text is unchanged, so the 16-page budget is untouched.

### 6.6 JPDC submission materials

New: `paper/jpdc/cover-letter.md` (+ built PDF), `highlights.tex` copied from the IST build,
`package` / `docs` / `abstract-wordcount` targets, and a root `make jpdc-package` carrying
the same Data-Availability refusal as `ist-package` plus page- and abstract-limit checks.
The flattened `_package/` compiles standalone: 43 pages review layout, 0 errors, 0 undefined
references or citations.

**The cover letter contains one bracketed `[CONFIRM BEFORE SENDING]` marker.** It sits above
the "not under consideration elsewhere" declaration, which is true only once the IST
submission is formally withdrawn. I cannot verify that; you sign it.

### 6.7 Control files

`DECISIONS.md` records the venue change and the abstract decision. `notes/venue.md` marks
the July screening as superseded and warns that no MEiN or IF figure for JPDC has been
verified. `CLAIMS_EVIDENCE.md` C18 rewritten.

### 6.8 Word-count effect

Main text: unchanged. Abstract: **-44 words**. Supplement: **+112 words**. The manuscript
stays at exactly 16 of 16 two-column pages.

