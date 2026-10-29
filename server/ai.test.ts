/// <reference lib="es2024.promise" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { AiError, aiConfiguration, suggest } from './ai';
import type { Project } from '../src/types';

const element = {
  id: 'heading', type: 'text' as const, name: 'Heading', x: 20, y: 20, width: 280, height: 60,
  fill: '#ffffff', text: 'A design', textColor: '#172033', fontSize: 32, borderRadius: 0,
};
const project: Project = { version: 1, name: 'Example', width: 800, height: 600, background: '#ffffff', elements: [element] };
const suggestion = { title: 'Clear hierarchy', rationale: 'Align the heading.', elements: [element] };
const privateText = 'private-key-or-provider-body-do-not-expose';

test('AI provider boundaries preserve safe validated results and actionable failures', async (t) => {
  const original = Object.fromEntries(['OPENAI_API_KEY', 'OPENAI_MODEL', 'OPENAI_BASE_URL'].map((key) => [key, process.env[key]]));
  t.beforeEach(() => {
    process.env.OPENAI_API_KEY = 'fixture-key';
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_BASE_URL;
  });
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  await t.test('default configuration uses the documented OpenAI image-capable model', () => {
    assert.deepEqual(aiConfiguration(), {
      key: 'fixture-key', model: 'gpt-5.4', baseUrl: 'https://api.openai.com/v1', configurationError: undefined,
    });
  });

  await t.test('custom account models and loopback endpoints remain configurable', () => {
    process.env.OPENAI_MODEL = 'account-specific-model';
    assert.equal(aiConfiguration().configurationError, undefined, 'configuration must not claim to validate provider model access');
    process.env.OPENAI_BASE_URL = 'http://127.0.0.1:3001/v1';
    assert.equal(aiConfiguration().configurationError, undefined, 'loopback fixture APIs remain supported');
  });

  await t.test('missing key and invalid endpoint fail before making a charged request', async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected provider call'); });
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && error.status === 503 && /OPENAI_API_KEY/.test(error.message));
    process.env.OPENAI_API_KEY = 'fixture-key';
    for (const base of ['https://example.com/v1/{project}', 'not-a-url', 'http://example.com/v1', 'https://example.com/v1/chat/completions', 'https://user:password@example.com/v1', 'https://example.com/v1?key=secret', 'https://example.com/v1#fragment']) {
      process.env.OPENAI_BASE_URL = base;
      assert.match(aiConfiguration().configurationError || '', /OPENAI_BASE_URL/);
      await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && error.status === 503);
    }
    assert.equal(fetch.mock.callCount(), 0);
  });

  await t.test('invalid key whitespace is rejected without exposing credentials', async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected provider call'); });
    process.env.OPENAI_API_KEY = `key ${privateText}`;
    await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && error.status === 503 && !error.message.includes(privateText));
    assert.equal(fetch.mock.callCount(), 0);
  });

  await t.test('project-only requests retain direction and use strict structured output without provider-specific reasoning options', async (t) => {
    t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(url, 'https://api.openai.com/v1/chat/completions');
      assert.equal(init?.redirect, 'error');
      assert.deepEqual(init?.headers, { Authorization: 'Bearer fixture-key', 'Content-Type': 'application/json' });
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'gpt-5.4');
      assert.equal('reasoning_effort' in body, false);
      assert.deepEqual(body.messages[1], { role: 'user', content: [{ type: 'text', text: JSON.stringify({ project, direction: 'Enlarge the heading' }) }] });
      assert.equal(body.response_format.type, 'json_schema');
      assert.equal(body.response_format.json_schema.strict, true);
      const schema = body.response_format.json_schema.schema;
      assert.equal(schema.additionalProperties, false);
      assert.deepEqual(schema.required, ['title', 'rationale', 'elements']);
      assert.equal(schema.properties.elements.items.additionalProperties, false);
      assert.deepEqual(schema.properties.elements.items.required, Object.keys(element));
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(suggestion) } }] });
    });
    assert.deepEqual(await suggest(project, 'Enlarge the heading', new AbortController().signal), suggestion);
  });

  await t.test('canvas and reference images are distinct labeled content parts for a configured compatible endpoint', async (t) => {
    process.env.OPENAI_MODEL = 'compatible-vision-model';
    process.env.OPENAI_BASE_URL = 'http://127.0.0.1:3001/v1/';
    const canvasImage = 'data:image/png;base64,iVBORw0KGgo=';
    const referenceImage = 'data:image/jpeg;base64,/9j/';
    t.mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      assert.equal(url, 'http://127.0.0.1:3001/v1/chat/completions');
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, 'compatible-vision-model');
      const content = body.messages[1].content;
      assert.deepEqual(JSON.parse(content[0].text), { project, direction: 'Match the reference spacing' });
      assert.equal(content[1].type, 'text');
      assert.match(content[1].text, /canvas/i);
      assert.deepEqual(content[2], { type: 'image_url', image_url: { url: canvasImage } });
      assert.equal(content[3].type, 'text');
      assert.match(content[3].text, /reference/i);
      assert.deepEqual(content[4], { type: 'image_url', image_url: { url: referenceImage } });
      assert.equal(content.length, 5);
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(suggestion) } }] });
    });
    assert.deepEqual(await suggest(project, 'Match the reference spacing', new AbortController().signal, { canvasImage, referenceImage }), suggestion);
  });

  await t.test('successful suggestion is validated and strips unrelated provider fields', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ ...suggestion, private: privateText }) } }] }));
    assert.deepEqual(await suggest(project, '', new AbortController().signal), suggestion);
  });

  for (const scenario of [
    { name: 'invalid key reported with HTTP 400', status: 400, body: { error: { message: privateText, code: 'invalid_api_key' } }, expected: /rejected OPENAI_API_KEY/ },
    { name: 'authentication failure', status: 401, body: { error: { message: privateText } }, expected: /rejected OPENAI_API_KEY/ },
    { name: 'key permission failure', status: 403, body: { error: { message: privateText } }, expected: /restrictions.*permissions/ },
    { name: 'model unavailable to this account', status: 404, body: { error: { code: 'model_not_found', message: privateText } }, expected: /OPENAI_MODEL/ },
    { name: 'compatible provider describes missing model in message', status: 404, body: { error: { message: `The model fixture-model does not exist. ${privateText}` } }, expected: /OPENAI_MODEL/ },
    { name: 'rate limit failure', status: 429, body: { error: { message: privateText, code: 'rate_limit_exceeded' } }, expected: /quota or rate limit/ },
    { name: 'exhausted credits require billing changes rather than retry', status: 429, body: { error: { message: privateText, code: 'insufficient_quota' } }, expected: /billing/ },
    { name: 'payment required', status: 402, body: { error: { message: privateText } }, expected: /billing/ },
    { name: 'unclassified bad request does not falsely diagnose schema', status: 400, body: { error: { message: privateText } }, expected: /OPENAI_BASE_URL.*OPENAI_MODEL/ },
    { name: 'wrong endpoint with non-JSON body', status: 404, body: undefined, expected: /endpoint was not found/ },
    { name: 'provider timeout', status: 504, body: { error: { message: privateText } }, expected: /timed out/ },
    { name: 'provider outage with malicious body', status: 500, body: { error: { message: privateText, status: { secret: privateText }, details: [null, privateText] } }, expected: /service could not complete/ },
  ]) {
    await t.test(scenario.name, async (t) => {
      const fetch = t.mock.method(globalThis, 'fetch', async () => scenario.body === undefined
        ? new Response(`<html>${privateText}</html>`, { status: scenario.status })
        : Response.json(scenario.body, { status: scenario.status }));
      const log = t.mock.method(console, 'error', () => {});
      await assert.rejects(suggest(project, '', new AbortController().signal), (error) => {
        assert.ok(error instanceof AiError);
        assert.match(error.message, scenario.expected);
        assert.equal(error.message.includes(privateText), false);
        assert.equal(error.status, scenario.status === 504 ? 504 : 502);
        return true;
      });
      assert.equal(fetch.mock.callCount(), 1, 'failures must not automatically retry');
      assert.equal(log.mock.callCount(), 0, 'provider bodies must not be logged');
    });
  }

  for (const scenario of [
    { name: 'invalid outer JSON', response: () => new Response(privateText), expected: /invalid JSON/ },
    { name: 'invalid suggestion JSON', response: () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: privateText } }] }), expected: /invalid design/ },
    { name: 'invalid suggestion geometry', response: () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ ...suggestion, elements: [{ ...element, width: 0 }] }) } }] }), expected: /invalid design/ },
    { name: 'refusal', response: () => Response.json({ choices: [{ finish_reason: 'stop', message: { refusal: privateText } }] }), expected: /declined/ },
    { name: 'truncated output', response: () => Response.json({ choices: [{ finish_reason: 'length', message: { content: privateText } }] }), expected: /incomplete/ },
    { name: 'malformed response envelope', response: () => Response.json({ choices: privateText }), expected: /incomplete/ },
  ]) {
    await t.test(scenario.name, async (t) => {
      t.mock.method(globalThis, 'fetch', async () => scenario.response());
      await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && scenario.expected.test(error.message) && !error.message.includes(privateText));
    });
  }

  await t.test('network errors do not expose URLs, credentials or low-level exception text', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => { throw new TypeError(privateText); });
    await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && /internet connection, proxy or firewall/.test(error.message) && !error.message.includes(privateText));
  });

  await t.test('deadline produces a distinct safe timeout failure', async (t) => {
    t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException(privateText, 'TimeoutError')));
    t.mock.method(globalThis, 'fetch', async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      init?.signal?.throwIfAborted();
      throw new Error('Expected an aborted deadline');
    });
    await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && error.status === 504 && /45 seconds/.test(error.message) && !error.message.includes(privateText));
  });

  await t.test('already canceled requests never contact the provider', async (t) => {
    const controller = new AbortController();
    controller.abort();
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected provider call'); });
    await assert.rejects(suggest(project, '', controller.signal), { name: 'AbortError' });
    assert.equal(fetch.mock.callCount(), 0);
  });

  await t.test('disconnect cancellation aborts an in-flight provider request without becoming a provider failure', async (t) => {
    const controller = new AbortController();
    let providerAborted = false;
    t.mock.method(globalThis, 'fetch', async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const { promise, reject } = Promise.withResolvers<Response>();
      const signal = init?.signal;
      assert.ok(signal);
      signal.addEventListener('abort', () => {
        providerAborted = true;
        reject(signal.reason);
      }, { once: true });
      controller.abort();
      return promise;
    });
    await assert.rejects(suggest(project, '', controller.signal), { name: 'AbortError' });
    assert.equal(providerAborted, true);
  });
});
