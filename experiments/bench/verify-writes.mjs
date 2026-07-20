// Write-correctness gate (review 6.2). For each adapter on ENGINE, verify that a
// write is semantically correct, not merely a successful 2xx. An INDEPENDENT
// native-driver connection (pg / mysql2) inspects post-write database state:
//
//   (1) createPost   -> the returned id exists with the EXACT author_id/title/body
//                       written; exactly one posts row added; zero comments added.
//   (2) createThread -> the post and its N comments are present with the exact
//                       fields written; exactly posts+1 and comments+N rows change
//                       (exactly one intended logical operation).
//   (3) atomicity    -> a createThread whose last comment violates the author
//                       foreign key must throw AND leave no partial state (the
//                       already-inserted post is rolled back).
//
// Every inserted row carries a '__vw__' marker and is removed afterwards, so the
// seeded tables are restored. This is the write half of the semantic-equivalence
// gate; the read half is bench/verify.mjs.
//
//   ENGINE=postgres node bench/verify-writes.mjs
//   ENGINE=mysql    node bench/verify-writes.mjs
import { ADAPTERS, config } from '../src/config.mjs';

const engine = config.engine;
const MARK = '__vw__';
const AUTHOR = 1;            // a seeded author
const BAD_AUTHOR = 999999999; // non-existent -> comments.author_id FK violation

// ---- independent native verifier (never the adapter under test) -------------
async function makeVerifier() {
  if (engine === 'postgres') {
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({ ...config.postgres, max: 2 });
    const conv = (s) => s; // pg uses $1,$2,...
    return {
      async q(sql, params = []) { const { rows } = await pool.query(conv(sql), params); return rows; },
      async close() { await pool.end(); },
    };
  }
  const mysql = (await import('mysql2/promise')).default;
  const pool = await mysql.createPool({ ...config.mysql, connectionLimit: 2 });
  // translate $1,$2,... placeholders to ? for mysql2
  const conv = (s) => s.replace(/\$\d+/g, '?');
  return {
    async q(sql, params = []) { const [rows] = await pool.query(conv(sql), params); return rows; },
    async close() { await pool.end(); },
  };
}

const num = (v) => Number(v);

async function cleanup(v) {
  await v.q(`DELETE FROM comments WHERE body LIKE '${MARK}%'`);
  await v.q(`DELETE FROM posts WHERE title LIKE '${MARK}%'`);
}
async function count(v, table, where = '', params = []) {
  const rows = await v.q(`SELECT COUNT(*) AS c FROM ${table} ${where}`, params);
  return num(rows[0].c);
}

