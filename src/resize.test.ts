import assert from 'node:assert/strict';
import test from 'node:test';
import { resizeBounds, resizeDirections, resizeHitArea } from './resize';

const original = { x: 100, y: 200, width: 80, height: 60 };

test('all edges and corners change only their axes and preserve the opposite anchor', () => {
  for (const { direction } of resizeDirections) {
    const result = resizeBounds(original, direction, 12, 8);
    const west = direction.includes('w');
    const east = direction.includes('e');
    const north = direction.includes('n');
    const south = direction.includes('s');
    assert.deepEqual(result, {
      x: west ? 112 : 100,
      y: north ? 208 : 200,
      width: west ? 68 : east ? 92 : 80,
      height: north ? 52 : south ? 68 : 60,
    }, direction);
    if (west) assert.equal(result.x + result.width, original.x + original.width);
    if (north) assert.equal(result.y + result.height, original.y + original.height);
  }
  assert.deepEqual(original, { x: 100, y: 200, width: 80, height: 60 });
});

test('resizing cannot flip an edge and clamps size without moving the anchor', () => {
  assert.deepEqual(resizeBounds(original, 'nw', 10000, 10000), { x: 179, y: 259, width: 1, height: 1 });
  assert.deepEqual(resizeBounds(original, 'nw', -10000, -10000), { x: -3820, y: -3740, width: 4000, height: 4000 });
  assert.deepEqual(resizeBounds(original, 'se', -10000, -10000), { ...original, width: 1, height: 1 });
  assert.deepEqual(resizeBounds(original, 'se', 10000, 10000), { ...original, width: 4000, height: 4000 });
});

test('north and west respect position limits while retaining the opposite edge', () => {
  const low = { x: -3995, y: -3995, width: 20, height: 30 };
  const expanded = resizeBounds(low, 'nw', -10000, -10000);
  assert.deepEqual(expanded, { x: -4000, y: -4000, width: 25, height: 35 });
  const high = { x: 7995, y: 7995, width: 20, height: 30 };
  const contracted = resizeBounds(high, 'nw', 10000, 10000);
  assert.deepEqual(contracted, { x: 8000, y: 8000, width: 15, height: 25 });
  assert.equal(contracted.x + contracted.width, high.x + high.width);
  assert.equal(contracted.y + contracted.height, high.y + high.height);
});

test('fractional geometry retains its opposite anchors', () => {
  const fractional = { x: 100.25, y: 200.5, width: 80.75, height: 60.25 };
  const result = resizeBounds(fractional, 'nw', 12, 8);
  assert.equal(result.x + result.width, fractional.x + fractional.width);
  assert.equal(result.y + result.height, fractional.y + fractional.height);
  assert.equal(result.width, 68.75);
  assert.equal(result.height, 52.25);
});

test('large-layer resize hit areas retain six screen pixels across zoom levels', () => {
  for (const scale of [0.25, 0.75, 1, 2]) {
    const hit = resizeHitArea(100, 100, scale);
    assert.equal(hit.x * scale, 6);
    assert.equal(hit.y * scale, 6);
  }
});

test('tiny layers retain an interior and all resize hit areas stay inside their layer', () => {
  for (const width of [1, 2, 10, 100]) {
    for (const height of [1, 2, 10, 100]) {
      for (const scale of [0.25, 0.75, 2]) {
        const hit = resizeHitArea(width, height, scale);
        assert.ok(hit.x <= width / 4 && hit.y <= height / 4);
        assert.ok(width - 2 * hit.x >= width / 2);
        assert.ok(height - 2 * hit.y >= height / 2);
        assert.ok(hit.x * scale <= 6 && hit.y * scale <= 6);
      }
    }
  }
});
