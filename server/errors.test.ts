import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { brotliCompressSync, constants, deflateSync, gzipSync } from 'node:zlib';
import express from 'express';
import type { Request, Response } from 'express';
import { handleRequestError } from './errors';

const internalMessage = 'The server could not complete the request. Please try again.';
const unsupportedMessage = 'Unsupported request body charset or encoding. Send UTF-8 JSON with a supported content encoding.';

test('request errors retain safe consumer-visible HTTP statuses and bodies', async (t) => {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.post('/body', (req, res) => { res.json({ ok: req.body?.accepted === true }); });
  app.get('/unexpected', () => { throw new Error('private server detail'); });
  app.get('/unexpected-status', () => { throw Object.assign(new Error('private server detail'), { status: 400 }); });
  app.get('/unexpected-syntax', () => { throw new SyntaxError('private server detail'); });
  app.get('/unexpected-status-envelope', () => {
    throw Object.assign(new Error('private server detail'), { status: 400, statusCode: 400, expose: true });
  });
  app.get('/unexpected-inflater-failure', () => {
    throw Object.assign(new Error('private server detail'), {
      status: 400, statusCode: 400, expose: true, code: 'Z_MEM_ERROR', errno: constants.Z_MEM_ERROR,
    });
  });
  app.get('/unexpected-data-error', () => {
    throw Object.assign(new Error('private server detail'), {
      status: 400, statusCode: 400, expose: true, code: 'Z_DATA_ERROR', errno: constants.Z_DATA_ERROR,
    });
  });
  app.use(handleRequestError);
  const server = createServer(app);
  t.after(async () => {
    const closed = once(server, 'close');
    server.close();
    server.closeAllConnections();
    await closed;
  });
  const listening = once(server, 'listening');
  server.listen(0, '127.0.0.1');
  await listening;
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const cases: { name: string; headers: Record<string, string>; body: string | Uint8Array<ArrayBuffer>; status: number; error: string }[] = [
    { name: 'malformed JSON', headers: { 'content-type': 'application/json' }, body: '{', status: 400, error: 'Invalid request body.' },
    { name: 'oversized JSON', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: 'x'.repeat(1024 * 1024) }), status: 413, error: 'Project is too large (maximum 1 MB).' },
    { name: 'unsupported charset', headers: { 'content-type': 'application/json; charset=made-up' }, body: '{}', status: 415, error: unsupportedMessage },
    { name: 'unsupported encoding', headers: { 'content-type': 'application/json', 'content-encoding': 'made-up' }, body: '{}', status: 415, error: unsupportedMessage },
  ];
  const compressions = [
    { encoding: 'gzip', compress: gzipSync },
    { encoding: 'deflate', compress: deflateSync },
    { encoding: 'br', compress: brotliCompressSync },
  ];
  for (const { encoding, compress } of compressions) {
    const headers = { 'content-type': 'application/json', 'content-encoding': encoding };
    const compressed = new Uint8Array(compress('{"accepted":true}'));
    cases.push(
      { name: `invalid ${encoding} bytes`, headers, body: 'not compressed', status: 400, error: 'Invalid request body.' },
      { name: `truncated ${encoding} stream`, headers, body: compressed.subarray(0, compressed.length - 1), status: 400, error: 'Invalid request body.' },
      {
        name: `oversized decompressed ${encoding} body`, headers,
        body: new Uint8Array(compress(JSON.stringify({ data: 'x'.repeat(1024 * 1024) }))),
        status: 413, error: 'Project is too large (maximum 1 MB).',
      },
    );
  }
  cases.push({
    name: 'deflate stream requiring an unavailable dictionary',
    headers: { 'content-type': 'application/json', 'content-encoding': 'deflate' },
    body: new Uint8Array(deflateSync('{"accepted":true}', { dictionary: Buffer.from('accepted') })),
    status: 400, error: 'Invalid request body.',
  });
  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const response = await fetch(`${base}/body`, { method: 'POST', headers: scenario.headers, body: scenario.body });
      assert.equal(response.status, scenario.status);
      assert.deepEqual(await response.json(), { error: scenario.error });
    });
  }
  for (const route of ['/unexpected', '/unexpected-status', '/unexpected-syntax', '/unexpected-status-envelope', '/unexpected-inflater-failure', '/unexpected-data-error']) {
    await t.test(route, async () => {
      const headers = route === '/unexpected-status-envelope' || route === '/unexpected-inflater-failure'
        ? { 'content-encoding': 'gzip' }
        : undefined;
      const response = await fetch(`${base}${route}`, { headers });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: internalMessage });
    });
  }
  await t.test('valid JSON remains successful', async () => {
    const response = await fetch(`${base}/body`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"accepted":true}' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
  for (const { encoding, compress } of compressions) {
    await t.test(`valid ${encoding} JSON remains successful`, async () => {
      const response = await fetch(`${base}/body`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-encoding': encoding },
        body: new Uint8Array(compress('{"accepted":true}')),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
    });
  }
});

test('errors after headers are sent delegate the original error without writing another response', () => {
  const error = Object.assign(new Error('already streaming'), { type: 'entity.parse.failed' });
  const delegated: unknown[] = [];
  const response = {
    headersSent: true,
    status: () => { assert.fail('must not write headers twice'); },
    json: () => { assert.fail('must not append an error body'); },
  } as unknown as Response;
  handleRequestError(error, {} as Request, response, (value: unknown) => { delegated.push(value); });
  assert.deepEqual(delegated, [error]);
});

test('an aborted body does not attempt a response to the disconnected client', () => {
  const response = {
    headersSent: false,
    status: () => { assert.fail('must not respond to an aborted body'); },
  } as unknown as Response;
  handleRequestError({ type: 'request.aborted' }, { aborted: true } as Request, response, () => { assert.fail('aborted body is already handled'); });
});
