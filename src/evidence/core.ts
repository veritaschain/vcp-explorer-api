type Status = 'VALID' | 'INVALID' | 'INDETERMINATE';
interface SDKCheck {
  name: string;
  status: Status;
  reason?: string;
  detail?: string;
  subject?: string;
}
interface SDKReport { status: Status; checks: SDKCheck[]; notes: string[] }
interface DemoCheck extends SDKCheck {
  group: 'batch' | 'chain' | 'inclusion';
  scope: 'local' | 'external';
}
type Obj = Record<string, unknown>;
interface Trust {
  actor_public_keys: Record<string, string>;
  anchor_public_key: string | null;
}
interface Proof {
  event_id: string;
  index: number;
  tree_size: number;
  event_hash: string;
  merkle_root: string;
  proof: string[];
}
interface DemoCase {
  id: string;
  title: string;
  description: string;
  events_jsonl: string;
  anchor_record_json: string;
  inclusion_proofs: Proof[];
}
interface SDK {
  VERSION: string;
  VCP_SPEC_VERSION: string;
  VCP_SPEC_COMMIT: string;
  parseJson: (text: string) => unknown;
  parseJsonLines: (text: string) => unknown[];
  verifyBatch: (events: unknown, anchor: unknown, options: {
    publicKey: Record<string, string>;
    anchorPublicKey: string | null;
    requireSignAlgo: string;
  }) => SDKReport;
  verifyChain: (events: unknown) => SDKReport;
  verifyInclusionProof: (hash: unknown, index: unknown, size: unknown,
    proof: unknown, root: unknown, authenticated: boolean) => SDKReport;
  computeEventHash: (header: object, payload: object,
    options: { prevHash?: string | null; algo?: string }) => string;
  parseHash: (hash: unknown) => string;
  publicKeyProblem: (bytes: Uint8Array) => string | null;
  fromHex: (hex: string) => Uint8Array;
  combine: (statuses: Status[]) => Status;
}

const FORMAT = 'vcp-evidence-demo/1';
const SUPPORTED_SDK_VERSION = '0.1.0';
const SUPPORTED_SPEC_VERSION = '1.2.0';
const SUPPORTED_SPEC_COMMIT = 'b23acb266f88df81d960d36d58fb64ceaa0dd5ed';
export const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
export const MAX_TRUST_BYTES = 64 * 1024;
const MAX_EVENTS = 100;
const MODULE_FUNCTIONS = [
  'parseJson', 'parseJsonLines', 'verifyBatch', 'verifyChain',
  'verifyInclusionProof', 'computeEventHash', 'parseHash',
  'publicKeyProblem', 'fromHex', 'combine'
] as const;
const object = (value: unknown): value is Obj =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function fail(message: string): never {
  throw new Error(`Evidence demo configuration: ${message}`);
}
function asObject(value: unknown, name: string): Obj {
  if (!object(value)) fail(`${name} must be an object`);
  return value;
}
function keys(value: Obj, allowed: string[], name: string): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) fail(`${name} has unknown fields`);
  if (allowed.some(key => !Object.hasOwn(value, key))) fail(`${name} is missing a required field`);
}
function string(value: unknown, name: string, max = 4096): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    fail(`${name} must be a non-empty string within ${max} characters`);
  }
  return value;
}
function integer(value: unknown, name: string, minimum: number): number {
  const number = typeof value === 'bigint' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < minimum) {
    fail(`${name} must be a safe integer >= ${minimum}`);
  }
  return number;
}
function parseProof(value: unknown): Proof {
  const p = asObject(value, 'inclusion proof');
  keys(p, ['event_id', 'index', 'tree_size', 'event_hash', 'merkle_root', 'proof'], 'inclusion proof');
  const eventHash = string(p.event_hash, 'proof.event_hash', 71);
  const root = string(p.merkle_root, 'proof.merkle_root', 64);
  if (!/^(?:sha256:)?[0-9a-f]{64}$/i.test(eventHash) || !/^[0-9a-f]{64}$/i.test(root)) {
    fail('proof hashes must be 32-byte hexadecimal digests');
  }
  const index = integer(p.index, 'proof.index', 0);
  const treeSize = integer(p.tree_size, 'proof.tree_size', 1);
  if (index >= treeSize) fail('proof.index must be less than tree_size');
  if (!Array.isArray(p.proof) || p.proof.length > 53 ||
      !p.proof.every(hash => typeof hash === 'string' && /^[0-9a-f]{64}$/i.test(hash))) {
    fail('proof.proof must be at most 53 hexadecimal sibling hashes');
  }
  return {
    event_id: string(p.event_id, 'proof.event_id', 128), index, tree_size: treeSize,
    event_hash: eventHash, merkle_root: root, proof: p.proof as string[]
  };
}

