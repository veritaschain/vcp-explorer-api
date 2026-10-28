import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute } from 'node:path';
import { createEvidenceDemo, type EvidenceDemo, MAX_BUNDLE_BYTES, MAX_TRUST_BYTES } from './core';

export { EvidenceDemo } from './core';

function fail(message: string): never {
  throw new Error(`Evidence demo configuration: ${message}`);
}
function file(path: string, name: string, maximum: number): string {
  if (!isAbsolute(path)) fail(`${name} must be an absolute local file path`);
  const stat = statSync(path);
  if (!stat.isFile() || stat.size > maximum) fail(`${name} must be a regular file within ${maximum} bytes`);
  return readFileSync(path, 'utf8');
}

/** Node-only operator configuration; verification lives in the portable core. */
export function loadEvidenceDemo(env: NodeJS.ProcessEnv): EvidenceDemo | null {
  const paths = [env.VCP_EVIDENCE_BUNDLE, env.VCP_EVIDENCE_TRUST, env.VCP_EVIDENCE_SDK_MODULE];
  if (paths.every(path => path === undefined)) return null;
  if (paths.some(path => !path)) fail('BUNDLE, TRUST and SDK_MODULE must all be configured');
  const [bundlePath, trustPath, modulePath] = paths as [string, string, string];
  if (!isAbsolute(modulePath) || !statSync(modulePath).isFile()) fail('SDK_MODULE must be an absolute regular local file');
  // Node 24 supports require(ESM) without top-level await. The SDK has no TLA;
  // this avoids TypeScript's CommonJS rewriting of native dynamic import().
  const sdkModule: unknown = createRequire(__filename)(modulePath);
  return createEvidenceDemo(
    sdkModule,
    file(bundlePath, 'BUNDLE', MAX_BUNDLE_BYTES),
    file(trustPath, 'TRUST', MAX_TRUST_BYTES)
  );
}

export function evidenceOrigin(env: NodeJS.ProcessEnv, enabled: boolean): string | null {
  const origin = env.VCP_EVIDENCE_ORIGIN;
  if (origin === undefined) return null;
  if (!enabled) fail('VCP_EVIDENCE_ORIGIN requires the evidence demo configuration');
  let url: URL;
  try { url = new URL(origin); } catch { return fail('VCP_EVIDENCE_ORIGIN must be an exact HTTP(S) origin'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    fail('VCP_EVIDENCE_ORIGIN must be an exact HTTP(S) origin without path or credentials');
  }
  return origin;
}
