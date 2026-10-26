import assert from 'node:assert/strict';
import test from 'node:test';
import type { DesignElement, Project } from './types';
import { applyLayout, getAlignmentGuides } from './layout';

function layer(id: string, x: number, y: number, width = 80, height = 40): DesignElement {
  return { id, type: 'rectangle', name: id, x, y, width, height, fill: '#ffffff', text: '', textColor: '#172033', fontSize: 16, borderRadius: 0 };
}
function project(elements: DesignElement[], width = 800, height = 600): Project {
  return { version: 1, name: 'Layout checks', width, height, background: '#ffffff', elements };
}

test('one layer aligns to screen while several align to selection bounds without touching other layers', () => {
  const first = layer('first', 70, 90, 120, 40);
  const second = layer('second', 260, 220, 60, 80);
  const background = layer('background', 0, 0, 800, 600);
  const p = project([background, first, second]);
  assert.equal(applyLayout(p, ['first'], 'align-center')[1].x, 340);
  const aligned = applyLayout(p, ['first', 'second'], 'align-right');
  assert.equal(aligned[1].x + first.width, 320);
  assert.equal(aligned[2].x + second.width, 320);
  assert.strictEqual(aligned[0], background);
  assert.equal(first.x, 70, 'alignment must not mutate its input');
  assert.deepEqual(aligned.map(e => e.id), ['background', 'first', 'second']);
  assert.strictEqual(applyLayout(p, [], 'align-left'), p.elements);
});

test('row arrangement has equal gaps, preserves sizes, and never rearranges unselected layers', () => {
  const p = project([layer('a', 600, 420, 100, 50), layer('unselected', 7, 8), layer('b', 50, 180, 140, 90), layer('c', 310, 20, 60, 40)]);
  const result = applyLayout(p, ['a', 'b', 'c'], 'arrange-horizontal');
  const [a, , b, c] = result;
  assert.equal(b.x - a.x - a.width, 24);
  assert.equal(c.x - b.x - b.width, 24);
  assert.equal(a.y + a.height / 2, b.y + b.height / 2);
  assert.equal(c.y + c.height / 2, b.y + b.height / 2);
  assert.strictEqual(result[1], p.elements[1]);
  for (let i = 0; i < result.length; i += 1) {
    assert.equal(result[i].width, p.elements[i].width);
    assert.equal(result[i].height, p.elements[i].height);
    assert.ok(result[i].x >= 0 && result[i].x + result[i].width <= p.width);
  }
});

test('grid fits unequal rectangles without overlap or reordering and rejects impossible layout rather than resizing', () => {
  const p = project([layer('a', 1, 1, 120, 100), layer('b', 1, 1, 90, 60), layer('c', 1, 1, 110, 70), layer('d', 1, 1, 60, 80)], 320, 320);
  const result = applyLayout(p, p.elements.map(e => e.id), 'arrange-grid');
  for (let i = 0; i < result.length; i += 1) {
    const a = result[i];
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= p.width && a.y + a.height <= p.height);
    for (const b of result.slice(i + 1)) assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, 'grid layers overlap');
  }
  assert.deepEqual(result.map(e => [e.id, e.width, e.height]), p.elements.map(e => [e.id, e.width, e.height]));
  const oversized = project([layer('wide', 0, 0, 300, 250), layer('other', 10, 10, 300, 250)], 320, 320);
  assert.throws(() => applyLayout(oversized, ['wide', 'other'], 'arrange-grid'), /do not fit/);
  assert.equal(oversized.elements[1].x, 10);
});

test('snapping chooses the nearest anchor within tolerance and leaves distant geometry alone', () => {
  const dragged = layer('dragged', 193, 147, 80, 40);
  const neighbor = layer('neighbor', 200, 150, 100, 60);
  const p = project([dragged, neighbor]);
  const near = getAlignmentGuides(p, dragged, 8);
  assert.equal(near.x, 200);
  assert.equal(near.y, 150);
  assert.deepEqual(near.guides, [{ axis: 'x', position: 200 }, { axis: 'y', position: 150 }]);
  const distant = getAlignmentGuides(p, dragged, 2);
  assert.deepEqual(distant, { x: 193, y: 147, guides: [] });
  const centered = layer('centered', 358, 278, 80, 40);
  const screenSnap = getAlignmentGuides(project([centered]), centered, 3);
  assert.equal(screenSnap.x, 360);
  assert.equal(screenSnap.y, 280);
  assert.equal(dragged.x, 193, 'snapping must not mutate its input');
});
