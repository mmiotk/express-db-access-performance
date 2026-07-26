// Unit tests for the static dead-work detector.
//
// The decisive test is `catches ASA-02`: it runs the detector against the actual
// pre-fix adapter source recovered from this repository's history, so the check is
// validated against a defect that really occurred rather than against a synthetic
// example. The companion test asserts the current adapters are clean, which is the
// evidence R7 now requires.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDeadWork, maskLiterals } from './dead-work.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('dead-work: catches ASA-02 in the real pre-fix adapter source', () => {
  const src = readFileSync(join(here, 'fixtures', 'mikroorm-asa02-before-fix.mjs'), 'utf8');
  const hits = findDeadWork(src, { filename: 'mikroorm(pre-fix)' });
  const knex = hits.find((h) => h.name === 'knex');
  assert.ok(knex, 'the discarded per-request handle acquisition must be reported');
  assert.equal(knex.kind, 'void-discard');
  assert.match(knex.snippet, /void knex/);
});

test('dead-work: current adapters are clean', () => {
  const dir = join(here, '..', 'src', 'adapters');
  const all = [];
  for (const fn of readdirSync(dir)) {
    all.push(...findDeadWork(readFileSync(join(dir, fn), 'utf8'), { filename: fn }));
  }
  assert.deepEqual(all, [], `unexpected dead work: ${JSON.stringify(all, null, 2)}`);
});

test('dead-work: reports a binding that is never read', () => {
  const hits = findDeadWork('function f(){ const handle = acquire(); return 1; }');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'handle');
});

test('dead-work: does not report a binding that is read', () => {
  assert.deepEqual(findDeadWork('function f(){ const h = acquire(); return h.x; }'), []);
});

test('dead-work: a use only inside a comment does not count', () => {
  const hits = findDeadWork('function f(){ const h = acquire(); /* h is fine */ return 1; }');
  assert.equal(hits.length, 1, 'commented mentions must not mask dead work');
});

test('dead-work: a use only inside a template substitution DOES count', () => {
  // Regression: masking ${...} made interpolated-only variables look unused.
  assert.deepEqual(findDeadWork('function f(){ const ph = "$1"; return `WHERE a = ${ph}`; }'), []);
});

test('dead-work: template text is still masked', () => {
  const hits = findDeadWork('function f(){ const ph = 1; return `no ph here`; }');
  assert.equal(hits.length, 1, 'an identifier appearing only as literal text is not a use');
});

test('dead-work: exported bindings are not reported', () => {
  assert.deepEqual(findDeadWork('export const canonPosts = (r) => r;'), []);
});

test('dead-work: a genuine use elsewhere clears a void discard', () => {
  // `void x` alone is a discard; `void x` plus a real use is not dead work.
  assert.deepEqual(findDeadWork('function f(){ const h = acquire(); use(h); void h; return 1; }'), []);
});

test('maskLiterals: preserves offsets and line numbers', () => {
  const src = 'const a = "xxx";\nconst b = 2;\n';
  const masked = maskLiterals(src);
  assert.equal(masked.length, src.length);
  assert.equal(masked.split('\n').length, src.split('\n').length);
  assert.ok(!masked.includes('xxx'));
});
