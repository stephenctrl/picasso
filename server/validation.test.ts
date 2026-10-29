import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProject, parseRequest, parseSuggestion } from './validation';

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

const pngBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const png = `data:image/png;base64,${pngBytes.toString('base64')}`;
const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==';
const webp = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

test('suggest requests preserve project-only clients and accept independently optional labeled raster inputs', () => {
  const input = { project, instruction: 'Improve contrast' };
  assert.deepEqual(parseRequest(input), input);
  for (const value of [png, jpeg, webp]) {
    assert.deepEqual(parseRequest({ ...input, canvasImage: value }), { ...input, canvasImage: value });
    assert.deepEqual(parseRequest({ ...input, referenceImage: value }), { ...input, referenceImage: value });
  }
  assert.deepEqual(parseRequest({ ...input, canvasImage: png, referenceImage: jpeg }), { ...input, canvasImage: png, referenceImage: jpeg });
  assert.throws(() => parseRequest({ ...input, instruction: 'x'.repeat(2001) }), /AI direction/);
});

test('image inputs reject URLs, unsupported MIME, malformed base64 and mismatched signatures', () => {
  const invalidImages = [
    null, 42, {}, '', 'https://example.com/image.png', 'file:///image.png',
    'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/gif;base64,R0lGODlhAQABAA==',
    'data:text/plain;base64,aGVsbG8=', 'data:image/png,not-base64',
    'data:image/png;base64,', 'data:image/png;base64,!!!!',
    `${png}\n`, png.replace(';base64,', ';base64, '), png.replace(/=+$/, ''),
    'data:image/png;base64,iVBORw0KGgp=', // Nonzero unused padding bits.
    'data:image/png;base64,iVBORw0KGgo===',
    png.replace('image/png', 'image/jpeg'), jpeg.replace('image/jpeg', 'image/webp'),
    webp.replace('image/webp', 'image/png'),
    'data:image/png;base64,AAAAAAAAAAA=', 'data:image/jpeg;base64,/9g=',
    'data:image/webp;base64,UklGRgAAAABXRUJQ', // Incorrect RIFF length.
  ];
  for (const field of ['canvasImage', 'referenceImage']) {
    for (const value of invalidImages) {
      assert.throws(() => parseRequest({ project, instruction: '', [field]: value }), /image/i);
    }
  }
});

test('decoded image limits apply per image at the exact 2 MiB boundary', () => {
  const maximum = 2 * 1024 * 1024;
  const imageAtSize = (size: number) => {
    const bytes = Buffer.alloc(size);
    pngBytes.copy(bytes, 0);
    return `data:image/png;base64,${bytes.toString('base64')}`;
  };
  const atLimit = imageAtSize(maximum);
  const input = { project, instruction: '', canvasImage: atLimit, referenceImage: atLimit };
  assert.deepEqual(parseRequest(input), input);
  assert.equal(parseRequest({ project, instruction: '', canvasImage: imageAtSize(maximum - 1) }).canvasImage?.startsWith('data:image/png;'), true);
  for (const field of ['canvasImage', 'referenceImage']) {
    for (const size of [maximum + 1, maximum + 4]) {
      assert.throws(() => parseRequest({ project, instruction: '', [field]: imageAtSize(size) }), /maximum 2 MiB/);
    }
  }
});
