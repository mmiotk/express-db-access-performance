# Documentation-selected deep-fetch choices, per access layer

## Purpose and principle

This document records, for every access layer in the benchmark, exactly how the
**deep fetch** is implemented and which documented alternative loading
strategy we deliberately did *not* use. The deep fetch materializes one post with
its author and all of its comments, each comment with its own comment-author
(the `post → author`, `post → comments → comment-author` graph).

The guiding principle is that **each layer uses the path selected by the predeclared documentation rule** — the relation-loading API that the pinned-version official documentation presents first — rather than a claim about a typical, competent, or performance-tuning developer. The two explicitly labelled *tuned* native adapters (`pg-tuned`, `mysql2-tuned`) are separate reference points, not documentation-selected treatments.
For every layer we additionally verify that **query logging is disabled**, that no
lifecycle hooks or validation run on the read path, and that entity tracking /
identity maps (where they exist) are either absent or scoped so they cannot leak
state across requests. This keeps the comparison about each library's selected
relational-fetch treatment, not about incidental instrumentation.

## Library inclusion and exclusion

The eleven levels of the access-layer factor were fixed before measurement by the
criteria below; the aim is a representative cross-section of the taxonomy, not an
exhaustive catalogue.

**Inclusion criteria.** A candidate library is included if it:

1. is actively maintained and in common production use (npm downloads / GitHub
   prominence at the July 2026 freeze);
2. occupies a distinct tier of the native-driver → query-builder → ORM taxonomy,
   classified by its dominant interface (not its self-description); and
3. for the portable (cross-engine) tiers, runs against **both** PostgreSQL and MySQL
   under the one uniform schema, exposing a documented relation / eager-loading path for
   the deep fetch (so the N+1 treatment is well defined).

The native-driver tier is the exception to (3): it is represented by each engine's
standard driver — `pg` for PostgreSQL, `mysql2` for MySQL, engine-specific by nature —
plus the two tuned baselines (`pg-tuned`, `mysql2-tuned`).

**Excluded candidates (and why).**

| Candidate | Tier | Reason for exclusion |
|---|---|---|
| Kysely | Query builder | Portable (PostgreSQL + MySQL), but the **same tier as Knex**, which already represents it. Being a query builder, its deep-fetch relation query is hand-composed (`jsonArrayFrom` / `jsonObjectFrom` helpers) — a query-builder join, not an ORM eager-loading abstraction — so it adds no distinct tier behavior. |
| Slonik | PostgreSQL client | **PostgreSQL-only** (built on `pg`); cannot serve as a portable cross-engine layer (fails criterion 3). |
| pg-promise | PostgreSQL client | **PostgreSQL-only**; same reason. |

Other query builders and ORMs were omitted for the same two reasons: either
PostgreSQL-only (non-portable) or a tier already represented by an included library. The
manuscript summarizes this in Section 3 (Factors and treatments).

## Selection protocol (fixed before measurement)

The documentation-selected API for each layer was chosen by a single rule, decided **before** any
timing was collected: *use the eager-loading (relation-loading) API that the
library's own official documentation for the pinned major version presents first in
its "loading related records / eager loading / populating relations" section, with
query logging, lifecycle hooks, and validation disabled and any identity map scoped
per request.* This makes the documentation-selected treatment a documented, reproducible choice
rather than an editorial one; the exact API, the pinned version, and the
documentation page that justifies each choice are recorded below. We did not invite
the library maintainers to review the adapters; that is disclosed as a limitation.

