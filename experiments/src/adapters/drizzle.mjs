// ORM (lightweight) — Drizzle. Schema is defined per-dialect; queries use the
// typed query builder with explicit joins (2-query deep fetch, no N+1). This is
// Drizzle's idiomatic style and mirrors the native-driver query plan closely.
import { eq, lt, desc, sql } from 'drizzle-orm';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThread, canonThreadRows, canonSummary } from './_canon.mjs';

export default async function createAdapter({ engine, config }) {
  let db, tables, close, rawPool;

  if (engine === 'postgres') {
    const pg = (await import('pg')).default;
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const t = await import('drizzle-orm/pg-core');
    const authors = t.pgTable('authors', {
      id: t.bigserial('id', { mode: 'number' }).primaryKey(),
      name: t.varchar('name'), email: t.varchar('email'), created_at: t.timestamp('created_at', { withTimezone: true }),
    });
    const posts = t.pgTable('posts', {
      id: t.bigserial('id', { mode: 'number' }).primaryKey(),
      author_id: t.bigint('author_id', { mode: 'number' }),
      title: t.varchar('title'), body: t.text('body'), views: t.integer('views'),
      published: t.boolean('published'), created_at: t.timestamp('created_at', { withTimezone: true }),
    });
    const comments = t.pgTable('comments', {
      id: t.bigserial('id', { mode: 'number' }).primaryKey(),
      post_id: t.bigint('post_id', { mode: 'number' }),
      author_id: t.bigint('author_id', { mode: 'number' }),
      body: t.text('body'), created_at: t.timestamp('created_at', { withTimezone: true }),
    });
    const pool = new pg.Pool({ ...config.postgres, min: config.pool.min, max: config.pool.max });
    db = drizzle(pool); tables = { authors, posts, comments }; close = () => pool.end(); rawPool = pool;
  } else {
    const mysql = (await import('mysql2/promise')).default;
    const { drizzle } = await import('drizzle-orm/mysql2');
    const t = await import('drizzle-orm/mysql-core');
    const authors = t.mysqlTable('authors', {
      id: t.bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
      name: t.varchar('name', { length: 120 }), email: t.varchar('email', { length: 200 }), created_at: t.datetime('created_at'),
    });
    const posts = t.mysqlTable('posts', {
      id: t.bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
      author_id: t.bigint('author_id', { mode: 'number', unsigned: true }),
      title: t.varchar('title', { length: 200 }), body: t.text('body'), views: t.int('views'),
      published: t.boolean('published'), created_at: t.datetime('created_at'),
    });
    const comments = t.mysqlTable('comments', {
      id: t.bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
      post_id: t.bigint('post_id', { mode: 'number', unsigned: true }),
      author_id: t.bigint('author_id', { mode: 'number', unsigned: true }),
      body: t.text('body'), created_at: t.datetime('created_at'),
    });
    const pool = mysql.createPool({ ...config.mysql, connectionLimit: config.pool.max });
    db = drizzle(pool); tables = { authors, posts, comments }; close = () => pool.end(); rawPool = pool;
  }

  const { authors, posts, comments } = tables;

  return {
    name: 'drizzle',
    category: 'orm',

    async getPost(id) {
      const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      return canonPost(rows[0]);
    },

    async listPosts({ limit, before }) {
      return canonPosts(await db.select().from(posts).where(lt(posts.id, before)).orderBy(desc(posts.id)).limit(limit));
    },

    async getThread(id) {
      const postRows = await db
        .select({ id: posts.id, title: posts.title, body: posts.body, views: posts.views, created_at: posts.created_at,
                  author_id: authors.id, author_name: authors.name, author_email: authors.email })
        .from(posts).innerJoin(authors, eq(authors.id, posts.author_id)).where(eq(posts.id, id)).limit(1);
      const p = postRows[0];
      if (!p) return null;

      const cRows = await db
        .select({ id: comments.id, body: comments.body, created_at: comments.created_at,
                  author_id: authors.id, author_name: authors.name, author_email: authors.email })
        .from(comments).innerJoin(authors, eq(authors.id, comments.author_id))
        .where(eq(comments.post_id, id)).orderBy(comments.id);

      return canonThreadRows(p, cRows);
    },

    // Same-plan control: identical SQL + identical mapping via db.execute. The
    // shared statement is split on a placeholder token so the id stays a bound
    // parameter inside drizzle's sql template.
    async getThreadRaw(id) {
      const tpl = (text, val) => { const [a, b] = text.split('__P__'); return sql`${sql.raw(a)}${val}${sql.raw(b ?? '')}`; };
      const p = await db.execute(tpl(THREAD_Q1('__P__'), id));
      const post = engine === 'postgres' ? p.rows?.[0] : p[0]?.[0];
      if (!post) return null;
      const c = await db.execute(tpl(THREAD_Q2('__P__'), id));
      return mapThread(post, engine === 'postgres' ? c.rows : c[0]);
    },

    async authorSummary(id) {
      // aggregation kept as raw SQL for parity with the native baseline
      const res = await db.execute(sql`
        SELECT a.id AS author_id,
               (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
               (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
               (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
                  WHERE p.author_id = a.id) AS comments
          FROM authors a
         WHERE a.id = ${id}`);
      // node-postgres returns { rows }; mysql2 returns [rows, fields].
      return canonSummary(engine === 'postgres' ? res.rows?.[0] : res[0]?.[0]);
    },

    async createPost({ authorId, title, body }) {
      if (engine === 'postgres') {
        const rows = await db.insert(posts).values({ author_id: authorId, title, body }).returning({ id: posts.id });
        return { id: Number(rows[0].id) };
      }
      const res = await db.insert(posts).values({ author_id: authorId, title, body });
      return { id: Number(res[0].insertId) };
    },

    poolStats() {
      if (engine === 'postgres') {
        const p = rawPool; if (!p || p.totalCount == null) return null;
        return { used: p.totalCount - p.idleCount, free: p.idleCount, pending: p.waitingCount };
      }
      const p = rawPool?.pool; if (!p || !p._allConnections) return null;
      const all = p._allConnections.length, free = p._freeConnections.length;
      return { used: all - free, free, pending: p._connectionQueue ? p._connectionQueue.length : 0 };
    },

    async close() { await close(); },
  };
}
