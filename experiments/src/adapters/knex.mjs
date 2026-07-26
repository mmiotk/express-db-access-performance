// Query builder — Knex. Fluent SQL, same 2-query deep fetch (no N+1). Works on
// both engines by switching the client.
import knexFactory from 'knex';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThreadRows, canonSummary } from './_canon.mjs';

export default async function createAdapter({ engine, config }) {
  const knex = knexFactory({
    client: engine === 'postgres' ? 'pg' : 'mysql2',
    connection: engine === 'postgres' ? config.postgres : config.mysql,
    pool: { min: config.pool.min, max: config.pool.max },
  });

  return {
    name: 'knex',
    category: 'query-builder',

    async getPost(id) {
      return canonPost(await knex('posts').where({ id }).first());
    },

    async listPosts({ limit, before }) {
      return canonPosts(await knex('posts').where('id', '<', before).orderBy('id', 'desc').limit(limit));
    },

    async getThread(id) {
      const post = await knex('posts as p')
        .join('authors as a', 'a.id', 'p.author_id')
        .select('p.*', 'a.name as author_name', 'a.email as author_email')
        .where('p.id', id).first();
      if (!post) return null;

      const comments = await knex('comments as c')
        .join('authors as a', 'a.id', 'c.author_id')
        .select('c.id', 'c.body', 'c.created_at', 'a.id as author_id', 'a.name as author_name', 'a.email as author_email')
        .where('c.post_id', id).orderBy('c.id');

      return canonThreadRows(post, comments);
    },

    // Same-plan control: identical SQL + identical mapping via knex.raw.
    async getThreadRaw(id) {
      const p = await knex.raw(THREAD_Q1('?'), [id]);
      const post = (p.rows ? p.rows : p[0])[0]; // pg: {rows}; mysql2: [rows,fields]
      if (!post) return null;
      const c = await knex.raw(THREAD_Q2('?'), [id]);
      return mapThread(post, c.rows ? c.rows : c[0]);
    },

    async authorSummary(id) {
      // Aggregation via the raw escape hatch (documented in METHODOLOGY): correlated
      // subqueries touch only this author's rows — no fan-out, no full-table scan.
      const res = await knex.raw(
        `SELECT a.id AS author_id,
                (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
                (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
                (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE p.author_id = a.id) AS comments
           FROM authors a WHERE a.id = ?`, [id]);
      return canonSummary((res.rows ? res.rows : res[0])[0]);
    },

    async createPost({ authorId, title, body }) {
      const insert = knex('posts').insert({ author_id: authorId, title, body });
      // Knex's returning option is supported by PostgreSQL but not MySQL.
      // Passing it on MySQL emits one warning per request and would make console
      // I/O part of the measured treatment.
      const rows = engine === 'postgres' ? await insert.returning('id') : await insert;
      // pg returns [{id}], mysql returns [insertId]
      const id = typeof rows[0] === 'object' ? rows[0].id : rows[0];
      return { id: Number(id) };
    },

    // Transactional multi-statement write (review 6.7): post + comments in one
    // transaction, through Knex's transaction facility.
    async createThread({ authorId, title, body, comments }) {
      return knex.transaction(async (trx) => {
        const insert = trx('posts').insert({ author_id: authorId, title, body });
        const rows = engine === 'postgres' ? await insert.returning('id') : await insert;
        const pid = typeof rows[0] === 'object' ? rows[0].id : rows[0];
        await trx('comments').insert(comments.map((c) => ({ post_id: pid, author_id: c.authorId, body: c.body })));
        return { post_id: Number(pid), comments: comments.length };
      });
    },

    poolStats() {
      const p = knex.client?.pool; if (!p) return null;
      return { used: p.numUsed(), free: p.numFree(), pending: p.numPendingAcquires() };
    },

    async close() { await knex.destroy(); },
  };
}
