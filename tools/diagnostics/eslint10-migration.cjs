'use strict';
// First-party development-tool migration, not a security/conformance certification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const BASE = '3493f1ad9e5b1b87e2e46c75aec02a599fae880b';
const CASES = [
  { name: 'typed-export', code: "export const value: string = 'ok';", rule: null },
  { name: 'underscore-argument-allowed', code: 'export function f(_unused: string): number { return 1; }', rule: null },
  { name: 'node-globals', code: "export const version = process.version; export const bytes = Buffer.from('x');", rule: null },
  { name: 'type-only-export', code: 'export type Name = string;', rule: null },
  { name: 'unused-local', code: 'const unused = 1; export {};', rule: '@typescript-eslint/no-unused-vars' },
  { name: 'unused-argument', code: 'export function f(unused: string) { return 1; }', rule: '@typescript-eslint/no-unused-vars' },
  { name: 'underscore-local-not-exempt', code: 'const _unused = 1; export {};', rule: '@typescript-eslint/no-unused-vars' },
  { name: 'explicit-any', code: 'export function f(value: any) { return value; }', rule: '@typescript-eslint/no-explicit-any' },
  { name: 'debugger', code: 'export function f() { debugger; return 1; }', rule: 'no-debugger' },
  { name: 'var-declaration', code: 'export function f() { var value = 1; return value; }', rule: 'no-var' },
  { name: 'prefer-const', code: 'export function f() { let value = 1; return value; }', rule: 'prefer-const' },
  { name: 'async-promise-executor', code: 'export const p = new Promise(async resolve => { resolve(1); });', rule: 'no-async-promise-executor' },
  { name: 'unused-expression', code: 'export {}; 1 + 2;', rule: '@typescript-eslint/no-unused-expressions' },
  { name: 'ts-ignore-comment', code: '// @ts-ignore\nexport const value = 1;', rule: '@typescript-eslint/ban-ts-comment' },
  { name: 'extra-semicolon', code: 'export const value = 1;;', rule: 'no-extra-semi' },
  { name: 'mixed-indentation', code: 'export function f() {\n \treturn 1;\n}', rule: 'no-mixed-spaces-and-tabs' },
  { name: 'nested-block-function', code: 'export function f(flag: boolean) { if (flag) { function inner() { return 1; } return inner(); } return 0; }', rule: 'no-inner-declarations' },
  { name: 'constant-while-condition', code: 'export function f() { while (true) { break; } }', rule: 'no-constant-condition' },
];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n'); };
function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error('Unexpected symlink: ' + p);
    return e.isDirectory() ? files(p) : e.isFile() ? [p] : [];
  }).sort();
}
function inventory(root, sub) { return Object.fromEntries(files(path.join(root, sub)).map(f => [path.relative(root, f), hash(fs.readFileSync(f))])); }
function level(value) { const n = Array.isArray(value) ? value[0] : value; return { off: 0, warn: 1, error: 2 }[n] ?? n; }
async function probe(root, output) {
  const req = createRequire(path.join(root, 'package.json'));
  const { ESLint } = req('eslint');
  const eslint = new ESLint({ cwd: root });
  const source = files(path.join(root, 'src')).filter(f => f.endsWith('.ts')).map(f => path.relative(root, f));
  assert.ok(source.length > 0);
  const linted = await eslint.lintFiles(['src/**/*.ts']);
  assert.deepEqual(linted.map(r => path.relative(root, r.filePath)).sort(), source);
  const config = await eslint.calculateConfigForFile(path.join(root, 'src/index.ts'));
  const activeRules = Object.fromEntries(Object.entries(config.rules).filter(([,v]) => level(v) > 0));
  const cases = [];
  for (const c of CASES) {
    const r = (await eslint.lintText(c.code, { filePath: path.join(root, 'src/__lint_policy_fixture.ts') }))[0];
    assert.equal(r.fatalErrorCount, 0, c.name + ' parse/config failure');
    const messages = r.messages.map(m => ({ ruleId: m.ruleId, severity: m.severity, message: m.message, line: m.line, column: m.column }));
    const ok = c.rule === null ? messages.length === 0 : messages.some(m => m.ruleId === c.rule && m.severity === 2);
    cases.push({ ...c, ok, messages });
  }
  const result = { version: req('eslint/package.json').version, source, activeRules,
    config: { rules: config.rules, env: config.env || null, parser: config.parser || config.languageOptions?.parser?.meta || null, parserOptions: config.parserOptions || null, language: config.languageOptions ? { ecmaVersion:config.languageOptions.ecmaVersion, sourceType:config.languageOptions.sourceType, globals:config.languageOptions.globals } : null },
    cases, deprecatedRules:[...new Set(linted.flatMap(r => (r.usedDeprecatedRules || []).map(x=>x.ruleId)))],
    sourceDiagnostics: linted.flatMap(r => r.messages.map(m => ({ file: path.relative(root, r.filePath), ...m }))) };
  writeJson(output, result);
  assert.ok(cases.every(c => c.ok), 'Policy fixture mismatch: ' + JSON.stringify(cases.filter(c => !c.ok)));
  assert.equal(result.sourceDiagnostics.length, 0, 'Existing source has lint diagnostics');
}

