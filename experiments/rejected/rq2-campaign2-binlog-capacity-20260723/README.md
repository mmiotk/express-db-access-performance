# Rejected RQ2 campaign attempt (insufficient binlog capacity)

This attempt is excluded from every analysis and table.

- Date: 2026-07-23
- Completed valid checkpoints: 7
- Reason: MySQL binary logs consumed approximately 0.2 GB/hour and projected
  disk exhaustion before replicate 25, despite no measurement failures yet.
- Action: the campaign was interrupted before ENOSPC. Its partial JSON, log,
  environment fingerprint, and source manifest are retained here.
- Remediation before replacement: closed historical binlogs were purged through
  MySQL `PURGE BINARY LOGS`; `innodb_flush_log_at_trx_commit=1`, `sync_binlog=1`,
  and `log_bin=1` were verified unchanged. In addition, a 7.5 GB reproducible
  `.lake` dependency cache in an inactive CI checkout was removed. Available
  filesystem space increased to 15 GB.
- Replacement: the full admission chain and campaign restart from replicate 1.

No observation from this directory is admissible evidence.
