'use strict';
// Explicit cross-repository test: actual configured SDK, generated data and HTTP API.
// Deliberately outside *.test.cjs; npm test needs no SDK/network installation.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { runInNewContext } = require('node:vm');
const { before, after, test } = require('node:test');
const { loadEvidenceDemo } = require('../dist/evidence/demo.js');
const { createEvidenceDemo, MAX_BUNDLE_BYTES, MAX_TRUST_BYTES } = require('../dist/evidence/core.js');
const { createEvidenceHttpHandler } = require('../dist/evidence/http.js');

for (const name of ['VCP_EVIDENCE_BUNDLE', 'VCP_EVIDENCE_TRUST', 'VCP_EVIDENCE_SDK_MODULE']) {
  assert.ok(process.env[name], `Set ${name} for the real SDK integration test`);
}
const sourceBundle = JSON.parse(readFileSync(process.env.VCP_EVIDENCE_BUNDLE, 'utf8'));
const sourceTrust = JSON.parse(readFileSync(process.env.VCP_EVIDENCE_TRUST, 'utf8'));
const bundleText = readFileSync(process.env.VCP_EVIDENCE_BUNDLE, 'utf8');
const trustText = readFileSync(process.env.VCP_EVIDENCE_TRUST, 'utf8');
const sdk = require(process.env.VCP_EVIDENCE_SDK_MODULE);
const evidenceEnv = { ...process.env };
const dir = mkdtempSync(join(tmpdir(), 'vcp-api-evidence-'));
process.env.PORT = '0';
process.env.HOST = '127.0.0.1';
process.env.VCP_EVIDENCE_ORIGIN = 'http://localhost:5187';
const { server } = require('../dist/index.js');
let base;

