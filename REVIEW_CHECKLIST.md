# Review checklist

**Purpose.** Gate before submission and before each resubmission.
**Owner.** Agent runs the mechanical items and reports; author signs off on the judgement items.
**Update when.** Before every submission; extended whenever a reviewer finds something this
checklist should have caught.

## Mechanical (agent verifies, with evidence)

- [ ] `make pdf` and `make ist` clean: 0 errors, 0 undefined references, 0 undefined citations.
- [ ] `make release-check` passes (version and DOI agree at every declaration site).
- [ ] `chktex` / `textidote` run; remaining warnings triaged.
- [ ] Every `\label` referenced; every `\cite` key present in `references.bib`.
- [ ] Every `.bib` entry cited at least once.
- [ ] `bibtex-tidy` applied; no duplicate keys; consistent field set.
- [ ] Every reference has a row in `SOURCE_LEDGER.md` marked verified.
- [ ] Every DOI resolves (checked against Crossref).
- [ ] No `\todo`, `TODO`, `XXX`, `TODO(gap)`, or placeholder citation remains.
- [ ] Layer names and terminology uniform across paper, supplement, and `METHODOLOGY.md`.
- [ ] Every number in text/tables matches `experiments/results/`.
- [ ] Reported numbers regenerate from the harness; checksums re-verified, not copied forward.
- [ ] Page count within the venue limit; template unmodified.
- [ ] Figures ≥ 300 dpi or vector; legible in greyscale; axes labelled with units.
- [ ] `latexdiff` against the previous version generated.

## Content (author judges)

- [ ] Abstract states problem, contribution, and result quantitatively.
- [ ] Contributions map 1:1 to numbered results.
- [ ] No caveat, limitation, or threat-to-validity sentence removed during condensation.
- [ ] Related work positions the paper, and no cited work is misrepresented.
- [ ] Limitations and threats to validity stated honestly.
- [ ] Conclusion claims nothing not proven or measured.
- [ ] Every `[assumption]` / `[unverified]` in `CLAIMS_EVIDENCE.md` resolved.

## Venue compliance

- [ ] Correct template and bibliography style.
- [ ] Anonymised if double-blind (no author names, no self-citing "our previous work",
      no identifying repository URL, anonymised build compiles).
- [ ] Required statements: data availability, code availability, funding,
      author contributions, competing interests, ethics (if applicable).
- [ ] Supplementary material and artefact archived (Zenodo DOI, git tag).
- [ ] Cover letter written (first submission) or response-to-reviewers (revision).

## Post-submission

- [ ] Submitted version tagged in git.
- [ ] arXiv version prepared (`arxiv-latex-cleaner`), licence chosen, embargo respected.
