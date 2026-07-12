// Native driver, TUNED variant — node-postgres with NAMED prepared statements.
// The idiomatic `pg` baseline issues parameterized simple queries; this variant is
// the lower bound an experienced practitioner can reach with statement reuse (the
// driver prepares once per connection and executes by name thereafter). Same SQL,
// same canonical output as every other adapter.
import pg from 'pg';
import { THREAD_Q1, THREAD_Q2, mapThread } from './_threadraw.mjs';
import { canonPost, canonPosts, canonThreadRows, canonSummary } from './_canon.mjs';

export default async function createAdapter({ config }) {
  const pool = new pg.Pool({ ...config.postgres, min: config.pool.min, max: config.pool.max });
  const P = (name, text) => (values) => pool.query({ name, text, values });

  const qPost = P('t_get_post', 'SELECT * FROM posts WHERE id = $1');
  const qList = P('t_list_posts', 'SELECT * FROM posts WHERE id < $1 ORDER BY id DESC LIMIT $2');
  const qThread1 = P('t_thread_q1', THREAD_Q1('$1'));
  const qThread2 = P('t_thread_q2', THREAD_Q2('$1'));
  const qSummary = P('t_summary',
    `SELECT a.id AS author_id,
            (SELECT COUNT(*)               FROM posts p WHERE p.author_id = a.id) AS posts,
            (SELECT COALESCE(SUM(p.views),0) FROM posts p WHERE p.author_id = a.id) AS views,
            (SELECT COUNT(*) FROM comments c JOIN posts p ON p.id = c.post_id
               WHERE p.author_id = a.id) AS comments
       FROM authors a
      WHERE a.id = $1`);
  const qInsert = P('t_insert', 'INSERT INTO posts(author_id, title, body) VALUES ($1, $2, $3) RETURNING id');

  return {
    name: 'pg-tuned',
    category: 'native-tuned',

    async getPost(id) {
      const { rows } = await qPost([id]);
      return canonPost(rows[0]);
    },

    async listPosts({ limit, before }) {
      const { rows } = await qList([before, limit]);
      return canonPosts(rows);
    },

    async getThread(id) {
      const postRes = await qThread1([id]);
      if (!postRes.rows[0]) return null;
      const commentsRes = await qThread2([id]);
      return canonThreadRows(postRes.rows[0], commentsRes.rows);
    },

    // Same-SQL control coincides with the idiomatic path for this adapter.
    async getThreadRaw(id) {
      return this.getThread(id);
    },

    async authorSummary(id) {
      const { rows } = await qSummary([id]);
      return canonSummary(rows[0]);
    },

    async createPost({ authorId, title, body }) {
      const { rows } = await qInsert([authorId, title, body]);
      return { id: Number(rows[0].id) };
    },

    async close() { await pool.end(); },
  };
}
