'use strict';
// First-party bounded migration study; only a separate reviewed branch is staged.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const base = '8120059b7f2afce0373ee01311c2e75657699f4c';
const subject = path.resolve('subject');
const out = path.resolve('stylistic-evidence');
const candidate = path.resolve('stylistic-candidate');
fs.mkdirSync(out, { recursive: true });
const hash = b => createHash('sha256').update(b).digest('hex');
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }
function command(label, args, allowed = [0]) {
  const r = spawnSync(args[0], args.slice(1), { cwd: subject, encoding: 'utf8', timeout: 180000,
    maxBuffer: 12 * 1024 * 1024, env: { ...process.env, DEV_INSTALL_EVIDENCE: path.join(out, label + '-dev') } });
  fs.writeFileSync(path.join(out, label + '.stdout'), r.stdout || '');
  fs.writeFileSync(path.join(out, label + '.stderr'), r.stderr || '');
  writeJSON(path.join(out, label + '.status.json'), { args, status: r.status, signal: r.signal, error: r.error?.message });
  assert.ok(allowed.includes(r.status) && !r.error, label + ': ' + (r.stderr || r.error || r.status));
  return r.stdout;
}
function tree(dir) {
  const result = {};
  function walk(p) {
    for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile()) result[path.relative(dir, full).split(path.sep).join('/')] = hash(fs.readFileSync(full));
      else throw new Error('Unexpected non-regular entry ' + full);
    }
  }
  walk(dir); return result;
}
function once(text, a, b) { assert.equal(text.split(a).length, 2, 'Replacement must be unique: ' + a); return text.replace(a, b); }
const cases = [];
const add = (name, code, rule) => cases.push({ name, code, rule });
const semi = 'no-extra-semi';
const tabs = 'no-mixed-spaces-and-tabs';
add('typed-statement', 'export const n: number = 1;\n', semi);
add('extra-statement', 'export const n: number = 1;;\n', semi);
add('function-normal', 'export function f() {}\n', semi);
add('function-extra', 'export function f() {};\n', semi);
add('class-normal', 'export class C { value: number = 1; method() {} }\n', semi);
add('class-extra', 'export class C { value: number = 1;; method() {}; }\n', semi);
add('empty-for-body', 'for (let i = 0; i < 1; i++);\n', semi);
add('empty-while-body', 'while (false);\n', semi);
add('empty-if-body', 'if (false);\n', semi);
add('directive-fix-safety', ';"use strict"; export const n = 1;\n', semi);
add('multiple-extra', 'export const n = 1;;;\n', semi);
add('comment-extra', 'export const n = 1; /* retained comment */ ;\n', semi);
add('spaces-only', 'export function f() {\n    return 1;\n}\n', tabs);
add('tabs-only', 'export function f() {\n\treturn 1;\n}\n', tabs);
add('space-tab', 'export function f() {\n \treturn 1;\n}\n', tabs);
add('tab-space', 'export function f() {\n\t return 1;\n}\n', tabs);
add('nested-mixed', 'export function f() {\n  if (true) {\n  \t return 1;\n  }\n}\n', tabs);
add('mixed-blank-line', ' \t\nexport const n = 1;\n', tabs);
add('mixed-line-comment', ' \t// comment\nexport const n = 1;\n', tabs);
add('mixed-block-comment', '/*\n \t comment\n*/\nexport const n = 1;\n', tabs);
add('template-literal-content', 'export const s = `line\n \tcontent`;\n', tabs);
add('mixed-crlf', 'export function f() {\r\n \treturn 1;\r\n}\r\n', tabs);
add('string-tab-content', 'export const s = " \tcontent";\n', tabs);
add('multiple-mixed-lines', 'export function f() {\n \tconst n = 1;\n\t return n;\n}\n', tabs);
assert.equal(cases.length, 24);

const probeSource = String.raw`'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { ESLint } = require('eslint');
const parser = require('@typescript-eslint/parser');
const legacy = process.argv[2] === 'legacy';
const plugin = legacy ? null : require('@stylistic/eslint-plugin').default;
const cases = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const normalize = messages => messages.map(m => ({
  ruleId: m.ruleId?.replace(/^@stylistic\//, ''), severity: m.severity,
  messageId: m.messageId, message: m.message, line: m.line, column: m.column,
  endLine: m.endLine, endColumn: m.endColumn, fix: m.fix || null,
}));
(async () => {
  const data = [];
  for (const item of cases) {
    const id = legacy ? item.rule : '@stylistic/' + item.rule;
    const config = { files: ['**/*.ts'], languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
      ...(legacy ? {} : { plugins: { '@stylistic': plugin } }), rules: { [id]: 'error' } };
    const normal = new ESLint({ overrideConfigFile: true, overrideConfig: [config] });
    const fixer = new ESLint({ overrideConfigFile: true, overrideConfig: [config], fix: true });
    const options = { filePath: path.join(process.cwd(), 'src/__style_fixture.ts') };
    const original = (await normal.lintText(item.code, options))[0];
    const fixed = (await fixer.lintText(item.code, options))[0];
    assert.equal(original.fatalErrorCount, 0, item.name);
    assert.equal(fixed.fatalErrorCount, 0, item.name);
    data.push({ ...item, messages: normalize(original.messages), fixedCode: fixed.output ?? item.code,
      afterFixMessages: normalize(fixed.messages) });
  }
  const real = new ESLint();
  const actual = await real.lintFiles(['src']);
  const configurations = {};
  for (const r of actual) {
    const c = await real.calculateConfigForFile(r.filePath);
    configurations[path.relative(process.cwd(), r.filePath)] = c.rules;
  }
  const deprecated = [...new Set(actual.flatMap(r => (r.usedDeprecatedRules || []).map(x => x.ruleId)))];
  fs.writeFileSync(process.argv[4], JSON.stringify({ cases: data, configurations, deprecated,
    sourceDiagnostics: actual.map(r => ({ file: path.relative(process.cwd(), r.filePath), messages: normalize(r.messages) })) }, null, 2) + '\n');
})().catch(e => { console.error(e); process.exitCode = 1; });
`;

