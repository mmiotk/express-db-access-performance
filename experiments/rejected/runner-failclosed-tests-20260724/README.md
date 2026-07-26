# Runner fail-closed tests

These are engineering-test artifacts, not benchmark evidence.

- Positive smoke: one MySQL write cell, one repetition, 1 s warm-up and 1 s
  measurement. It passed the state preflight, zero-request-failure gate,
  per-replicate completeness gate, and final completeness gate; exit code 0.
- Negative startup test: ports 3211 and 3212 were deliberately occupied by
  HTTP 503 listeners. The runner recorded the first rejected pre-warm-up start,
  retried once, rejected the second start, wrote the partial/event records, and
  exited code 1 without a final results JSON.

The files are kept under `rejected/` so no checksum or table generator can treat
these short engineering checks as study data.
