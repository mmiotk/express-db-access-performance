// Independent expected-result oracle for every non-mutating adapter method.
//
// Unlike verify.mjs and verify-property.mjs, this gate does not use a native
// driver response as the expected value.  It derives substantive fields,
// ordering, graph membership, and aggregate values from the executable
// deterministic seed specification (src/seed-spec.mjs).  Timestamps are
// database-generated defaults rather than seed-PRNG values, so the oracle
// validates their required location and ISO-8601 representation but does not
// predict their instant.
//
//   ENGINE=postgres node bench/verify-spec.mjs
//   ENGINE=mysql    node bench/verify-spec.mjs
//
// Tunables: SPEC_N (random post/author inputs; default 1000), SPEC_SEED.
// Results from both engines are merged into spec-oracle.json.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ADAPTERS, config } from '../src/config.mjs';
import { buildSeedOracle, CAMPAIGN_FANOUT } from '../src/seed-spec.mjs';

const engine = config.engine;
const NP = config.seed.posts;
const NA = config.seed.authors;
const NC = config.seed.commentsPerPost;
const N = Number(process.env.SPEC_N ?? 1000);
const SEED = Number(process.env.SPEC_SEED ?? 73199217);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const randInt = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const edgePostIds = [0, -1, 1, 2, NP - 1, NP, NP + 1, NP + 1000, 2147483647];
const edgeAuthorIds = [0, -1, 1, NA - 1, NA, NA + 1, NA + 1000];
const postIds = [
  ...edgePostIds,
  ...CAMPAIGN_FANOUT.postIds,
  ...Array.from({ length: N }, () => randInt(1, NP)),
];
const authorIds = [...edgeAuthorIds, ...Array.from({ length: N }, () => randInt(1, NA))];
const listParams = [
  { limit: 20, before: 1 },
  { limit: 20, before: 2 },
  { limit: 20, before: NP + 1 },
  { limit: 0, before: 1000 },
  { limit: 1, before: 1000 },
  { limit: 100, before: 60000 },
  { limit: 20, before: NP },
  { limit: 50, before: 0 },
];

console.log(
  `Building DB-independent seed oracle: ${NP} posts, ${NP * NC} comments; ` +
  `${postIds.length} post inputs, ${authorIds.length} author inputs`,
);
const spec = buildSeedOracle({
  authors: NA,
  posts: NP,
  commentsPerPost: NC,
  postIds,
  authorIds,
  listParams,
});

const ISO_KEYS = new Set(['created_at']);
const isCanonicalIso = (value) => {
  if (typeof value !== 'string') return false;
  const millis = Date.parse(value);
  return Number.isFinite(millis) && new Date(millis).toISOString() === value;
};
function stripAndValidate(value, path = '$') {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v, i) => stripAndValidate(v, `${path}[${i}]`));
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (ISO_KEYS.has(key)) {
      assert.equal(typeof child, 'string', `${path}.${key}: timestamp must be a string`);
      assert.ok(isCanonicalIso(child), `${path}.${key}: timestamp must be canonical ISO-8601`);
    } else {
      out[key] = stripAndValidate(child, `${path}.${key}`);
    }
  }
  return out;
}

function requireTimestamp(object, path) {
  assert.ok(
    object && Object.hasOwn(object, 'created_at'),
    `${path}.created_at: required timestamp field is missing`,
  );
  assert.equal(
    typeof object.created_at,
    'string',
    `${path}.created_at: timestamp must be a string`,
  );
  assert.ok(
    isCanonicalIso(object.created_at),
    `${path}.created_at: timestamp must be canonical ISO-8601`,
  );
}

function validateRequiredTimestamps(actual, label) {
  if (actual == null) return;
  if (label.startsWith('getPost(')) {
    requireTimestamp(actual, label);
  } else if (label.startsWith('getThread')) {
    requireTimestamp(actual.post, `${label}.post`);
    actual.comments.forEach((comment, index) => {
      requireTimestamp(comment, `${label}.comments[${index}]`);
    });
  } else if (label.startsWith('listPosts(')) {
    actual.forEach((post, index) => {
      requireTimestamp(post, `${label}[${index}]`);
    });
  }
}

