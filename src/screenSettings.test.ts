import assert from 'node:assert/strict';
import test from 'node:test';
import { screenDimensionsFromRatio } from './screenSettings';

test('common custom ratios derive the height from the chosen width', () => {
  assert.deepEqual(screenDimensionsFromRatio(16, 9, 1920), { ok: true, width: 1920, height: 1080 });
  assert.deepEqual(screenDimensionsFromRatio(3, 2, 1200), { ok: true, width: 1200, height: 800 });
  assert.deepEqual(screenDimensionsFromRatio(2, 3, 800), { ok: true, width: 800, height: 1200 });
  assert.deepEqual(screenDimensionsFromRatio(1.5, 1, 1200), { ok: true, width: 1200, height: 800 });
});

test('valid screen boundaries are inclusive and derived height rounds to the nearest unit', () => {
  assert.deepEqual(screenDimensionsFromRatio(1, 1, 240), { ok: true, width: 240, height: 240 });
  assert.deepEqual(screenDimensionsFromRatio(1, 1, 4000), { ok: true, width: 4000, height: 4000 });
  assert.deepEqual(screenDimensionsFromRatio(16, 9, 1000), { ok: true, width: 1000, height: 563 });
  assert.deepEqual(screenDimensionsFromRatio(16, 9, 1000.5), { ok: true, width: 1000.5, height: 563 });
});

test('ratios cannot silently clamp or round an out-of-bounds height into range', () => {
  for (const input of [[16, 9, 240], [9, 16, 4000], [4000, 239.9, 4000], [240, 4000.1, 240]]) {
    assert.equal(screenDimensionsFromRatio(input[0], input[1], input[2]).ok, false);
  }
});

test('invalid ratio sides, nonfinite arithmetic and invalid widths never produce dimensions', () => {
  for (const side of [0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(screenDimensionsFromRatio(side, 9, 1920).ok, false);
    assert.equal(screenDimensionsFromRatio(16, side, 1920).ok, false);
  }
  for (const width of [0, 239.99, 4000.01, NaN, Infinity, -Infinity]) {
    assert.equal(screenDimensionsFromRatio(16, 9, width).ok, false);
  }
  assert.equal(screenDimensionsFromRatio(Number.MIN_VALUE, Number.MAX_VALUE, 240).ok, false);
  assert.equal(screenDimensionsFromRatio(Number.MAX_VALUE, Number.MIN_VALUE, 240).ok, false);
});
