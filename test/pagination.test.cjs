'use strict';
// Real HTTP regression on the compiled mock API. No limiter is bypassed.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

process.env.PORT = '0';
const { server } = require('../dist/index.js');
const { EventsDataSource, mockEventSummaries } = require('../dist/data/events.js');
const originalRecent = EventsDataSource.prototype.getRecentEvents;
const originalSearch = EventsDataSource.prototype.searchEvents;
const calls = { recent: 0, search: 0 };
const observations = [];
let lastRecentLimit;
let lastSearchParams;
let baseURL;

before(async () => {
  EventsDataSource.prototype.getRecentEvents = async function (...args) {
    calls.recent++;
    lastRecentLimit = args[0];
    return originalRecent.apply(this, args);
  };
  EventsDataSource.prototype.searchEvents = async function (...args) {
    calls.search++;
    lastSearchParams = args[0];
    return originalSearch.apply(this, args);
  };
  if (!server.listening) await once(server, 'listening');
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  EventsDataSource.prototype.getRecentEvents = originalRecent;
  EventsDataSource.prototype.searchEvents = originalSearch;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (process.env.DEV_INSTALL_EVIDENCE) {
    fs.mkdirSync(process.env.DEV_INSTALL_EVIDENCE, { recursive: true });
    fs.writeFileSync(path.join(process.env.DEV_INSTALL_EVIDENCE, 'pagination-http.json'),
      JSON.stringify({ node: process.version, platform: process.platform, arch: process.arch,
        scope: 'first-party compiled mock API; HTTP status and data-source call observations, not cryptographic verification',
        observations }, null, 2) + '\n');
  }
});

async function request(route, expectedStatus) {
  const response = await fetch(baseURL + route, { signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  observations.push({ route, expectedStatus, status: response.status, calls: { ...calls }, body });
  assert.equal(response.status, expectedStatus, route);
  assert.match(response.headers.get('content-type'), /application\/json/);
  return body;
}

// Exactly fourteen malformed limit shapes; offset=0 is valid and excluded below.
const malformed = [
  ['empty', key => `${key}=`],
  ['letters', key => `${key}=abc`],
  ['suffix', key => `${key}=2junk`],
  ['fraction', key => `${key}=1.5`],
  ['negative', key => `${key}=-1`],
  ['zero', key => `${key}=0`],
  ['exponent', key => `${key}=1e2`],
  ['hexadecimal', key => `${key}=0x10`],
  ['whitespace', key => `${key}=%201`],
  ['plus-sign', key => `${key}=%2B1`],
  ['unsafe-integer', key => `${key}=9007199254740992`],
  ['repeated', key => `${key}=1&${key}=2`],
  ['array', key => `${key}[]=1`],
  ['object', key => `${key}[page]=1`],
];
for (const [route, parameter, method] of [
  ['/v1/events/recent', 'limit', 'recent'],
  ['/v1/events', 'limit', 'search'],
  ['/v1/events', 'offset', 'search'],
]) {
  for (const [name, query] of malformed) {
    if (parameter === 'offset' && name === 'zero') continue;
    test(`pagination rejects ${method} ${parameter}: ${name}`, async () => {
      const beforeCalls = calls[method];
      const body = await request(`${route}?${query(parameter)}`, 400);
      assert.equal(body.error, 'invalid_parameter');
      assert.equal(typeof body.message, 'string');
      assert.ok(body.message.length > 0);
      assert.equal(body.stack, undefined);
      assert.equal(calls[method], beforeCalls, 'Malformed input must not reach the data source');
    });
  }
}

test('recent pagination preserves missing defaults, decimal leading zeros and legacy cap', async () => {
  for (const [query, passedLimit] of [
    ['', 10], ['?limit=1', 1], ['?limit=002', 2], ['?limit=100', 100], ['?limit=101', 100],
  ]) {
    const body = await request('/v1/events/recent' + query, 200);
    assert.equal(lastRecentLimit, passedLimit);
    assert.deepEqual(body, { events: mockEventSummaries.slice(0, passedLimit) });
  }
});

test('search pagination preserves filtering, response query, defaults and legacy cap', async () => {
  for (const [query, params, expected] of [
    ['', {}, mockEventSummaries],
    ['?limit=2&offset=1', { limit: 2, offset: 1 }, mockEventSummaries.slice(1, 3)],
    ['?offset=0', { offset: 0 }, mockEventSummaries],
    ['?limit=002&offset=01', { limit: 2, offset: 1 }, mockEventSummaries.slice(1, 3)],
    ['?limit=500', { limit: 500 }, mockEventSummaries],
    ['?limit=501', { limit: 501 }, mockEventSummaries],
    ['?limit=9007199254740991', { limit: Number.MAX_SAFE_INTEGER }, mockEventSummaries],
    ['?offset=9007199254740991', { offset: Number.MAX_SAFE_INTEGER }, []],
    ['?symbol=XAUUSD&event_type=ORD&limit=1', { symbol: 'XAUUSD', event_type: 'ORD', limit: 1 },
      mockEventSummaries.filter(e => e.symbol === 'XAUUSD' && e.type === 'ORD').slice(0, 1)],
  ]) {
    const body = await request('/v1/events' + query, 200);
    assert.deepEqual(lastSearchParams, params);
    assert.deepEqual(body, { events: expected, query: params, total: expected.length });
  }
});

for (const [method, route] of [['getRecentEvents', '/v1/events/recent'], ['searchEvents', '/v1/events']]) {
  test(`genuine ${method} errors remain JSON 500, not pagination 400`, async () => {
    const prior = EventsDataSource.prototype[method];
    EventsDataSource.prototype[method] = async () => { throw new Error('test-only data source failure'); };
    try {
      const body = await request(route, 500);
      assert.equal(body.error, 'internal_error');
    } finally {
      EventsDataSource.prototype[method] = prior;
    }
  });
}