| Layer | Pinned version | Chosen deep-fetch API | Justifying documentation |
|---|---|---|---|
| `pg` | 8.22.0 | hand-written parameterized JOIN (`pool.query`) | native driver — no relation API; `https://node-postgres.com/features/queries` |
| `mysql2` | 3.23.0 | hand-written JOIN (`pool.query`) | native driver — no relation API; `https://sidorares.github.io/node-mysql2/docs` |
| `knex` | 3.3.0 | builder `.join()` | `https://knexjs.org/guide/query-builder.html#join` |
| `drizzle-orm` | 0.45.2 | core builder `.innerJoin()` | `https://orm.drizzle.team/docs/joins` |
| `prisma` (`@prisma/client`) | 7.8.0 | `include` (nested reads) | `https://www.prisma.io/docs/orm/prisma-client/queries/relation-queries` |
| `sequelize` | 6.37.8 | `include` eager loading | `https://sequelize.org/docs/v6/advanced-association-concepts/eager-loading/` |
| `typeorm` | 1.1.0 | `relations` find option | `https://typeorm.io/docs/working-with-entity-manager/find-options` |
| `objection` | 3.1.5 | `withGraphFetched` | `https://vincit.github.io/objection.js/guide/query-examples.html#eager-loading` |
| `@mikro-orm/core` | 7.1.6 | `populate` | `https://mikro-orm.io/docs/populating-relations` |

The two *tuned* baselines (`pg-tuned`, `mysql2-tuned`) reuse the native drivers' plan
as reusable prepared statements and are labelled separately. Each layer's declined
alternative loading strategy (join versus select-in) and its state flags are in the
per-adapter sections below; the loading-strategy sensitivity check (paper §Results,
Supplement Table S18) measures the declined alternative where it is a byte-identical
drop-in.

Round-trip counts for the eight portable layers are the empirically captured values
from server-side statement logging on PostgreSQL (`paper/tables/query_counts.tex`,
generated by `scripts/capture-plans.mjs`). The three native-family adapters not in
that table (`mysql2`, `pg-tuned`, `mysql2-tuned`) issue the identical hand-written
two-statement plan (`THREAD_Q1` + `THREAD_Q2` in `src/adapters/_threadraw.mjs`), so
their deep fetch is two round-trips by construction.

A separate *same-SQL* standardized contrast (`getThreadRaw`, endpoint `/posts/:id/thread-raw`) runs the identical two-statement plan through every layer's raw-SQL facility. It standardizes SQL and row mapping while jointly changing the API, protocol, query strategy, hydration, and other mechanisms; it is diagnostic and isolates no single cause.

---

## Per-adapter

### pg (native driver, PostgreSQL) — baseline

- **Deep-fetch API:** two hand-written parameterized `pool.query(...)` calls.
  Post + author: `SELECT p.*, a.name AS author_name, a.email AS author_email FROM
  posts p JOIN authors a ON a.id = p.author_id WHERE p.id = $1`; then comments +
  comment-authors: `SELECT c.id, c.body, c.created_at, a.id AS author_id,
  a.name AS author_name, a.email AS author_email FROM comments c JOIN authors a
  ON a.id = c.author_id WHERE c.post_id = $1 ORDER BY c.id`.
- **Round-trips:** 2 (measured).
- **Alternative not used:** n/a (hand-written SQL). One could collapse to a single
  post⋈comments join, but that fans out the post row across comments; the two-query
  split is the documentation-selected no-fan-out plan and is the shared baseline all layers target.
- **Logging:** disabled — `new pg.Pool(...)` carries no logging option.
- **Tracking / hooks / validation:** none. Native driver: no identity map, no
  lifecycle hooks, no validation on the read path.

### mysql2 (native driver, MySQL) — baseline

- **Deep-fetch API:** two hand-written `pool.query(...)` calls with `?` placeholders,
  the same two SQL statements as `pg` (JOIN post→author, then JOIN
  comments→comment-author, `ORDER BY c.id`).
- **Round-trips:** 2 (by construction; identical plan to `pg`).
- **Alternative not used:** n/a (hand-written SQL).
- **Logging:** disabled — `mysql.createPool(...)` carries no logging option.
- **Tracking / hooks / validation:** none (native driver).

### pg-tuned (native driver, tuned) — PostgreSQL

- **Deep-fetch API:** same two statements as `pg`, but issued as **named prepared
  statements** via `pool.query({ name, text, values })`
  (`qThread1 = P('t_thread_q1', THREAD_Q1('$1'))`, `qThread2 = P('t_thread_q2',
  THREAD_Q2('$1'))`). The driver prepares once per connection and executes by name.
- **Round-trips:** 2 (by construction).
- **Alternative not used:** n/a (hand-written SQL). The tuning axis here is
  statement reuse, not loading strategy.