function compare(actual, expected, label) {
  validateRequiredTimestamps(actual, label);
  assert.deepEqual(stripAndValidate(actual, label), expected);
}

async function checkAdapter(name) {
  const { default: create } = await import(`../src/adapters/${name}.mjs`);
  const db = await create({ engine, config });
  let checks = 0;
  const failures = [];
  const check = async (label, run, expected) => {
    try {
      compare(await run(), expected, label);
      checks++;
    } catch (error) {
      if (failures.length < 5) failures.push(`${label}: ${error.message}`);
    }
  };
  try {
    for (const id of postIds) {
      await check(`getPost(${id})`, () => db.getPost(id), spec.getPost(id));
      await check(`getThread(${id})`, () => db.getThread(id), spec.getThread(id));
      await check(`getThreadRaw(${id})`, () => db.getThreadRaw(id), spec.getThread(id));
    }
    for (const id of authorIds) {
      await check(`authorSummary(${id})`, () => db.authorSummary(id), spec.authorSummary(id));
    }
    for (const params of listParams) {
      await check(
        `listPosts(${params.limit},${params.before})`,
        () => db.listPosts(params),
        spec.listPosts(params),
      );
    }
  } finally {
    await db.close();
  }
  return { name, checks, failures, status: failures.length ? 'FAIL' : 'PASS' };
}

const names = Object.keys(ADAPTERS).filter((name) => ADAPTERS[name].engines.includes(engine));
const perAdapter = [];
let bad = 0;
for (const name of names) {
  try {
    const result = await checkAdapter(name);
    perAdapter.push(result);
    if (result.status === 'PASS') {
      console.log(`  ✓ ${name}: ${result.checks} expected-result checks`);
    } else {
      bad++;
      console.log(`  ✗ ${name}: ${result.failures.length} captured mismatch(es)`);
      result.failures.forEach((failure) => console.log(`      ${failure}`));
    }
  } catch (error) {
    bad++;
    perAdapter.push({ name, checks: 0, failures: [error.message], status: 'ERROR' });
    console.log(`  ✗ ${name}: ERROR ${error.message}`);
  }
}

const OUT = new URL('../spec-oracle.json', import.meta.url);
let engines = {};
try {
  if (existsSync(OUT)) engines = JSON.parse(readFileSync(OUT, 'utf8')).engines ?? {};
} catch {
  // Replace malformed or absent prior output.
}
engines[engine] = {
  adapters: names.length,
  randomInputsPerType: N,
  inputSeed: SEED,
  postInputs: postIds.length,
  authorInputs: authorIds.length,
  listInputs: listParams.length,
  checks: perAdapter.reduce((sum, item) => sum + item.checks, 0),
  failedAdapters: bad,
  timestampPolicy: 'presence and canonical ISO-8601 representation; instant is DB-generated',
  perAdapter,
  status: bad === 0 ? 'ALL MATCH SPECIFICATION' : `${bad} adapter(s) failed`,
};
writeFileSync(OUT, JSON.stringify({
  note: 'Expected-result read oracle derived from src/seed-spec.mjs, not from a native-driver response.',
  seedSpecification: {
    dataPrngSeed: spec.coverage.seed,
    postsReplayed: spec.coverage.replayedPosts,
    commentsReplayed: spec.coverage.replayedComments,
    campaignFanoutIncluded: spec.coverage.campaignFanoutIncluded,
    campaignFanoutPosts: spec.coverage.campaignFanoutPosts,
    campaignFanoutComments: spec.coverage.campaignFanoutComments,
  },
  engines,
}, null, 2) + '\n');

console.log(`\n${bad === 0 ? 'ALL ADAPTERS MATCH THE SEED SPECIFICATION' : `${bad} ADAPTER(S) FAILED`}`);
console.log('summary -> experiments/spec-oracle.json');
process.exit(bad === 0 ? 0 : 1);
