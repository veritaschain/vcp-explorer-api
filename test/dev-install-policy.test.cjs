'use strict';
// Bounded first-party installation/dev regression. Does not sandbox packages.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function npm(args, cwd = root) {
  assert.ok(process.env.npm_execpath, 'Run this suite through npm test');
  return execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd, env: process.env, encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function evidence(name, value) {
  const location = process.env.DEV_INSTALL_EVIDENCE;
  if (!location) return;
  fs.mkdirSync(location, { recursive: true });
  fs.writeFileSync(path.join(location, name + '.json'), JSON.stringify(value, null, 2) + '\n');
}

test('installation policy blocks lifecycle hooks and inventories the installed lock', () => {
  assert.match(fs.readFileSync(path.join(root, '.npmrc'), 'utf8'), /^ignore-scripts=true$/m);
  assert.equal(npm(['config', 'get', 'ignore-scripts']).trim(), 'true');
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const hooks = Object.entries(lock.packages).filter(([p, metadata]) =>
    p && metadata.hasInstallScript && fs.existsSync(path.join(root, p, 'package.json'))
  ).map(([p, metadata]) => ({ path: p, version: metadata.version }));
  assert.deepEqual(hooks.map(x => x.path).sort(), ['node_modules/esbuild'],
    'A new install-hook dependency requires an explicit policy review');
  const installed = require('esbuild/package.json');
  assert.equal(hooks[0].version, installed.version);
  evidence('policy', { ignoreScripts: true, installedHookPackages: hooks, node: process.version });
});

