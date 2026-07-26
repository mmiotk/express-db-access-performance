# Independent-review packets

These packets support three reviews requested during pre-submission assessment:

1. independent application of the frozen treatment-selection rule
   (`treatment-selection-blind.md`, register rows TS-01/TS-02);
2. independent inspection of adapter implementations for documented,
   performance-neutral conformance (`adapter-audit-blind.md`, row AD-01); and
3. independent re-coding of the 63-judgement external protocol audit, so that
   inter-rater agreement on the codebook can be computed
   (`protocol-audit-blind.md`, row PA-01).

Each is independently completable: a reviewer who has time for only one of the
three still produces a usable result. Review 3 is the only one that yields a
numeric agreement statistic, because it re-codes items the author already coded.

They intentionally contain no benchmark rankings or throughput/latency values.
The manuscript does **not** claim that an independent human review has occurred
until signed forms are present in `completed/` and entered in
`review-register.csv`.

Returned forms are scored by committed code, not by hand:

- `npm run audit:protocol` validates the audit schema, including any additional
  rater's judgements;
- `npm run audit:agreement` computes percent agreement and Cohen's kappa overall
  and per protocol stage, and writes every disagreeing cell to
  `experiments/results/protocol-audit-agreement.json`.

The agreement estimators are unit-tested in `experiments/bench/stats.test.mjs`.
Disagreements are reported, not reconciled away.

An author cannot supply independent agreement with their own decisions. The
repository therefore distinguishes:

- automated/specification checks already executed; and
- independent human review, currently pending.

Reviewers should work from a clean checkout at the revision commit, record that
commit, and return one signed form per role. Proposed code changes must be
recorded before any affected performance cell is rerun.
