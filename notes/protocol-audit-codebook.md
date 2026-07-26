# Retrospective protocol-audit codebook

This codebook defines the bounded retrospective application reported in
Supplement Table S37. It is a validation exercise for the *usability* of the
protocol, not a claim that the audited benchmarks are defective and not an
independent validation of this manuscript.

## Scope and rater status

- Corpus: the nine empirical benchmark sources retained by the July 2026
  scoping search (`notes/related-work-search.md`).
- Unit: one published benchmark or vendor suite, not each individual result.
- Rater: the manuscript author. No inter-rater agreement is claimed.
- Date: 2026-07-23.
- Inputs: the public paper or benchmark-methodology page named in
  `experiments/external-protocol-audit.json`.
- No benchmark was rerun. Coding concerns only what the source reports.

The JSON record preserves, for every judgement, a stable source locator and a
short paraphrase of the evidence. `not_reported` means that the inspected source
does not report the item; it does not prove that the authors never performed it.

## Codes

- `satisfied`: the source reports enough information to meet the stage as
  defined below.
- `partial`: a relevant control is present, but one or more required elements
  are absent or unclear.
- `not_reported`: no supporting procedure was located in the inspected source.
- `not_applicable`: the stage has no referent for that benchmark.
- `unclear`: the accessible source is insufficient to decide.

## Stages

### M1 — semantic admission

`satisfied` requires task-derived expected-result evidence independent of the timed
reference, cross-implementation equivalence under a declared comparator for reads,
and state-level validation for any timed mutations. A successful request, lack of exceptions, or identical schemas alone
is insufficient.

### M2 — treatment definition

`satisfied` requires the implementation/configuration representing every
compared layer to be selected by a rule stated independently of the measured
ranking, with material alternatives or defaults recorded. Pinning package
versions without defining the query/loading path is `partial`.

### R3 — common-SQL raw-path sensitivity

`satisfied` requires a contrast in which the compared layers execute common SQL
through their raw facilities, with the result interpreted as a compound
sensitivity contrast. A raw-SQL implementation compared with one ORM, where SQL
or semantics differ, is `partial`.

### R4 — capacity characterization

`satisfied` requires a load/concurrency sweep that locates a throughput knee or
other saturation estimate for each compared treatment. A single high-load point
or several loads without a stated capacity estimate is `partial`.

### R5 — operating-point separation

`satisfied` requires client-observed latency at equal external demand and at
matched fractions of separately estimated capacity, or an equivalent explicit
separation. Reporting throughput and a percentile at one load is `partial`.

### R6 — resource accounting

`satisfied` requires application/database resource use to be reported with performance, or a clearly labelled equal-resource-budget comparison. Reporting only a subset of the relevant application/database resources, or not identifying their scope, is `partial`; normalization is required only when the claim itself is resource-normalized.

### R7 — implementation-review provenance

`satisfied` requires a recorded review of the benchmark adapters/configurations
by someone other than their implementer (maintainer sign-off is not required).
Open source code without recorded review is `partial`.

## Interpretation

The audit asks what each source's evidence licenses under this codebook. Lower
coverage does not invalidate its measurements; it narrows the conclusion. The single-rater exercise demonstrates one complete, source-located application of
the checklist, but cannot establish inter-rater reproducibility or independent validity.

A blank second-rater form covering exactly these 63 judgements is shipped as
`notes/reviewer-packets/protocol-audit-blind.md`, so an independent replication
can re-code the same items without exposure to this study's performance results
or to the author's codings. Returned codings are entered under
`studies[].additional_codings[<rater-id>]` in
`experiments/external-protocol-audit.json` — the author's `coding` block is never
edited — and scored by `npm run audit:agreement`, which reports percent agreement
and Cohen's kappa overall and per stage plus every disagreeing cell. Until a
second rater is recorded, that script reports agreement as not computable rather
than defaulting to a number. Two further packets in the same directory cover
treatment selection and adapter implementation; they concern different objects
and do not produce an agreement statistic for this codebook.
