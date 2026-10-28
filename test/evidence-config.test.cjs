'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { loadEvidenceDemo, evidenceOrigin } = require('../dist/evidence/demo.js');

test('ordinary API needs no SDK, bundle or trust configuration', () => {
  assert.equal(loadEvidenceDemo({}), null);
  assert.equal(evidenceOrigin({}, false), null);
});

test('partial or empty evidence configuration cannot silently fall back to mock', () => {
  for (const name of ['VCP_EVIDENCE_BUNDLE', 'VCP_EVIDENCE_TRUST', 'VCP_EVIDENCE_SDK_MODULE']) {
    assert.throws(() => loadEvidenceDemo({ [name]: '/tmp/evidence.json' }), /must all be configured/);
  }
  assert.throws(() => loadEvidenceDemo({
    VCP_EVIDENCE_BUNDLE: '', VCP_EVIDENCE_TRUST: '', VCP_EVIDENCE_SDK_MODULE: ''
  }), /must all be configured/);
});

test('SDK loader accepts local absolute files only', () => {
  for (const path of ['https://example.invalid/sdk.mjs', './sdk.mjs', '/tmp']) {
    assert.throws(() => loadEvidenceDemo({
      VCP_EVIDENCE_BUNDLE: '/tmp/bundle.json', VCP_EVIDENCE_TRUST: '/tmp/trust.json',
      VCP_EVIDENCE_SDK_MODULE: path
    }), /absolute regular local file/);
  }
});

test('optional CORS configuration is one exact origin and requires the demo', () => {
  assert.equal(evidenceOrigin({ VCP_EVIDENCE_ORIGIN: 'http://localhost:5187' }, true), 'http://localhost:5187');
  assert.equal(evidenceOrigin({ VCP_EVIDENCE_ORIGIN: 'https://demo.example' }, true), 'https://demo.example');
  assert.throws(() => evidenceOrigin({ VCP_EVIDENCE_ORIGIN: 'http://localhost:5187' }, false), /requires/);
  for (const origin of ['', '*', 'null', 'file:///tmp/demo', 'https://demo.example/',
    'https://demo.example/path', 'https://demo.example?query', 'https://demo.example#fragment',
    'https://name:password@demo.example']) {
    assert.throws(() => evidenceOrigin({ VCP_EVIDENCE_ORIGIN: origin }, true), /exact HTTP\(S\) origin/);
  }
});
