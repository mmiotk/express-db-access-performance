# Blind treatment-selection review

Reviewer: ____________________
Date: ____________________
Repository commit: ____________________

## Isolation

- [ ] I did not inspect benchmark results, generated tables, or manuscript
      rankings before completing the decisions.
- [ ] I verified `experiments/documentation-snapshots/manifest.json` hashes.
- [ ] I used only the preserved pages in
      `experiments/documentation-snapshots/pages/`.

## Rule to apply

For each layer, select the eager/relation-loading API that the official
documentation for the pinned stable major version presents first in its
loading-related-records section. Resolve contradictory pages in this order:
pinned-major relation/eager-loading page; relation section over quick-start or
marketing page; first presentation in that section. If APIs remain equally
prominent, select the lower-level API that the library documents as its base layer and record every
alternative. If still unresolved, mark the treatment ambiguous; do not inspect
performance.

Native drivers and Knex have no relation abstraction; record the documented
parameterized query/builder path that implements the declared task.

## Decisions

| Layer | Selected API/path | Alternative(s) | Unambiguous? | Evidence file + heading | Notes |
|---|---|---|---|---|---|
| pg | | | | | |
| mysql2 | | | | | |
| knex | | | | | |
| drizzle | | | | | |
| prisma | | | | | |
| sequelize | | | | | |
| typeorm | | | | | |
| objection | | | | | |
| mikroorm | | | | | |

## Comparison performed by custodian after submission

Agreement with registered assignments: ______ / 9
Cohen's kappa (if two independent raters): ______
Disagreements and preregistered resolution: ________________________________

Signature: ____________________
