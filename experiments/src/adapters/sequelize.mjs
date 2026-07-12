// ORM — Sequelize. Models + `include` eager loading (single query with joins)
// for the deep fetch. Aggregation via a raw SELECT to keep it comparable.
import { Sequelize, DataTypes, Model, Op } from 'sequelize';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThread, canonThreadRows, canonSummary } from './_canon.mjs';

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
  Post.init({ author_id: DataTypes.BIGINT, title: DataTypes.STRING, body: DataTypes.TEXT, views: DataTypes.INTEGER, published: DataTypes.BOOLEAN, created_at: DataTypes.DATE },
    { sequelize, tableName: 'posts', timestamps: false });

  class Comment extends Model {}
  Comment.init({ post_id: DataTypes.BIGINT, author_id: DataTypes.BIGINT, body: DataTypes.TEXT, created_at: DataTypes.DATE },
    { sequelize, tableName: 'comments', timestamps: false });

  Post.belongsTo(Author, { as: 'author', foreignKey: 'author_id' });
  Post.hasMany(Comment, { as: 'comments', foreignKey: 'post_id' });
  Comment.belongsTo(Author, { as: 'author', foreignKey: 'author_id' });

  return {
    name: 'sequelize',
    category: 'orm',

    async getPost(id) {
      const p = await Post.findByPk(id, { raw: true });
      return canonPost(p);
    },

    async listPosts({ limit, before }) {
      return canonPosts(await Post.findAll({ where: { id: { [Op.lt]: before } }, order: [['id', 'DESC']], limit, raw: true }));
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
      return canonThread(j, j.author, j.comments || []);
    },

    // Same-plan control: identical SQL + identical mapping via sequelize.query.
    async getThreadRaw(id) {
      const ph = engine === 'postgres' ? '$1' : '?';
      const opts = engine === 'postgres' ? { bind: [id] } : { replacements: [id] };
      const [postRows] = await sequelize.query(THREAD_Q1(ph), opts);
      if (!postRows[0]) return null;
      const [commentRows] = await sequelize.query(THREAD_Q2(ph), opts);
      return mapThread(postRows[0], commentRows);
    },

    async authorSummary(id) {
      const [rows] = await sequelize.query(
        `SELECT a.id AS author_id,
                (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
                (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
                (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE p.author_id = a.id) AS comments
           FROM authors a
          WHERE a.id = ${engine === 'postgres' ? '$1' : '?'}`,
        { bind: engine === 'postgres' ? [id] : undefined, replacements: engine === 'postgres' ? undefined : [id] });
      return canonSummary(rows[0]);
    },

    async createPost({ authorId, title, body }) {
      const row = await Post.create({ author_id: authorId, title, body });
      return { id: Number(row.id) };
    },

    async close() { await sequelize.close(); },
  };
}
