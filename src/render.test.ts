import assert from 'node:assert/strict';
import test from 'node:test';
import { projectCode } from './render';
import type { DesignElement, Project } from './types';

function element(overrides: Partial<DesignElement> = {}): DesignElement {
  return {
    id: 'node', type: 'text', name: 'Text', x: 16, y: 24, width: 180, height: 80,
    fill: '#ffffff', text: 'First line\nSecond line', textColor: '#172033', fontSize: 20, borderRadius: 6,
    ...overrides,
  };
}

function project(elements: DesignElement[], overrides: Partial<Project> = {}): Project {
  return { version: 1, name: 'Offline design', width: 800, height: 600, background: '#e0e1e2', elements, ...overrides };
}

test('each primitive generates one honest HTML node and buttons cannot submit forms', () => {
  const rectangle = element({ id: 'box', type: 'rectangle', text: 'Not visible' });
  const text = element({ id: 'paragraph' });
  const button = element({ id: 'action', type: 'button', text: 'Save\nchanges' });
  const code = projectCode(project([rectangle, text, button]));
  assert.match(code.html, /<div class="picasso-node-0"><\/div>/);
  assert.match(code.html, /<p class="picasso-node-1">First line\nSecond line<\/p>/);
  assert.match(code.html, /<button class="picasso-node-2" type="button">Save\nchanges<\/button>/);
  assert.doesNotMatch(code.html, /Not visible/);
  assert.equal(code.nodes.length, 3);
});

test('canonical styles preserve geometry, opaque fills, native resets and multiline typography', () => {
  const text = element({ x: -37.5, y: -8, width: 211, height: 97, fill: '#234567', textColor: '#fedcba', fontSize: 25, borderRadius: 17 });
  const { css } = projectCode(project([text]));
  for (const declaration of ['left: -37.5px;', 'top: -8px;', 'width: 211px;', 'height: 97px;', 'background: #234567;', 'color: #fedcba;', 'font-size: 25px;', 'line-height: 1.18;', 'font-weight: 400;', 'letter-spacing: -0.5px;', 'border-radius: 17px;', 'white-space: pre-wrap;']) {
    assert.ok(css.includes(declaration), `Missing visible style: ${declaration}`);
  }
  assert.match(css, /width: 800px;/);
  assert.match(css, /height: 600px;/);
  assert.match(css, /background: #e0e1e2;/);
  assert.match(css, /overflow: hidden;/);
});

test('title, attributes and literal HTML text cannot escape into executable markup or CSS', () => {
  const attack = `"'><&</title></style></script><script>alert('x')</script><img src=x onerror=alert(1)>`;
  const hostile = element({ id: attack, name: attack, text: attack });
  const code = projectCode(project([hostile], { name: attack }));
  assert.equal(code.nodes[0].elementId, attack, 'original IDs remain a separate correspondence mapping');
  assert.equal(code.nodes[0].selector, '.picasso-root > .picasso-node-0');
  assert.ok(code.html.includes('&quot;&#39;&gt;&lt;&amp;&lt;/title&gt;&lt;/style&gt;&lt;/script&gt;'));
  assert.doesNotMatch(code.document, /<script|<img|onerror="|<\/script>/i);
  assert.equal(code.document.match(/<style>/g)?.length, 1);
  assert.equal(code.document.match(/<\/style>/g)?.length, 1);
  assert.equal(code.document.match(/<\/title>/g)?.length, 1);
  assert.doesNotMatch(code.css, /alert|script|onerror/);
  assert.match(code.document, /^<!doctype html>/);
  assert.match(code.document, /<meta charset="UTF-8">/);
  assert.ok(code.document.includes(code.html));
  assert.ok(code.document.includes(code.css));
  assert.doesNotMatch(code.document, /<script\b|<link\b|<iframe\b|url\(/i);
});

test('invalid CSS-bearing values are rejected instead of becoming CSS or style-closing injections', () => {
  const injection = '#ffffff; } </style><script>alert(1)</script><style>';
  assert.throws(() => projectCode(project([element({ fill: injection })])), /six-digit hex/);
  assert.throws(() => projectCode(project([element({ textColor: injection })])), /six-digit hex/);
  assert.throws(() => projectCode(project([], { background: injection })), /six-digit hex/);
  assert.throws(() => projectCode(project([element({ x: Number.NaN })])), /finite number/);
});

test('selected snippets carry their own scoped positioning, background and clipping context', () => {
  const code = projectCode(project([element({ id: 'first', text: 'First' }), element({ id: 'second', type: 'button', text: 'Second' })]));
  const snippet = code.nodes[1];
  assert.equal(snippet.elementId, 'second');
  assert.match(snippet.html, /^<div class="picasso-root"/);
  assert.match(snippet.html, /<button class="picasso-node-1" type="button">Second<\/button>/);
  assert.doesNotMatch(snippet.html, /picasso-node-0|First/);
  assert.match(snippet.css, /^\.picasso-root \{/);
  assert.ok(snippet.css.includes(`${snippet.selector} {`));
  assert.match(snippet.css, /position: relative;/);
  assert.match(snippet.css, /position: absolute;/);
  assert.match(snippet.css, /background: #e0e1e2;/);
  assert.match(snippet.css, /overflow: hidden;/);
  assert.doesNotMatch(snippet.css, /picasso-node-0/);
});

test('generation is deterministic, preserves paint order and ignores transient editor metadata', () => {
  const first = element({ id: 'user id with spaces', text: 'Back' });
  const second = element({ id: 'another#id', text: 'Front' });
  const input = project([first, second]);
  const before = JSON.stringify(input);
  const code = projectCode(input);
  assert.deepEqual(projectCode(input), code);
  assert.equal(JSON.stringify(input), before);
  assert.ok(code.html.indexOf('>Back</p>') < code.html.indexOf('>Front</p>'));
  assert.deepEqual(code.nodes.map(node => node.elementId), [first.id, second.id]);
  const reversed = projectCode(project([second, first]));
  assert.ok(reversed.html.indexOf('>Front</p>') < reversed.html.indexOf('>Back</p>'));
  assert.equal(reversed.nodes[0].selector, code.nodes[0].selector, 'selectors are controlled by order, not IDs');
  const withTransientState = Object.assign({}, input, { selectedIds: [first.id], proposal: { elements: [element({ text: 'Unaccepted proposal' })] } });
  assert.deepEqual(projectCode(withTransientState), code);
  assert.doesNotMatch(code.html, /selected|proposal|handle|user id with spaces|another#id/);
});
