// ORM — MikroORM (Data Mapper / Unit of Work) via EntitySchema, decorator-free.
// Deep fetch uses `populate` (MikroORM batches related loads, avoiding N+1).
// A fresh EntityManager fork is used per request to isolate identity maps.
import { MikroORM, EntitySchema } from '@mikro-orm/core';

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
      return (await em.findOne(Post, { id })) || null;
    },

    async listPosts({ limit, offset }) {
      const em = orm.em.fork();
      return em.find(Post, {}, { orderBy: { created_at: 'DESC', id: 'DESC' }, limit, offset });
    },

    async getThread(id) {
      const em = orm.em.fork();
      const post = await em.findOne(Post, { id }, {
        populate: ['author', 'comments', 'comments.author'],
        orderBy: { comments: { id: 'ASC' } },
      });
      if (!post) return null;
      const p = em.map ? post : post; // entity
      return {
        post: { id: num(p.id), title: p.title, body: p.body, views: p.views, created_at: p.created_at },
        author: { id: num(p.author.id), name: p.author.name, email: p.author.email },
        comments: p.comments.getItems().map((cm) => ({
          id: num(cm.id), body: cm.body, created_at: cm.created_at,
          author: { id: num(cm.author.id), name: cm.author.name, email: cm.author.email },
        })),
      };
    },

    async authorSummary(id) {
      const em = orm.em.fork();
      const knex = em.getConnection().getKnex?.();
      // MikroORM's SQL drivers expose the underlying knex; fall back to raw exec.
      const rows = await em.getConnection().execute(
        `SELECT a.id AS author_id,
                COUNT(p.id) AS posts,
                COALESCE(SUM(p.views),0) AS views,
                COALESCE(SUM(cc.cnt),0) AS comments
           FROM authors a
           LEFT JOIN posts p ON p.author_id = a.id
           LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                  ON cc.post_id = p.id
          WHERE a.id = ?
          GROUP BY a.id`, [id]);
      void knex;
      const r = rows[0];
      if (!r) return null;
      return { author_id: num(r.author_id), posts: num(r.posts), comments: num(r.comments), views: num(r.views || 0) };
    },

    async createPost({ authorId, title, body }) {
      const em = orm.em.fork();
      const post = em.create(Post, { author: em.getReference(Author, authorId), title, body, views: 0, published: true });
      await em.persistAndFlush(post);
      return { id: num(post.id) };
    },

    async close() { try { await orm.close(true); } catch { /* teardown races on pooled conns */ } },
  };
}
