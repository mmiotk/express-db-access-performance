// Unit tests for the shared statistical estimators (review R3, §9/Q19).
// Run with:  node --test   (or: npm test)
//
// The Monte-Carlo estimators take a `rand` parameter; the tests inject a seeded
// deterministic PRNG so every assertion is reproducible. Cases are hand-computed
// or use closed-form properties (identical samples, constant shifts, symmetry).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  median, cv, mean, sd, logRatios, geomMeanRatio, winFraction,
  mannWhitneyU, cliffsDelta, cliffsMagnitude,
  pairedPermutation, wilcoxonSignedRank, pairedBootstrapRatioCI,
  pairedTOST, blockedInteraction,
} from './stats.mjs';

// --- seeded PRNG (mulberry32): deterministic [0,1) generator for the MC tests --
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const approx = (x, y, eps = 1e-9) => Math.abs(x - y) <= eps;

// --------------------------------------------------------------------------
test('median: odd, even, unsorted, empty', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([5]), 5);
  assert.ok(Number.isNaN(median([])));
  // does not mutate input
  const xs = [3, 1, 2];
  median(xs);
  assert.deepEqual(xs, [3, 1, 2]);
});

test('cv: known value, degenerate cases', () => {
  // [2,4,6]: mean 4, sample sd 2 (var = 8/2) -> cv 0.5
  assert.ok(approx(cv([2, 4, 6]), 0.5, 1e-12));
  assert.equal(cv([7]), 0);           // <2 elements
  assert.equal(cv([0, 0, 0]), 0);     // zero mean guarded
});

test('mean and sd: hand-computed', () => {
  assert.equal(mean([1, 2, 3, 4]), 2.5);
  assert.ok(approx(sd([2, 4, 6]), 2, 1e-12));   // sample sd = sqrt(8/2)
  assert.equal(sd([5]), 0);
});

test('logRatios and geomMeanRatio', () => {
  assert.deepEqual(logRatios([2, 4], [2, 4]), [0, 0]);
  assert.ok(approx(geomMeanRatio([2, 4, 8], [2, 4, 8]), 1));      // identical -> 1
  assert.ok(approx(geomMeanRatio([2, 4, 8], [1, 2, 4]), 2));      // uniform 2x -> 2
  assert.ok(approx(geomMeanRatio([4, 4], [1, 16]), 1));           // 4x and .25x -> geomean 1
});

test('winFraction: dominance with ties = 1/2', () => {
  assert.equal(winFraction([2, 2, 2], [1, 1, 1]), 1);
  assert.equal(winFraction([1, 1, 1], [2, 2, 2]), 0);
  assert.equal(winFraction([2, 2], [2, 2]), 0.5);
  assert.equal(winFraction([3, 1, 2, 2], [1, 3, 2, 1]), (2 + 1 / 2) / 4); // W,L,T,W
});

test('cliffsDelta and magnitude thresholds', () => {
  assert.equal(cliffsDelta([3, 4, 5], [0, 1, 2]), 1);   // a wholly above b
  assert.equal(cliffsDelta([0, 1, 2], [3, 4, 5]), -1);  // a wholly below b
  assert.equal(cliffsDelta([1, 2, 3], [1, 2, 3]), 0);   // symmetric ties
  assert.equal(cliffsMagnitude(0.1), 'negligible');
  assert.equal(cliffsMagnitude(0.2), 'small');
  assert.equal(cliffsMagnitude(0.4), 'medium');
  assert.equal(cliffsMagnitude(0.9), 'large');
});

