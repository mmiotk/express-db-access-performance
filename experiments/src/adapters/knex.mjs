// Query builder — Knex. Fluent SQL, same 2-query deep fetch (no N+1). Works on
// both engines by switching the client.
import knexFactory from 'knex';

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
      return (await knex('posts').where({ id }).first()) || null;
    },

    async listPosts({ limit, offset }) {
      return knex('posts').orderBy([{ column: 'created_at', order: 'desc' }, { column: 'id', order: 'desc' }]).limit(limit).offset(offset);
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

      return {
        post: { id: post.id, title: post.title, body: post.body, views: post.views, created_at: post.created_at },
        author: { id: post.author_id, name: post.author_name, email: post.author_email },
        comments: comments.map((c) => ({
          id: c.id, body: c.body, created_at: c.created_at,
          author: { id: c.author_id, name: c.author_name, email: c.author_email },
        })),
      };
    },

    async authorSummary(id) {
      const r = await knex('authors as a')
        .leftJoin('posts as p', 'p.author_id', 'a.id')
        .leftJoin('comments as c', 'c.post_id', 'p.id')
        .where('a.id', id)
        .groupBy('a.id')
        .select('a.id as author_id')
        .countDistinct('p.id as posts')
        .count('c.id as comments')
        .sum('p.views as views')
        .first();
      if (!r) return null;
      return { author_id: Number(r.author_id), posts: Number(r.posts), comments: Number(r.comments), views: Number(r.views || 0) };
    },

    async createPost({ authorId, title, body }) {
      const rows = await knex('posts').insert({ author_id: authorId, title, body }, ['id']);
      // pg returns [{id}], mysql returns [insertId]
      const id = typeof rows[0] === 'object' ? rows[0].id : rows[0];
      return { id: Number(id) };
    },

    async close() { await knex.destroy(); },
  };
}