// one adapter, all checks; returns { name, ok, detail }
async function checkAdapter(name, v) {
  const { default: create } = await import(`../src/adapters/${name}.mjs`);
  const db = await create({ engine, config });
  const fails = [];
  try {
    await cleanup(v);

    // (1) createPost: field/id equality + exactly one posts row, zero comments
    {
      const pBefore = await count(v, 'posts');
      const r = await db.createPost({ authorId: AUTHOR, title: `${MARK}post`, body: `${MARK}body` });
      if (!r || typeof r.id !== 'number') fails.push('createPost: no numeric id returned');
      const row = await v.q('SELECT author_id, title, body FROM posts WHERE id = $1', [r.id]);
      if (row.length !== 1) fails.push('createPost: inserted row not found by returned id');
      else {
        if (num(row[0].author_id) !== AUTHOR) fails.push(`createPost: author_id ${row[0].author_id} != ${AUTHOR}`);
        if (row[0].title !== `${MARK}post`) fails.push('createPost: title mismatch');
        if (row[0].body !== `${MARK}body`) fails.push('createPost: body mismatch');
      }
      const pAfter = await count(v, 'posts');
      if (pAfter !== pBefore + 1) fails.push(`createPost: posts changed by ${pAfter - pBefore}, expected +1`);
      const cN = await count(v, 'comments', 'WHERE post_id = $1', [r.id]);
      if (cN !== 0) fails.push(`createPost: ${cN} stray comments`);
      await v.q('DELETE FROM posts WHERE id = $1', [r.id]);
    }

    if (typeof db.createThread === 'function') {
      // (2) createThread: post + 5 comments, exact fields, exactly posts+1/comments+5
      {
        const pBefore = await count(v, 'posts');
        const cBefore = await count(v, 'comments');
        const comments = Array.from({ length: 5 }, (_, i) => ({ authorId: AUTHOR, body: `${MARK}c${i}` }));
        const r = await db.createThread({ authorId: AUTHOR, title: `${MARK}thread`, body: `${MARK}tbody`, comments });
        if (!r || typeof r.post_id !== 'number') fails.push('createThread: no numeric post_id');
        if (r && r.comments !== 5) fails.push(`createThread: reported ${r.comments} comments, expected 5`);
        const post = await v.q('SELECT author_id, title, body FROM posts WHERE id = $1', [r.post_id]);
        if (post.length !== 1) fails.push('createThread: post not found');
        else if (post[0].title !== `${MARK}thread` || post[0].body !== `${MARK}tbody` || num(post[0].author_id) !== AUTHOR)
          fails.push('createThread: post fields mismatch');
        const crows = await v.q('SELECT author_id, body FROM comments WHERE post_id = $1 ORDER BY id', [r.post_id]);
        if (crows.length !== 5) fails.push(`createThread: ${crows.length} comments, expected 5`);
        else crows.forEach((c, i) => {
          if (num(c.author_id) !== AUTHOR || c.body !== `${MARK}c${i}`) fails.push(`createThread: comment ${i} fields mismatch`);
        });
        const pAfter = await count(v, 'posts');
        const cAfter = await count(v, 'comments');
        if (pAfter !== pBefore + 1) fails.push(`createThread: posts changed by ${pAfter - pBefore}, expected +1`);
        if (cAfter !== cBefore + 5) fails.push(`createThread: comments changed by ${cAfter - cBefore}, expected +5`);
        await v.q('DELETE FROM comments WHERE post_id = $1', [r.post_id]);
        await v.q('DELETE FROM posts WHERE id = $1', [r.post_id]);
      }

      // (3) atomicity: 2nd comment violates the author FK -> throw, no partial state
      {
        const pBefore = await count(v, 'posts');
        const cBefore = await count(v, 'comments');
        const comments = [{ authorId: AUTHOR, body: `${MARK}ok` }, { authorId: BAD_AUTHOR, body: `${MARK}bad` }];
        let threw = false;
        try { await db.createThread({ authorId: AUTHOR, title: `${MARK}atomic`, body: `${MARK}abody`, comments }); }
        catch { threw = true; }
        if (!threw) fails.push('atomicity: expected the FK-violating transaction to fail, but it succeeded');
        const pAfter = await count(v, 'posts');
        const cAfter = await count(v, 'comments');
        if (pAfter !== pBefore || cAfter !== cBefore)
          fails.push(`atomicity: partial state left (posts ${pAfter - pBefore}, comments ${cAfter - cBefore}) -- transaction did not roll back`);
      }
    }

    await cleanup(v);
  } finally {
    await db.close();
  }
  return { name, ok: fails.length === 0, fails };
}

const v = await makeVerifier();
const names = Object.keys(ADAPTERS).filter((n) => ADAPTERS[n].engines.includes(engine));
console.log(`Write-correctness gate: ${names.length} adapters on ${engine} (independent ${engine === 'postgres' ? 'pg' : 'mysql2'} verifier)\n`);
let allOk = true;
for (const name of names) {
  try {
    const { ok, fails } = await checkAdapter(name, v);
    if (ok) console.log(`  ✓ ${name} (createPost + createThread field/id/row-count + atomicity)`);
    else { allOk = false; console.log(`  ✗ ${name}`); fails.forEach((f) => console.log(`      - ${f}`)); }
  } catch (e) {
    allOk = false; console.log(`  ✗ ${name}: ERROR ${String(e.message || e).slice(0, 120)}`);
  }
}
await v.close();
console.log(allOk ? '\nALL WRITES SEMANTICALLY CORRECT' : '\nWRITE-CORRECTNESS FAILURES ABOVE');
process.exit(allOk ? 0 : 1);
