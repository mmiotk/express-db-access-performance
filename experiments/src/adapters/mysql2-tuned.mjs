// Native driver, TUNED variant — mysql2 with pool.execute(): the binary protocol
// with server-side prepared statements, cached per connection. The idiomatic
// `mysql2` baseline uses pool.query() (text protocol, no statement reuse); this
// variant is the practitioner lower bound. Same SQL, same canonical output.
import mysql from 'mysql2/promise';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThreadRows, canonSummary } from './_canon.mjs';

export default async function createAdapter({ config }) {
  const pool = mysql.createPool({
    ...config.mysql,
    connectionLimit: config.pool.max,
    waitForConnections: true,
  });

  return {
    name: 'mysql2-tuned',
    category: 'native-tuned',

    async getPost(id) {
      const [rows] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id]);
      return canonPost(rows[0]);
    },

    async listPosts({ limit, before }) {
      // LIMIT cannot be a placeholder in a prepared statement; the page size is a
      // constant of the workload, so it is inlined (still one cached statement).
      const [rows] = await pool.execute(
        `SELECT * FROM posts WHERE id < ? ORDER BY id DESC LIMIT ${Number(limit)}`,
        [before]);
      return canonPosts(rows);
    },

    async getThread(id) {
      const [postRows] = await pool.execute(THREAD_Q1('?'), [id]);
      if (!postRows[0]) return null;
      const [commentRows] = await pool.execute(THREAD_Q2('?'), [id]);
      return canonThreadRows(postRows[0], commentRows);
    },

    // Same-SQL control coincides with the idiomatic path for this adapter.
    async getThreadRaw(id) {
      return this.getThread(id);
    },

    async authorSummary(id) {
      const [rows] = await pool.execute(
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
      const [res] = await pool.execute(
        'INSERT INTO posts(author_id, title, body) VALUES (?, ?, ?)',
        [authorId, title, body]);
      return { id: Number(res.insertId) };
    },

    async close() { await pool.end(); },
  };
}
