// Unit tests for the timed-path diagnostic gate.
//
// The gate exists because the result-blind self-audit found an adapter doing
// avoidable per-request work that announced itself on the console: Knex emitted
// 44,907 warnings in under two pilot repetitions. Nothing in the harness noticed;
// a human did. These tests pin the behaviour that now does.
//
// It catches the self-announcing sub-class only. The other self-audit finding
// (MikroORM discarding an unused handle per request) was silent and is out of
// scope by construction — see the note in diagnostics.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachDiagnosticCounter } from './diagnostics.mjs';

// Minimal stand-in for a spawned child with piped stdio.
function fakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}
const attach = (child) => attachDiagnosticCounter(child, { forward: () => {} });

test('diagnostics: silent treatment produces a clean measured window', async () => {
  const c = fakeChild(); const d = attach(c);
  d.enter('warmup'); c.stderr.emit('data', Buffer.from('connecting to postgres\n'));
  d.enter('measured');
  await d.settle();
  assert.equal(d.measuredLines(), 0);
  assert.equal(d.snapshot().byWindow.warmup.lines, 1);
});

test('diagnostics: warm-up chatter is tolerated, measured chatter is not', async () => {
  const c = fakeChild(); const d = attach(c);
  d.enter('warmup');
  c.stderr.emit('data', Buffer.from('deprecation notice\nanother\n'));
  const before = d.measuredLines();
  d.enter('measured');
  c.stderr.emit('data', Buffer.from('Warning: ignoring unsupported option\n'));
  await d.settle();
  assert.equal(before, 0, 'warm-up output must not count against the measured window');
  assert.equal(d.measuredLines() - before, 1, 'measured output must be counted');
});

test('diagnostics: the Knex-class defect is caught (repeated per-request warning)', async () => {
  const c = fakeChild(); const d = attach(c);
  d.enter('measured');
  for (let i = 0; i < 1000; i++) {
    c.stderr.emit('data', Buffer.from('Warning: .returning() is not supported by mysql\n'));
  }
  await d.settle();
  assert.equal(d.measuredLines(), 1000);
  assert.match(d.samples()[0], /returning/);
  assert.match(d.samples()[0], /^\[measured\/stderr\]/);
});

test('diagnostics: stdout counts too, and blank lines do not inflate the count', async () => {
  const c = fakeChild(); const d = attach(c);
  d.enter('measured');
  c.stdout.emit('data', Buffer.from('\n\n  \nreal line\n\n'));
  await d.settle();
  assert.equal(d.measuredLines(), 1);
});

test('diagnostics: samples are capped and bytes accumulate', async () => {
  const c = fakeChild(); const d = attach(c);
  d.enter('measured');
  for (let i = 0; i < 20; i++) c.stderr.emit('data', Buffer.from(`line ${i}\n`));
  await d.settle();
  assert.equal(d.samples().length, 5, 'sample list must stay bounded');
  assert.ok(d.snapshot().bytes > 0);
  assert.equal(d.snapshot().lines, 20);
});

test('diagnostics: output is still forwarded to the operator', async () => {
  const c = fakeChild(); const seen = [];
  const d = attachDiagnosticCounter(c, { forward: (chunk) => seen.push(chunk.toString()) });
  d.enter('measured');
  c.stderr.emit('data', Buffer.from('visible\n'));
  await d.settle();
  assert.deepEqual(seen, ['visible\n'], 'piping must not hide output from a human');
});