try {
  assert.equal(command('source-head', ['git', 'rev-parse', 'HEAD']).trim(), base);
  command('baseline-install', ['npm', 'ci']);
  command('baseline-lint', ['npm', 'run', 'lint']);
  command('baseline-typecheck', ['npm', 'run', 'type-check']);
  command('baseline-build', ['npm', 'run', 'build']);
  command('baseline-tests', ['npm', 'test']);
  const unchanged = Object.fromEntries(['.npmrc', '.nvmrc', 'test/http.test.cjs', 'test/dev-install-policy.test.cjs',
    'test/fixtures/lint-policy-baseline.json'].map(p => [p, hash(fs.readFileSync(path.join(subject, p)))]));
  const sourceBefore = tree(path.join(subject, 'src'));
  const compiledBefore = tree(path.join(subject, 'dist'));
  const packageBefore = JSON.parse(fs.readFileSync(path.join(subject, 'package.json')));
  const lockBefore = JSON.parse(fs.readFileSync(path.join(subject, 'package-lock.json')));
  writeJSON(path.join(out, 'cases.json'), cases);
  fs.writeFileSync(path.join(subject, '.style-probe.cjs'), probeSource);
  command('baseline-probe', ['node', '.style-probe.cjs', 'legacy', path.join(out, 'cases.json'), path.join(out, 'baseline.json')]);
  command('add-plugin', ['npm', 'install', '--save-dev', '--save-exact', '--ignore-scripts', '@stylistic/eslint-plugin@5.10.0']);
  command('candidate-clean-install', ['npm', 'ci']);
  const packageAfter = JSON.parse(fs.readFileSync(path.join(subject, 'package.json')));
  const lockAfter = JSON.parse(fs.readFileSync(path.join(subject, 'package-lock.json')));
  const expectedPackage = structuredClone(packageBefore);
  expectedPackage.devDependencies['@stylistic/eslint-plugin'] = '5.10.0';
  assert.deepEqual(packageAfter, expectedPackage, 'Only one dev dependency may be added');
  const production = l => Object.fromEntries(Object.entries(l.packages).filter(([p, m]) => p && !m.dev));
  assert.deepEqual(production(lockAfter), production(lockBefore), 'Production dependencies must not drift');
  let config = fs.readFileSync(path.join(subject, 'eslint.config.cjs'), 'utf8');
  config = once(config, "const globals = require('globals');", "const globals = require('globals');\nconst stylistic = require('@stylistic/eslint-plugin').default;");
  config = once(config, "plugins: { '@typescript-eslint': plugin },", "plugins: { '@typescript-eslint': plugin, '@stylistic': stylistic },");
  config = once(config, "      // These were enabled by the legacy recommended preset. Preserve policy.\n      // The two stylistic core rules still work in v10 but need replacement before v11.\n      'no-extra-semi': 'error',\n      'no-mixed-spaces-and-tabs': 'error',", "      // Maintained equivalents; the legacy behavior is frozen in regression fixtures.\n      '@stylistic/no-extra-semi': 'error',\n      '@stylistic/no-mixed-spaces-and-tabs': 'error',");
  fs.writeFileSync(path.join(subject, 'eslint.config.cjs'), config);
  command('candidate-probe', ['node', '.style-probe.cjs', 'stylistic', path.join(out, 'cases.json'), path.join(out, 'candidate.json')]);
  const before = JSON.parse(fs.readFileSync(path.join(out, 'baseline.json')));
  const after = JSON.parse(fs.readFileSync(path.join(out, 'candidate.json')));
  assert.deepEqual(after.cases, before.cases, 'Diagnostic positions/messages/fixes must match on all 24 fixtures');
  assert.deepEqual(after.sourceDiagnostics, before.sourceDiagnostics, 'Real source diagnostics must match');
  assert.deepEqual(after.deprecated, [], 'No active deprecated rule may remain');
  const aliases = { 'no-extra-semi': '@stylistic/no-extra-semi', 'no-mixed-spaces-and-tabs': '@stylistic/no-mixed-spaces-and-tabs' };
  const severity = r => Array.isArray(r) ? r[0] : (r ?? 0);
  for (const [file, rules] of Object.entries(before.configurations)) {
    const got = after.configurations[file]; assert.ok(got, file);
    const activeBefore = Object.entries(rules).filter(([,v]) => severity(v) !== 0);
    const activeAfter = Object.entries(got).filter(([,v]) => severity(v) !== 0);
    assert.equal(activeAfter.length, activeBefore.length);
    for (const [id, options] of activeBefore) assert.deepEqual(got[aliases[id] || id], options, file + ':' + id);
  }
  let guard = fs.readFileSync(path.join(subject, 'test/lint-policy.test.cjs'), 'utf8');
  guard = once(guard, "const eslint = new ESLint({ cwd: root });", "const eslint = new ESLint({ cwd: root });\n// Only these two names migrate; the frozen 66-rule baseline is unchanged.\nconst aliases = Object.freeze({ 'no-extra-semi': '@stylistic/no-extra-semi', 'no-mixed-spaces-and-tabs': '@stylistic/no-mixed-spaces-and-tabs' });");
  guard = once(guard, 'severity(config.rules[id]) >= severity(rule)', 'severity(config.rules[aliases[id] || id]) >= severity(rule)');
  guard = once(guard, 'm.ruleId === fixture.rule && m.severity === 2', 'm.ruleId === (aliases[fixture.rule] || fixture.rule) && m.severity === 2');
  fs.writeFileSync(path.join(subject, 'test/lint-policy.test.cjs'), guard);
  const snapshot = { sourceCommit: base, eslintVersion: lockBefore.packages['node_modules/eslint'].version,
    rules: Object.keys(aliases), cases: before.cases };
  writeJSON(path.join(subject, 'test/fixtures/style-rule-baseline.json'), snapshot);
  const permanent = String.raw`'use strict';
// Bounded old-rule observations, not a proof of equivalence for all source text.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ESLint } = require('eslint');
const parser = require('@typescript-eslint/parser');
const stylistic = require('@stylistic/eslint-plugin').default;
const baseline = require('./fixtures/style-rule-baseline.json');
const normalize = messages => messages.map(m => ({
  ruleId: m.ruleId?.replace(/^@stylistic\//, ''), severity: m.severity,
  messageId: m.messageId, message: m.message, line: m.line, column: m.column,
  endLine: m.endLine, endColumn: m.endColumn, fix: m.fix || null,
}));
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
      assert.deepEqual(cfg.rules['@stylistic/' + id], [2], 'Severity/options drift');
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
`;
  fs.writeFileSync(path.join(subject, 'test/style-rule-policy.test.cjs'), permanent);
  command('candidate-lint', ['npm', 'run', 'lint']);
  command('candidate-typecheck', ['npm', 'run', 'type-check']);
  command('candidate-build', ['npm', 'run', 'build']);
  command('candidate-tests', ['npm', 'test']);
  for (const [label, args] of [['full', []], ['production', ['--omit=dev']]]) {
    const text = command('audit-' + label, ['npm', 'audit', '--json', ...args]);
    const audit = JSON.parse(text); assert.equal(audit.metadata.vulnerabilities.total, 0);
  }
  assert.deepEqual(tree(path.join(subject, 'src')), sourceBefore);
  assert.deepEqual(tree(path.join(subject, 'dist')), compiledBefore);
  for (const [p, value] of Object.entries(unchanged)) assert.equal(hash(fs.readFileSync(path.join(subject, p))), value, p);
  const changed = ['package.json', 'package-lock.json', 'eslint.config.cjs', 'test/lint-policy.test.cjs',
    'test/fixtures/style-rule-baseline.json', 'test/style-rule-policy.test.cjs'];
  const fileHashes = {};
  for (const p of changed) {
    const target = path.join(candidate, p); fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(subject, p), target); fileHashes[p] = hash(fs.readFileSync(target));
  }
  const report = { status: 'PASSED', baseline: base, plugin: '5.10.0', fixtureCount: cases.length,
    coveredSourceFiles: Object.keys(sourceBefore).length, productionEntries: Object.keys(production(lockBefore)).length,
    compiledFileCount: Object.keys(compiledBefore).length, compiledHashes: compiledBefore,
    activeRules: Object.values(before.configurations)[0] && Object.values(Object.values(before.configurations)[0]).filter(r => severity(r) !== 0).length,
    deprecatedBefore: before.deprecated, deprecatedAfter: after.deprecated,
    contentChecks: { sourceUnchanged: true, productionLockUnchanged: true, compiledUnchanged: true, originalFixturesUnchanged: true },
    limits: 'First-party Linux CI; 24 bounded fixtures, not all-input semantic equivalence, security certification or independent VCP reproduction.' };
  writeJSON(path.join(out, 'summary.json'), report);
  writeJSON(path.join(candidate, 'manifest.json'), { baseline: base, sourceDiagnosticCommit: process.env.GITHUB_SHA,
    fileHashes, report });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  writeJSON(path.join(out, 'failure.json'), { status: 'FAILED', error: error.stack });
  console.error(error); process.exitCode = 1;
}
