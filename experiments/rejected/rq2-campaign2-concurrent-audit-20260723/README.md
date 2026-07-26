# Rejected RQ2 campaign attempt (concurrent audit command)

This attempt is excluded from every analysis and table.

- Date: 2026-07-23
- Accepted checkpoints: none
- Reason: after the first timed cell had begun, an offline documentation-snapshot
  verification was accidentally run concurrently for approximately 0.13 s.
- Action: the campaign was interrupted during replicate 1. Its log, environment
  fingerprint, and source manifest are retained here for auditability.
- Replacement: the complete campaign was restarted from the full admission chain
  with no concurrent analysis or verification commands.

No observation from this directory is admissible evidence.
