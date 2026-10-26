import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProject, parseSuggestion } from './validation';

const element = {
  id: 'heading', type: 'text', name: 'Heading', x: 20, y: 20, width: 280, height: 60,
  fill: '#ffffff', text: 'A design', textColor: '#172033', fontSize: 32, borderRadius: 0,
};
const project = { version: 1, name: 'Example', width: 800, height: 600, background: '#ffffff', elements: [element] };

test('import rejects ambiguous identities and unsupported element kinds', () => {
  assert.throws(() => parseProject({ ...project, elements: [element, { ...element, text: 'Duplicate identity' }] }), /unique/);
  assert.throws(() => parseProject({ ...project, elements: [{ ...element, id: '' }] }), /nonempty/);
  assert.throws(() => parseProject({ ...project, elements: [{ ...element, type: 'iframe' }] }), /Unsupported element/);
  assert.throws(() => parseProject({ ...project, version: 2 }), /version/);
});

test('import rejects non-finite geometry, invalid bounds and unsafe colors', () => {
  for (const invalid of [{ x: NaN }, { width: 0 }, { height: Infinity }, { fontSize: 301 }, { borderRadius: -1 }, { fill: 'url(https://example.com)' }]) {
    assert.throws(() => parseProject({ ...project, elements: [{ ...element, ...invalid }] }));
  }
  assert.throws(() => parseProject({ ...project, width: 239 }), /artboard width/);
  assert.throws(() => parseProject({ ...project, elements: Array.from({ length: 201 }, (_, i) => ({ ...element, id: String(i) })) }), /200/);
});

test('empty projects are valid but an empty AI replacement cannot erase the design', () => {
  assert.deepEqual(parseProject({ ...project, elements: [] }).elements, []);
  assert.throws(() => parseSuggestion({ title: 'Empty', rationale: 'Erase', elements: [] }), /empty design/);
});

test('untrusted AI output obeys the same invariants and text limits', () => {
  assert.throws(() => parseSuggestion({ title: 'New', rationale: 'Improve', elements: [{ ...element, text: 'x'.repeat(2001) }] }), /element text/);
  assert.throws(() => parseSuggestion({ title: 'x'.repeat(121), rationale: 'Improve', elements: [element] }), /title/);
  assert.throws(() => parseSuggestion({ title: 'New', rationale: 3, elements: [element] }), /rationale/);
  assert.throws(() => parseSuggestion({ title: 'New', rationale: 'Improve', elements: [element, element] }), /unique/);
});
