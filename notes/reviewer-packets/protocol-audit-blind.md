# Blind external-protocol audit (second rater)

Reviewer: ____________________
Date: ____________________
Repository commit: ____________________

This form re-codes the same 63 judgements (9 external benchmark sources x 7
protocol stages) that the manuscript author coded, so that inter-rater agreement
can be computed. The author's codings are **not** reproduced here; do not read
`experiments/external-protocol-audit.json`, Supplement Table S37, or
`paper/tables/protocol_retro.tex` before finishing.

## Isolation

- [ ] I did not inspect the author's codings (`experiments/external-protocol-audit.json`),
      Supplement Table S37, or `paper/tables/protocol_retro.tex` beforehand.
- [ ] I did not inspect this study's benchmark results or rankings.
- [ ] I read the codebook `notes/protocol-audit-codebook.md` in full.
- [ ] I coded from the cited sources themselves, recording a locator for each judgement.

## Codes

Assign exactly one code per (source, stage) cell:

| Code | Meaning |
|---|---|
| `satisfied` | The source reports the stage as the codebook defines it. |
| `partial` | Some but not all of the stage's requirement is reported. |
| `not_reported` | The source does not report it. Not evidence it was never performed. |
| `not_applicable` | Outside the source's estimand (e.g. no access-layer treatment). |
| `unclear` | The source is genuinely ambiguous on this point. |

Stage definitions are in `notes/protocol-audit-codebook.md`, section "Stages":
**M1** semantic admission; **M2** treatment definition; **R3** common-SQL raw-path
sensitivity; **R4** capacity characterization; **R5** operating-point separation;
**R6** resource accounting; **R7** implementation-waste evidence.

## Sources to code

Source URLs and the inspected copies are recorded per study in
`experiments/external-protocol-audit.json` under `source` — that field may be
read for retrieval; the `coding` field must not.

| # | id | Source | Type |
|---|---|---|---|
| 1 | `colley2018orm` | Colley et al. (2018) | peer-reviewed |
| 2 | `prisma_rawsql_2025` | Yusmita et al. (2025) | peer-reviewed |
| 3 | `orm_compare_jcct_2025` | Attala and Khemapatpapan (2025) | peer-reviewed |
| 4 | `zhadko2025orm` | Zhadko-Bazilevych (2025) | peer-reviewed |
| 5 | `pratama2023nodebench` | Pratama and Raharja (2023) | peer-reviewed |
| 6 | `salunke2024pgmysql` | Salunke and Ouda (2024) | peer-reviewed |
| 7 | `drizzle_benchmarks` | Drizzle benchmark suite | vendor |
| 8 | `prisma_benchmarks` | Prisma query-performance benchmarks | vendor |
| 9 | `imdbench` | IMDBench / Gel Data | vendor |

## Codings

One block per source. Every cell needs a code, a locator (page, section, table,
or URL fragment), and one line of evidence. A cell with no locator is not usable.

### 1. `colley2018orm` — Colley et al. (2018)

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 2. `prisma_rawsql_2025` — Yusmita et al. (2025)

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 3. `orm_compare_jcct_2025` — Attala and Khemapatpapan (2025)

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 4. `zhadko2025orm` — Zhadko-Bazilevych (2025)

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 5. `pratama2023nodebench` — Pratama and Raharja (2023)

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 6. `salunke2024pgmysql` — Salunke and Ouda (2024)

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 7. `drizzle_benchmarks` — Drizzle benchmark suite

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 8. `prisma_benchmarks` — Prisma query-performance benchmarks

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

### 9. `imdbench` — IMDBench / Gel Data

| Stage | Code | Locator | Evidence |
|---|---|---|---|
| M1 | | | |
| M2 | | | |
| R3 | | | |
| R4 | | | |
| R5 | | | |
| R6 | | | |
| R7 | | | |

## Disagreement policy (fixed before comparison)

Disagreements are **reported, not reconciled away**. The custodian records both
codings, publishes per-stage agreement, and lists every disagreeing cell. Neither
rater revises a code after seeing the other's. If a disagreement reveals a
codebook ambiguity, the ambiguity is reported as a finding about the codebook.

## Custodian steps after the form is returned

1. Add the reviewer to `raters[]` in `experiments/external-protocol-audit.json`
   with `independent_of_manuscript: true`.
2. Enter the 63 judgements under
   `studies[].additional_codings["<rater-id>"]["<stage>"] = {code, locator, evidence}`.
   The author's `coding` block must not be edited.
3. `npm run audit:protocol` — schema validation.
4. `npm run audit:agreement` — writes percent agreement, Cohen's kappa per stage
   and overall, and the full disagreement list to
   `experiments/results/protocol-audit-agreement.json`.
5. File the signed form in `completed/` and update `review-register.csv`.

Signature: ____________________
