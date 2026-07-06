// Native driver — mysql2 (promise pool). MySQL counterpart of the pg baseline.
// Same two-query deep fetch to avoid N+1.
import mysql from 'mysql2/promise';

export default async function createAdapter({ config }) {
  const pool = mysql.createPool({
    ...config.mysql,
    connectionLimit: config.pool.max,
    waitForConnections: true,
  });

  return {
    name: 'mysql2',
    category: 'native-driver',

    async getPost(id) {
      const [rows] = await pool.query('SELECT * FROM posts WHERE id = ?', [id]);
      return rows[0] || null;
    },

    async listPosts({ limit, before }) {
      const [rows] = await pool.query(
        'SELECT * FROM posts WHERE id < ? ORDER BY id DESC LIMIT ?',
        [before, limit]);
      return rows;
    },

    async getThread(id) {
      const [postRows] = await pool.query(
        `SELECT p.*, a.name AS author_name, a.email AS author_email
           FROM posts p JOIN authors a ON a.id = p.author_id
          WHERE p.id = ?`, [id]);
      const post = postRows[0];
      if (!post) return null;

      const [commentRows] = await pool.query(
        `SELECT c.id, c.body, c.created_at,
                a.id AS author_id, a.name AS author_name, a.email AS author_email
           FROM comments c JOIN authors a ON a.id = c.author_id
          WHERE c.post_id = ?
          ORDER BY c.id`, [id]);

      return {
        post: { id: post.id, title: post.title, body: post.body, views: post.views, created_at: post.created_at },
        author: { id: post.author_id, name: post.author_name, email: post.author_email },
        comments: commentRows.map((c) => ({
          id: c.id, body: c.body, created_at: c.created_at,
          author: { id: c.author_id, name: c.author_name, email: c.author_email },
        })),
      };
    },

    async authorSummary(id) {
      // Correlated subqueries: touch only this author's rows (no fan-out, no
      // full-table GROUP BY per request).
      const [rows] = await pool.query(
        `SELECT a.id AS author_id,
                (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
                (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
                (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
                   WHERE p.author_id = a.id) AS comments
           FROM authors a
          WHERE a.id = ?`, [id]);
      if (!rows[0]) return null;
      const r = rows[0];
      return { author_id: Number(r.author_id), posts: Number(r.posts), comments: Number(r.comments), views: Number(r.views) };
    },

    async createPost({ authorId, title, body }) {
      const [res] = await pool.query(
        'INSERT INTO posts(author_id, title, body) VALUES (?, ?, ?)',
        [authorId, title, body]);
      return { id: res.insertId };
    },

    async close() { await pool.end(); },
  };
}
