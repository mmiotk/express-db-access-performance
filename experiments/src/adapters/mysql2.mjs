// Native driver — mysql2 (promise pool). MySQL counterpart of the pg baseline.
// Same two-query deep fetch to avoid N+1.
import mysql from 'mysql2/promise';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThread, canonThreadRows, canonSummary } from './_canon.mjs';

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
      return canonPost(rows[0]);
    },

    async listPosts({ limit, before }) {
      const [rows] = await pool.query(
        'SELECT * FROM posts WHERE id < ? ORDER BY id DESC LIMIT ?',
        [before, limit]);
      return canonPosts(rows);
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

      return canonThreadRows(post, commentRows);
    },

    // Same-plan control: identical SQL + identical mapping via the raw facility.
    async getThreadRaw(id) {
      const [postRows] = await pool.query(THREAD_Q1('?'), [id]);
      if (!postRows[0]) return null;
      const [commentRows] = await pool.query(THREAD_Q2('?'), [id]);
      return mapThread(postRows[0], commentRows);
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
      return canonSummary(rows[0]);
    },

    async createPost({ authorId, title, body }) {
      const [res] = await pool.query(
        'INSERT INTO posts(author_id, title, body) VALUES (?, ?, ?)',
        [authorId, title, body]);
      return { id: res.insertId };
    },

    poolStats() {
      const p = pool.pool; // core (callback) pool inside the promise wrapper
      if (!p || !p._allConnections) return null;
      const all = p._allConnections.length, free = p._freeConnections.length;
      return { used: all - free, free, pending: p._connectionQueue ? p._connectionQueue.length : 0 };
    },

    async close() { await pool.end(); },
  };
}
