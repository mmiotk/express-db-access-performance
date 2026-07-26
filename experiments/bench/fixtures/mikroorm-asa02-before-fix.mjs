// ORM — MikroORM (Data Mapper / Unit of Work) via EntitySchema, decorator-free.
// Deep fetch uses `populate` (MikroORM batches related loads, avoiding N+1).
// A fresh EntityManager fork is used per request to isolate identity maps.
import { MikroORM, EntitySchema } from '@mikro-orm/core';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThread, canonSummary } from './_canon.mjs';

const Author = new EntitySchema({
  name: 'Author', tableName: 'authors',
  properties: {
    id: { type: 'bigint', primary: true },
    name: { type: 'string' }, email: { type: 'string' },
    created_at: { type: 'Date', nullable: true },
    posts: { kind: '1:m', entity: 'Post', mappedBy: 'author' },
  },
});
const Post = new EntitySchema({
  name: 'Post', tableName: 'posts',
  properties: {
    id: { type: 'bigint', primary: true },
    title: { type: 'string' }, body: { type: 'text' },
    views: { type: 'integer' }, published: { type: 'boolean' },
    created_at: { type: 'Date', nullable: true },
    author: { kind: 'm:1', entity: 'Author', fieldName: 'author_id' },
    comments: { kind: '1:m', entity: 'Comment', mappedBy: 'post' },
  },
});
const Comment = new EntitySchema({
  name: 'Comment', tableName: 'comments',
  properties: {
    id: { type: 'bigint', primary: true },
    body: { type: 'text' }, created_at: { type: 'Date', nullable: true },
    post: { kind: 'm:1', entity: 'Post', fieldName: 'post_id' },
    author: { kind: 'm:1', entity: 'Author', fieldName: 'author_id' },
  },
});

export default async function createAdapter({ engine, config }) {
  const c = engine === 'postgres' ? config.postgres : config.mysql;
  const driver = engine === 'postgres'
    ? (await import('@mikro-orm/postgresql')).PostgreSqlDriver
    : (await import('@mikro-orm/mysql')).MySqlDriver;

  const orm = await MikroORM.init({
    driver,
    host: c.host, port: c.port, user: c.user, password: c.password, dbName: c.database,
    entities: [Author, Post, Comment],
    pool: { min: config.pool.min, max: config.pool.max },
    debug: false, discovery: { warnWhenNoEntities: false },
  });

  const num = (v) => (typeof v === 'string' || typeof v === 'bigint' ? Number(v) : v);

  return {
    name: 'mikroorm',
    category: 'orm',

    async getPost(id) {
      const em = orm.em.fork();
      const p = await em.findOne(Post, { id });
      return p ? canonPost({ ...p, author_id: p.author?.id ?? p.author }) : null;
    },

    async listPosts({ limit, before }) {
      const em = orm.em.fork();
      const rows = await em.find(Post, { id: { $lt: before } }, { orderBy: { id: 'DESC' }, limit });
      return rows.map((p) => canonPost({ ...p, author_id: p.author?.id ?? p.author }));
    },

    async getThread(id) {
      const em = orm.em.fork();
      const post = await em.findOne(Post, { id }, {
        populate: ['author', 'comments', 'comments.author'],
        orderBy: { comments: { id: 'ASC' } },
      });
      return post ? canonThread(post, post.author, post.comments.getItems()) : null;
    },

    // Same-plan control: identical SQL + identical mapping via the connection's
    // raw execute (fork mirrors this adapter's per-request idiom).
    async getThreadRaw(id) {
      const em = orm.em.fork();
      const conn = em.getConnection();
      const postRows = await conn.execute(THREAD_Q1('?'), [id]);
      if (!postRows[0]) return null;
      const commentRows = await conn.execute(THREAD_Q2('?'), [id]);
      return mapThread(postRows[0], commentRows);
    },

    async authorSummary(id) {
      const em = orm.em.fork();
      const knex = em.getConnection().getKnex?.();
      // MikroORM's SQL drivers expose the underlying knex; fall back to raw exec.
      const rows = await em.getConnection().execute(
        `SELECT a.id AS author_id,
                (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
                (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
                (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE p.author_id = a.id) AS comments
           FROM authors a
          WHERE a.id = ?`, [id]);
      void knex;
      return canonSummary(rows[0]);
    },

    async createPost({ authorId, title, body }) {
      const em = orm.em.fork();
      const post = em.create(Post, { author: em.getReference(Author, authorId), title, body, views: 0, published: true });
      await em.persistAndFlush(post);
      return { id: num(post.id) };
    },

    poolStats() {
      const k = orm.em.getConnection().getKnex?.();
      const p = k?.client?.pool; if (!p) return null;
      return { used: p.numUsed(), free: p.numFree(), pending: p.numPendingAcquires() };
    },

    async close() { try { await orm.close(true); } catch { /* teardown races on pooled conns */ } },
  };
}
