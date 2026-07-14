# Database configuration and schema (both engines)

This file records the exact database configuration and DDL used in the benchmark,
so the server side can be reproduced independently of the harness (review §9).

## Engine versions (pinned by content digest)

| Engine | Image tag | Digest |
|---|---|---|
| PostgreSQL | `postgres:18.4` | `sha256:22c89fe0…fe8f9a4` |
| MySQL | `mysql:9.7.1` | `sha256:ae269281…d7fa0370` |

Digests are pinned in `experiments/docker-compose.yml` so a re-pushed tag cannot
silently change the engine.

## Server configuration

Both engines are tuned to hold the seeded working set in memory, so measurements
reflect access-layer overhead rather than storage latency. All settings not listed
below are the pinned engine version's defaults.

### PostgreSQL 18.4
```
shared_buffers      = 512MB
max_connections     = 200
```
Durability settings depend on the campaign (see below).

### MySQL 9.7.1
```
innodb_buffer_pool_size      = 512M
max_connections              = 200
```
Durability settings depend on the campaign (see below).

## Two durability configurations

The harness distinguishes two configurations explicitly:

1. **Relaxed (default docker-compose state).** For the read-pattern campaigns,
   disk-sync noise is removed so the access-layer comparison is fair on CPU-bound
   work: PostgreSQL runs `fsync=off synchronous_commit=off full_page_writes=off`;
   MySQL runs `innodb_flush_log_at_trx_commit=0`. These are set in
   `docker-compose.yml`. **Never use these in production.**

2. **Default durability (primary insert campaign).** The headline insert results
   are measured under each engine's *default* durability from a physically rebuilt
   write state: PostgreSQL with `fsync=on synchronous_commit=on`; MySQL with
   `innodb_flush_log_at_trx_commit=1`. The rebuild procedure and rationale are in
   the paper's methodology (physical write-state rebuild) and in the durability
   sensitivity run (`results/durability.json`).

## Schema and index DDL

The full schema, including every index, is committed per engine:

- `experiments/schema/postgres.sql`
- `experiments/schema/mysql.sql`

Indexes (both engines): `posts(author_id)`, `posts(created_at DESC)`,
`comments(post_id)`, `comments(author_id)`, plus the primary keys. The keyset range
scan uses `posts(created_at DESC)` / the primary key; the deep fetch and
aggregation use the `comments(post_id)` and `posts(author_id)` indexes. Prisma
schemas mirror the same tables in `experiments/prisma/schema.{postgres,mysql}.prisma`.
