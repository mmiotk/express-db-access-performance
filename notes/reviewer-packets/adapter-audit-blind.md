# Blind adapter-conformance and implementation audit

Reviewer: ____________________
Date: ____________________
Repository commit: ____________________
Relevant expertise: ____________________

## Isolation and scope

- [ ] I did not inspect performance results or rankings before completing this
      review.
- [ ] I inspected both engine branches where a layer supports both engines.
- [ ] I compared the adapter with the frozen documentation and declared endpoint
      specification.
- [ ] I recorded every proposed change before any affected benchmark rerun.

For each adapter, assess:

1. exact endpoint semantics and selected field set;
2. query/loading API conformance to the registered policy;
3. avoidable allocations, conversions, serial waits, duplicate queries, or
   redundant graph construction in adapter-specific code;
4. pooling, identity-map, logging, hooks, validation, and cache settings;
5. engine-specific driver/adapter differences;
6. movement of work into or out of shared canonical constructors;
7. error and transaction handling for writes.

Do not optimize beyond the frozen treatment. A proposed performance change that
selects another documented strategy is a new treatment, not a correction.

## Per-adapter record

| Adapter | Semantics pass | Policy pass | Performance-neutral coding pass | Engine branches pass | Proposed change ID(s) |
|---|---:|---:|---:|---:|---|
| pg / pg-tuned | | | | | |
| mysql2 / mysql2-tuned | | | | | |
| knex | | | | | |
| drizzle | | | | | |
| prisma | | | | | |
| sequelize | | | | | |
| typeorm | | | | | |
| objection | | | | | |
| mikroorm | | | | | |

## Proposed changes

| ID | File:line | Finding | Semantic correction or new treatment? | Affected cells | Recommendation |
|---|---|---|---|---|---|
| | | | | | |

Overall decision: [ ] pass  [ ] pass with corrections  [ ] treatment change required

Signature: ____________________
