import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedOracle } from '../src/seed-spec.mjs';

test('seed oracle replays a small fixture exactly', () => {
  const spec = buildSeedOracle({
    authors: 3,
    posts: 4,
    commentsPerPost: 2,
    postIds: [1, 3],
    authorIds: [1, 2, 3],
    listParams: [{ limit: 2, before: 4 }],
  });

  assert.deepEqual(spec.getPost(1), {
    id: 1,
    author_id: 2,
    title: 'Post 1',
    body: 'Body of post 1. '.repeat(4),
    views: 2241,
    published: true,
  });
  assert.equal(spec.getPost(0), null);
  assert.deepEqual(spec.listPosts({ limit: 2, before: 4 }).map((p) => p.id), [3, 2]);
  assert.equal(
    [...[1, 2, 3]].reduce((n, id) => n + spec.authorSummary(id).posts, 0),
    4,
  );
  assert.equal(
    [...[1, 2, 3]].reduce((n, id) => n + spec.authorSummary(id).comments, 0),
    8,
  );
  assert.equal(spec.getThread(1).post.id, 1);
  assert.equal(spec.coverage.replayedComments, 8);
});


test("seed oracle materializes the declared fan-out fixture", () => {
  const spec = buildSeedOracle({
    authors: 1000,
    posts: 4,
    commentsPerPost: 0,
    postIds: [250001, 250003, 250006],
    authorIds: [1000],
    includeCampaignFanout: true,
  });

  assert.equal(spec.getThread(250001).comments.length, 0);
  assert.equal(spec.getThread(250003).comments.length, 10);
  assert.equal(spec.getThread(250006).comments.length, 500);
  assert.equal(spec.getThread(250003).post.title, "Fanout post 10");
  assert.equal(spec.getThread(250003).comments[0].id, 2);
  assert.deepEqual(spec.authorSummary(1000), {
    author_id: 1000,
    posts: 6,
    comments: 661,
    views: 0,
  });
});
