# Adapter contract

Every access layer implements the **same** factory so the Express server and the
benchmark runner stay layer-agnostic. One file per layer, ESM, default export:

```js
export default async function createAdapter({ engine, config }) {
  // engine: 'postgres' | 'mysql'
  // ... open a pool / client here ...
  return {
    name: 'pg',
    category: 'native-driver',

    // 1. POINT READ — fetch one post by primary key
    async getPost(id) { /* -> post | null */ },

    // 2. RANGE SCAN — newest-first page of posts
    async listPosts({ limit, offset }) { /* -> post[] */ },

    // 3. DEEP / NESTED FETCH (N+1-sensitive) — post + its author +
    //    all comments, each with its comment-author
    async getThread(id) { /* -> { post, author, comments:[{...,author}] } | null */ },

    // 4. AGGREGATION — per-author rollup (post count, comment count, total views)
    async authorSummary(id) { /* -> { author_id, posts, comments, views } | null */ },

    // 5. WRITE — insert a post, return its new id
    async createPost({ authorId, title, body }) { /* -> { id } */ },

    async close() { /* release pool */ },
  };
}
```

## Rules that keep the comparison fair

- **Same pool size** for every layer: read `config.pool.min/max` (default 10/10).
- **Same result shape**: return plain objects with the columns above. The deep
  fetch MUST actually resolve the nested `author` on every comment — this is
  where naive ORM usage triggers N+1. Each adapter should use that layer's
  *idiomatic recommended* way to avoid N+1 (join / `include` / `with` / relation
  loading), and that choice is documented in a top-of-file comment.
- **No per-request connect**: open the pool once in the factory, reuse it.
- **No caching layer** in front of the DB.

The `category` field feeds the paper's grouping (native-driver, query-builder,
orm-lightweight, orm).