function parsedEvidence(sdk: SDK, item: DemoCase): { events: Obj[]; anchor: Obj } {
  const events = sdk.parseJsonLines(item.events_jsonl);
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    fail(`${item.id} must contain 1..${MAX_EVENTS} events`);
  }
  const ids = new Set<string>();
  const objects = events.map(value => {
    const event = asObject(value, `${item.id} event`);
    const header = asObject(event.Header, `${item.id} Header`);
    asObject(event.Payload, `${item.id} Payload`);
    asObject(event.Security, `${item.id} Security`);
    const id = string(header.EventID, `${item.id} EventID`, 128);
    if (ids.has(id)) fail(`${item.id} has duplicate EventIDs`);
    ids.add(id);
    return event;
  });
  return { events: objects, anchor: asObject(sdk.parseJson(item.anchor_record_json), `${item.id} anchor record`) };
}

export class EvidenceDemo {
  constructor(
    private readonly sdk: SDK,
    private readonly cases: DemoCase[],
    private readonly trust: Map<string, Trust>,
    private readonly trustNotice: string,
    private readonly disclosure: string[]
  ) {}

  list() {
    return {
      format: FORMAT,
      sdk_version: this.sdk.VERSION,
      spec_version: this.sdk.VCP_SPEC_VERSION,
      disclosure: [...this.disclosure],
      cases: this.cases.map(({ id, title, description }) => ({ id, title, description }))
    };
  }

