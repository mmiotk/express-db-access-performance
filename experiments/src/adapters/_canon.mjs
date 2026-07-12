// Canonical response shapes (harness 2.0). Every adapter funnels its result
// through these constructors, so the JSON Express serializes is BYTE-IDENTICAL
// across layers for the same input: same field set, same key order, same value
// types (ids as Number, timestamps as ISO-8601 strings, booleans as true/false),
// regardless of how the layer materialized the data (raw rows, typed rows, or
// entity graphs). What still differs between layers — by design — is the work
// done to PRODUCE these values (SQL, round trips, hydration); what no longer
// differs is the task output. Response-equivalence is enforced by verify.mjs
// at the byte level before any timing run.
const num = (v) => (v == null ? null : Number(v));
const bool = (v) => (v == null ? null : v === true || v === 1 || v === '1' || v === 't');
const iso = (v) => (v == null ? null : (v instanceof Date ? v : new Date(v)).toISOString());

export function canonPost(r) {
  if (!r) return null;
  return {
    id: num(r.id),
    author_id: num(r.author_id),
    title: r.title,
    body: r.body,
    views: num(r.views),
    published: bool(r.published),
    created_at: iso(r.created_at),
  };
}
export const canonPosts = (rows) => rows.map(canonPost);

export const canonAuthor = (a) => ({ id: num(a.id), name: a.name, email: a.email });

// Object-graph input (ORM entities / nested objects).
export function canonThread(post, author, comments) {
  if (!post) return null;
  return {
    post: { id: num(post.id), title: post.title, body: post.body, views: num(post.views), created_at: iso(post.created_at) },
    author: canonAuthor(author),
    comments: comments.map((c) => ({
      id: num(c.id), body: c.body, created_at: iso(c.created_at),
      author: canonAuthor(c.author),
    })),
  };
}

// Flat-row input (native drivers / query builders / the same-SQL control):
// post row carries author_name/author_email; comment rows carry author_id/name/email.
export function canonThreadRows(post, commentRows) {
  if (!post) return null;
  return {
    post: { id: num(post.id), title: post.title, body: post.body, views: num(post.views), created_at: iso(post.created_at) },
    author: { id: num(post.author_id), name: post.author_name, email: post.author_email },
    comments: commentRows.map((c) => ({
      id: num(c.id), body: c.body, created_at: iso(c.created_at),
      author: { id: num(c.author_id), name: c.author_name, email: c.author_email },
    })),
  };
}

export const canonSummary = (r) => (r ? {
  author_id: num(r.author_id), posts: num(r.posts), comments: num(r.comments), views: num(r.views ?? 0),
} : null);
