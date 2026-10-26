'use strict';
// Retained migration guard: these are lint-policy tests, not HTTP/security claims.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ESLint } = require('eslint');
const policy = require('./fixtures/lint-policy-baseline.json');
const root = path.resolve(__dirname, '..');
const eslint = new ESLint({ cwd: root });
const severity = value => {
  const n = Array.isArray(value) ? value[0] : value;
  return { off: 0, warn: 1, error: 2 }[n] ?? n;
};
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.isFile() && p.endsWith('.ts') ? [p] : [];
  }).sort();
}
test('lint policy covers every TypeScript source file and preserves baseline active severities', async () => {
  const source = walk(path.join(root, 'src'));
  assert.ok(source.length > 0);
  const results = await eslint.lintFiles(['src']);
  assert.deepEqual(results.map(r => r.filePath).sort(), source);
  assert.equal(Object.keys(policy.activeRules).length, 66, 'Fixed baseline must not be truncated');
  assert.equal(policy.cases.length, 18, 'Fixed regression corpus must not be truncated');
  for (const file of source) {
    const config = await eslint.calculateConfigForFile(file);
    assert.ok(config && config.languageOptions.parser, 'TypeScript parser required: ' + file);
    for (const [id, rule] of Object.entries(policy.activeRules)) {
      assert.ok(severity(config.rules[id]) >= severity(rule), 'Rule removed or weakened: ' + id + ' in ' + file);
    }
    const unused = config.rules['@typescript-eslint/no-unused-vars'];
    assert.equal(severity(unused), 2);
    assert.equal(unused[1].argsIgnorePattern, '^_');
    assert.equal(config.rules['no-inner-declarations'][2].blockScopedFunctions, 'disallow');
    assert.equal(config.rules['no-constant-condition'][1].checkLoops, 'all');
  }
});
for (const fixture of policy.cases) {
  test('lint fixture: ' + fixture.name, async () => {
    const result = (await eslint.lintText(fixture.code, { filePath: path.join(root, 'src/__lint_policy_fixture.ts') }))[0];
    assert.equal(result.fatalErrorCount, 0);
    if (fixture.rule === null) assert.deepEqual(result.messages, []);
    else assert.ok(result.messages.some(m => m.ruleId === fixture.rule && m.severity === 2), JSON.stringify(result.messages));
  });
}
