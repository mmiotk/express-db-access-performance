// ORM (lightweight) — Drizzle. Schema is defined per-dialect; queries use the
// typed query builder with explicit joins (2-query deep fetch, no N+1). This is
// Drizzle's idiomatic style and mirrors the native-driver query plan closely.
import { eq, desc, sql } from 'drizzle-orm';

export default async function createAdapter({ engine, config }) {
  let db, tables, close;

  if (engine === 'postgres') {
    const pg = (await import('pg')).default;
    const { drizzle } = await import('drizzle-orm/node-postgres');
    const t = await import('drizzle-orm/pg-core');
    const authors = t.pgTable('authors', {
      id: t.bigserial('id', { mode: 'number' }).primaryKey(),
      name: t.varchar('name'), email: t.varchar('email'), created_at: t.timestamp('created_at'),
    });
    const posts = t.pgTable('posts', {
      id: t.bigserial('id', { mode: 'number' }).primaryKey(),
      author_id: t.bigint('author_id', { mode: 'number' }),
      title: t.varchar('title'), body: t.text('body'), views: t.integer('views'),
      published: t.boolean('published'), created_at: t.timestamp('created_at'),
    });
    const comments = t.pgTable('comments', {
      id: t.bigserial('id', { mode: 'number' }).primaryKey(),
      post_id: t.bigint('post_id', { mode: 'number' }),
      author_id: t.bigint('author_id', { mode: 'number' }),
      body: t.text('body'), created_at: t.timestamp('created_at'),
    });
    const pool = new pg.Pool({ ...config.postgres, min: config.pool.min, max: config.pool.max });
    db = drizzle(pool); tables = { authors, posts, comments }; close = () => pool.end();
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
    db = drizzle(pool); tables = { authors, posts, comments }; close = () => pool.end();
  }

  const { authors, posts, comments } = tables;

  return {
    name: 'drizzle',
    category: 'orm-lightweight',

    async getPost(id) {
      const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      return rows[0] || null;
    },

    async listPosts({ limit, offset }) {
      return db.select().from(posts).orderBy(desc(posts.created_at), desc(posts.id)).limit(limit).offset(offset);
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

      return {
        post: { id: p.id, title: p.title, body: p.body, views: p.views, created_at: p.created_at },
        author: { id: p.author_id, name: p.author_name, email: p.author_email },
        comments: cRows.map((c) => ({ id: c.id, body: c.body, created_at: c.created_at,
          author: { id: c.author_id, name: c.author_name, email: c.author_email } })),
      };
    },

    async authorSummary(id) {
      // aggregation kept as raw SQL for parity with the native baseline
      const res = await db.execute(sql`
        SELECT a.id AS author_id,
               COUNT(DISTINCT p.id) AS posts,
               COALESCE(SUM(p.views),0) AS views,
               COUNT(c.id) AS comments
          FROM authors a
          LEFT JOIN posts p ON p.author_id = a.id
          LEFT JOIN comments c ON c.post_id = p.id
         WHERE a.id = ${id}
         GROUP BY a.id`);
      const r = Array.isArray(res) ? res[0] : (res.rows ? res.rows[0] : res[0]?.[0]);
      if (!r) return null;
      return { author_id: Number(r.author_id), posts: Number(r.posts), comments: Number(r.comments), views: Number(r.views || 0) };
    },

    async createPost({ authorId, title, body }) {
      if (engine === 'postgres') {
        const rows = await db.insert(posts).values({ author_id: authorId, title, body }).returning({ id: posts.id });
        return { id: Number(rows[0].id) };
      }
      const res = await db.insert(posts).values({ author_id: authorId, title, body });
      return { id: Number(res[0].insertId) };
    },

    async close() { await close(); },
  };
}