- **Logging:** disabled — no logging option on the pool.
- **Tracking / hooks / validation:** none (native driver).

### mysql2-tuned (native driver, tuned) — MySQL

- **Deep-fetch API:** same two statements as `mysql2`, issued via
  `pool.execute(THREAD_Q1('?'), [id])` then `pool.execute(THREAD_Q2('?'), [id])` —
  the binary protocol with server-side prepared statements cached per connection.
- **Round-trips:** 2 (by construction).
- **Alternative not used:** n/a (hand-written SQL).
- **Logging:** disabled — no logging option on the pool.
- **Tracking / hooks / validation:** none (native driver).

### knex (query builder)

- **Deep-fetch API:** fluent builder with explicit joins:
  `knex('posts as p').join('authors as a', 'a.id', 'p.author_id').select('p.*',
  'a.name as author_name', 'a.email as author_email').where('p.id', id).first()`;
  then `knex('comments as c').join('authors as a', 'a.id', 'c.author_id')
  .select(...).where('c.post_id', id).orderBy('c.id')`.
- **Round-trips:** 2 (measured).
- **Alternative not used:** n/a (hand-written SQL). Knex is a query builder with no
  eager-loading / relation abstraction; the two explicit joins are the documentation-selected form.
- **Logging:** disabled — `knexFactory({...})` sets no `log:` handler and `debug` is
  left at its `false` default.
- **Tracking / hooks / validation:** none. Query builder: no identity map, no hooks,
  no validation.

### drizzle (lightweight ORM)

- **Deep-fetch API:** typed core query builder with explicit `.innerJoin(...)`:
  `db.select({...}).from(posts).innerJoin(authors, eq(authors.id, posts.author_id))
  .where(eq(posts.id, id)).limit(1)`; then `db.select({...}).from(comments)
  .innerJoin(authors, eq(authors.id, comments.author_id))
  .where(eq(comments.post_id, id)).orderBy(comments.id)`.
- **Round-trips:** 2 (measured).
- **Alternative not used:** Drizzle's higher-level **relational query API**
  (`db.query.posts.findFirst({ with: { author: true, comments: { with: { author:
  true } } } })`), which plans the nested graph for you. We used the manual core
  query builder with explicit joins instead.
- **Logging:** disabled — `drizzle(pool)` is created with no `{ logger: true }`
  option.
- **Tracking / hooks / validation:** none. Drizzle is stateless: no identity map,
  no lifecycle hooks, no validation on reads.

### prisma (ORM)

- **Deep-fetch API:** `prisma.post.findUnique({ where: { id: BigInt(id) },
  include: { author: true, comments: { include: { author: true },
  orderBy: { id: 'asc' } } } })`.
- **Round-trips:** 4 (measured). Prisma's default strategy issues separate batched
  queries per relation level (no N+1).
- **Alternative not used:** `relationLoadStrategy: 'join'` — Prisma's database-side
  correlated-subquery / JSON-join strategy. We used the default
  `relationLoadStrategy: 'query'` (separate batched queries).
- **Logging:** disabled — `new PrismaClient()` is constructed with no `log:` option,
  so no query events are emitted.
- **Tracking / hooks / validation:** none on the read path. The Prisma client is
  stateless (no identity map / entity tracking); no query-extension middleware or
  hooks are registered.

### sequelize (ORM)

- **Deep-fetch API:** `Post.findByPk(id, { include: [{ model: Author, as: 'author'
  }, { model: Comment, as: 'comments', include: [{ model: Author, as: 'author' }],
  separate: false }], order: [[{ model: Comment, as: 'comments' }, 'id', 'ASC']] })`.
- **Round-trips:** 1 (measured). A single query with joins; `separate: false`
  explicitly pins the JOIN strategy for the `hasMany` comments association.
- **Alternative not used:** **`separate: true`** — Sequelize's select-in / separate-
  query loading for the `hasMany` comments association (one extra `WHERE post_id IN
  (...)` query). We explicitly chose the single-JOIN form (`separate: false`).
- **Logging:** disabled — `logging: false` is set explicitly in the `Sequelize`
  constructor.
