# Rejected RQ2 campaign attempt (ENOSPC)

This attempt is excluded from every analysis and table.

- Date: 2026-07-23
- Completed valid checkpoints: replicate 1 only
- Failure: the host filesystem reached zero user-available bytes during
  replicate 2. Prisma client generation failed with `ENOSPC`; a subsequent
  TypeORM/PostgreSQL server-health check also failed.
- Action: the runner was interrupted immediately after the failure was
  detected. Its partial JSON, log, environment fingerprint, and source
  manifest are retained here for auditability.
- Replacement: the complete campaign was restarted from the full admission
  chain after freeing only reproducible npm and Playwright caches.

No observation from this directory is admissible evidence.
