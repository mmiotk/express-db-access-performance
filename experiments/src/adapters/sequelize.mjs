// ORM — Sequelize. Models + `include` eager loading (single query with joins)
// for the deep fetch. Aggregation via a raw SELECT to keep it comparable.
import { Sequelize, DataTypes, Model } from 'sequelize';

export default async function createAdapter({ engine, config }) {
  const c = engine === 'postgres' ? config.postgres : config.mysql;
  const sequelize = new Sequelize(c.database, c.user, c.password, {
    host: c.host, port: c.port,
    dialect: engine === 'postgres' ? 'postgres' : 'mysql',
    logging: false,
    pool: { min: config.pool.min, max: config.pool.max },
  });

  class Author extends Model {}
  Author.init({ name: DataTypes.STRING, email: DataTypes.STRING },
    { sequelize, tableName: 'authors', timestamps: false });

  class Post extends Model {}
  Post.init({ author_id: DataTypes.BIGINT, title: DataTypes.STRING, body: DataTypes.TEXT, views: DataTypes.INTEGER, published: DataTypes.BOOLEAN },
    { sequelize, tableName: 'posts', timestamps: false });

  class Comment extends Model {}
  Comment.init({ post_id: DataTypes.BIGINT, author_id: DataTypes.BIGINT, body: DataTypes.TEXT },
    { sequelize, tableName: 'comments', timestamps: false });

  Post.belongsTo(Author, { as: 'author', foreignKey: 'author_id' });
  Post.hasMany(Comment, { as: 'comments', foreignKey: 'post_id' });
  Comment.belongsTo(Author, { as: 'author', foreignKey: 'author_id' });

  return {
    name: 'sequelize',
    category: 'orm',

    async getPost(id) {
      const p = await Post.findByPk(id, { raw: true });
      return p || null;
    },

    async listPosts({ limit, offset }) {
      return Post.findAll({ order: [['created_at', 'DESC'], ['id', 'DESC']], limit, offset, raw: true });
    },

    async getThread(id) {
      const post = await Post.findByPk(id, {
        include: [
          { model: Author, as: 'author' },
          { model: Comment, as: 'comments', include: [{ model: Author, as: 'author' }], separate: false },
        ],
        order: [[{ model: Comment, as: 'comments' }, 'id', 'ASC']],
      });
      if (!post) return null;
      const j = post.toJSON();
      return {
        post: { id: j.id, title: j.title, body: j.body, views: j.views, created_at: j.created_at },
        author: j.author,
        comments: (j.comments || []).map((cm) => ({ id: cm.id, body: cm.body, created_at: cm.created_at, author: cm.author })),
      };
    },

    async authorSummary(id) {
      const [rows] = await sequelize.query(
        `SELECT a.id AS author_id,
                COUNT(p.id) AS posts,
                COALESCE(SUM(p.views),0) AS views,
                COALESCE(SUM(cc.cnt),0) AS comments
           FROM authors a
           LEFT JOIN posts p ON p.author_id = a.id
           LEFT JOIN (SELECT post_id, COUNT(*) AS cnt FROM comments GROUP BY post_id) cc
                  ON cc.post_id = p.id
          WHERE a.id = ${engine === 'postgres' ? '$1' : '?'}
          GROUP BY a.id`,
        { bind: engine === 'postgres' ? [id] : undefined, replacements: engine === 'postgres' ? undefined : [id] });
      const r = rows[0];
      if (!r) return null;
      return { author_id: Number(r.author_id), posts: Number(r.posts), comments: Number(r.comments), views: Number(r.views || 0) };
    },

    async createPost({ authorId, title, body }) {
      const row = await Post.create({ author_id: authorId, title, body });
      return { id: Number(row.id) };
    },

    async close() { await sequelize.close(); },
  };
}
