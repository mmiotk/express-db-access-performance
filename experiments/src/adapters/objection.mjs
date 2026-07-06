// ORM — Objection.js (built on Knex). Uses models + eager loading (`withGraphFetched`)
// which batches related rows, avoiding N+1 for the deep fetch.
import knexFactory from 'knex';
import { Model } from 'objection';

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
      return (await Post.query().findById(id)) || null;
    },

    async listPosts({ limit, before }) {
      return Post.query().where('id', '<', before).orderBy('id', 'desc').limit(limit);
    },

    async getThread(id) {
      const post = await Post.query().findById(id)
        .withGraphFetched('[author, comments(orderById).author]')
        .modifiers({ orderById: (b) => b.orderBy('comments.id') });
      if (!post) return null;
      return {
        post: { id: post.id, title: post.title, body: post.body, views: post.views, created_at: post.created_at },
        author: post.author,
        comments: (post.comments || []).map((c) => ({ id: c.id, body: c.body, created_at: c.created_at, author: c.author })),
      };
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
      if (!r) return null;
      return { author_id: Number(r.author_id), posts: Number(r.posts), comments: Number(r.comments), views: Number(r.views || 0) };
    },

    async createPost({ authorId, title, body }) {
      const row = await Post.query().insert({ author_id: authorId, title, body });
      return { id: Number(row.id) };
    },

    async close() { await knex.destroy(); },
  };
}
