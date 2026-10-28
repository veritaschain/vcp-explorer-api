# SDK → API → GUI evidence demonstration

This optional path uses the actual VCP SDK to verify a fixed synthetic batch.
It connects generated signed events to a live HTTP response and the Explorer's
dedicated evidence view. It does not turn the older `/v1/events` fixtures into
real evidence, and it does not require a package-registry SDK release.

## What the three cases mean

| Case | Local checks | Overall result | Reason |
| --- | --- | --- | --- |
| `intact` | `VALID` | `INDETERMINATE` | Hashes, configured-key signatures, batch/chain relationships and inclusion pass; external anchor evidence is absent |
| `tampered` | `INVALID` | `INVALID` | One signed order payload is changed without re-signing; recomputed hash, signature and inclusion fail |
| `missing-key` | `INDETERMINATE` | `INDETERMINATE` | The same intact bytes are supplied without a configured actor/root verification key |

The key is **PUBLIC RFC 8032 TEST 1 material**. Anyone can sign with it. Its use
demonstrates verification against explicit caller policy and establishes no
real-world identity. Evidence and trust are separate files; no key in the
evidence bundle is automatically trusted. The API does not accept arbitrary
uploaded evidence, keys or caller-provided success results through these routes.

## Local setup

Use Node.js 24.22.1 or a later 24.x patch and npm 11+. The reviewed SDK revision
is [`eb8df265a09f2415154de2ae2a617bb502c558d2`](https://github.com/veritaschain/vcp-sdk/commit/eb8df265a09f2415154de2ae2a617bb502c558d2).
Prepare a checkout at that commit,
install its TypeScript dependencies with `npm ci` in `typescript/`, and run
`npm run build` there. Its [`examples/explorer-demo`](https://github.com/veritaschain/vcp-sdk/tree/eb8df265a09f2415154de2ae2a617bb502c558d2/examples/explorer-demo)
directory contains `bundle.json` and `trust.json`; the generator is
`tools/generate_explorer_demo.py`. The SDK is
loaded from the absolute local `typescript/dist/index.js` path; ordinary API
`npm ci` does not install or fetch an SDK. Review the pinned SDK source before
loading it, as the module executes with the server process's privileges.

In this API checkout:

```bash
npm ci
npm run build

export VCP_EVIDENCE_SDK_MODULE=/absolute/path/vcp-sdk/typescript/dist/index.js
export VCP_EVIDENCE_BUNDLE=/absolute/path/vcp-sdk/examples/explorer-demo/bundle.json
export VCP_EVIDENCE_TRUST=/absolute/path/vcp-sdk/examples/explorer-demo/trust.json
export VCP_EVIDENCE_ORIGIN=http://localhost:5173

npm run test:evidence
HOST=127.0.0.1 PORT=3001 npm start
```

The Explorer GUI's evidence view uses an explicitly configured API base ending
in `/v1`, for example `http://127.0.0.1:3001/v1`. See the
[GUI repository](https://github.com/veritaschain/vcp-explorer-gui) for its local
launcher and browser checks. The optional `VCP_EVIDENCE_ORIGIN` adds one exact
HTTP(S) origin to the existing CORS allowlist. It accepts neither a wildcard nor
a URL with credentials, path, query or fragment. It requires the three evidence
settings. The server otherwise keeps the existing origin allowlist. `HOST` is
optional; set it to `127.0.0.1` for a local demonstration.

All three paths must be configured together and refer to regular local files.
Malformed/partial settings, unsupported formats, duplicate JSON keys, malformed
proof fields, invalid keys or inconsistent SDK/spec version declarations fail
startup. They do not cause fallback to mock data. No evidence settings means
that these routes are absent and return the normal `404` response.

The adapter supports SDK `0.1.0`, VCP specification `1.2.0` at
`b23acb266f88df81d960d36d58fb64ceaa0dd5ed`. Those declarations constrain adapter
compatibility; they do not authenticate the SDK module or prove a source commit.
Upgrading the adapter requires reviewing check names and the scope split.

The Node adapter reads files at startup. Restart after changing evidence or trust. The bundle
is limited to 2 MiB, 32 cases and 100 events/proofs per case; trust is limited to
64 KiB. Proof indices/tree sizes must be safe integers and sibling paths have at
most 53 hashes. The existing API rate limit applies. No external network access
or persistence is performed by this demonstration.

## Portable core and Fetch-API transport

`src/evidence/core.ts` exports
`createEvidenceDemo(sdkModule, bundleJson, trustJson)`. It accepts the actual SDK
module plus the original bundle and separate trust JSON strings, applies the
same validation and limits as the Node adapter, and returns `list()` and
`verify(caseId)`. The core uses no filesystem, module loader, network or Node
globals. It preserves the exact signed inner JSON strings and copies returned
proof/disclosure arrays so response mutation cannot change later verification.

`src/evidence/http.ts` exports
`createEvidenceHttpHandler(demo, { allowedOrigins, provenance? })`, returning a
standard `(request: Request) => Response` function. A host can statically bundle
the reviewed SDK and public fixture text, then import these same two modules.
The HTTP adapter serves the two evidence endpoints below and `GET /health`;
optional plain scalar provenance metadata appears only in the health response.
It does not change the evidence/report envelopes or the existing Express routes.

All responses use `Cache-Control: no-store` and `Vary: Origin`. Requests without
an Origin header and same-origin requests are accepted. Cross-origin access
requires an explicitly listed `https://veritaschain.org` and/or
`https://www.veritaschain.org`; wildcards and unrelated origins are rejected,
and `Access-Control-Allow-Credentials` is never emitted. Known routes accept GET/OPTIONS only. Preflight allows
GET/OPTIONS and an optional Accept header, without invoking verification.
Unknown/malformed routes and unknown GET case IDs return `404`, unsupported
methods `405`, disallowed origins/headers `403`, and
verification exceptions a generic `503` without any previous result or internal
diagnostics. Request bodies are never read or treated as evidence uploads.

The portable transport introduces no storage or distributed rate limiter.
Actual host-runtime and public-endpoint validation remain separate from these
source-level and local Fetch-API tests. SDK/spec compatibility declarations do
not authenticate deployed source; publication should record the reviewed source
commits and bundled file hashes independently.

## HTTP contract

### `GET /v1/evidence-demo/cases`

Returns `format: "vcp-evidence-demo/1"`, `sdk_version`, `spec_version`,
`disclosure` (string array), and `cases` containing only `id`, `title` and
`description`. Metadata contains no verification verdict.

### `GET /v1/evidence-demo/cases/:id/verification`

Returns a newly computed report with:

- `format: "vcp-evidence-demo-verification/1"`, case identity/description and SDK
  version/specification metadata;
- `scope`, `local_status`, `overall_status`, `checks` and `notes`;
- `evidence.events_jsonl` and `evidence.anchor_record_json` as the exact original
  strings, retaining signed 19-digit nanosecond integers;
- `evidence.inclusion_proofs`, each with `event_id`, `index`, `tree_size`,
  `event_hash`, `merkle_root` and `proof` (sibling hash array);
- `trust.notice` and `trust.key_configured`. Public key configuration is not
  copied into the response or inferred from the bundle.

Each check has SDK fields `name`, `status`, optional string `reason`, `detail`,
and `subject`, plus `group` (`batch`, `chain`, `inclusion`) and `scope` (`local`,
`external`). Unknown cases and routes return `404`; errors never substitute the
intact case. Successful responses set `Cache-Control: no-store`.

The API strictly parses the original raw evidence with the SDK. Browser clients
should retain those raw strings when displaying/downloading signed material;
ordinary `JSON.parse` on the nested event text can round nanosecond integers.
Counts and proof indices in the HTTP envelope are safe JSON numbers.

## Verification boundaries

`verifyBatch` checks the event hashes/signatures and supplied batch record;
`verifyChain` checks continuity. For every event, detached proof metadata is
checked against the actual event ID, array index, batch size, event hash,
event Merkle fields and AnchorRecord. The inclusion leaf is **recomputed from
the actual Header/Payload/PrevHash**, not copied from the claimed EventHash.
A stale proof cannot appear to validate a modified payload.

Only the SDK checks named `external_anchor` and `root_authenticity` are excluded
from `local_status`; they remain visible and count toward `overall_status`.
No external-verifier callback and no `rootAuthenticated=true` shortcut are used.
Every other check, including an unfamiliar future check, contributes locally.
Missing inclusion evidence is `INDETERMINATE` rather than silently omitted.

The signed root does not establish real-world event capture, trusted identity,
external time, full VCP/VAP conformance or certification. SDK notes are preserved,
including that AnchorRecord metadata is checked for consistency with submitted
events while its signature covers the root only. The report describes these
specific offline checks and their unresolved evidence requirements.

## Verification commands

```bash
npm run lint
npm run type-check
npm run build
npm test
npm run test:evidence
```

`npm test` covers the ordinary API and configuration guardrails without an SDK.
`test:evidence` requires the three explicit settings and uses the real SDK and
generated bundle over a local HTTP server. It checks all three outcomes, raw
byte preservation, proof binding, missing proof evidence, malformed JSON/proofs/
trust, unsupported adapter contracts, unknown routes and configured CORS.
It fails if the SDK settings are absent; it does not silently skip integration.
