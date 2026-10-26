'use strict';
// Precise time-filter acceptance, using the existing synthetic summary timestamps.
// This is not a VCP signature, anchoring, completeness, or live-service test.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { before, after, test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
process.env.PORT = '0';
const { server } = require('../dist/index.js');
const { EventsDataSource } = require('../dist/data/events.js');
const originalSearch = EventsDataSource.prototype.searchEvents;
const first = '01934e3a-7b2c-7f93-8f2a-1234567890ab';
const observations = [];
let calls = 0;
let origin;

before(async () => {
  EventsDataSource.prototype.searchEvents = async function (...args) {
    calls++;
    return originalSearch.apply(this, args);
  };
  if (!server.listening) await once(server, 'listening');
  origin = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  EventsDataSource.prototype.searchEvents = originalSearch;
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  if (process.env.DEV_INSTALL_EVIDENCE) {
    const dir = process.env.DEV_INSTALL_EVIDENCE;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir,'time-search-http.json'),JSON.stringify({
      subject: 'first-party compiled synthetic API; exact UTC nanosecond boundary and invalid-date testing',
      node: process.version, platform: process.platform, observations,
      limits: 'Mock EventSummary timestamp only. Does not validate independent signed logs or header timestamp_int.',
    },null,2)+'\n');
  }
});

async function fetchSearch(params, expectedStatus) {
  const search = new URLSearchParams(params).toString();
  const response = await fetch(origin + '/v1/events?' + search, { signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  observations.push({ query:params,status:response.status,returned:body.events?.map(e=>e.event_id),error:body.error,calls });
  assert.equal(response.status, expectedStatus, search);
  assert.match(response.headers.get('content-type'), /application\/json/);
  return body;
}
const stamp = '2025-11-24T14:02:05.123456789Z';

test('nanosecond-exact inclusive start/end matches the first event only', async () => {
  const result = await fetchSearch({start_time:stamp,end_time:stamp},200);
  assert.deepEqual(result.events.map(e=>e.event_id),[first]);
  assert.equal(result.events[0].timestamp,stamp);
  assert.equal(result.total,1);
  assert.deepEqual(result.query,{start_time:stamp,end_time:stamp});
});
test('one nanosecond before the first event excludes it', async () => {
  const result = await fetchSearch({end_time:'2025-11-24T14:02:05.123456788Z'},200);
  assert.deepEqual(result.events,[]);
});
test('one nanosecond after the first event excludes it from start boundary', async () => {
  const result = await fetchSearch({start_time:'2025-11-24T14:02:05.123456790Z'},200);
  assert.equal(result.events.length,9);
  assert.equal(result.events.some(e=>e.event_id===first),false);
});
test('a non-inclusive gap in a single millisecond has zero events', async () => {
  const result = await fetchSearch({
    start_time:'2025-11-24T14:02:05.123456790Z',
    end_time:'2025-11-24T14:02:05.223456788Z',
  },200);
  assert.deepEqual(result.events,[]);
});
test('RFC3339 offsets normalize to the same absolute nanosecond', async () => {
  for(const [local,offset] of [
    ['2025-11-24T23:02:05.123456789+09:00','+09:00'],
    ['2025-11-24T09:02:05.123456789-05:00','-05:00'],
    ['2025-11-24T14:02:05.123456789+00:00','+00:00'],
  ]) {
    const result = await fetchSearch({start_time:local,end_time:local},200);
    assert.deepEqual(result.events.map(e=>e.event_id),[first],offset);
    assert.equal(result.query.start_time,local,'Echo the original user-supplied timestamp');
  }
});
test('shorter fractions are right-padded rather than rounded to milliseconds', async () => {
  const result = await fetchSearch({
    start_time:'2025-11-24T14:02:05.12345678Z',
    end_time:stamp,
  },200);
  assert.deepEqual(result.events.map(e=>e.event_id),[first]);
});
test('a full nanosecond range preserves event ordering and the original timestamp strings', async () => {
  const result = await fetchSearch({
    start_time:'2025-11-24T14:02:05.123456789Z',
    end_time:'2025-11-24T14:02:06.023456789Z',
  },200);
  assert.equal(result.events.length,10);
  assert.equal(result.events[0].timestamp,stamp);
  assert.equal(result.events.at(-1).timestamp,'2025-11-24T14:02:06.023456789Z');
});
test('valid leap-day date is accepted, yielding an empty historical result', async () => {
  const result = await fetchSearch({start_time:'2024-02-29T23:59:59Z',end_time:'2024-02-29T23:59:59Z'},200);
  assert.deepEqual(result.events,[]);
});
const invalid = [
  ['not-a-date',{start_time:'not-a-date'}],
  ['invalid leap day',{start_time:'2025-02-29T10:00:00Z'}],
  ['invalid April day',{start_time:'2025-04-31T10:00:00Z'}],
  ['invalid month',{start_time:'2025-13-01T10:00:00Z'}],
  ['24th hour',{start_time:'2025-11-24T24:00:00Z'}],
  ['invalid minute',{start_time:'2025-11-24T14:60:00Z'}],
  ['leap-second outside supported syntax',{start_time:'2025-11-24T14:02:60Z'}],
  ['ten fractional digits',{start_time:'2025-11-24T14:02:05.1234567890Z'}],
  ['offset hour 24',{start_time:'2025-11-24T14:02:05+24:00'}],
  ['offset minute 60',{start_time:'2025-11-24T14:02:05+00:60'}],
  ['timezone omitted',{start_time:'2025-11-24T14:02:05'}],
  ['invalid end',{end_time:'no-date'}],
  ['reversed whole seconds',{start_time:'2025-11-24T14:03:00Z',end_time:'2025-11-24T14:02:00Z'}],
  ['reversed nanoseconds in same millisecond',{start_time:'2025-11-24T14:02:05.123456790Z',end_time:'2025-11-24T14:02:05.123456789Z'}],
];
for(const [label,query] of invalid){
  test('time filter returns 400 before data access: '+label, async () => {
    const previous = calls;
    const body = await fetchSearch(query,400);
    assert.equal(body.error,'invalid_parameter');
    assert.equal(calls,previous,'Malformed time reached data source');
  });
}
