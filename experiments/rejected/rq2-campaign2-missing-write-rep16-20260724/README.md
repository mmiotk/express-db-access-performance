# Rejected RQ2 campaign (missing write sample)

This campaign is excluded from every analysis and table despite process exit 0.

- Completion time: 2026-07-24
- Replicate checkpoints: 25/25
- Expected timed observations: 2250
- Observed timed observations: 2249
- Missing sample: `mysql2/mysql/write`, replicate 16 (24/25 samples)
- Immediate cause: the dedicated write server did not become healthy before its
  30 s timeout. No timed write measurement was produced for that block.
- Runner defect: the previous `mainIndep` catch logged `FAILED` and continued,
  then emitted a nominally successful 90-row file without checking each sample
  array length.
- Disposition: no late sample was appended. The runner was changed to fail closed,
  retry only a pre-warm-up startup failure once with an explicit event record,
  reject request errors/timeouts/non-2xx, and validate the exact roster and sample
  counts after every replicate and before final output. The replacement campaign
  starts again at replicate 1 under a new source manifest.

No observation from this directory is admissible evidence.
