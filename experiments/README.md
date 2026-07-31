# experiments/ — benchmark harness

Measures the cost of the **database access layer** in an Express.js service, as a
function of two factors:

- **configured treatment** (11): nine policy-selected documented paths plus two tuned native references; seven portable layers run on both backend stacks
- **engine** (2): PostgreSQL 18.4, MySQL 9.7.1 (the reference-run versions)

One Express app, one adapter contract ([`src/adapters/README.md`](src/adapters/README.md)),
five workload endpoints that map onto the canonical access patterns:

| Endpoint | Pattern | Stresses |
|---|---|---|
| `GET /posts/:id` | point read (PK) | per-query overhead |
| `GET /posts?limit&before` | range scan (keyset) | PK-index seek + row hydration |
| `GET /posts/:id/thread` | deep fetch | **N+1** avoidance, join strategy |
| `GET /authors/:id/summary` | aggregation | GROUP BY / raw-SQL escape hatch |
| `POST /posts` | single-row insert | insert + id return |

## Requirements

- Node ≥ 20 (tested on 24), npm
- DB engines, either:
  - **Docker** (`docker compose up -d`) — a workflow path pinning the same engine versions by digest, but with relaxed durability and a containerized topology; it does not reproduce the headline default-durability insert numbers, or
  - **No Docker / no root**: conda user-space engines via
    `scripts/db-local.sh` (`conda create -n dbbench -c conda-forge postgresql
    mysql-server`, then `./scripts/db-local.sh init`). The reference run used this
    path with PostgreSQL 18.4 / MySQL 9.7.1.

## Setup

```bash
cd experiments
npm ci
npm run db:up            # start postgres + mysql (docker compose)
npm run migrate          # create schema on both engines
npm run seed             # deterministic seed (2k authors, 100k posts, 1M comments)
node scripts/seed-fanout.mjs  # fixed fan-out cases and safe write-id floor
node scripts/make-seed-template.mjs
```

## Run

```bash
npm run campaign:rq2     # reference numerical matrix -> results/rq2-campaign2.json
npm run analyze:rq2      # validate and materialize results/current-primary.json
npm run tables:primary   # regenerate primary tables from current-primary.json
npm run campaign:rq2-validation  # same-host 42-cell RQ2 sensitivity
npm run analyze:rq2-validation   # validate comparison and generate S46
npm run bench:quick      # pg,knex,drizzle,prisma on postgres, 3s/1 repeat (sanity)
```

`npm run bench` remains a generic configurable harness command that writes `results/raw.json`; that file is superseded provenance and is not the revised paper's implicit data source.

Matrix knobs (env): `ADAPTERS`, `ENGINES`, `ENDPOINTS`, `DURATION`, `CONNECTIONS`, `REPEATS`, `WARMUP`. Independent campaigns additionally use `INDEP=1`, `REPLICATES`, `INDEP_OUT`, `CAMPAIGN_ID`, and `ORDER_SEED`.
Example: `ADAPTERS=pg,prisma ENGINES=postgres,mysql DURATION=10 REPEATS=3 node bench/runner.mjs`

## What is measured

Per (adapter × engine × endpoint), driven by **autocannon** over HTTP:

- **throughput** — requests/second (primary)
- **tail latency** — p50 / p90 / p97.5 / **p99** (the gap most vendor benchmarks omit)

Each cell is warmed (`WARMUP`s, discarded) and measured at run level. The revised primary design uses `INDEP=1` and 25 `REPLICATES`; each adapter--engine block receives a fresh application process, while database and host caches remain shared. The endpoint-level run is the inferential unit.

> Docker starts the workflow in a relaxed-durability regime. The headline single-row insert uses each engine default durability on the reference conda path; see `scripts/set-durability.mjs` and `schema/db-config.md`. Pool size is fixed at 10 for every adapter. See [`METHODOLOGY.md`](METHODOLOGY.md).

## Status

The complete revision artifact is archived as v1.13.8, which concept DOI 10.5281/zenodo.21313858 resolves to; the Zenodo record also carries an immutable per-version DOI. It includes the specification-derived read oracle, campaign-state preflight, accepted 90-cell corrected-state primary campaign, 42-cell same-host validation campaign, fresh secondary measurements, exact 42-file source snapshots for both accepted campaigns, source-located external protocol audit, and result-blind human-review packets. It does not claim independent reproduction or independent adapter review. [`../REPRODUCE.md`](../REPRODUCE.md) is the authoritative entry point; `MANIFEST.md` maps every table and figure to its data and generator.