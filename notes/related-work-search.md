# Related-work search protocol

This records how the related work was located, so the positioning claims in
Section 2 ("we did not identify a study combining all four properties in the
sources searched through July 2026") are reproducible. This is a scoping search,
not a systematic literature review.

## Sources

- ACM Digital Library
- IEEE Xplore
- Scopus
- Google Scholar (for coverage of grey literature and preprints)
- Vendor benchmark suites located by name (Prisma, Drizzle, IMDBench/Gel,
  TechEmpower Framework Benchmarks)

## Search window

2006 to July 2026 (2006 is the first year of the modern Node.js/ORM ecosystem
relevant here), plus backward and forward citation chaining from the hits.

## Query terms

Cross the access-layer terms with the measurement terms:

- access-layer terms: `ORM`, `object-relational mapping`, `query builder`,
  `database access layer`, `native driver`, and the library names
  (`Prisma`, `Drizzle`, `TypeORM`, `Sequelize`, `Objection`, `MikroORM`, `Knex`,
  `pg`, `mysql2`)
- context terms: `Node.js`, `Express`, `JavaScript`, `TypeScript`
- engine terms: `PostgreSQL`, `MySQL`
- measurement terms: `benchmark`, `performance`, `throughput`, `latency`,
  `tail latency`, `p99`

## Composed queries and search dates

All four sources were searched in July 2026 over title/abstract/keyword fields,
adapting the boolean below to each engine's syntax:

    ("ORM" OR "object-relational mapping" OR "query builder"
        OR "database access layer" OR Prisma OR Drizzle OR TypeORM
        OR Sequelize OR Objection OR MikroORM OR Knex)
    AND ("Node.js" OR Express OR JavaScript OR TypeScript)
    AND (PostgreSQL OR MySQL OR "relational database")
    AND (benchmark OR performance OR throughput OR latency)

A parallel engine-only query dropped the access-layer clause and required
(PostgreSQL AND MySQL) to catch dual-engine comparisons that hold the access
layer fixed. Google Scholar, which does not handle long boolean queries reliably,
was searched with the shorter phrases `Node.js ORM benchmark PostgreSQL MySQL`
and `Express database access layer performance`, plus backward/forward citation
chaining from the closest hits.

## Coverage note

This is a scoping search: the composed queries and citation chaining were run to
saturation (no new eligible relational-access-layer comparison appearing), not
with formal identified/screened/included record counts. The eligible works that
survived screening are exactly those cited in Section 2 and Table 3. Accordingly
the positioning is stated as "not identified in the sources searched," never as a
proof of non-existence.

## Screening

Retained: empirical performance comparisons of relational database access layers,
or direct PostgreSQL-versus-MySQL performance comparisons, in a form that could
bear on the four positioning properties (taxonomy breadth, dual-engine, joint
throughput/tail, vendor independence).

Excluded: non-empirical or purely conceptual ORM papers; studies of non-relational
stores only; runtime/framework benchmarks that hold the access layer fixed;
SEO/content-farm "2026 ORM benchmark" pages with unverifiable version numbers and
no reproducible method.

## Result

The retained works are cited in Section 2 and summarized in Table 3
(`tab:prior_art`). Each covers at most two or three of the four positioning
properties. The most recent peer-reviewed access-layer study located (JCSI 37,
Dec 2025) covers three ORMs, PostgreSQL only, and instruments internal query
stages rather than the client-observed HTTP round trip. TechEmpower Framework
Benchmarks exercised MySQL through Express but fixed a single driver or ORM per
framework variant, and the project was archived in March 2026.

Every DOI, year, volume, and page in the bibliography was machine-verified against
Crossref before submission.
