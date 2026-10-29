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
  const original = Object.fromEntries(['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_BASE_URL'].map((key) => [key, process.env[key]]));
  t.beforeEach(() => {
    process.env.GEMINI_API_KEY = 'fixture-key';
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_BASE_URL;
  });
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  await t.test('custom account models and loopback endpoints remain configurable', () => {
    process.env.GEMINI_MODEL = 'account-specific-model';
    assert.equal(aiConfiguration().configurationError, undefined, 'configuration must not claim to validate provider model access');
    process.env.GEMINI_BASE_URL = 'http://127.0.0.1:3001/v1';
    assert.equal(aiConfiguration().configurationError, undefined, 'loopback fixture APIs remain supported');
  });

  await t.test('missing key and invalid endpoint fail before making a charged request', async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected provider call'); });
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && error.status === 503 && /GEMINI_API_KEY/.test(error.message));
    process.env.GEMINI_API_KEY = 'fixture-key';
    for (const base of ['https://api.gemini.com/v1/projects/{project_id}/locations/{location}/endpoints/{endpoint}', 'not-a-url', 'http://example.com/v1', 'https://example.com/v1/chat/completions']) {
      process.env.GEMINI_BASE_URL = base;
      assert.match(aiConfiguration().configurationError || '', /GEMINI_BASE_URL/);
      await assert.rejects(suggest(project, '', new AbortController().signal), (error) => error instanceof AiError && error.status === 503);
    }
    assert.equal(fetch.mock.callCount(), 0);
  });

  await t.test('successful suggestion is validated and strips unrelated provider fields', async (t) => {
    t.mock.method(globalThis, 'fetch', async () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ ...suggestion, private: privateText }) } }] }));
    assert.deepEqual(await suggest(project, '', new AbortController().signal), suggestion);
  });

  for (const scenario of [
    { name: 'invalid key reported with HTTP 400', status: 400, body: { error: { message: privateText, details: [{ reason: 'API_KEY_INVALID' }] } }, expected: /rejected GEMINI_API_KEY/ },
    { name: 'key permission failure', status: 403, body: { error: { message: privateText } }, expected: /restrictions.*permissions/ },
    { name: 'model unavailable to this account', status: 404, body: { error: { message: `models/fixture-model is not found for API version v1beta. ${privateText}` } }, expected: /configured Gemini model/ },
    { name: 'Google array error identifies model eligibility instead of endpoint failure', status: 404, body: [{ error: { code: 404, status: 'NOT_FOUND', message: `This model models/fixture-model is no longer available to new users. ${privateText}` } }], expected: /configured Gemini model/ },
    { name: 'quota failure', status: 429, body: { error: { message: privateText } }, expected: /quota or rate limit/ },
    { name: 'billing or regional precondition failure', status: 400, body: { error: { status: 'FAILED_PRECONDITION', message: privateText } }, expected: /billing or project eligibility/ },
    { name: 'payment required', status: 402, body: { error: { message: privateText } }, expected: /billing or project eligibility/ },
    { name: 'unclassified bad request does not falsely diagnose schema', status: 400, body: { error: { message: privateText } }, expected: /project billing and regional availability/ },
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