- **Tracking / hooks / validation:** `timestamps: false` on all three models; no
  hooks and no validators declared; no identity map. `getThread` hydrates model
  instances and returns `post.toJSON()`, but no lifecycle callbacks fire on the read.

### typeorm (ORM)

- **Deep-fetch API:** `posts.findOne({ where: { id }, relations: { author: true,
  comments: { author: true } }, order: { comments: { id: 'ASC' } } })`.
- **Round-trips:** 2 (measured), using TypeORM's default join-based relation loading.
- **Alternative not used:** **`relationLoadStrategy: 'query'`** — TypeORM's separate-
  query-per-relation strategy. We used the default `'join'` (LEFT JOINs).
- **Logging:** disabled — `logging: false` is set in the `DataSource` config
  (alongside `synchronize: false`).
- **Tracking / hooks / validation:** no entity subscribers or listeners registered;
  no validation; `synchronize: false`. `find` returns fresh entities (no identity
  map on the read path).

### objection (ORM, built on Knex)

- **Deep-fetch API:** `Post.query().findById(id)
  .withGraphFetched('[author, comments(orderById).author]')
  .modifiers({ orderById: (b) => b.orderBy('comments.id') })`.
- **Round-trips:** 4 (measured). `withGraphFetched` loads the graph with separate
  batched queries per relation (no N+1).
- **Alternative not used:** **`withGraphJoined`** — Objection's single-query,
  JOIN-based eager loading. We used `withGraphFetched` (separate queries).
- **Logging:** disabled — the underlying `knexFactory({...})` sets no `log:` handler
  and leaves `debug` at `false`.
- **Tracking / hooks / validation:** no identity map; no `$beforeFind` /
  lifecycle hooks defined on the models; no `jsonSchema`, so no validation runs.

### mikroorm (ORM, Data Mapper / Unit of Work)

- **Deep-fetch API:** `em.findOne(Post, { id }, { populate: ['author', 'comments',
  'comments.author'], orderBy: { comments: { id: 'ASC' } } })`, run on a fresh
  `orm.em.fork()` per request.
- **Round-trips:** 1 (measured) — the effective populate strategy resolves to a
  single joined query (no N+1).
- **Alternative not used:** **`strategy: 'select-in'`** (`LoadStrategy.SELECT_IN`) —
  MikroORM's separate `WHERE id IN (...)` population per relation. The config leaves
  `loadStrategy` at its default, which produced the single joined query measured here.
- **Logging:** disabled — `MikroORM.init({ ..., debug: false })`.
- **Tracking / hooks / validation:** MikroORM keeps a Unit of Work + identity map,
  but the adapter takes a **fresh `em.fork()` per request** so each identity map is
  isolated and discarded after the request (no cross-request state). No lifecycle
  hooks are declared on the entities and no validation runs; reads are never flushed.

---

## Closing note: alternatives a sensitivity check could exercise

Five layers expose a documented alternative loading strategy that a planned
follow-up sensitivity experiment could exercise, swapping only the loading path while
holding everything else fixed:

| Layer | Chosen (documentation-selected default) | Documented alternative not used |
|-------|----------------------------|---------------------------------|
| drizzle | manual core builder with explicit joins | relational query API (`db.query...with`) |
| prisma | `relationLoadStrategy: 'query'` (default) | `relationLoadStrategy: 'join'` |
| sequelize | `separate: false` (single JOIN) | `separate: true` (select-in) |
| typeorm | `relationLoadStrategy: 'join'` (default) | `relationLoadStrategy: 'query'` |
| objection | `withGraphFetched` (separate queries) | `withGraphJoined` (single JOIN) |
| mikroorm | joined populate (default) | `strategy: 'select-in'` (`LoadStrategy.SELECT_IN`) |

The remaining layers have no such switch: the two native drivers, the two tuned
native variants, and Knex all issue hand-written SQL, so there is no library-level
loading strategy to vary (only the SQL itself, which is held constant as the shared
baseline). Note the two directions cancel across the ORMs — some default to a single
JOIN (Sequelize, TypeORM, MikroORM) and some to separate batched queries (Prisma,
Objection) — so a sensitivity sweep would probe both directions of the
join-vs-select-in trade-off.