before(async () => {
  if (!server.listening) await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/v1/evidence-demo`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  rmSync(dir, { recursive: true, force: true });
});
function loadChanged(changeBundle, changeTrust) {
  const bundle = structuredClone(sourceBundle);
  const trust = structuredClone(sourceTrust);
  if (changeBundle) changeBundle(bundle);
  if (changeTrust) changeTrust(trust);
  const bundlePath = join(dir, 'bundle.json');
  const trustPath = join(dir, 'trust.json');
  writeFileSync(bundlePath, JSON.stringify(bundle));
  writeFileSync(trustPath, JSON.stringify(trust));
  return loadEvidenceDemo({ ...evidenceEnv, VCP_EVIDENCE_BUNDLE: bundlePath, VCP_EVIDENCE_TRUST: trustPath });
}
async function get(path, status = 200, options) {
  const response = await fetch(base + path, options);
  assert.equal(response.status, status, path);
  return { body: await response.json(), headers: response.headers };
}

test('case directory is metadata only; verifier supplies no canned status', async () => {
  const { body, headers } = await get('/cases');
  assert.equal(body.format, 'vcp-evidence-demo/1');
  assert.equal(body.sdk_version, sourceBundle.sdk_version);
  assert.deepEqual(body.cases.map(item => item.id), sourceBundle.cases.map(item => item.id));
  assert.ok(body.cases.every(item => !Object.hasOwn(item, 'status') && !Object.hasOwn(item, 'checks')));
  assert.equal(headers.get('cache-control'), 'no-store');
});

test('intact data passes local checks but never claims verified external anchoring', async () => {
  const { body } = await get('/cases/intact/verification');
  assert.equal(body.format, 'vcp-evidence-demo-verification/1');
  assert.equal(body.local_status, 'VALID');
  assert.equal(body.overall_status, 'INDETERMINATE');
  assert.equal(body.trust.key_configured, true);
  for (const name of ['event_hash', 'signature', 'root_signature', 'merkle_root', 'anchor_binding']) {
    assert.ok(body.checks.some(check => check.name === name && check.status === 'VALID'), name);
  }
  assert.equal(body.checks.filter(check => check.name === 'inclusion' && check.status === 'VALID').length, 3);
  assert.ok(body.checks.some(check => check.name === 'external_anchor' && check.scope === 'external' && check.status === 'INDETERMINATE'));
  assert.ok(body.checks.every(check => check.scope !== 'external' || check.status !== 'VALID'));
});

test('payload tamper invalidates recomputed hash, signature and inclusion', async () => {
  const { body } = await get('/cases/tampered/verification');
  assert.equal(body.local_status, 'INVALID');
  assert.equal(body.overall_status, 'INVALID');
  for (const name of ['event_hash', 'signature', 'inclusion']) {
    assert.ok(body.checks.some(check => check.name === name && check.status === 'INVALID'), name);
  }
});

test('missing explicit trust remains indeterminate even with intact evidence', async () => {
  const { body } = await get('/cases/missing-key/verification');
  assert.equal(body.local_status, 'INDETERMINATE');
  assert.equal(body.overall_status, 'INDETERMINATE');
  assert.equal(body.trust.key_configured, false);
  assert.ok(body.checks.some(check => check.name === 'signature' && check.reason === 'KEY_NOT_ESTABLISHED'));
  assert.ok(body.checks.some(check => check.name === 'root_signature' && check.reason === 'KEY_NOT_ESTABLISHED'));
});

test('raw JSONL and anchor strings preserve exact signed nanosecond integers', async () => {
  for (const item of sourceBundle.cases) {
    const { body } = await get(`/cases/${item.id}/verification`);
    assert.equal(body.evidence.events_jsonl, item.events_jsonl);
    assert.equal(body.evidence.anchor_record_json, item.anchor_record_json);
    assert.deepEqual(body.evidence.inclusion_proofs, item.inclusion_proofs);
    assert.match(body.evidence.events_jsonl, /"TimestampInt":\d{19}/);
    assert.ok(body.evidence.inclusion_proofs.every(proof => proof.tree_size === 3));
  }
});

test('unknown cases/routes return 404 and do not fall back to an intact fixture', async () => {
  assert.equal((await get('/cases/does-not-exist/verification', 404)).body.error, 'not_found');
  assert.equal((await get('/cases/intact/unknown', 404)).body.error, 'not_found');
});

test('configured exact browser origin works; other origins remain rejected', async () => {
  const { headers } = await get('/cases', 200, { headers: { Origin: 'http://localhost:5187' } });
  assert.equal(headers.get('access-control-allow-origin'), 'http://localhost:5187');
  const rejected = await get('/cases', 500, { headers: { Origin: 'http://localhost:5188' } });
  assert.equal(rejected.body.error, 'internal_error');
  assert.equal(rejected.headers.get('access-control-allow-origin'), null);
});

test('detached proof metadata is bound to actual event, count, index and root', () => {
  for (const change of [
    proof => { proof.index = 1; },
    proof => { proof.tree_size = 4; },
    proof => { proof.event_hash = 'sha256:' + '0'.repeat(64); },
    proof => { proof.merkle_root = '0'.repeat(64); },
    proof => { proof.event_id = 'not-in-the-batch'; }
  ]) {
    const demo = loadChanged(bundle => change(bundle.cases.find(item => item.id === 'intact').inclusion_proofs[0]));
    const result = demo.verify('intact');
    assert.equal(result.local_status, 'INVALID');
    assert.ok(result.checks.some(check => check.name === 'proof_binding' && check.status === 'INVALID'));
  }
});

test('missing inclusion evidence is reported indeterminate, never silently omitted', () => {
  const demo = loadChanged(bundle => { bundle.cases.find(item => item.id === 'intact').inclusion_proofs = []; });
  const result = demo.verify('intact');
  assert.equal(result.local_status, 'INDETERMINATE');
  assert.equal(result.checks.filter(check => check.reason === 'MISSING_INCLUSION_PROOF').length, 3);
});

test('malformed proof/trust/JSON and precomputed status fields fail configuration', () => {
  for (const change of [
    bundle => { bundle.cases[0].inclusion_proofs[0].tree_size = 0; },
    bundle => { bundle.cases[0].inclusion_proofs[0].proof = ['not-hex']; },
    bundle => { bundle.cases[0].events_jsonl = '{"Header":'; },
    bundle => { bundle.cases[0].events_jsonl = '{"Header":{},"Header":{}}'; },
    bundle => { bundle.cases[0].status = 'VALID'; },
    bundle => { bundle.sdk_version = '999'; }
  ]) assert.throws(() => loadChanged(change));
  assert.throws(() => loadChanged(null, trust => { trust.cases.intact.anchor_public_key = '00'; }), /public keys/);
  assert.throws(() => loadChanged(null, trust => { trust.cases.intact.anchor_public_key = '0'.repeat(64); }), /public keys/);
  assert.throws(() => loadChanged(null, trust => { delete trust.cases['missing-key']; }), /missing a required field/);
});

test('an unsupported SDK contract is rejected before evidence verification', () => {
  const modulePath = join(dir, 'unsupported-sdk.cjs');
  writeFileSync(modulePath, `module.exports = { ...require(${JSON.stringify(evidenceEnv.VCP_EVIDENCE_SDK_MODULE)}), VCP_SPEC_COMMIT: 'unsupported' };`);
  assert.throws(() => loadEvidenceDemo({ ...evidenceEnv, VCP_EVIDENCE_SDK_MODULE: modulePath }), /unsupported SDK or specification revision/);
});

test('portable core and Node loader return the identical complete reports and raw evidence', () => {
  const portable = createEvidenceDemo(sdk, bundleText, trustText);
  const node = loadEvidenceDemo(evidenceEnv);
  assert.deepEqual(portable.list(), node.list());
  const expected = {
    intact: ['VALID', 'INDETERMINATE'],
    tampered: ['INVALID', 'INVALID'],
    'missing-key': ['INDETERMINATE', 'INDETERMINATE'],
  };
  for (const item of sourceBundle.cases) {
    const result = portable.verify(item.id);
    assert.deepEqual(result, node.verify(item.id));
    assert.deepEqual([result.local_status, result.overall_status], expected[item.id]);
    assert.equal(result.evidence.events_jsonl, item.events_jsonl);
    assert.equal(result.evidence.anchor_record_json, item.anchor_record_json);
  }
  assert.equal(portable.verify('unknown'), null);
});

test('portable core runs without Node globals or module resolution', () => {
  // Evaluate only the compiled core in a realm without Buffer, process or require.
  // The real SDK is injected; this is a portability guard, not a Worker-runtime claim.
  const realm = { exports: {}, TextEncoder };
  const coreCode = readFileSync(join(__dirname, '../dist/evidence/core.js'), 'utf8');
  runInNewContext(coreCode, realm, { timeout: 5000 });
  assert.equal(runInNewContext('typeof Buffer + "/" + typeof process + "/" + typeof require', realm), 'undefined/undefined/undefined');
  const isolated = realm.exports.createEvidenceDemo(sdk, bundleText, trustText);
  const normal = createEvidenceDemo(sdk, bundleText, trustText);
  for (const item of sourceBundle.cases) {
    // JSON envelopes are compared across realms; signed inner text remains untouched.
    assert.deepEqual(JSON.parse(JSON.stringify(isolated.verify(item.id))), normal.verify(item.id));
  }
});

test('mutating a returned disclosure or proof cannot change later verification', () => {
  const portable = createEvidenceDemo(sdk, bundleText, trustText);
  const baseline = portable.verify('intact');
  const list = portable.list();
  list.disclosure.push('caller mutation');
  list.cases[0].title = 'caller mutation';
  const result = portable.verify('intact');
  result.evidence.inclusion_proofs[0].tree_size = 999;
  result.evidence.inclusion_proofs[0].proof[0] = '0'.repeat(64);
  result.evidence.inclusion_proofs.push({ event_id: 'injected' });
  assert.deepEqual(portable.verify('intact'), baseline);
  assert.deepEqual(portable.list().disclosure, sourceBundle.disclosure);
  assert.notEqual(portable.list().cases[0].title, 'caller mutation');
});

test('portable core retains byte limits, strict parsing and explicit trust validation', () => {
  const badBundle = structuredClone(sourceBundle);
  badBundle.cases[0].inclusion_proofs[0].tree_size = 0;
  assert.throws(() => createEvidenceDemo(sdk, JSON.stringify(badBundle), trustText), /safe integer/);
  assert.throws(() => createEvidenceDemo(sdk, '{"format":"x","format":"x"}', trustText), /duplicate key/);
  assert.throws(() => createEvidenceDemo(sdk, bundleText, '{"cases":{},"cases":{}}'), /duplicate key/);
  const badTrust = structuredClone(sourceTrust);
  badTrust.cases.intact.anchor_public_key = '0'.repeat(64);
  assert.throws(() => createEvidenceDemo(sdk, bundleText, JSON.stringify(badTrust)), /public keys/);
  assert.throws(() => createEvidenceDemo(sdk, ' '.repeat(MAX_BUNDLE_BYTES + 1), trustText), /within 2097152 bytes/);
  assert.throws(() => createEvidenceDemo(sdk, bundleText, ' '.repeat(MAX_TRUST_BYTES + 1)), /within 65536 bytes/);
  // UTF-8 bytes, not JavaScript code-unit count, enforce the input limit.
  assert.throws(() => createEvidenceDemo(sdk, bundleText, 'あ'.repeat(Math.floor(MAX_TRUST_BYTES / 3) + 1)), /within 65536 bytes/);
  assert.throws(() => createEvidenceDemo({ ...sdk, fromHex: undefined }, bundleText, trustText), /missing fromHex/);
  assert.throws(() => createEvidenceDemo({ ...sdk, VERSION: 'unsupported' }, bundleText, trustText), /unsupported SDK/);
});

test('portable HTTP adapter serves all three actual SDK reports and exact signed text', async () => {
  const demo = createEvidenceDemo(sdk, bundleText, trustText);
  const handle = createEvidenceHttpHandler(demo, {
    allowedOrigins: ['https://veritaschain.org'],
    provenance: { api_commit: 'test-source-reference', fixture_bytes: bundleText.length }
  });
  const request = path => new Request('https://evidence.example' + path);
  assert.deepEqual(await handle(request('/v1/evidence-demo/cases')).json(), demo.list());
  const health = await handle(request('/health')).json();
  assert.equal(health.status, 'ok');
  assert.equal(health.provenance.api_commit, 'test-source-reference');
  for (const item of sourceBundle.cases) {
    const response = handle(request(`/v1/evidence-demo/cases/${item.id}/verification`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('vary'), 'Origin');
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
    const report = await response.json();
    assert.deepEqual(report, demo.verify(item.id));
    assert.equal(report.evidence.events_jsonl, item.events_jsonl);
    assert.equal(report.evidence.anchor_record_json, item.anchor_record_json);
    assert.equal(report.provenance, undefined, 'Transport metadata must not change the verification contract');
  }
});

test('portable HTTP adapter permits absent/same/exact approved origins and rejects other origins', async () => {
  const demo = createEvidenceDemo(sdk, bundleText, trustText);
  const handle = createEvidenceHttpHandler(demo, { allowedOrigins: ['https://veritaschain.org'] });
  const url = 'https://evidence.example/v1/evidence-demo/cases';
  for (const origin of [null, 'https://evidence.example', 'https://veritaschain.org']) {
    const response = handle(new Request(url, { headers: origin ? { Origin: origin } : {} }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
  }
  for (const origin of ['null', 'https://www.veritaschain.org', 'https://veritaschain.org.evil.example',
    'http://veritaschain.org', 'https://veritaschain.org/', 'https://unrelated.example']) {
    const response = handle(new Request(url, { headers: { Origin: origin } }));
    assert.equal(response.status, 403, origin);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('vary'), 'Origin');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).error, 'origin_not_allowed');
  }
  const withWww = createEvidenceHttpHandler(demo, { allowedOrigins: ['https://www.veritaschain.org'] });
  assert.equal(withWww(new Request(url, { headers: { Origin: 'https://www.veritaschain.org' } })).status, 200);
  for (const origin of ['*', 'https://veritaschain.org/', 'http://veritaschain.org', 'https://unrelated.example']) {
    assert.throws(() => createEvidenceHttpHandler(demo, { allowedOrigins: [origin] }), /exact approved/);
  }
});

test('portable HTTP preflight allows GET/OPTIONS without credentials or arbitrary headers', async () => {
  const demo = createEvidenceDemo(sdk, bundleText, trustText);
  const handle = createEvidenceHttpHandler(demo, { allowedOrigins: ['https://veritaschain.org'] });
  const url = 'https://evidence.example/v1/evidence-demo/cases/intact/verification';
  const request = extra => new Request(url, { method: 'OPTIONS', headers: {
    Origin: 'https://veritaschain.org', 'Access-Control-Request-Method': 'GET', ...extra
  } });
  const response = handle(request({ 'Access-Control-Request-Headers': 'Accept' }));
  assert.equal(response.status, 204);
  assert.equal(await response.text(), '');
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Accept');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://veritaschain.org');
  assert.equal(response.headers.get('access-control-allow-credentials'), null);
  assert.equal(handle(request({ 'Access-Control-Request-Method': 'POST' })).status, 405);
  assert.equal(handle(request({ 'Access-Control-Request-Headers': 'Authorization' })).status, 403);
});

test('portable HTTP unknown paths/cases and unsupported methods never read uploaded data', async () => {
  const actual = createEvidenceDemo(sdk, bundleText, trustText);
  let verifyCalls = 0;
  const handle = createEvidenceHttpHandler({
    list: () => actual.list(),
    verify: id => { verifyCalls++; return actual.verify(id); }
  }, { allowedOrigins: [] });
  for (const path of ['/missing', '/v1/evidence-demo/cases/',
    '/v1/evidence-demo/cases/intact/verification/', '/v1/evidence-demo/cases/%69ntact/verification',
    '/v1/evidence-demo/cases/intact%2Ftampered/verification', '/v1/evidence-demo/cases/%ZZ/verification']) {
    assert.equal(handle(new Request('https://evidence.example' + path)).status, 404, path);
  }
  assert.equal(verifyCalls, 0);
  const unknown = handle(new Request('https://evidence.example/v1/evidence-demo/cases/unknown/verification'));
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error, 'not_found');
  for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) {
    const request = new Request('https://evidence.example/v1/evidence-demo/cases/intact/verification', {
      method, ...(method === 'HEAD' ? {} : { body: 'untrusted upload' })
    });
    const doNotRead = () => { throw new Error('request body was inspected'); };
    Object.defineProperty(request, 'body', { get: doNotRead });
    for (const accessor of ['text', 'json', 'arrayBuffer', 'formData', 'blob']) {
      Object.defineProperty(request, accessor, { value: doNotRead });
    }
    const response = handle(request);
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get('allow'), 'GET, OPTIONS');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(verifyCalls, 1, 'Only the syntactically valid unknown case may reach the verifier');
});

test('portable HTTP verification exceptions return generic 503 without stale success', async () => {
  const actual = createEvidenceDemo(sdk, bundleText, trustText);
  let unavailable = false;
  const handle = createEvidenceHttpHandler({
    list: () => actual.list(),
    verify: id => {
      if (unavailable) throw new Error('private deployment diagnostic');
      return actual.verify(id);
    }
  }, { allowedOrigins: ['https://veritaschain.org'] });
  const request = () => new Request('https://evidence.example/v1/evidence-demo/cases/intact/verification', {
    headers: { Origin: 'https://veritaschain.org' }
  });
  assert.equal((await handle(request()).json()).local_status, 'VALID');
  unavailable = true;
  const response = handle(request());
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://veritaschain.org');
  const text = await response.text();
  assert.doesNotMatch(text, /private deployment diagnostic|VALID|local_status|checks/);
  assert.deepEqual(JSON.parse(text), { error: 'service_unavailable', message: 'Evidence verification is unavailable' });
});

test('portable HTTP copies allowlist/provenance and rejects non-plain transport metadata', async () => {
  const demo = createEvidenceDemo(sdk, bundleText, trustText);
  const origins = ['https://veritaschain.org'];
  const provenance = { source_commit: 'reviewed-source', public_demo: true };
  const handle = createEvidenceHttpHandler(demo, { allowedOrigins: origins, provenance });
  origins.push('https://unrelated.example');
  provenance.source_commit = 'caller mutation';
  const health = handle(new Request('https://evidence.example/health'));
  assert.equal((await health.json()).provenance.source_commit, 'reviewed-source');
  assert.equal(handle(new Request('https://evidence.example/health', { headers: { Origin: 'https://unrelated.example' } })).status, 403);
  for (const value of [[], new Date(), { bad: Infinity }, { bad: {} }, { bad: () => true }]) {
    assert.throws(() => createEvidenceHttpHandler(demo, { allowedOrigins: [], provenance: value }), /Provenance/);
  }
});

test('partial configuration exits before the HTTP server starts', () => {
  const env = { ...evidenceEnv, PORT: '0' };
  delete env.VCP_EVIDENCE_TRUST;
  const run = spawnSync(process.execPath, ['dist/index.js'], { cwd: join(__dirname, '..'), env, encoding: 'utf8', timeout: 5000 });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /must all be configured/);
  assert.doesNotMatch(run.stdout, /Server Started/);
});
