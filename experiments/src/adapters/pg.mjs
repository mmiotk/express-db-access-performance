// Native driver — node-postgres (`pg`). Baseline for the whole comparison:
// hand-written SQL, parameterized, pooled. Deep fetch avoids N+1 with exactly
// two queries (post+author, then all comments+their authors joined).
import pg from 'pg';

export default async function createAdapter({ config }) {
  const pool = new pg.Pool({ ...config.postgres, min: config.pool.min, max: config.pool.max });

  return {
    name: 'pg',
    category: 'native-driver',

    async getPost(id) {
      const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
      return rows[0] || null;
    },

    async listPosts({ limit, offset }) {
      const { rows } = await pool.query(
        'SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      );
      return rows;
    },

    async getThread(id) {
      const postRes = await pool.query(
        `SELECT p.*, a.name AS author_name, a.email AS author_email
           FROM posts p JOIN authors a ON a.id = p.author_id
          WHERE p.id = $1`, [id]);
      const post = postRes.rows[0];
      if (!post) return null;

      const commentsRes = await pool.query(
        `SELECT c.id, c.body, c.created_at,
                a.id AS author_id, a.name AS author_name, a.email AS author_email
           FROM comments c JOIN authors a ON a.id = c.author_id
          WHERE c.post_id = $1
          ORDER BY c.id`, [id]);

      return {
        post: { id: post.id, title: post.title, body: post.body, views: post.views, created_at: post.created_at },
        author: { id: post.author_id, name: post.author_name, email: post.author_email },
        comments: commentsRes.rows.map((c) => ({
          id: c.id, body: c.body, created_at: c.created_at,
          author: { id: c.author_id, name: c.author_name, email: c.author_email },
        })),
      };
    },

    async authorSummary(id) {
      const { rows } = await pool.query(
        `SELECT a.id AS author_id,
                COUNT(DISTINCT p.id)                    AS posts,
                COALESCE(SUM(p.views), 0)               AS views,
                COUNT(c.id)                             AS comments
           FROM authors a
           LEFT JOIN posts p    ON p.author_id = a.id
           LEFT JOIN comments c ON c.post_id  = p.id
          WHERE a.id = $1
          GROUP BY a.id`, [id]);
      if (!rows[0]) return null;
      const r = rows[0];
      return { author_id: Number(r.author_id), posts: Number(r.posts), comments: Number(r.comments), views: Number(r.views) };
    },

    async createPost({ authorId, title, body }) {
      const { rows } = await pool.query(
        'INSERT INTO posts(author_id, title, body) VALUES ($1, $2, $3) RETURNING id',
        [authorId, title, body]);
      return { id: Number(rows[0].id) };
    },

    async close() { await pool.end(); },
  };
}
