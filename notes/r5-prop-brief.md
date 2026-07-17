# R5 propagation brief — rewrite the manuscript against the current-versions data

**All numbers are in `notes/r5-numbers.md` (auto-dumped from the final results).** Use
those exactly; do not invent or carry over any old value. Cross-check every figure you
write against `paper/tables/*.tex` (regenerated from the new data).

## The single biggest change: the Prisma / CPU story is RETIRED and REPLACED

The paper was re-run on the latest stable versions (Prisma 5.22 -> **7.8, Rust-free**;
Drizzle 0.45, TypeORM 1.1, MikroORM 7, Express 5). Consequences to propagate everywhere
(results, discussion, threats, abstract, conclusion, intro contributions):

1. **No layer is multi-core anymore. MAX app-CPU across all 90 cells = 110%.** DELETE
   every trace of: Prisma ~498%/469%/five-cores, "cores-for-latency", "cores-for-throughput",
   the app-vs-combined-CPU 813-vs-596 story, "Prisma needs ~4 cores", "multi-threaded/
   in-process Rust query engine", "pipelined query engine", "query-engine ORM Prisma".
2. **Prisma 7 is now mid-to-low throughput everywhere** (Rust-free TS client via a JS
   driver adapter: `@prisma/adapter-pg` / `@prisma/adapter-mariadb`). It is **7th on both
   reads, 5th (PG)/7th (MySQL) on deep fetch, LAST on aggregation (both engines), and last
   on MySQL writes**. The old "Prisma ties, and on several patterns leads, the native
   driver" is FALSE now -> replace with the current finding.
3. **Native leads reads AND writes on both engines.** Native `pg` runs at ~100% app CPU
   but drives the database harder (deep-fetch db-CPU ~355%) because it issues lean SQL;
   the ORMs sit at ~100% app and lower db-CPU.
4. **Equal-CPU control (S4) flips:** every layer is ~single-core-bound (pg flat
   3689/3688/3687; prisma 1079/1052/1219; mikroorm 446/495/522). No layer benefits much
   from extra cores. Old "Prisma scales 896->3025" is gone.
5. **Multi-worker cluster (S23) new finding:** because Prisma is ~1-core-bound *per
   process*, it scales out nearly linearly under `node:cluster` (PG 1117 -> 2275 -> 4449 at
   1/2/4 workers), reaching native-like aggregate throughput at 4 workers. Frame as: the
   current low per-process throughput is recovered by horizontal scaling, at 4x the
   processes/cores.
6. **This old->new contrast IS the paper's thesis, demonstrated with data:** the R4 headline
   (a 5-core Prisma tying native) was an artifact of a superseded library generation; one
   re-run of the *same instrument* retired it. Rankings are perishable; the harness,
   design, and pitfalls are durable. Lead the abstract/intro/discussion with this.

## Numbers to propagate (see r5-numbers.md for the full tables)
- Deep-fetch native-relative spread **7.15x (PG) / 4.96x (MySQL)**; per-pattern spreads:
  point 2.78/2.11, range 4.21/3.85, agg 1.83/1.72, write 3.23/1.98.
- Cross-engine Spearman rho: point 0.86, range 0.89, deep 0.86 (reads transfer strongly);
  aggregation 0.64, write 0.68 (moderate). So: **reads transfer, aggregation and writes
  transfer only moderately** (do not say writes "do not transfer" -- rho=0.68 is moderate).
- Utilization (co-primary): at 50% of own capacity every layer holds deep-fetch p99
  ~2-5 ms on both engines; tails diverge only near saturation (e.g. objection PG 95% ->
  285 ms). The wide saturated ladder is a capacity/queueing effect (already stated).
- Same-SQL: on identical raw SQL the deep-fetch field compresses (e.g. PG drizzle idiomatic
  1865 -> raw 3237, prisma 1186 -> raw 2155, knex 2487 -> raw 2926); the idiomatic
  eager-loading strategy, not the machinery, drives most of the spread. Keep the
  compound-contrast framing (bounds, isolates no single factor).

## Keep (do NOT undo) the R5 framing already in place
- Three operating conditions named in methodology (equal demand / equal utilization /
  equal resource); RQ1 = "performance difference" not "overhead"; utilization elevated to
  co-primary; saturated p99 = overload/queueing; within-campaign CIs; novelty-search audit;
  the estimand/language edits from commits 762c139 / 6433ae1.

## New pitfall example (correctness before timing)
MikroORM 7 removed `persistAndFlush`; the read-path byte-equivalence check passed, but
every mikroorm *write* threw a 500 -- which returns faster than a real insert, so the
broken cells showed inflated throughput (spuriously "leading" MySQL writes) until the
runner's non-2xx counters caught it. Add to the pitfalls checklist + the cross-check
narrative as a fresh, current example.

## Version/setup facts for the methodology + versions table (S11)
Freeze date 2026-07-15; measured 2026-07-16/17; Node 24.18; Express 5; Prisma 7.8
(pg/mariadb driver adapters -- Prisma ships no mysql2 adapter, disclose); Drizzle 0.45.2,
TypeORM 1.1, MikroORM 7.1.6, mysql2 3.23, pg 8.22, knex 3.3, sequelize 6.37.8 (v7 is a
prerelease -> 6.x stable used, documented), objection 3.1.5. Rewrite the freeze paragraph
to the "latest stable compatible at the freeze date" rule (Priority-1). DB engines PG
18.4 / MySQL 9.7.1 unchanged.