  verify(id: string) {
    const item = this.cases.find(entry => entry.id === id);
    if (!item) return null;
    const configured = this.trust.get(id)!;
    // Recompute every request from the original strings; the bundle contains no reports.
    const { events, anchor } = parsedEvidence(this.sdk, item);
    const checks: DemoCheck[] = [];
    const notes: string[] = [];
    const append = (group: DemoCheck['group'], report: SDKReport, subject?: string): void => {
      checks.push(...report.checks.map(check => ({
        ...check, ...(subject ? { subject } : {}), group,
        scope: check.name === 'external_anchor' || check.name === 'root_authenticity'
          ? 'external' as const : 'local' as const
      })));
      notes.push(...report.notes);
    };
    append('batch', this.sdk.verifyBatch(events, anchor, {
      publicKey: configured.actor_public_keys,
      anchorPublicKey: configured.anchor_public_key,
      requireSignAlgo: 'ED25519'
    }));
    append('chain', this.sdk.verifyChain(events));

    for (const event of events) {
      const header = event.Header as Obj;
      const security = event.Security as Obj;
      const eventId = header.EventID as string;
      const proof = item.inclusion_proofs.find(entry => entry.event_id === eventId);
      if (!proof) {
        checks.push({ group: 'inclusion', scope: 'local', name: 'inclusion',
          subject: eventId, status: 'INDETERMINATE', reason: 'MISSING_INCLUSION_PROOF' });
        continue;
      }
      const sameHash = (left: unknown, right: unknown): boolean => {
        try { return this.sdk.parseHash(left) === this.sdk.parseHash(right); }
        catch { return false; }
      };
      const actualIndex = events.indexOf(event);
      const sameInteger = (value: unknown, expected: number): boolean =>
        (typeof value === 'bigint' || (typeof value === 'number' && Number.isSafeInteger(value))) &&
        BigInt(value) === BigInt(expected);
      const binding = proof.index === actualIndex && proof.tree_size === events.length &&
        sameInteger(anchor.EventCount, proof.tree_size) &&
        sameInteger(security.MerkleIndex, proof.index) &&
        sameHash(proof.event_hash, security.EventHash) &&
        sameHash(proof.merkle_root, security.MerkleRoot) &&
        sameHash(proof.merkle_root, anchor.MerkleRoot);
      checks.push({ group: 'inclusion', scope: 'local', name: 'proof_binding', subject: eventId,
        status: binding ? 'VALID' : 'INVALID',
        ...(binding ? {} : { reason: 'PROOF_BINDING_MISMATCH',
          detail: 'Proof event hash, index, size or root differs from the supplied event/batch record.' }) });
      try {
        // A proof over a stale claimed hash must not appear valid after a payload edit.
        const hash = this.sdk.computeEventHash(header, event.Payload as Obj, {
          prevHash: security.PrevHash as string | null | undefined,
          algo: security.HashAlgo as string | undefined
        });
        append('inclusion', this.sdk.verifyInclusionProof(
          hash, proof.index, proof.tree_size, proof.proof, proof.merkle_root, false
        ), eventId);
      } catch {
        checks.push({ group: 'inclusion', scope: 'local', name: 'inclusion', subject: eventId,
          status: 'INDETERMINATE', reason: 'HASH_NOT_RECOMPUTED',
          detail: 'The event hash could not be recomputed; no inclusion success is asserted.' });
      }
    }
    for (const proof of item.inclusion_proofs) {
      if (!events.some(event => (event.Header as Obj).EventID === proof.event_id)) {
        checks.push({ group: 'inclusion', scope: 'local', name: 'proof_binding',
          subject: proof.event_id, status: 'INVALID', reason: 'EVENT_NOT_IN_BATCH' });
      }
    }
    return {
      format: 'vcp-evidence-demo-verification/1',
      case_id: item.id, case_title: item.title, description: item.description,
      sdk: { version: this.sdk.VERSION, spec_version: this.sdk.VCP_SPEC_VERSION,
        spec_commit: this.sdk.VCP_SPEC_COMMIT },
      scope: 'Offline first-party demonstration of supplied event hashes, Ed25519 signatures, batch consistency, chain continuity and Merkle inclusion. No external anchor or production capture is verified; this is not a conformance assessment.',
      local_status: this.sdk.combine(checks.filter(check => check.scope === 'local').map(check => check.status)),
      overall_status: this.sdk.combine(checks.map(check => check.status)),
      checks,
      notes: [...new Set(notes)],
      evidence: { events_jsonl: item.events_jsonl, anchor_record_json: item.anchor_record_json,
        inclusion_proofs: item.inclusion_proofs.map(proof => ({ ...proof, proof: [...proof.proof] })) },
      trust: {
        notice: this.trustNotice,
        key_configured: configured.anchor_public_key !== null && events.every(event => {
          const actor = (event.Header as Obj).ActorID;
          return typeof actor === 'string' && Object.hasOwn(configured.actor_public_keys, actor);
        })
      }
    };
  }
}

/**
 * Build an isolated verifier from raw, operator-selected evidence and trust.
 * No filesystem, module loader, network, Node globals or host configuration.
 */
