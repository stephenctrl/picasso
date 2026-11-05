import assert from 'node:assert/strict';
import test from 'node:test';
import type { DesignElement, Project } from './types';
import { sameElementContent, sameProjectContent } from './pages/editor/projectContent';

const element: DesignElement = {
  id: 'one', type: 'text', name: 'Heading', x: 10, y: 20, width: 120, height: 40,
  fill: '#FFFFFF', text: 'Hello', textColor: '#000000', fontSize: 24, borderRadius: 4,
};
const project: Project = { version: 1, name: 'Page', width: 800, height: 600, background: '#FFFFFF', elements: [element] };

test('project content equality accepts immutable references and independently parsed copies', () => {
  assert.equal(sameProjectContent(project, project), true);
  assert.equal(sameProjectContent(project, { ...project, elements: [element] }), true);
  assert.equal(sameProjectContent(project, JSON.parse(JSON.stringify(project))), true);
  assert.equal(sameElementContent(element, { ...element }), true);
});

test('every v1 layer field participates in content equality', () => {
  const changes: { [Key in keyof DesignElement]: DesignElement[Key] } = {
    id: 'two', type: 'button', name: 'Changed', x: 11, y: 21, width: 121, height: 41,
    fill: '#CCCCCC', text: 'Changed', textColor: '#111111', fontSize: 25, borderRadius: 5,
  };
  for (const [key, value] of Object.entries(changes)) {
    const changed = { ...element, [key]: value };
    assert.equal(sameElementContent(element, changed), false, key);
    assert.equal(sameProjectContent(project, { ...project, elements: [changed] }), false, key);
  }
});

test('project metadata, layer count, and paint order participate in content equality', () => {
  for (const [key, value] of Object.entries({ name: 'Changed', width: 801, height: 601, background: '#CCCCCC' })) {
    assert.equal(sameProjectContent(project, { ...project, [key]: value }), false, key);
  }
  assert.equal(sameProjectContent(project, { ...project, elements: [] }), false);
  const second = { ...element, id: 'two' };
  assert.equal(sameProjectContent({ ...project, elements: [element, second] }, { ...project, elements: [second, element] }), false);
});

test('a changed project can return to saved content without sharing saved references', () => {
  const moved = { ...project, elements: [{ ...element, x: 30 }] };
  const restored = { ...moved, elements: [{ ...moved.elements[0], x: element.x }] };
  assert.equal(sameProjectContent(project, moved), false);
  assert.equal(sameProjectContent(project, restored), true);
});
