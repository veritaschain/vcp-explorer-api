import type { EvidenceDemo } from './core';

export type EvidenceProvenance = Readonly<Record<string, string | number | boolean | null>>;
export interface EvidenceHttpOptions {
  allowedOrigins: readonly string[];
  provenance?: EvidenceProvenance;
}

const APPROVED_ORIGINS = new Set([
  'https://veritaschain.org',
  'https://www.veritaschain.org'
]);

/**
 * Fetch-API transport for the fixed evidence demonstration. It does not read
 * request bodies or accept evidence, keys, module names or success reports.
 * The actual portable verifier is injected; no Node or framework API is used.
 */
export function createEvidenceHttpHandler(
  demo: Pick<EvidenceDemo, 'list' | 'verify'>,
  options: EvidenceHttpOptions
): (request: Request) => Response {
  if (!Array.isArray(options.allowedOrigins) ||
      options.allowedOrigins.some(origin => !APPROVED_ORIGINS.has(origin))) {
    throw new TypeError('Allowed origins must be exact approved HTTPS website origins');
  }
  const allowedOrigins = new Set(options.allowedOrigins);
  let provenance: Record<string, string | number | boolean | null> | undefined;
  if (options.provenance !== undefined) {
    const value = options.provenance;
    if (value === null || typeof value !== 'object' || Array.isArray(value) ||
        ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
      throw new TypeError('Provenance must be a plain metadata object');
    }
    provenance = {};
    for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (!Object.hasOwn(descriptor, 'value')) throw new TypeError('Provenance must contain plain values');
      const item: unknown = descriptor.value;
      if (item !== null && typeof item !== 'string' && typeof item !== 'boolean' &&
          !(typeof item === 'number' && Number.isFinite(item))) {
        throw new TypeError('Provenance values must be strings, finite numbers, booleans or null');
      }
      Object.defineProperty(provenance, name, { value: item, enumerable: true });
    }
  }

  return (request: Request): Response => {
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    const json = (status: number, body: unknown): Response => {
      headers.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(body), { status, headers });
    };
    const notFound = (): Response => json(404, { error: 'not_found', message: 'Endpoint or evidence case not found' });
    let url: URL;
    try { url = new URL(request.url); } catch { return notFound(); }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return notFound();

    const origin = request.headers.get('Origin');
    if (origin !== null) {
      if (origin !== url.origin && !allowedOrigins.has(origin)) {
        return json(403, { error: 'origin_not_allowed', message: 'Request origin is not allowed' });
      }
      headers.set('Access-Control-Allow-Origin', origin);
    }

    const isHealth = url.pathname === '/health';
    const isCases = url.pathname === '/v1/evidence-demo/cases';
    // Case IDs are not decoded or normalized into a different resource. Encoded
    // delimiters, invalid escapes, repeated slashes and trailing paths fail closed.
    const match = /^\/v1\/evidence-demo\/cases\/([a-z][a-z0-9-]{0,63})\/verification$/.exec(url.pathname);
    if (!isHealth && !isCases && !match) return notFound();

    const methodNotAllowed = (): Response => {
      headers.set('Allow', 'GET, OPTIONS');
      return json(405, { error: 'method_not_allowed', message: 'Only GET and OPTIONS are supported' });
    };
    if (request.method !== 'GET' && request.method !== 'OPTIONS') return methodNotAllowed();
    if (request.method === 'OPTIONS') {
      const requestedMethod = request.headers.get('Access-Control-Request-Method');
      if (requestedMethod !== null && requestedMethod !== 'GET' && requestedMethod !== 'OPTIONS') return methodNotAllowed();
      const requestedHeaders = request.headers.get('Access-Control-Request-Headers');
      if (requestedHeaders !== null && requestedHeaders.split(',').some(name => name.trim().toLowerCase() !== 'accept')) {
        return json(403, { error: 'headers_not_allowed', message: 'Requested headers are not supported' });
      }
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      if (requestedHeaders !== null) headers.set('Access-Control-Allow-Headers', 'Accept');
      return new Response(null, { status: 204, headers });
    }

    if (isHealth) {
      return json(200, {
        status: 'ok', service: 'VCP evidence demonstration',
        ...(provenance ? { provenance } : {})
      });
    }
    try {
      if (isCases) return json(200, demo.list());
      const result = demo.verify(match![1]!);
      return result === null ? notFound() : json(200, result);
    } catch {
      // Never retain an earlier success or include private diagnostics in errors.
      return json(503, { error: 'service_unavailable', message: 'Evidence verification is unavailable' });
    }
  };
}
