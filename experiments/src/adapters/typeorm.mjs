// ORM — TypeORM via EntitySchema (decorator-free, so it runs in plain JS ESM).
// Deep fetch uses `relations` eager loading; aggregation via QueryBuilder.
import 'reflect-metadata';
import { DataSource, EntitySchema } from 'typeorm';

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
      return (await posts.findOne({ where: { id } })) || null;
    },

    async listPosts({ limit, offset }) {
      return posts.find({ order: { created_at: 'DESC', id: 'DESC' }, take: limit, skip: offset });
    },

    async getThread(id) {
      const post = await posts.findOne({
        where: { id },
        relations: { author: true, comments: { author: true } },
        order: { comments: { id: 'ASC' } },
      });
      if (!post) return null;
      return {
        post: { id: num(post.id), title: post.title, body: post.body, views: post.views, created_at: post.created_at },
        author: post.author,
        comments: (post.comments || []).map((cm) => ({ id: num(cm.id), body: cm.body, created_at: cm.created_at, author: cm.author })),
      };
    },

    async authorSummary(id) {
      const r = await ds.createQueryBuilder()
        .select('a.id', 'author_id')
        .addSelect('COUNT(DISTINCT p.id)', 'posts')
        .addSelect('COALESCE(SUM(p.views),0)', 'views')
        .addSelect('COUNT(c.id)', 'comments')
        .from('authors', 'a')
        .leftJoin('posts', 'p', 'p.author_id = a.id')
        .leftJoin('comments', 'c', 'c.post_id = p.id')
        .where('a.id = :id', { id })
        .groupBy('a.id')
        .getRawOne();
      if (!r) return null;
      return { author_id: num(r.author_id), posts: num(r.posts), comments: num(r.comments), views: num(r.views || 0) };
    },

    async createPost({ authorId, title, body }) {
      const row = await posts.save({ author_id: authorId, title, body, views: 0, published: true });
      return { id: num(row.id) };
    },

    async close() { await ds.destroy(); },
  };
}
