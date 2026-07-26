// Executable specification of the deterministic seed.
//
// This module does not query either database and does not import an access
// layer.  It replays the documented seed PRNG to derive expected values for
// independently checking read endpoints.  Database-generated timestamps are
// intentionally not predicted; the verifier checks their field presence,
// ISO-8601 representation, and consistency separately.

export const SEED_PRNG_SEED = 42;
export const CAMPAIGN_FANOUT = Object.freeze({
  authorId: 1000,
  postIds: Object.freeze([250001, 250002, 250003, 250004, 250005, 250006]),
  commentCounts: Object.freeze([0, 1, 10, 50, 100, 500]),
});

export function seedRng(seed = SEED_PRNG_SEED) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const author = (id) => ({
  id,
  name: `Author ${id}`,
  email: `author${id}@bench.local`,
});

const postShape = (id, authorId, views) => ({
  id,
  author_id: authorId,
  title: `Post ${id}`,
  body: `Body of post ${id}. `.repeat(4),
  views,
  published: true,
});

// Build only the requested expected outputs while replaying the full PRNG
// stream.  A compact post->author typed array is retained because the summary
// endpoint counts comments on posts written by the requested author.
export function buildSeedOracle({
  authors,
  posts,
  commentsPerPost,
  postIds = [],
  authorIds = [],
  listParams = [],
  includeCampaignFanout = authors >= CAMPAIGN_FANOUT.authorId && posts >= 100000,
}) {
  const wantedPosts = new Set(
    postIds.filter((id) => Number.isInteger(id) && (
      (id >= 1 && id <= posts)
      || (includeCampaignFanout && CAMPAIGN_FANOUT.postIds.includes(id))
    )),
  );
  for (const { limit, before } of listParams) {
    const n = Math.max(0, Math.min(Number(limit), posts));
    const start = Math.min(posts, Number(before) - 1);
    for (let id = start; id >= 1 && id > start - n; id--) wantedPosts.add(id);
  }

  const wantedAuthors = new Set(
    authorIds.filter((id) => Number.isInteger(id) && id >= 1 && id <= authors),
  );
  const summaries = new Map([...wantedAuthors].map((id) => [
    id,
    { author_id: id, posts: 0, comments: 0, views: 0 },
  ]));
  const selectedPosts = new Map();
  const selectedComments = new Map([...wantedPosts].map((id) => [id, []]));
  const postAuthors = new Uint32Array(posts + 1);

  const rand = seedRng();
  const pick = (n) => 1 + Math.floor(rand() * n);

  for (let id = 1; id <= posts; id++) {
    const authorId = pick(authors);
    const views = Math.floor(rand() * 5000);
    postAuthors[id] = authorId;
    if (wantedPosts.has(id)) selectedPosts.set(id, postShape(id, authorId, views));
    const summary = summaries.get(authorId);
    if (summary) {
      summary.posts++;
      summary.views += views;
    }
  }

  const totalComments = posts * commentsPerPost;
  for (let id = 1; id <= totalComments; id++) {
    const postId = pick(posts);
    const authorId = pick(authors);
    const summary = summaries.get(postAuthors[postId]);
    if (summary) summary.comments++;
    if (wantedPosts.has(postId)) {
      selectedComments.get(postId).push({
        id,
        body: `Comment ${id}`,
        author: author(authorId),
      });
    }
  }

  // The published campaign adds six dedicated fan-out posts after the base
  // seed (scripts/seed-fanout.mjs) and preserves them through write resets.
  // The primary request stream samples base ids, while the specification gate
  // also probes all six fixture ids explicitly. An author-summary request for
  // author 1000 includes these rows. Account for that declared fixture instead
  // of learning it from a database.
  if (includeCampaignFanout) {
    const fanoutRand = seedRng(0xfa0);
    const fanoutAuthors = CAMPAIGN_FANOUT.commentCounts.map((count) =>
      Array.from({ length: count }, () => 1 + Math.floor(fanoutRand() * authors)));
    let commentId = totalComments + 1;
    for (let index = 0; index < CAMPAIGN_FANOUT.postIds.length; index++) {
      const id = CAMPAIGN_FANOUT.postIds[index];
      const count = CAMPAIGN_FANOUT.commentCounts[index];
      if (wantedPosts.has(id)) {
        selectedPosts.set(id, {
          id,
          author_id: CAMPAIGN_FANOUT.authorId,
          title: `Fanout post ${count}`,
          body: `Body of fanout post with ${count} comments. `.repeat(2),
          views: 0,
          published: true,
        });
        selectedComments.set(id, fanoutAuthors[index].map((authorId, offset) => ({
          id: commentId + offset,
          body: `Fanout comment ${offset + 1}. `,
          author: author(authorId),
        })));
      }
      commentId += count;
    }
    const summary = summaries.get(CAMPAIGN_FANOUT.authorId);
    if (summary) {
      summary.posts += CAMPAIGN_FANOUT.postIds.length;
      summary.comments += CAMPAIGN_FANOUT.commentCounts.reduce((sum, n) => sum + n, 0);
    }
  }

  return {
    getPost(id) {
      return selectedPosts.get(id) ?? null;
    },
    getThread(id) {
      const post = selectedPosts.get(id);
      if (!post) return null;
      return {
        post: {
          id: post.id,
          title: post.title,
          body: post.body,
          views: post.views,
        },
        author: author(post.author_id),
        comments: selectedComments.get(id),
      };
    },
    authorSummary(id) {
      return summaries.get(id) ?? null;
    },
    listPosts({ limit, before }) {
      const out = [];
      const n = Math.max(0, Number(limit));
      for (let id = Math.min(posts, Number(before) - 1); id >= 1 && out.length < n; id--) {
        out.push(selectedPosts.get(id));
      }
      return out;
    },
    coverage: {
      seed: SEED_PRNG_SEED,
      requestedPosts: wantedPosts.size,
      requestedAuthors: wantedAuthors.size,
      replayedPosts: posts,
      replayedComments: totalComments,
      campaignFanoutIncluded: includeCampaignFanout,
      campaignFanoutPosts: includeCampaignFanout ? CAMPAIGN_FANOUT.postIds.length : 0,
      campaignFanoutComments: includeCampaignFanout
        ? CAMPAIGN_FANOUT.commentCounts.reduce((sum, n) => sum + n, 0)
        : 0,
    },
  };
}
