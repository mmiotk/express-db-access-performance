# Prior art — deep research (2026-07)

Fact-checked survey of existing work comparing relational database access layers
in Node.js/Express. Method: fan-out web search across 5 angles, 17 sources fetched,
75 claims extracted, top 25 adversarially verified (2/3 refutes to kill). 24/25
confirmed, 1 refuted. Confidence noted per item.

## TL;DR

Prior art **exists but is fragmented and vendor-dominated**. No neutral,
peer-reviewed, full-taxonomy, Express-specific study on **both** PostgreSQL and
MySQL that reports throughput *and* tail latency together. That is the gap.

## Peer-reviewed

1. **Prisma ORM vs optimized raw SQL on PostgreSQL** — Procedia Computer Science
   (Elsevier), 2025. 8 query patterns, containerized, >15 related tables.
   `https://www.sciencedirect.com/science/article/pii/S187705092502722X`
   ⚠️ The specific headline result ("raw SQL up to 5× faster, 6–9× less CPU") was
   **refuted** in verification (vote 1–2) — cite the *methodology*, not the numbers.
2. **Prisma vs TypeORM vs Sequelize on PostgreSQL** — Journal of Computer and
   Creative Technology, Vol. 3(2), 2025 (TCI-indexed, regional). Dockerized TS,
   measures response time, memory, CPU across 4 relation types.
   `https://so13.tci-thaijo.org/index.php/jcct/article/view/2330`
3. **The Impact of ORM Frameworks on Relational Query Performance** — Colley,
   Stanier & Asaduzzaman, IEEE iCCECE 2018 (DOI 10.1109/iCCECE.2018.8659222).
   8 frameworks across **Java, C#, Python, PHP — deliberately NOT JavaScript/Node**.
   Strongest single evidence for the Node gap.
   `https://www.researchgate.net/publication/328488840`
4. Methodological caution — **Tell-Tale Tail Latencies**, Fritz et al., TPCTC 2021
   (Springer LNCS), arXiv:2107.11607: naive benchmarking distorts p95/p99
   (coordinated omission, JIT/GC warm-up, tool-induced distortion). Pair with
   Dean & Barroso, *The Tail at Scale* (2013).

## Practitioner / vendor benchmarks (all PostgreSQL-only, mostly vendor-biased)

- **Drizzle northwind-benchmarks-pg** — 9 targets: `pg`, `pg:p`, `drizzle`,
  `drizzle:p`, Knex, Kysely, MikroORM, TypeORM, Prisma.
  `https://github.com/drizzle-team/drizzle-northwind-benchmarks-pg`
- **Drizzle official** — k6, 1M prepared requests, two machines (client/server) over
  1GbE; reports avg latency, req/s, **P95**, CPU. `https://orm.drizzle.team/benchmarks`
- **Prisma official** — Prisma/Drizzle/TypeORM only; 14 queries, **median of 500
  iterations**; NO throughput, NO p95/p99. `https://benchmarks.prisma.io/`
- **IMDBench (geldata/EdgeDB)** — Prisma, TypeORM, Sequelize, Drizzle + node-postgres
  (+ Hasura/PostGraphile); throughput (iter/s) + latency on 3 realistic CRUD ops.
  `https://github.com/geldata/imdbench`
- **JS-AK/db-orm-benchmarks** — 9 libs (`pg.pool` + Prisma, TypeORM, Sequelize,
  Drizzle, MikroORM, Objection, Kysely, custom); direct-timing, 50k×10 iters.
  `https://github.com/JS-AK/db-orm-benchmarks`
- **Orchid ORM** — Orchid, Prisma, Sequelize, Knex, Kysely; pool=10, ops/s over 10s.
  Numbers self-marked "approximate and out of date" (2023-06).
  `https://orchid-orm.netlify.app/guide/benchmarks.html`

## Two methodological schools observed

1. **HTTP-load** (k6/autocannon) — measures the full request roundtrip. → our choice.
2. **Direct-timing** — measures query execution in Node without HTTP.

Metrics in the wild: throughput (req/s, iter/s), latency (avg, P95), CPU, memory.
Pool commonly fixed (e.g. Orchid pool=10) or varied (Drizzle pooled/non-pooled).

## The gap (our contribution)

1. **No MySQL/mysql2** anywhere — all PostgreSQL-only.
2. **No neutral full-taxonomy peer-reviewed study** — academic work covers 2–3 libs;
   full comparisons are vendor marketing.
3. **Throughput and tail latency never reported together** — each source picks the
   metric that flatters its product.
4. **No Express/HTTP-layer focus** in the peer-reviewed work.

## Caveats

Landscape moves fast — library versions in every benchmark age quickly; treat
*rankings* as stale, *methodology* as reusable. Vendor sources are biased on "who
wins" but reliable on "what is compared / how". Some sources returned HTTP 403
(ScienceDirect, ResearchGate); verification leaned on indexed abstracts.
