'use strict';
// Bounded old-rule observations, not a proof of equivalence for all source text.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ESLint } = require('eslint');
const parser = require('@typescript-eslint/parser');
const stylisticModule = require('@stylistic/eslint-plugin');
const stylistic = stylisticModule.default ?? stylisticModule;
const baseline = require('./fixtures/style-rule-baseline.json');
const normalize = messages => JSON.parse(JSON.stringify(messages.map(m => ({
  ruleId: m.ruleId?.replace(/^@stylistic\//, ''), severity: m.severity,
  messageId: m.messageId, message: m.message, line: m.line, column: m.column,
  endLine: m.endLine, endColumn: m.endColumn, fix: m.fix || null,
}))));
test('style migration preserves a fixed legacy corpus and removes active deprecated rules', async () => {
  assert.equal(baseline.sourceCommit, '8120059b7f2afce0373ee01311c2e75657699f4c');
  assert.equal(baseline.cases.length, 24);
  assert.deepEqual(baseline.rules, ['no-extra-semi', 'no-mixed-spaces-and-tabs']);
  assert.equal(new Set(baseline.cases.map(x => x.name)).size, 24);
  const eslint = new ESLint({ cwd: path.resolve(__dirname, '..') });
  const results = await eslint.lintFiles(['src']);
  for (const r of results) {
    assert.deepEqual(r.usedDeprecatedRules, [], r.filePath);
    const cfg = await eslint.calculateConfigForFile(r.filePath);
    for (const id of baseline.rules) {
      assert.ok(!cfg.rules[id] || cfg.rules[id][0] === 0, 'Old rule is still active');
      const expected = id === 'no-mixed-spaces-and-tabs' ? [2, false] : [2];
      assert.deepEqual(cfg.rules['@stylistic/' + id], expected, 'Severity/options drift');
    }
  }
  for (const id of baseline.rules) {
    const group = baseline.cases.filter(x => x.rule === id);
    assert.ok(group.some(x => x.messages.length === 0) && group.some(x => x.messages.length > 0));
  }
});
for (const item of baseline.cases) {
  test('style rule parity: ' + item.name, async () => {
    const overrideConfig = [{ files: ['**/*.ts'], languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
      plugins: { '@stylistic': stylistic }, rules: { ['@stylistic/' + item.rule]: 'error' } }];
    const options = { filePath: path.resolve(__dirname, '../src/__style_fixture.ts') };
    const normal = (await new ESLint({ overrideConfigFile: true, overrideConfig }).lintText(item.code, options))[0];
    const fixed = (await new ESLint({ overrideConfigFile: true, overrideConfig, fix: true }).lintText(item.code, options))[0];
    assert.equal(normal.fatalErrorCount, 0);
    assert.equal(fixed.fatalErrorCount, 0);
    assert.deepEqual(normalize(normal.messages), item.messages);
    assert.equal(fixed.output ?? item.code, item.fixedCode);
    assert.deepEqual(normalize(fixed.messages), item.afterFixMessages);
  });
}
