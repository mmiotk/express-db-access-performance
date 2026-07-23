# Documentation-selection rubric (machine-readable)

Selection rubric for the RQ1 **documentation-selected implementation-and-strategy**
treatment. This file is the reproducibility artifact backing Supplement Table S16
(`paper/tables/adapter_choices.tex`), methodology Section 3.4
(`paper/sections/methodology.tex`, `sec:3.4`), the Threats construct-validity
paragraph (`paper/sections/threats.tex`), and the supplement Construct-validity
section (Table S33). It is not counted against the manuscript word budget.

## 1. What this treatment is (and is not)

The documentation-selected treatment is an **intentionally artificial, predeclared
treatment-selection policy**, fixed before any timing was collected. It is **not** a
practitioner survey, not a usage measurement, and not a validated developer persona.
It records what one **mechanical selection rule** picks, so that the RQ1 treatment is
reproducible and independently re-checkable, not a claim that this is the most common,
the idiomatic, or the performance-optimal API. An equivalent available reading of the
same object is **"documentation-primary configuration under a predeclared selection
rule."**

Because the rule is mechanical rather than surveyed, its external construct validity is
deliberately narrow: it fixes a defensible, reproducible starting configuration, and the
manuscript reports its corroboration and limits in the Threats construct-validity
paragraph and Supplement Table S33.

## 2. Freeze date and provenance

- **Freeze date:** 2026-07-15 (the date the lockfile / library versions were pinned).
- **Measurement window:** 2026-07-16 to 2026-07-18, single virtualized host.
- **Authoritative pinned-version source:** Supplement Table S11 (`tab:versions` in
  `paper/supplement.tex`) and the committed `experiments/package.json`. Where the
  version column inside `experiments/METHODOLOGY.md` disagrees with these, Table S11 /
  `package.json` govern (see Section 7, provenance note).
- **Environment (from Table S11):** Node.js 24.18.0, Express 5.2.1, PostgreSQL 18.4,
  MySQL 9.7.1, autocannon 8.0.0.

## 3. The predeclared selection rule

Decided **before measurement**:

> For each access layer, use the eager-loading / relation-loading API that the library's
> own **official documentation** for the pinned major version **presents first** in its
> section on loading related records (eager loading / populating relations), with query
> logging, lifecycle hooks, and validation disabled and any identity map scoped per
> request. Record the API not chosen as the *documented alternative not used*.

For the native drivers (`pg`, `mysql2`) and the query builder (`knex`) there is **no
relation / eager-loading API**, so the documentation-selected deep fetch is a
hand-written parameterized JOIN — the shared no-fan-out baseline every layer targets.

**Operationalizing "presents first" for reassessment.** "Presents first" is resolved
against an **archived snapshot** of the official documentation base site at (or nearest
before) the freeze date (Section 6), by locating that library's loading-related-records
section and confirming the recorded API is the one it leads with. This is what makes the
otherwise-ambiguous notion of documentation prominence independently checkable rather
than editorial.

## 4. The tie-break rule and its decisions

Where several official paths are **equally prominent**, the tie is broken toward **the
API at the library's own taxonomy tier**, recording the others as documented
alternatives.

- **Drizzle — the one borderline case.** Drizzle's documentation presents two
  co-prominent paths: its **SQL-style core query builder** (`select(...).innerJoin(...)`)
  and its **higher-level relational-query API** (`db.query.posts.findFirst({ with: { ... } })`).
  The tie-break selects the API at Drizzle's own taxonomy tier — the **core SQL-style
  builder** (`.innerJoin()`), which Drizzle documents as its base layer — and records the
  higher-level relational-query API as the documented alternative not used.
- **All other eight layers required no tie-break.** Each presents a single unambiguous
  documentation-first API for loading related records (Prisma `include`, Sequelize
  `include`, TypeORM `relations`, Objection `withGraphFetched`, MikroORM `populate`), or
  has no relation API at all (`pg`, `mysql2`, `knex`).

Note: the *documented-alternative* column below also records, for the ORMs, the declined
**loading strategy** (join vs. select-in) that is the default's counterpart. Those are
not tie-breaks in API selection; they are the alternative loading path a separate
sensitivity check (Supplement Table S18) can exercise where it is a byte-identical
drop-in.

## 5. The nine documentation-selected layers

The access-layer factor has eleven levels; the two **tuned** native baselines
(`pg-tuned`, `mysql2-tuned`) are labelled reference points, **not** documentation-selected
treatments, and are excluded from this rubric. That leaves the **nine** below (round-trip
counts are the deep/nested fetch; "measured" = server-side statement logging,
"by construction" = identical hand-written plan).

