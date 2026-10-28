'use strict';
// Explicit cross-repository test: actual configured SDK, generated data and HTTP API.
// Deliberately outside *.test.cjs; npm test needs no SDK/network installation.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { before, after, test } = require('node:test');
const { loadEvidenceDemo } = require('../dist/evidence/demo.js');

for (const name of ['VCP_EVIDENCE_BUNDLE', 'VCP_EVIDENCE_TRUST', 'VCP_EVIDENCE_SDK_MODULE']) {
  assert.ok(process.env[name], `Set ${name} for the real SDK integration test`);
}
const sourceBundle = JSON.parse(readFileSync(process.env.VCP_EVIDENCE_BUNDLE, 'utf8'));
const sourceTrust = JSON.parse(readFileSync(process.env.VCP_EVIDENCE_TRUST, 'utf8'));
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

test('partial configuration exits before the HTTP server starts', () => {
  const env = { ...evidenceEnv, PORT: '0' };
  delete env.VCP_EVIDENCE_TRUST;
  const run = spawnSync(process.execPath, ['dist/index.js'], { cwd: join(__dirname, '..'), env, encoding: 'utf8', timeout: 5000 });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /must all be configured/);
  assert.doesNotMatch(run.stdout, /Server Started/);
});
