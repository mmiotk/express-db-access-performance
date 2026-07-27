# Source ledger

**Purpose.** Single registry of every reference in `references.bib`, with proof that its
metadata was checked against an authoritative API. A `.bib` entry with no row here is
considered unverified and must not be cited.
**Owner.** Agent writes rows; author owns the "Read?" and "Trust" columns.
**Update when.** Immediately after any entry is added to or changed in `references.bib`.

Verification sources: `crossref` | `openalex` | `dblp` | `arxiv` | `s2` | `publisher`.
Read: `full` (read in full) | `skim` | `abstract-only`.

| BibTeX key | DOI / arXiv ID | Verified against | Date | Read? | Preprint≠published? | Notes |
|---|---|---|---|---|---|---|
| `example2020thing` | 10.1000/xyz123 | crossref, dblp | 2026-07-27 | full | no | venue name normalised to LNCS abbreviation |

## Unresolved

Entries that failed verification, with the reason (DOI not found, author mismatch,
retracted, venue ambiguous). Nothing here may be cited.

| Candidate | Problem | Action |
|---|---|---|

## Retraction / erratum watch

Re-check before final submission for any source older than the project itself.