| # | Layer | Tier | Selected deep-fetch API / method | Round-trips | Documented alternative not used | Official documentation base URL | Pinned version |
|---|-------|------|----------------------------------|-------------|---------------------------------|---------------------------------|----------------|
| 1 | `pg` | native driver (PostgreSQL) | hand-written parameterized JOIN ×2 via `pool.query()` | 2 (measured) | n/a — hand-written SQL, no relation API | https://node-postgres.com/ | 8.22.0 |
| 2 | `mysql2` | native driver (MySQL) | hand-written JOIN ×2 via `pool.query()` | 2 (by construction) | n/a — hand-written SQL, no relation API | https://sidorares.github.io/node-mysql2/ | 3.23.0 |
| 3 | `knex` | query builder | builder `.join()` ×2 | 2 (measured) | n/a — hand-written SQL, no relation abstraction | https://knexjs.org/ | 3.3.0 |
| 4 | `drizzle` (`drizzle-orm`) | ORM | core builder `.innerJoin()` ×2 (**tie-break**) | 2 (measured) | relational query API (`db.query.posts.findFirst({ with: { author: true, comments: { with: { author: true } } } })`) | https://orm.drizzle.team/ | 0.45.2 |
| 5 | `prisma` (`@prisma/client`) | ORM | `include:` nested reads (default `relationLoadStrategy: 'query'`) | 4 (measured) | `relationLoadStrategy: 'join'` | https://www.prisma.io/docs | 7.8.0 |
| 6 | `sequelize` | ORM | `include:` with `separate: false` (single JOIN) | 1 (measured) | `separate: true` (select-in) | https://sequelize.org/ | 6.37.8 |
| 7 | `typeorm` | ORM | `relations:` find option (default join strategy) | 2 (measured) | `relationLoadStrategy: 'query'` | https://typeorm.io/ | 1.1.0 |
| 8 | `objection` | ORM (on Knex) | `.withGraphFetched()` | 4 (measured) | `.withGraphJoined()` | https://vincit.github.io/objection.js/ | 3.1.5 |
| 9 | `mikroorm` (`@mikro-orm/core`) | ORM | `populate:` (default joined strategy) | 1 (measured) | `strategy: 'select-in'` (`LoadStrategy.SELECT_IN`) | https://mikro-orm.io/ | 7.1.6 |

Version-specific reproducibility notes carried by the pinned freeze (Table S11):
- **Sequelize** is on the stable **6.x** line because the 7.x line is a prerelease.
- **Prisma 7** is Rust-free and connects through an official JS driver adapter
  (`@prisma/adapter-pg` for PostgreSQL; `@prisma/adapter-mariadb` with the `mariadb`
  3.5.3 driver for MySQL, as Prisma ships no `mysql2` adapter).

All recorded doc-source fields above are **official documentation base URLs** (site
roots) retained as navigation metadata. The exact justifying URL for each choice is listed in `experiments/METHODOLOGY.md`; the preserved response, capture timestamp, and hash in `experiments/documentation-snapshots/manifest.json` are the auditable evidence.

## 6. Documentation snapshot retrieval (Wayback Machine)

The replication package ships the exact archived HTML for every justifying page under `experiments/documentation-snapshots/pages`, plus a machine-readable manifest containing the source URL, capture timestamp, Wayback URL, SHA-256, byte length, and evidence terms. All committed pages are the nearest retrievable official-page capture at or before the 2026-07-15 freeze; the recorded timestamps, rather than an assumed exact-day capture, define the preserved evidence. The archive script labels any future live fallback as post-freeze evidence and forbids treating it as a freeze copy.

Contradictory official pages are resolved in this order: the page for the pinned stable major version; the relation/eager-loading section over quick-start or marketing material; then first presentation within that section. Remaining equal prominence invokes the taxonomy-tier tie-break above. If still unresolved, the choice is recorded as ambiguous and both treatments must be predeclared.

The preserved state proves what the page contained at its capture timestamp, not that it remained unchanged on every day through the freeze. This is the residual archival limitation.

## 7. Machine-readable record

