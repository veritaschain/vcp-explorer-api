const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');

process.env.PORT = '0';
const { server } = require('../dist/index.js');
const { EventsDataSource, mockEventDetails } = require('../dist/data/events.js');
let baseURL;
const eventId = '01934e3a-7b2c-7f93-8f2a-1234567890ab';
const missingId = '01934e3a-7b2c-7f93-8f2a-000000000000';

before(async () => {
  if (!server.listening) await once(server, 'listening');
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

async function get(path, status = 200, options) {
  const response = await fetch(`${baseURL}${path}`, options);
  assert.equal(response.status, status, path);
  return response.json();
}

test('compiled server serves health, metadata, system and entity endpoints', async () => {
  for (const path of ['/health', '/v1/health']) {
    const health = await get(path);
    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'VCP Explorer API');
    assert.ok(Number.isFinite(Date.parse(health.timestamp)));
  }
  assert.equal((await get('/')).name, 'VeritasChain Protocol Explorer API');
  assert.equal(typeof await get('/v1/system/status'), 'object');
  assert.ok(Array.isArray((await get('/v1/certified/entities')).entities));
});

test('recent and filtered search responses preserve pagination and fixture fields', async () => {
  assert.equal((await get('/v1/events/recent?limit=2')).events.length, 2);
  await get('/v1/events/recent?limit=-1', 400);
  const search = await get('/v1/events?symbol=XAUUSD&event_type=ORD&limit=1');
  assert.equal(search.events.length, 1);
  assert.equal(search.events[0].event_id, eventId);
  assert.equal(search.total, 1);
});

test('detail export and HTTP detail use one fixture with precision-safe timestamps', async () => {
  const event = await get(`/v1/events/${eventId}`);
  assert.deepEqual(event, mockEventDetails.find(item => item.header.event_id === eventId));
  assert.equal(event.header.timestamp_int, '1763992925123456789');
  assert.equal(event.header.timestamp, undefined);
  assert.equal(typeof event.payload.trade_data.price, 'string');
  const search = await get(`/v1/events?trace_id=${event.header.trace_id}`);
  assert.ok(search.events.some(item => item.event_id === eventId));
});

test('event and trace lookups accept alternate UUID casing and return stored identifiers', async () => {
  const mixedId = eventId.replace('e3a', 'E3A');
  const detail = await get(`/v1/events/${eventId}`);
  assert.deepEqual(await get(`/v1/events/${mixedId}`), detail);
  const proof = await get(`/v1/events/${eventId.toUpperCase()}/proof`);
  assert.deepEqual(proof, await get(`/v1/events/${eventId}/proof`));
  const certificate = await get(`/v1/events/${mixedId}/certificate`);
  assert.equal(certificate.event_id, eventId);
  assert.deepEqual(certificate.header, detail.header);

  const traceId = detail.header.trace_id;
  const lower = await get(`/v1/events?trace_id=${traceId}`);
  const upper = await get(`/v1/events?trace_id=${traceId.toUpperCase()}`);
  assert.ok(lower.events.some(event => event.event_id === eventId));
  assert.deepEqual(upper.events, lower.events);
  assert.equal(upper.query.trace_id, traceId.toUpperCase());
});

test('bundled details and search summaries agree to the nanosecond', async () => {
  const { events } = await get('/v1/events');
  for (const { header } of mockEventDetails) {
    const summary = events.find(item => item.event_id === header.event_id);
    assert.equal(summary.timestamp, header.timestamp_iso);
    const [seconds, fraction] = summary.timestamp.slice(0, -1).split('.');
    const expected = BigInt(Date.parse(seconds + 'Z')) * 1000000n + BigInt(fraction.padEnd(9, '0'));
    const detail = await get(`/v1/events/${header.event_id}`);
    assert.equal(detail.header.timestamp_int, expected.toString());
  }
});

test('proof and certificate routes retain demo response consistency', async () => {
  const event = await get(`/v1/events/${eventId}`);
  const proof = await get(`/v1/events/${eventId}/proof`);
  const certificate = await get(`/v1/events/${eventId}/certificate`);
  assert.equal(certificate.event_id, eventId);
  assert.deepEqual(certificate.header, event.header);
  assert.deepEqual(certificate.merkle_proof, proof.merkle_proof);
});

test('detail, proof and certificate routes return explicit 400 and 404 responses', async () => {
  for (const suffix of ['', '/proof', '/certificate']) {
    assert.equal((await get(`/v1/events/invalid${suffix}`, 400)).error, 'invalid_event_id');
    assert.equal((await get(`/v1/events/${missingId}${suffix}`, 404)).error, 'not_found');
  }
  assert.equal((await get('/missing', 404)).error, 'not_found');
});

test('route failures return JSON 500 responses', async () => {
  const original = EventsDataSource.prototype.getEventById;
  EventsDataSource.prototype.getEventById = async () => { throw new Error('test data source failure'); };
  try {
    assert.equal((await get(`/v1/events/${eventId}`, 500)).error, 'internal_error');
  } finally {
    EventsDataSource.prototype.getEventById = original;
  }
});

test('four-argument Express error handler still handles CORS failures', async () => {
  const error = await get('/health', 500, { headers: { Origin: 'https://not-allowed.example' } });
  assert.deepEqual(error, { error: 'internal_error', message: 'An unexpected error occurred' });
  const allowed = await fetch(`${baseURL}/health`, { headers: { Origin: 'https://veritaschain.org' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://veritaschain.org');
});

test('rate limit produces 429 with a reset timestamp while health remains available', async () => {
  const first = await fetch(`${baseURL}/v1/events/recent`);
  assert.equal(first.status, 200);
  const remainingHeader = first.headers.get('ratelimit-remaining');
  assert.notEqual(remainingHeader, null);
  const remaining = Number(remainingHeader);
  assert.ok(Number.isInteger(remaining) && remaining >= 0 && remaining < 60);
  await first.arrayBuffer();
  for (let index = 0; index < remaining; index++) await get('/v1/events/recent');
  const limited = await get('/v1/events/recent', 429);
  assert.equal(limited.error, 'rate_limit_exceeded');
  assert.ok(Number.isFinite(Date.parse(limited.retry_after)));
  assert.equal((await get('/health')).status, 'ok');
});
