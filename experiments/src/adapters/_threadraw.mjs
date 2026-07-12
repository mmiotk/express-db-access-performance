// Shared same-plan deep-fetch control. Every adapter's getThreadRaw() executes the
// IDENTICAL two-statement plan below through its own documented raw-SQL facility and
// maps rows with the IDENTICAL mapThread() — so differences measured on the
// /posts/:id/thread-raw endpoint isolate each library's raw execution path (pool
// acquisition, raw-query API, driver row decoding) from its default eager-loading
// strategy and entity hydration, which only the idiomatic /posts/:id/thread endpoint
// exercises. This mirrors the aggregation control, applied to the deep fetch.
//
// `ph` is the engine's placeholder token ('$1' for postgres wire protocol, '?' for
// mysql/knex-style binding); both statements take the post id as their only bind.

export const THREAD_Q1 = (ph) =>
  `SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = ${ph}`;

export const THREAD_Q2 = (ph) =>
  `SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = ${ph}
    ORDER BY c.id`;

import { canonThreadRows } from './_canon.mjs';
export const mapThread = canonThreadRows;
