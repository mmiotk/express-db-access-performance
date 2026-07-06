# Benchmark design

See [[prior-art]] for why. Full rationale in `../METHODOLOGY.md`.

## Factors

- **Access layer** (9): pg, mysql2 (native) · knex (query builder) · drizzle
  (lightweight ORM) · prisma, sequelize, typeorm, objection, mikroorm (ORM).
- **Engine** (2): PostgreSQL 16, MySQL 8.4.
- **Access pattern** (5 endpoints): point read, range scan, deep/nested fetch
  (N+1-sensitive), aggregation, insert.

## Domain schema

`authors 1—* posts 1—* comments *—1 authors`. Minimal but exercises 1:1, 1:N, and
a two-hop join for the deep fetch. Seed: 1k authors / 20k posts / 200k comments
(deterministic PRNG), working set fits in RAM.

## Adapter contract

One factory per layer, 5 methods + `close()`; identical result shape. Each adapter
uses that layer's *recommended* N+1 avoidance (join / include / with / eager load).
Contract: `../experiments/src/adapters/README.md`.

## Response variables

Throughput (req/s) **and** p50/p90/p97.5/p99 — the pairing that prior art omits.

## Decisions log

- Pool fixed at 10 for all adapters (isolate the layer; pool sweep is a side study).
- Load via autocannon (pure Node, no external binary; gives latency percentiles).
- Durability off + in-RAM working set (measure layer cost, not disk).
- Warm-up per endpoint discarded; medians over REPEATS reported.

## Open questions

Same-host vs two-machine · concurrency sweep · resource (CPU/RSS) sampling ·
k6 constant-arrival cross-check. Tracked in `../TODO.md`.
