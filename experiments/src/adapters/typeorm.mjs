// ORM — TypeORM via EntitySchema (decorator-free, so it runs in plain JS ESM).
// Deep fetch uses `relations` eager loading; aggregation via QueryBuilder.
import 'reflect-metadata';
import { DataSource, EntitySchema, LessThan } from 'typeorm';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThread, canonThreadRows, canonSummary } from './_canon.mjs';

const Author = new EntitySchema({
  name: 'Author', tableName: 'authors',
  columns: {
    id: { type: 'bigint', primary: true, generated: true },
    name: { type: String }, email: { type: String },
    created_at: { type: 'timestamp', createDate: false },
  },
});
const Post = new EntitySchema({
  name: 'Post', tableName: 'posts',
  columns: {
    id: { type: 'bigint', primary: true, generated: true },
    author_id: { type: 'bigint' }, title: { type: String }, body: { type: 'text' },
    views: { type: 'int' }, published: { type: 'boolean' }, created_at: { type: 'timestamp', createDate: false },
  },
  relations: {
    author: { type: 'many-to-one', target: 'Author', joinColumn: { name: 'author_id' } },
    comments: { type: 'one-to-many', target: 'Comment', inverseSide: 'post' },
  },
});
const Comment = new EntitySchema({
  name: 'Comment', tableName: 'comments',
  columns: {
    id: { type: 'bigint', primary: true, generated: true },
    post_id: { type: 'bigint' }, author_id: { type: 'bigint' },
    body: { type: 'text' }, created_at: { type: 'timestamp', createDate: false },
  },
  relations: {
    post: { type: 'many-to-one', target: 'Post', joinColumn: { name: 'post_id' } },
    author: { type: 'many-to-one', target: 'Author', joinColumn: { name: 'author_id' } },
  },
});

export default async function createAdapter({ engine, config }) {
  const c = engine === 'postgres' ? config.postgres : config.mysql;
  const ds = new DataSource({
    type: engine === 'postgres' ? 'postgres' : 'mysql',
    host: c.host, port: c.port, username: c.user, password: c.password, database: c.database,
    entities: [Author, Post, Comment], synchronize: false, logging: false,
    extra: engine === 'postgres' ? { max: config.pool.max } : { connectionLimit: config.pool.max },
  });
  await ds.initialize();
  const posts = ds.getRepository('Post');

  const num = (v) => (typeof v === 'string' ? Number(v) : v);

  return {
    name: 'typeorm',
    category: 'orm',

    async getPost(id) {
      return canonPost(await posts.findOne({ where: { id } }));
    },

    async listPosts({ limit, before }) {
      return canonPosts(await posts.find({ where: { id: LessThan(before) }, order: { id: 'DESC' }, take: limit }));
    },

    async getThread(id) {
      const post = await posts.findOne({
        where: { id },
        relations: { author: true, comments: { author: true } },
        order: { comments: { id: 'ASC' } },
      });
      return post ? canonThread(post, post.author, post.comments || []) : null;
    },

    // Same-plan control: identical SQL + identical mapping via ds.query.
    async getThreadRaw(id) {
      const ph = engine === 'postgres' ? '$1' : '?';
      const postRows = await ds.query(THREAD_Q1(ph), [id]);
      if (!postRows[0]) return null;
      const commentRows = await ds.query(THREAD_Q2(ph), [id]);
      return mapThread(postRows[0], commentRows);
    },

    async authorSummary(id) {
      // Correlated subqueries — touch only this author's rows (no fan-out, no scan).
      const ph = engine === 'postgres' ? '$1' : '?';
      const rows = await ds.query(
        `SELECT a.id AS author_id,
                (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
                (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
                (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE p.author_id = a.id) AS comments
           FROM authors a
          WHERE a.id = ${ph}`, [id]);
      return canonSummary(rows[0]);
    },

    async createPost({ authorId, title, body }) {
      const row = await posts.save({ author_id: authorId, title, body, views: 0, published: true });
      return { id: num(row.id) };
    },

    async close() { await ds.destroy(); },
  };
}
