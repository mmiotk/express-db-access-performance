# experiments/ — benchmark harness

Measures the cost of the **database access layer** in an Express.js service, as a
function of two factors:

- **access layer** (9): native driver → query builder → ORM
  (`pg`/`mysql2`, `knex`, `drizzle`, `prisma`, `sequelize`, `typeorm`, `objection`, `mikroorm`)
- **engine** (2): PostgreSQL 18.4, MySQL 9.7.1 (the reference-run versions)

One Express app, one adapter contract ([`src/adapters/README.md`](src/adapters/README.md)),
five workload endpoints that map onto the canonical access patterns:

| Endpoint | Pattern | Stresses |
|---|---|---|
| `GET /posts/:id` | point read (PK) | per-query overhead |
| `GET /posts?limit&before` | range scan (keyset) | PK-index seek + row hydration |
| `GET /posts/:id/thread` | deep/nested fetch | **N+1** avoidance, join strategy |
| `GET /authors/:id/summary` | aggregation | GROUP BY / raw-SQL escape hatch |
| `POST /posts` | write | insert + id return |

## Requirements

- Node ≥ 20 (tested on 24), npm
- DB engines, either:
  - **Docker** (`docker compose up -d`) — a convenience path pinning PostgreSQL 16 /
    MySQL 8.4 (older than the reference run; use the conda path below to reproduce the
    published numbers), or
  - **No Docker / no root**: conda user-space engines via
    `scripts/db-local.sh` (`conda create -n dbbench -c conda-forge postgresql
    mysql-server`, then `./scripts/db-local.sh init`). The reference run used this
    path with PostgreSQL 18.4 / MySQL 9.7.1.

## Setup

```bash
cd experiments
npm install
npm run db:up            # start postgres + mysql (docker compose)
npm run migrate          # create schema on both engines
npm run seed             # deterministic seed (1k authors, 20k posts, 200k comments)
npm run prisma:generate:pg   # Prisma client for postgres (regenerate per engine)
```

## Run

```bash
npm run bench            # full matrix → results/{raw.json,summary.csv}, tables/*.tex
npm run bench:quick      # pg,knex,drizzle,prisma on postgres, 3s/1 repeat (sanity)
npm run sync:tables      # copy generated LaTeX tables into ../paper/tables/
```

Matrix knobs (env): `ADAPTERS`, `ENGINES`, `DURATION`, `CONNECTIONS`, `REPEATS`, `WARMUP`.
Example: `ADAPTERS=pg,prisma ENGINES=postgres,mysql DURATION=10 REPEATS=3 node bench/runner.mjs`

## What is measured

Per (adapter × engine × endpoint), driven by **autocannon** over HTTP:

- **throughput** — requests/second (primary)
- **tail latency** — p50 / p90 / p97.5 / **p99** (the gap most vendor benchmarks omit)

Each cell is warmed (`WARMUP`s, discarded) then measured `REPEATS`× and reported as
the median. Server runs as a separate process from the load generator.

> Engine tuning (`docker-compose.yml`) disables fsync/durability **on purpose** to
> remove disk-sync noise — this is an ephemeral benchmark, never a production config.
> Pool size is fixed at 10 for every adapter so the comparison isolates the access
> layer, not pool tuning. See [`../METHODOLOGY.md`](../METHODOLOGY.md).

## Status

Complete and archived. The full matrix (11 access layers × PostgreSQL + MySQL × five
access patterns, 25 independent runs per cell) has been measured on the reference host
(PostgreSQL 18.4 / MySQL 9.7.1 via the conda path), byte-equivalence cross-checked
(`bench/verify.mjs`), and released. The manuscript, raw per-cell data, and table
generators are archived on Zenodo (concept DOI 10.5281/zenodo.21313858). See
`REPRODUCE.md` at the repo root for the one-command reproduction path and
`MANIFEST.md` for the table-to-generator map.
