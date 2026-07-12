// ORM — Objection.js (built on Knex). Uses models + eager loading (`withGraphFetched`)
// which batches related rows, avoiding N+1 for the deep fetch.
import knexFactory from 'knex';
import { Model } from 'objection';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThread, canonThreadRows, canonSummary } from './_canon.mjs';

class Author extends Model {
  static get tableName() { return 'authors'; }
}
class Comment extends Model {
  static get tableName() { return 'comments'; }
  static get relationMappings() {
    return {
      author: { relation: Model.BelongsToOneRelation, modelClass: Author, join: { from: 'comments.author_id', to: 'authors.id' } },
    };
  }
}
class Post extends Model {
  static get tableName() { return 'posts'; }
  static get relationMappings() {
    return {
      author: { relation: Model.BelongsToOneRelation, modelClass: Author, join: { from: 'posts.author_id', to: 'authors.id' } },
      comments: { relation: Model.HasManyRelation, modelClass: Comment, join: { from: 'posts.id', to: 'comments.post_id' } },
    };
  }
}

export default async function createAdapter({ engine, config }) {
  const knex = knexFactory({
    client: engine === 'postgres' ? 'pg' : 'mysql2',
    connection: engine === 'postgres' ? config.postgres : config.mysql,
    pool: { min: config.pool.min, max: config.pool.max },
  });
  Model.knex(knex);

  return {
    name: 'objection',
    category: 'orm',

    async getPost(id) {
      return canonPost(await Post.query().findById(id));
    },

    async listPosts({ limit, before }) {
      return canonPosts(await Post.query().where('id', '<', before).orderBy('id', 'desc').limit(limit));
    },

    async getThread(id) {
      const post = await Post.query().findById(id)
        .withGraphFetched('[author, comments(orderById).author]')
        .modifiers({ orderById: (b) => b.orderBy('comments.id') });
      return post ? canonThread(post, post.author, post.comments || []) : null;
    },

    // Same-plan control: identical SQL + identical mapping via the underlying knex.
    async getThreadRaw(id) {
      const k = Post.knex();
      const p = await k.raw(THREAD_Q1('?'), [id]);
      const post = (p.rows ? p.rows : p[0])[0];
      if (!post) return null;
      const c = await k.raw(THREAD_Q2('?'), [id]);
      return mapThread(post, c.rows ? c.rows : c[0]);
    },

    async authorSummary(id) {
      // Correlated subqueries — no fan-out, so SUM(views) is not inflated.
      const r = await Author.query()
        .findById(id)
        .select(
          'authors.id as author_id',
          Author.knex().raw('(SELECT COUNT(*) FROM posts WHERE posts.author_id = authors.id) as posts'),
          Author.knex().raw('(SELECT COALESCE(SUM(views),0) FROM posts WHERE posts.author_id = authors.id) as views'),
          Author.knex().raw('(SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id WHERE p.author_id = authors.id) as comments'),
        );
      return canonSummary(r);
    },

    async createPost({ authorId, title, body }) {
      const row = await Post.query().insert({ author_id: authorId, title, body });
      return { id: Number(row.id) };
    },

    poolStats() {
      const p = Post.knex()?.client?.pool; if (!p) return null;
      return { used: p.numUsed(), free: p.numFree(), pending: p.numPendingAcquires() };
    },

    async close() { await knex.destroy(); },
  };
}
