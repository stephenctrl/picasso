import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePort, serverFailureMessage } from './startup';

test('PORT defaults only when absent and accepts valid TCP ports', () => {
  assert.equal(parsePort(undefined), 3000);
  for (const port of [1, 3000, 65535]) assert.equal(parsePort(String(port)), port);
});

test('invalid PORT values produce an actionable diagnostic without leaking the value', () => {
  for (const value of ['', ' ', '0', '-1', '65536', '1.5', 'NaN', 'Infinity', '0x1000', '3e3', ' 3000 ', 'private-invalid-value']) {
    assert.throws(() => parsePort(value), (error: unknown) => {
      assert.equal(serverFailureMessage(error, undefined), 'Picasso could not start: PORT must be an integer between 1 and 65535. Correct PORT and restart.');
      return true;
    });
  }
});

test('address and permission failures explain recovery without exposing raw errors', () => {
  assert.equal(
    serverFailureMessage(Object.assign(new Error('private detail'), { code: 'EADDRINUSE' }), 3107),
    'Picasso could not bind to 127.0.0.1:3107: the port is already in use. Stop the other server yourself or set PORT to an available port, then restart.',
  );
  assert.equal(
    serverFailureMessage(Object.assign(new Error('private detail'), { code: 'EACCES' }), 3107),
    'Picasso could not bind to 127.0.0.1:3107: permission was denied. Choose an allowed PORT or check local permissions, then restart.',
  );
});

test('unexpected startup and runtime failures use a fixed safe terminal diagnostic', () => {
  for (const error of [new Error('private detail'), 'private detail', null, { code: 'UNKNOWN', message: 'private detail' }]) {
    assert.equal(serverFailureMessage(error, 3000), 'Picasso stopped because the server could not initialize or continue running. Check the project dependencies, build output, and local permissions, then restart.');
  }
});