export function createEvidenceDemo(sdkModule: unknown, bundleJson: string, trustJson: string): EvidenceDemo {
  const withinBytes = (text: unknown, maximum: number, name: string): void => {
    if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > maximum) {
      fail(`${name} must be UTF-8 JSON text within ${maximum} bytes`);
    }
  };
  withinBytes(bundleJson, MAX_BUNDLE_BYTES, 'BUNDLE');
  withinBytes(trustJson, MAX_TRUST_BYTES, 'TRUST');
  const sdkExports = asObject(sdkModule, 'SDK module');
  for (const name of MODULE_FUNCTIONS) {
    if (typeof sdkExports[name] !== 'function') fail(`SDK module is missing ${name}`);
  }
  for (const name of ['VERSION', 'VCP_SPEC_VERSION', 'VCP_SPEC_COMMIT']) string(sdkExports[name], `SDK ${name}`);
  // This adapter's check names and local/external split target one SDK contract.
  // These declarations constrain compatibility; they do not authenticate code.
  if (sdkExports.VERSION !== SUPPORTED_SDK_VERSION || sdkExports.VCP_SPEC_VERSION !== SUPPORTED_SPEC_VERSION ||
      sdkExports.VCP_SPEC_COMMIT !== SUPPORTED_SPEC_COMMIT) {
    fail('unsupported SDK or specification revision; review the adapter before upgrading');
  }
  const sdk = sdkModule as SDK;
  const bundle = asObject(sdk.parseJson(bundleJson), 'bundle');
  keys(bundle, ['format', 'sdk_version', 'spec_version', 'disclosure', 'cases'], 'bundle');
  if (bundle.format !== FORMAT || bundle.sdk_version !== sdk.VERSION || bundle.spec_version !== sdk.VCP_SPEC_VERSION) {
    fail('bundle format or SDK/spec version does not match the loaded SDK');
  }
  if (!Array.isArray(bundle.disclosure) || bundle.disclosure.length > 32) fail('disclosure must be a bounded array');
  const disclosure = bundle.disclosure.map(value => string(value, 'disclosure'));
  if (!Array.isArray(bundle.cases) || bundle.cases.length === 0 || bundle.cases.length > 32) {
    fail('cases must contain 1..32 entries');
  }
  const ids = new Set<string>();
  const cases: DemoCase[] = bundle.cases.map(value => {
    const entry = asObject(value, 'case');
    keys(entry, ['id', 'title', 'description', 'events_jsonl', 'anchor_record_json', 'inclusion_proofs'], 'case');
    const id = string(entry.id, 'case.id', 64);
    if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id)) fail('case ids must be unique lowercase identifiers');
    ids.add(id);
    if (!Array.isArray(entry.inclusion_proofs) || entry.inclusion_proofs.length > MAX_EVENTS) {
      fail('inclusion_proofs must be a bounded array');
    }
    const proofs = entry.inclusion_proofs.map(parseProof);
    if (new Set(proofs.map(proof => proof.event_id)).size !== proofs.length) fail('duplicate proof event_ids');
    const item = { id, title: string(entry.title, 'case.title', 256),
      description: string(entry.description, 'case.description'),
      events_jsonl: string(entry.events_jsonl, 'case.events_jsonl', 512 * 1024),
      anchor_record_json: string(entry.anchor_record_json, 'case.anchor_record_json', 64 * 1024),
      inclusion_proofs: proofs };
    parsedEvidence(sdk, item);
    return item;
  });

  const rawTrust = asObject(sdk.parseJson(trustJson), 'trust');
  keys(rawTrust, ['format', 'notice', 'cases'], 'trust');
  if (rawTrust.format !== 'vcp-evidence-demo-trust/1') fail('unsupported trust format');
  const notice = string(rawTrust.notice, 'trust.notice');
  const trustCases = asObject(rawTrust.cases, 'trust.cases');
  keys(trustCases, [...ids], 'trust.cases');
  const trust = new Map<string, Trust>();
  const publicKey = (value: unknown): string => {
    const key = string(value, 'public key', 64);
    if (!/^[0-9a-f]{64}$/i.test(key) || sdk.publicKeyProblem(sdk.fromHex(key)) !== null) {
      fail('public keys must be valid 32-byte Ed25519 keys');
    }
    return key;
  };
  for (const id of ids) {
    const config = asObject(trustCases[id], `trust.${id}`);
    keys(config, ['actor_public_keys', 'anchor_public_key'], `trust.${id}`);
    const actorKeys = asObject(config.actor_public_keys, 'actor_public_keys');
    if (Object.keys(actorKeys).length > MAX_EVENTS) fail('too many actor keys');
    const actors: Record<string, string> = Object.create(null);
    for (const [actor, key] of Object.entries(actorKeys)) {
      string(actor, 'ActorID', 256);
      actors[actor] = publicKey(key);
    }
    trust.set(id, { actor_public_keys: actors,
      anchor_public_key: config.anchor_public_key === null ? null : publicKey(config.anchor_public_key) });
  }
  return new EvidenceDemo(sdk, cases, trust, notice, disclosure);
}
