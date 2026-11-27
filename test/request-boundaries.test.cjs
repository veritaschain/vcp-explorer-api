'use strict';
// Real HTTP checks of input selection and parser errors in the compiled mock API.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');

process.env.PORT = '0';
const { server } = require('../dist/index.js');
const { EventsDataSource } = require('../dist/data/events.js');
const originals = {
  searchEvents: EventsDataSource.prototype.searchEvents,
  getRecentEvents: EventsDataSource.prototype.getRecentEvents,
};
const calls = { searchEvents: 0, getRecentEvents: 0 };
let root;

before(async () => {
  for (const method of Object.keys(originals)) {
    EventsDataSource.prototype[method] = async function (...args) {
      calls[method]++;
      return originals[method].apply(this, args);
    };
  }
  if (!server.listening) await once(server, 'listening');
  root = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const [method, original] of Object.entries(originals)) {
    EventsDataSource.prototype[method] = original;
  }
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

for (const [path, method] of [
  ['/v1/events?event_id=01934e3a-7b2c-7f93-8f2a-1234567890ab', 'searchEvents'],
  ['/v1/events?hash=abc123', 'searchEvents'],
  ['/v1/events?traceId=unknown', 'searchEvents'],
  ['/v1/events?symbol=XAUUSD&event_id=unknown', 'searchEvents'],
  ['/v1/events?hash[]=abc123', 'searchEvents'],
  ['/v1/events?hash[value]=abc123', 'searchEvents'],
  ['/v1/events/recent?offset=10', 'getRecentEvents'],
  ['/v1/events/recent?symbol=XAUUSD', 'getRecentEvents'],
  ['/v1/events/recent?limit=1&limt=2', 'getRecentEvents'],
]) {
  test(`unsupported query is rejected before data access: ${path}`, async () => {
    const beforeCalls = calls[method];
    const response = await fetch(root + path, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, 'invalid_parameter');
    assert.equal(body.events, undefined);
    assert.equal(calls[method], beforeCalls);
  });
}

for (const [name, headers, body, status, error] of [
  ['malformed JSON', { 'Content-Type': 'application/json' }, '{"private":"do-not-echo",', 400, 'invalid_body'],
  ['oversized JSON', { 'Content-Type': 'application/json' }, JSON.stringify({ value: 'x'.repeat(102401) }), 413, 'payload_too_large'],
  ['oversized form', { 'Content-Type': 'application/x-www-form-urlencoded' }, 'value=' + 'x'.repeat(102401), 413, 'payload_too_large'],
  ['too many form parameters', { 'Content-Type': 'application/x-www-form-urlencoded' }, Array.from({ length: 1001 }, (_, i) => `key${i}=value`).join('&'), 413, 'payload_too_large'],
  ['excessively nested form', { 'Content-Type': 'application/x-www-form-urlencoded' }, 'key' + '[value]'.repeat(33) + '=test', 400, 'invalid_body'],
  ['unsupported JSON charset', { 'Content-Type': 'application/json; charset=iso-8859-1' }, '{}', 415, 'unsupported_media_type'],
  ['unsupported form charset', { 'Content-Type': 'application/x-www-form-urlencoded; charset=iso-8859-1' }, 'value=test', 415, 'unsupported_media_type'],
  ['quoted Latin-1 form charset', { 'Content-Type': 'application/x-www-form-urlencoded; Charset="ISO-8859-1"' }, 'value=test', 415, 'unsupported_media_type'],
  ['unsupported content encoding', { 'Content-Type': 'application/json', 'Content-Encoding': 'unknown' }, '{}', 415, 'unsupported_media_type'],
]) {
  test(`${name} preserves the parser client-error status and hides request data`, async () => {
    // The existing parsers run before route selection; this does not add a POST endpoint.
    const response = await fetch(root + '/health', {
      method: 'POST', headers, body, signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, status);
    const result = await response.json();
    assert.equal(result.error, error);
    assert.deepEqual(Object.keys(result).sort(), ['error', 'message']);
    assert.equal(typeof result.message, 'string');
    assert.equal(JSON.stringify(result).includes('do-not-echo'), false);
  });
}

test('valid requests retain defaults, supported filters and unsupported-method behavior', async () => {
  const all = await (await fetch(root + '/v1/events')).json();
  assert.equal(all.events.length, 10);
  assert.deepEqual(all.query, {});
  const filtered = await (await fetch(root + '/v1/events?symbol=XAUUSD&limit=1')).json();
  assert.equal(filtered.events.length, 1);
  assert.equal(filtered.events[0].symbol, 'XAUUSD');
  assert.deepEqual(filtered.query, { symbol: 'XAUUSD', limit: 1 });
  const recent = await (await fetch(root + '/v1/events/recent?limit=2')).json();
  assert.equal(recent.events.length, 2);
  const validForm = await fetch(root + '/health', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset="UTF-8"' }, body: 'value=test',
  });
  assert.equal(validForm.status, 404);
  const unsupportedMethod = await fetch(root + '/health', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(unsupportedMethod.status, 404);
  assert.equal((await unsupportedMethod.json()).error, 'not_found');
});
