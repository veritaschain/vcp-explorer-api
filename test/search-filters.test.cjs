'use strict';
// First-party HTTP regression on the compiled mock API. No cryptographic verification.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { EventsDataSource } = require('../dist/data/events.js');
const { EVENT_TYPE_CODES, VCP_V1_2_EVENT_TYPES } = require('../dist/types/index.js');
const registry = require('./fixtures/vcp-v1.2-event-registry.json');

process.env.PORT = '0';
const { server } = require('../dist/index.js');
const id = '01934e3a-7b2c-7f93-8f2a-1234567890ab';
let root;
let searches = 0;
const observations = [];
const original = EventsDataSource.prototype.searchEvents;

before(async () => {
  EventsDataSource.prototype.searchEvents = async function (...args) {
    searches++;
    return original.apply(this, args);
  };
  if (!server.listening) await once(server, 'listening');
  root = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  EventsDataSource.prototype.searchEvents = original;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});
async function request(query, status) {
  const response = await fetch(root + '/v1/events?' + query, { signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  observations.push({ query, status: response.status, error: body.error, count: body.events?.length });
  assert.equal(response.status, status, query);
  assert.match(response.headers.get('content-type'), /application\/json/);
  return body;
}
const cases = [
  ['duplicate', key => `${key}=alpha&${key}=beta`],
  ['bracket-array', key => `${key}[]=alpha`],
  ['bracket-object', key => `${key}[nested]=alpha`],
  ['empty', key => `${key}=`],
];
for (const key of ['trace_id', 'symbol', 'event_type', 'start_time', 'end_time', 'algo_id', 'venue_id']) {
  for (const [shape, build] of cases) {
    test(`search rejects non-scalar/empty ${key} (${shape}) before consulting data source`, async () => {
      const beforeCalls = searches;
      const body = await request(build(key), 400);
      assert.equal(body.error, 'invalid_parameter');
      assert.equal(typeof body.message, 'string');
      assert.equal(searches, beforeCalls, 'Invalid query reached the data source');
    });
  }
}
for (const name of ['INVALID', 'ord', '__proto__']) {
  test(`unknown event_type ${name} returns 400 before data access`, async () => {
    const beforeCalls = searches;
    const body = await request('event_type=' + encodeURIComponent(name), 400);
    assert.equal(body.error, 'invalid_event_type');
    assert.equal(searches, beforeCalls);
  });
}
test('search vocabulary matches the pinned registry across server, client and OpenAPI without assigning new codes', () => {
  assert.deepEqual(VCP_V1_2_EVENT_TYPES, registry.vcp_v1_2_names);
  assert.deepEqual(EVENT_TYPE_CODES, registry.preserved_legacy_fixture_codes);
  const client = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../types.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
  });
  vm.runInNewContext(compiled.outputText, { exports: client.exports }, { timeout: 1000 });
  assert.deepEqual(Array.from(client.exports.VCP_V1_2_EVENT_TYPES), registry.vcp_v1_2_names);
  assert.deepEqual(JSON.parse(JSON.stringify(client.exports.EVENT_TYPE_CODES)), registry.preserved_legacy_fixture_codes);
  const expected = [...new Set([...Object.keys(registry.preserved_legacy_fixture_codes), ...registry.vcp_v1_2_names])].sort();
  const yaml = fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8');
  const section = yaml.match(/    EventSearchType:\n([\s\S]*?)(?=\n    [A-Za-z]\w*:)/);
  assert.ok(section, 'OpenAPI search schema is missing');
  const declared = [...section[1].matchAll(/^        - ([A-Z][A-Z_]*)$/gm)].map(match => match[1]).sort();
  assert.deepEqual(declared, expected);
  assert.equal(declared.length, 33);
});
for (const name of registry.vcp_v1_2_names.filter(name => !Object.hasOwn(registry.preserved_legacy_fixture_codes, name))) {
  test(`registered ${name} search is accepted with an empty page and no invented fixture`, async () => {
    const beforeCalls = searches;
    const body = await request('event_type=' + name, 200);
    assert.equal(searches, beforeCalls + 1);
    assert.deepEqual(body.events, []);
    assert.equal(body.total, 0);
    assert.equal(body.query.event_type, name);
    assert.equal(Object.hasOwn(EVENT_TYPE_CODES, name), false);
  });
}
test('algo_id searches VCP-GOV detailed fixtures, not every summary', async () => {
  const result = await request('algo_id=neural-scalper-v1.2', 200);
  assert.deepEqual(result.events.map(e => e.event_id), [id]);
  assert.equal(result.total, 1); // Existing total means returned-page size.
  assert.equal(result.query.algo_id, 'neural-scalper-v1.2');
});
test('unknown algorithm ID returns no match, not unfiltered data', async () => {
  const result = await request('algo_id=not-in-fixture', 200);
  assert.deepEqual(result.events, []);
  assert.equal(result.total, 0);
});
test('algo_id intersects with symbol and event type', async () => {
  const yes = await request('algo_id=neural-scalper-v1.2&symbol=XAUUSD&event_type=ORD', 200);
  assert.deepEqual(yes.events.map(e => e.event_id), [id]);
  const no = await request('algo_id=neural-scalper-v1.2&symbol=EURUSD', 200);
  assert.deepEqual(no.events, []);
});
test('valid known event type without fixtures yields empty result', async () => {
  const result = await request('event_type=MOD', 200);
  assert.deepEqual(result.events, []);
  assert.equal(result.query.event_type, 'MOD');
});
test('unfiltered and venue filters preserve existing response structure', async () => {
  const all = await request('', 200);
  assert.equal(all.events.length, 10);
  assert.equal(all.total, 10);
  const venue = await request('venue_id=XNAS', 200);
  assert.ok(venue.events.length > 0);
  assert.ok(venue.events.every(e => e.venue === 'XNAS'));
});