```yaml
rubric:
  name: documentation-selected implementation-and-strategy
  alternative_framing: documentation-primary configuration under a predeclared selection rule
  policy_type: intentionally-artificial predeclared treatment-selection policy
  is_practitioner_survey: false
  freeze_date: 2026-07-15
  measurement_window: [2026-07-16, 2026-07-18]
  authoritative_version_source: [Supplement Table S11, experiments/package.json]
  selection_rule: >-
    Use the eager-loading / relation-loading API the library's official documentation for
    the pinned major version presents first in its loading-related-records section, with
    query logging, hooks, and validation off and any identity map scoped per request.
  tie_break_rule: >-
    Where several official paths are equally prominent, select the API at the library's
    own taxonomy tier; record the others as documented alternatives.
  tie_break_cases:
    drizzle:
      borderline: true
      competing_paths: [SQL-style core query builder, higher-level relational-query API]
      selected: SQL-style core query builder (.innerJoin)
      rationale: API at Drizzle's own taxonomy tier (its documented base layer)
  snapshot_manifest: experiments/documentation-snapshots/manifest.json
  snapshot_retrieval: Internet Archive Wayback Machine, nearest exact-page capture at/before freeze date
  excluded_from_rubric: [pg-tuned, mysql2-tuned]   # tuned reference baselines, not documentation-selected
  layers:
    - id: pg
      tier: native-driver
      engine: postgresql
      selected_api: hand-written parameterized JOIN x2 via pool.query()
      round_trips: 2
      round_trips_basis: measured
      alternative_not_used: null
      doc_base_url: https://node-postgres.com/
      pinned_version: 8.22.0
    - id: mysql2
      tier: native-driver
      engine: mysql
      selected_api: hand-written JOIN x2 via pool.query()
      round_trips: 2
      round_trips_basis: by-construction
      alternative_not_used: null
      doc_base_url: https://sidorares.github.io/node-mysql2/
      pinned_version: 3.23.0
    - id: knex
      tier: query-builder
      selected_api: builder .join() x2
      round_trips: 2
      round_trips_basis: measured
      alternative_not_used: null
      doc_base_url: https://knexjs.org/
      pinned_version: 3.3.0
    - id: drizzle
      package: drizzle-orm
      tier: orm
      selected_api: core builder .innerJoin() x2
      tie_break_applied: true
      round_trips: 2
      round_trips_basis: measured
      alternative_not_used: relational query API (db.query...with)
      doc_base_url: https://orm.drizzle.team/
      pinned_version: 0.45.2
    - id: prisma
      package: "@prisma/client"
      tier: orm
      selected_api: "include: nested reads (default relationLoadStrategy: query)"
      round_trips: 4
      round_trips_basis: measured
      alternative_not_used: "relationLoadStrategy: join"
      doc_base_url: https://www.prisma.io/docs
      pinned_version: 7.8.0
      notes: Rust-free client; MySQL via @prisma/adapter-mariadb (no mysql2 adapter)
    - id: sequelize
      tier: orm
      selected_api: "include: with separate:false (single JOIN)"
      round_trips: 1
      round_trips_basis: measured
      alternative_not_used: "separate:true (select-in)"
      doc_base_url: https://sequelize.org/
      pinned_version: 6.37.8
      notes: stable 6.x line; 7.x is prerelease
    - id: typeorm
      tier: orm
      selected_api: "relations: find option (default join strategy)"
      round_trips: 2
      round_trips_basis: measured
      alternative_not_used: "relationLoadStrategy: query"
      doc_base_url: https://typeorm.io/
      pinned_version: 1.1.0
    - id: objection
      tier: orm
      selected_api: .withGraphFetched()
      round_trips: 4
      round_trips_basis: measured
      alternative_not_used: .withGraphJoined()
      doc_base_url: https://vincit.github.io/objection.js/
      pinned_version: 3.1.5
    - id: mikroorm
      package: "@mikro-orm/core"
      tier: orm
      selected_api: "populate: (default joined strategy)"
      round_trips: 1
      round_trips_basis: measured
      alternative_not_used: "strategy: select-in (LoadStrategy.SELECT_IN)"
      doc_base_url: https://mikro-orm.io/
      pinned_version: 7.1.6
```

## 8. Provenance and known discrepancy

- **Selected API / method, round-trips, documented alternatives, tie-break:** taken from
  Supplement Table S16 (`paper/tables/adapter_choices.tex`),
  `experiments/METHODOLOGY.md` (Selection-protocol and per-adapter sections), and
  methodology `sec:3.4`.
- **Pinned versions and freeze date:** taken from Supplement Table S11 (`tab:versions`)
  and `experiments/package.json` (authoritative), corroborated by the paper body
  (e.g. `paper/sections/threats.tex` external-validity paragraph: Prisma 7.8; Sequelize
  6.x).
- **Version-column reconciliation (resolved in this revision):** `experiments/METHODOLOGY.md`'s
  version column was previously stale relative to Table S11 / `package.json` (it listed Prisma
  5.22.0, drizzle-orm 0.36.4, mysql2 3.22.5, TypeORM 0.3.30, `@mikro-orm/core` 6.6.15 from an
  earlier freeze). It has been reconciled to the current freeze lockfile (Prisma 7.8.0, drizzle-orm
  0.45.2, mysql2 3.23.0, TypeORM 1.1.0, `@mikro-orm/core` 7.1.6), so `METHODOLOGY.md`, Table S11,
  and `package.json` now agree; this rubric uses those values (the selected-API content was
  unaffected throughout).

## 9. How to independently reassess

1. Pull the pinned versions from `experiments/package.json` / Table S11 (Section 5).
2. For each layer, verify the SHA-256 in `experiments/documentation-snapshots/manifest.json`, then open the corresponding committed exact-page HTML and locate its relations/eager-loading section.
3. Confirm the API in the "Selected deep-fetch API" column is the one presented first
   there; for Drizzle, confirm the two co-prominent paths and that the tie-break selects
   the core SQL-style builder.
4. Check the recorded capture timestamp. If a future regeneration falls back to a live post-freeze page, treat the freeze-date ordering as unverifiable rather than substituting that page.