const CONFIG = `// Preserve the API's TypeScript policy while using supported ESLint flat config.
const js = require('@eslint/js');
const plugin = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');
const globals = require('globals');
module.exports = [
  { ignores: ['dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser,
      globals: { ...globals.node, ...globals.es2022 },
    },
    plugins: { '@typescript-eslint': plugin },
    rules: {
      ...js.configs.recommended.rules,
      ...plugin.configs['eslint-recommended'].overrides[0].rules,
      ...plugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // These were enabled by the legacy recommended preset. Preserve policy.
      // The two stylistic core rules still work in v10 but need replacement before v11.
      'no-extra-semi': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-inner-declarations': ['error', 'functions', { blockScopedFunctions: 'disallow' }],
      'no-constant-condition': ['error', { checkLoops: 'all' }],
    },
  },
];
`;
const TEST = `'use strict';
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
`;

function migrate() {
  const root = path.resolve('subject');
  const evidence = path.resolve('migration-evidence');
  const candidate = path.resolve('migration-candidate');
  fs.mkdirSync(evidence, { recursive: true });
  let seq = 0;
  const summary = { status: 'failed', baselineCommit: BASE, commands: [], limits: 'First-party tooling comparison; not deployment, independent verification or VCP compliance.' };
  function command(name, args, allowed = [0]) {
    const prefix = String(++seq).padStart(2, '0') + '-' + name;
    const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: 'utf8', timeout: 240000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, CI: '1' } });
    fs.writeFileSync(path.join(evidence, prefix + '.stdout'), r.stdout || '');
    fs.writeFileSync(path.join(evidence, prefix + '.stderr'), r.stderr || '');
    summary.commands.push({ name, args, status: r.status, signal: r.signal, error: r.error ? String(r.error) : null, stdout: prefix + '.stdout', stderr: prefix + '.stderr' });
    if (r.error || !allowed.includes(r.status)) throw new Error(name + ' failed with ' + r.status + ': ' + (r.stderr || r.stdout || '').slice(-2500));
    return r.stdout;
  }
  try {
    assert.equal(command('baseline-commit', ['git', 'rev-parse', 'HEAD']).trim(), BASE);
    summary.environment = { node: process.version, npm: command('npm-version', ['npm','--version']).trim() };
    const beforePackage = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
    const beforeLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
    const originalSource = inventory(root, 'src');
    const originalTests = inventory(root, 'test');
    const oldConfigBytes = fs.readFileSync(path.join(root, '.eslintrc.cjs'));
    fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(evidence, 'baseline-package-lock.json'));
    fs.copyFileSync(path.join(root, 'package.json'), path.join(evidence, 'baseline-package.json'));
    fs.writeFileSync(path.join(evidence, 'baseline.eslintrc.cjs'), oldConfigBytes);
    command('baseline-install', ['npm','ci','--ignore-scripts','--no-audit']);
    for (const script of ['lint','type-check','build','test']) command('baseline-' + script, ['npm','run',script]);
    const beforeDist = inventory(root, 'dist');
    writeJson(path.join(evidence, 'baseline-dist-hashes.json'), beforeDist);
    command('baseline-probe', [process.execPath, __filename, 'probe', root, path.join(evidence, 'baseline-policy.json')]);
    function audit(phase, omit) {
      const args = ['npm','audit','--json']; if (omit) args.push('--omit=dev');
      const raw = command(phase + '-audit-' + (omit ? 'production' : 'full'), args, [0,1]);
      const parsed = JSON.parse(raw);
      assert.ok(!parsed.error && parsed.metadata?.vulnerabilities, 'Audit must produce a complete report');
      assert.equal(parsed.metadata.vulnerabilities.total, 0, 'New or existing audit findings require review');
      return parsed.metadata.vulnerabilities;
    }
    summary.baselineAudits = { full: audit('baseline',false), production: audit('baseline',true) };
    for (const pkg of ['eslint@10.13.0','@eslint/js@10.0.1','globals@16.5.0','@typescript-eslint/parser@8.72.0','@typescript-eslint/eslint-plugin@8.72.0']) {
      command('registry-' + pkg.replace(/[^a-z0-9]/gi,'_'), ['npm','view',pkg,'version','engines','peerDependencies','dist.integrity','--json']);
    }
    command('install-candidate', ['npm','install','--save-dev','--save-exact','--ignore-scripts','--no-audit','eslint@10.13.0','@eslint/js@10.0.1','globals@16.5.0']);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
    pkg.scripts.lint = 'eslint src';
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg,null,2) + '\n');
    fs.writeFileSync(path.join(root, 'eslint.config.cjs'), CONFIG);
    fs.unlinkSync(path.join(root, '.eslintrc.cjs'));
    const baseline = JSON.parse(fs.readFileSync(path.join(evidence, 'baseline-policy.json')));
    writeJson(path.join(root, 'test/fixtures/lint-policy-baseline.json'), { sourceCommit: BASE, eslintVersion: baseline.version, activeRules: baseline.activeRules, cases: CASES });
    fs.writeFileSync(path.join(root, 'test/lint-policy.test.cjs'), TEST);
    command('clean-candidate-install', ['npm','ci','--ignore-scripts','--no-audit']);
    command('candidate-dependency-tree', ['npm','ls','--all','--json']);
    for (const script of ['lint','type-check','build','test']) command('candidate-' + script, ['npm','run',script]);
    command('candidate-probe', [process.execPath, __filename, 'probe', root, path.join(evidence, 'candidate-policy.json')]);
    const after = JSON.parse(fs.readFileSync(path.join(evidence, 'candidate-policy.json')));
    assert.equal(after.version, '10.13.0');
    assert.deepEqual(after.source, baseline.source);
    const preserved = [];
    for (const [id, rule] of Object.entries(baseline.activeRules)) {
      assert.ok(level(after.activeRules[id]) >= level(rule), 'Removed/weakened rule: ' + id);
      preserved.push(id);
    }
    summary.rules = { preservedActive: preserved.length, baselineActive: Object.keys(baseline.activeRules).length, candidateActive: Object.keys(after.activeRules).length, added: Object.keys(after.activeRules).filter(id => !(id in baseline.activeRules)), fileCoverage: after.source, baselineCases: baseline.cases.length, candidateCases: after.cases.length, retainedDeprecatedCoreRules:after.deprecatedRules };
    const afterLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
    const runtime = lock => Object.fromEntries(Object.entries(lock.packages).filter(([name,p]) => name && !p.dev));
    assert.deepEqual(runtime(afterLock), runtime(beforeLock), 'Runtime lock entries changed');
    assert.deepEqual(pkg.dependencies, beforePackage.dependencies);
    assert.equal(pkg.devDependencies['@typescript-eslint/parser'], beforePackage.devDependencies['@typescript-eslint/parser']);
    assert.equal(pkg.devDependencies['@typescript-eslint/eslint-plugin'], beforePackage.devDependencies['@typescript-eslint/eslint-plugin']);
    assert.deepEqual(inventory(root,'src'), originalSource);
    for (const [p,h] of Object.entries(originalTests)) assert.equal(hash(fs.readFileSync(path.join(root,p))),h);
    const afterDist = inventory(root,'dist');
    assert.deepEqual(afterDist,beforeDist,'Compiled output changed');
    writeJson(path.join(evidence, 'candidate-dist-hashes.json'), afterDist);
    summary.preservation = { runtimeEntries: Object.keys(runtime(afterLock)).length, sourceFiles: Object.keys(originalSource).length, existingTestFiles: Object.keys(originalTests).length, identicalCompiledFiles: Object.keys(afterDist).length };
    summary.candidateAudits = { full: audit('candidate',false), production: audit('candidate',true) };
    const selected = ['package.json','package-lock.json','eslint.config.cjs','test/fixtures/lint-policy-baseline.json','test/lint-policy.test.cjs'];
    const hashes = {};
    for (const p of selected) {
      const target = path.join(candidate,'files',p); fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(path.join(root,p),target); hashes[p]=hash(fs.readFileSync(target));
    }
    summary.status='passed';
    writeJson(path.join(candidate,'manifest.json'), { baselineCommit: BASE, files: hashes, deleted: { '.eslintrc.cjs': hash(oldConfigBytes) }, runtimeEntriesUnchanged: summary.preservation.runtimeEntries, distFilesUnchanged: summary.preservation.identicalCompiledFiles, validationStatus:'passed' });
  } catch (e) { summary.error=String(e); console.error(e); process.exitCode=1; }
  finally { writeJson(path.join(evidence,'summary.json'),summary); console.log(JSON.stringify(summary,null,2)); }
}
if (process.argv[2] === 'probe') probe(path.resolve(process.argv[3]), path.resolve(process.argv[4])).catch(e => { console.error(e); process.exitCode=1; });
else migrate();