test('mannWhitneyU: identical -> p~1, separated -> small p, U symmetric', () => {
  const same = mannWhitneyU([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
  assert.ok(same.p > 0.9);
  const sep = mannWhitneyU([10, 11, 12, 13, 14], [1, 2, 3, 4, 5]);
  assert.ok(sep.p < 0.05);
  assert.ok(sep.U >= 0);                        // U is the smaller of U1, n1n2-U1
});

// --- paired permutation -----------------------------------------------------
test('pairedPermutation: identical samples give p = 1', () => {
  const a = [5, 6, 7, 8, 9];
  const r = pairedPermutation(a, a.slice(), { B: 2000, rand: mulberry32(1) });
  assert.equal(r.p, 1);                          // obs=0, every flip |s/n| >= 0
  assert.ok(approx(r.geomRatio, 1));
  assert.equal(r.n, 5);
});

test('pairedPermutation: well-separated gives small p; respects the 1/(B+1) floor', () => {
  const b = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28];
  const a = b.map((x) => 2 * x);                 // uniform 2x, strong effect
  const B = 5000;
  const r = pairedPermutation(a, b, { B, rand: mulberry32(42) });
  assert.ok(r.p < 0.01, `expected small p, got ${r.p}`);
  assert.ok(r.p >= 1 / (B + 1) - 1e-12);         // resolution floor
  assert.ok(approx(r.geomRatio, 2, 1e-12));
});

test('pairedPermutation: p is symmetric under swapping a,b (same seed)', () => {
  const a = [3, 5, 4, 6, 5, 7, 4, 8];
  const b = [2, 4, 5, 3, 6, 4, 5, 5];
  const p1 = pairedPermutation(a, b, { B: 3000, rand: mulberry32(7) }).p;
  const p2 = pairedPermutation(b, a, { B: 3000, rand: mulberry32(7) }).p;
  assert.equal(p1, p2);                          // sign-flip null is symmetric
});

// --- Wilcoxon signed-rank ---------------------------------------------------
test('wilcoxonSignedRank: all-zero differences -> p = 1', () => {
  const r = wilcoxonSignedRank([4, 4, 4], [4, 4, 4]);
  assert.deepEqual(r, { W: 0, z: 0, p: 1 });
});

test('wilcoxonSignedRank: constant positive shift, hand-computed z and p', () => {
  // diffs = [1,2,3,4,5] all positive: W+=15, mu=7.5, sigma=sqrt(13.75),
  // z=(15-7.5-0.5)/sigma, p=2*Phi(-z)
  const a = [1, 2, 3, 4, 5];
  const b = [0, 0, 0, 0, 0];
  const r = wilcoxonSignedRank(a, b);
  const sigma = Math.sqrt((5 * 6 * 11) / 24);
  const zExp = (15 - 7.5 - 0.5) / sigma;
  assert.ok(approx(r.W, 15));
  assert.ok(approx(r.z, zExp, 1e-9));
  assert.ok(r.p > 0.05 && r.p < 0.07);           // ~0.059
});

// --- paired bootstrap CI ----------------------------------------------------
test('pairedBootstrapRatioCI: identical -> [1,1] regardless of resampling', () => {
  const a = [5, 6, 7, 8];
  const [lo, hi] = pairedBootstrapRatioCI(a, a.slice(), { B: 1000, rand: mulberry32(3) });
  assert.ok(approx(lo, 1) && approx(hi, 1));
});

test('pairedBootstrapRatioCI: uniform 2x -> [2,2]; ordered lo<=hi otherwise', () => {
  const b = [10, 12, 14, 16, 18];
  const a = b.map((x) => 2 * x);
  const [lo, hi] = pairedBootstrapRatioCI(a, b, { B: 1000, rand: mulberry32(9) });
  assert.ok(approx(lo, 2) && approx(hi, 2));
  const noisy = pairedBootstrapRatioCI([11, 9, 13, 8, 12], [10, 10, 10, 10, 10],
    { B: 2000, rand: mulberry32(11) });
  assert.ok(noisy[0] <= noisy[1]);
});

// --- paired TOST ------------------------------------------------------------
test('pairedTOST: identical samples are equivalent within +/-5%', () => {
  const a = [100, 102, 98, 101, 99];
  const r = pairedTOST(a, a.slice(), { margin: 0.05, B: 1000, rand: mulberry32(5) });
  assert.equal(r.equivalent, true);
  assert.ok(approx(r.geomRatio, 1, 1e-4));
  assert.deepEqual(r.ci90, [1, 1]);
});

test('pairedTOST: a 2x larger is NOT equivalent; a 2% shift IS', () => {
  const b = [50, 55, 60, 45, 65];
  const twoX = pairedTOST(b.map((x) => 2 * x), b, { margin: 0.05, B: 1000, rand: mulberry32(13) });
  assert.equal(twoX.equivalent, false);
  const twoPct = pairedTOST(b.map((x) => 1.02 * x), b, { margin: 0.05, B: 1000, rand: mulberry32(13) });
  assert.equal(twoPct.equivalent, true);
});

// --- blocked interaction ----------------------------------------------------
test('blockedInteraction: no layer effect -> F=0, p=1', () => {
  // Latin square: equal per-layer means (ssLayer=0) but non-zero within-layer
  // variance (ssErr>0), so F is a well-defined 0 rather than 0/0.
  const D = [
    [1, 2, 3],
    [3, 1, 2],
    [2, 3, 1],
  ];
  const r = blockedInteraction(D, { B: 1000, rand: mulberry32(2) });
  assert.ok(approx(r.F, 0, 1e-9));
  assert.equal(r.p, 1);
  assert.equal(r.L, 3);
  assert.equal(r.R, 3);
});

test('blockedInteraction: strong, consistent layer effect -> large F, small p', () => {
  // layer 0 systematically high, layer 2 low, in every replicate (interaction)
  const D = [
    [1.0, 1.1, 0.9, 1.05, 0.95],
    [0.0, 0.05, -0.05, 0.0, 0.02],
    [-1.0, -1.1, -0.9, -1.05, -0.95],
  ];
  const r = blockedInteraction(D, { B: 2000, rand: mulberry32(4) });
  assert.ok(r.F > 10, `expected large F, got ${r.F}`);
  assert.ok(r.p < 0.01, `expected small p, got ${r.p}`);
});

test('blockedInteraction: p respects the 1/(B+1) resolution floor', () => {
  const D = [
    [2, 2.1, 1.9, 2.05],
    [0, 0.1, -0.1, 0.05],
    [-2, -2.1, -1.9, -2.05],
  ];
  const B = 500;
  const r = blockedInteraction(D, { B, rand: mulberry32(6) });
  assert.ok(r.p >= 1 / (B + 1) - 1e-12);
});
