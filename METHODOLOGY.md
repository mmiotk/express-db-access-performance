# Methodology

Design decisions for the benchmark, and the known pitfalls each one guards
against. Grounded in the prior-art review (`notes/prior-art.md`), especially
*Tell-Tale Tail Latencies* (Fritz et al., TPCTC 2021, arXiv:2107.11607) and
*The Tail at Scale* (Dean & Barroso, 2013).

## Factors

| Factor | Levels |
|---|---|
| Access layer | pg, mysql2, knex, drizzle, prisma, sequelize, typeorm, objection, mikroorm |
| Engine | PostgreSQL 16, MySQL 8.4 |
| Access pattern (endpoint) | point read, range scan, deep/nested fetch, aggregation, insert |

`pg` runs on PostgreSQL only, `mysql2` on MySQL only; every other layer runs on both.

## Response variables

- **Throughput** — requests/second (autocannon `requests.average`).
- **Tail latency** — p50, p90, p97.5, **p99** (ms). Reporting throughput *and*
  the tail together is the core contribution; vendor benchmarks report one or the
  other and pick whichever flatters them.

## Controls (what we hold constant so the layer is the only variable)

1. **Connection pool = 10** (min=max) for every adapter. Pool sizing is a known
   confounder; fixing it isolates access-layer overhead. A pool-sizing sweep is a
   planned secondary study, not mixed into the main comparison.
2. **Identical schema and data** on both engines, loaded by the native driver from
   a **deterministic seed** (fixed PRNG), independent of any adapter under test.
3. **Same logical query** per endpoint. Each adapter must use its layer's
   *recommended idiomatic* way to avoid N+1 on the deep fetch (join / `include` /
   `with` / eager loading); the choice is documented at the top of each adapter.
4. **Same result shape** returned to Express, so JSON serialization cost is equal.
5. **Load generator in a separate process** from the server (and ideally a separate
   machine — see below) to reduce observer interference.

## Pitfalls and mitigations

| Pitfall | Mitigation |
|---|---|
| **N+1 queries** silently inflating an ORM's numbers | Deep-fetch endpoint forces nested resolution; adapters use documented eager-loading; a correctness cross-check asserts all adapters return the same object. |
| **Cold start / JIT / pool fill** contaminating early samples | Explicit warm-up phase per endpoint (`WARMUP`s), measurements discarded; then `REPEATS` measured runs, median reported. |
| **Tail latency neglect** | p99 reported alongside throughput for every cell. |
| **Coordinated omission** (load tester stalls, hiding tail) | autocannon issues requests continuously at fixed concurrency; per-request latency histogram; document `CONNECTIONS`. Cross-checking with a fixed-rate tool (k6 constant-arrival) is a planned robustness check. |
| **Disk-sync noise** dominating over layer cost | Engines configured with durability off and working set in RAM (`docker-compose.yml`); benchmark targets access-layer CPU/allocation, not storage. |
| **Plan-cache / prepared-statement warmth differences** | Warm-up runs the exact endpoint mix first; seed is `ANALYZE`d after load. |
| **Environment drift** | `bench/environment.mjs` records Node version, CPU, RAM, OS into `results/environment.txt`, cited in the paper's setup table. |

## Reproducibility

- `REPEATS` medians per cell; coefficient of variation across repeats is available
  as a stability signal (`bench/stats.mjs`).
- All inputs are deterministic; the entire matrix is one command (`npm run bench`).
- Raw per-cell results (`results/raw.json`) and the released `summary.csv` back
  every number in the paper.

## Open method questions (to resolve before first submission)

- Client and server on the **same host** (simpler, some interference) vs **two
  machines over ethernet** (Drizzle's approach; cleaner, harder to reproduce)?
- Concurrency level(s): single `CONNECTIONS=50` point, or a sweep (1/10/50/100/200)
  to expose where each layer saturates?
- Add memory/CPU sampling per cell (RSS, `process.cpuUsage`) for a resource table?