test('offline lifecycle control is blocked, explicit npm script still runs', { timeout: 60000 }, t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcp-install-policy-'));
  try {
    fs.copyFileSync(path.join(root, '.npmrc'), path.join(dir, '.npmrc'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      name: 'vcp-local-install-policy-control', version: '0.0.0', private: true,
      scripts: { postinstall: 'node marker.cjs', verify: 'node explicit.cjs', preverify: 'node before.cjs' },
    }));
    for (const [file, marker] of [['marker.cjs', 'install-ran'], ['explicit.cjs', 'explicit-ran'], ['before.cjs', 'pre-ran']]) {
      fs.writeFileSync(path.join(dir, file), `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'local-test-only');\n`);
    }
    npm(['install', '--offline', '--no-audit', '--no-fund', '--package-lock=false'], dir);
    assert.equal(fs.existsSync(path.join(dir, 'install-ran')), false);
    npm(['run', 'verify'], dir);
    assert.equal(fs.existsSync(path.join(dir, 'explicit-ran')), true);
    assert.equal(fs.existsSync(path.join(dir, 'pre-ran')), false);
    // Deliberate negative control: only this disposable, dependency-free fixture
    // is allowed to run its locally written marker. Never change the app policy.
    npm(['install', '--offline', '--no-audit', '--no-fund', '--package-lock=false', '--ignore-scripts=false'], dir);
    assert.equal(fs.existsSync(path.join(dir, 'install-ran')), true,
      'The negative control must actually execute, not merely omit a failure');
    const result = { blockedInstallHook: true, explicitScriptRuns: true,
      implicitPreScriptBlocked: true, negativeControlRuns: true, externalDependencies: 0 };
    t.diagnostic(JSON.stringify(result));
    evidence('lifecycle-control', result);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('esbuild CLI and sync/async APIs operate with the install hook disabled', async t => {
  const esbuild = require('esbuild');
  const cli = require.resolve('esbuild/bin/esbuild');
  // A clean ignored-script install retains the JS shim rather than the optional
  // install-time native executable optimization.
  assert.match(fs.readFileSync(cli).subarray(0, 100).toString(), /^#!.*node/);
  const cliVersion = execFileSync(process.execPath, [cli, '--version'], {
    encoding: 'utf8', timeout: 10000,
  }).trim();
  assert.equal(cliVersion, esbuild.version);
  const input = 'export const answer: number = 42;';
  const options = { loader: 'ts', format: 'cjs', target: 'node24' };
  const sync = esbuild.transformSync(input, options);
  const asyncResult = await esbuild.transform(input, options);
  assert.equal(sync.code, asyncResult.code);
  const fixtureModule = { exports: {} };
  // Execute only the constant, test-owned transformation above.
  new Function('module', 'exports', sync.code)(fixtureModule, fixtureModule.exports);
  assert.equal(fixtureModule.exports.answer, 42);
  const result = { version: esbuild.version, cliVersion, transformedValue: 42,
    syncAndAsyncMatch: true, installerOptimizationAbsent: true };
  t.diagnostic(JSON.stringify(result));
  evidence('esbuild-smoke', result);
});

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function stopTree(child, closed) {
  if (child.pid === undefined) return;
  if (process.platform === 'win32') {
    try { execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', timeout: 5000 }); }
    catch (error) { if (child.exitCode === null) throw error; }
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    await Promise.race([closed, delay(3000)]);
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  assert.equal(await Promise.race([closed.then(() => true), delay(5000).then(() => false)]), true,
    'Development process must be reaped');
}

test('npm run dev starts and reloads a disposable source copy with hooks disabled', { timeout: 75000 }, async t => {
  assert.ok(process.env.npm_execpath, 'Run this suite through npm test');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vcp-dev-policy-'));
  const source = path.join(root, 'src/index.ts');
  const original = fs.readFileSync(source);
  const originalHash = digest(original);
  let child;
  let closed;
  let output = '';
  let result = { status: 'failed' };
  try {
    fs.cpSync(path.join(root, 'src'), path.join(dir, 'src'), { recursive: true });
    for (const file of ['package.json', 'tsconfig.json', '.npmrc']) {
      fs.copyFileSync(path.join(root, file), path.join(dir, file));
    }
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir');
    const port = await freePort();
    child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev'], {
      cwd: dir, env: { ...process.env, PORT: String(port), NO_COLOR: '1' },
      detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    });
    let spawnError;
    child.on('error', e => { spawnError = e; });
    closed = new Promise(resolve => child.once('close', resolve));
    const collect = chunk => { output = (output + chunk.toString()).slice(-100000); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const waitForService = async expected => {
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        if (spawnError) throw spawnError;
        if (child.exitCode !== null || child.signalCode !== null) throw new Error('dev exited early: ' + output);
        let value;
        try {
          const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(700) });
          if (response.ok) value = await response.json();
        } catch { /* Startup/restart connection gaps are bounded by the deadline. */ }
        if (value?.status === 'ok' && value.service === expected) return;
        await delay(150);
      }
      throw new Error('Health did not reach ' + expected + ': ' + output);
    };
    await waitForService('VCP Explorer API');
    const needle = "service: 'VCP Explorer API'";
    const before = original.toString('utf8');
    assert.equal(before.split(needle).length, 2, 'Fixture mutation must target one existing health field');
    const changed = before.replace(needle, "service: 'VCP Explorer API reload-control'");
    const copy = path.join(dir, 'src/index.ts');
    fs.writeFileSync(copy, changed);
    await waitForService('VCP Explorer API reload-control');
    fs.writeFileSync(copy, original);
    await waitForService('VCP Explorer API');
    assert.equal(digest(fs.readFileSync(source)), originalHash);
    result = { status: 'passed', command: 'npm run dev', startup: true, changedSourceReload: true,
      restoredSourceReload: true, originalSourceUnchanged: true, node: process.version,
      platform: process.platform, arch: process.arch };
    t.diagnostic(JSON.stringify(result));
  } finally {
    try { if (child) await stopTree(child, closed); }
    finally {
      evidence('dev-smoke', { ...result, output });
      fs.rmSync(dir, { recursive: true, force: true });
      assert.equal(digest(fs.readFileSync(source)), originalHash, 'Original source must remain unchanged');
    }
  }
});
