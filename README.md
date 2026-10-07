# VCP Explorer API

[![Package version](https://img.shields.io/badge/API_package-1.1.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

Express / TypeScript HTTP API for exploring sample VeritasChain Protocol (VCP)
events. This repository contains the API server, in-memory fixtures, API
documentation, and client integration types.

**Implementation status:** the server currently returns mock data. Event hashes,
signatures, Merkle paths, anchors, certification statuses, and system statistics
are demonstration values, not verified evidence or a live certification registry.
The server retrieves proof fixtures and assembles JSON certificates; it does not
perform cryptographic verification, contact an external anchor, or persist events.

## Quick Start

Requires Node.js 18+ and npm 9+ as declared in [package.json](package.json).
Use a maintained Node.js release satisfying those minimums.

```bash
git clone https://github.com/veritaschain/vcp-explorer-api.git
cd vcp-explorer-api
npm install
npm run dev
```

The development command runs `tsx watch src/index.ts`. The API listens on port
`3001` by default, with versioned routes under `http://localhost:3001/v1`.

In a second terminal:

```bash
curl --fail http://localhost:3001/health
curl --fail "http://localhost:3001/v1/events?symbol=XAUUSD&limit=5"
curl --fail http://localhost:3001/v1/events/01934e3a-7b2c-7f93-8f2a-1234567890ab
curl --fail http://localhost:3001/v1/events/01934e3a-7b2c-7f93-8f2a-1234567890ab/proof
curl --fail http://localhost:3001/v1/events/01934e3a-7b2c-7f93-8f2a-1234567890ab/certificate
```

These requests demonstrate the JSON interface using bundled fixtures. There is
no GUI, browser-launch step, React application, or Vite build in this repository.

### Compile and run

```bash
npm run type-check
npm run build
npm start
```

`build` invokes TypeScript with [tsconfig.json](tsconfig.json), compiling `src/`
into `dist/` (JavaScript, declarations, and source maps). `start` runs
`node dist/index.js`; `dist/` is server output, not a static website.
**Known build limitation (checked 2026-10-08):** the current source fails
both type-checking and compilation with existing TypeScript diagnostics, including
legacy fixture fields, unused declarations, route return paths, and the
\`req.rateLimit\` type. Development execution does not type-check the source.
Resolve those errors before treating the compiled output as deployable.
The existing CI masks lint/build failures with `|| true`, so a green workflow
alone does not establish a clean build.

## Configuration

| Setting | Current behavior |
|---------|------------------|
| `PORT` | Read from the process environment; defaults to `3001` |
| Environment files | No `dotenv` loader; `.env` / `.env.local` are not loaded automatically |
| CORS | Allowlist in [src/index.ts](src/index.ts): `https://veritaschain.org`, `https://explorer.veritaschain.org`, `http://localhost:3000`, `http://localhost:5173`; requests without an Origin header are also allowed |
| Rate limit | 60 requests per minute per IP on `/v1/`; standard rate-limit headers enabled, legacy `X-RateLimit-*` headers disabled |
| Authentication | No authentication middleware is implemented |
| Storage | In-memory mock data in `src/data/`; no database configuration |

For example, in a POSIX shell:

```bash
PORT=3002 npm run dev
```

Helmet provides response security headers and Morgan logs requests. CORS and rate
limiting are configured in code, not through `VITE_*` environment variables.

## API

All routes below are implemented as `GET` endpoints. Paths include the `/v1`
prefix where applicable.

| Endpoint | Response / behavior |
|----------|---------------------|
| `/` | Service metadata and a partial endpoint listing |
| `/health` | Health status, timestamp, and service metadata |
| `/v1/system/status` | Mock event totals, node count, tier, and last-anchor metadata |
| `/v1/events` | Filtered event summaries as `{ events, query, total }` |
| `/v1/events/recent` | Recent sample summaries as `{ events }`; default limit 10, capped at 100 |
| `/v1/events/:id` | Event detail with `header`, `payload`, and `security` |
| `/v1/events/:id/proof` | Stored Merkle-proof fixture and anchor metadata |
| `/v1/events/:id/certificate` | JSON assembled from event details and a proof fixture |
| `/v1/certified/entities` | Mock organization entries as `{ entities }` |

Event detail payloads contain `trade_data` and optional `vcp_risk` /
`vcp_gov` modules. Integer timestamps and financial quantities are represented
as strings in the fixtures. The detail, proof, and certificate routes validate
UUID v7 syntax and return `400` for invalid IDs or `404` for missing data.
Only the sample event ending in `7890ab` has a bundled proof and certificate.

### Search behavior

Implemented filters are `trace_id`, `symbol`, `event_type`, `venue_id`,
`start_time`, and `end_time`. Time comparisons use JavaScript `Date`.
Pagination uses `offset` (default 0) and `limit` (default 50, capped at 500).
Use non-negative offsets and positive limits; comprehensive query validation is
not implemented.

The response `total` is the number of events in the returned page, not a count
before pagination. Search returns summaries; fetch `/v1/events/:id` for payloads.

### Differences from the integration documents

[API_REFERENCE.md](API_REFERENCE.md), [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md),
[openapi.yaml](openapi.yaml), and [types.ts](types.ts) describe the v1.1 API and
client integration examples. Some descriptions are ahead of the server:

- `algo_id` is parsed by the route but not applied by the data source.
  `event_type_code` is not parsed as a search filter.
- Missing proofs return `404`; the documented `422 proof_not_available`
  response and several documented query-validation errors are not implemented.
- `/` and `/health` currently hard-code `version: "1.0.0"`, whereas the
  package version is `1.1.0`.
- There is no `POST /verify`, `/chain/:trace_id`, PDF certificate export,
  WebSocket stream, or server-side cryptographic verifier.
- Proof and certificate responses do not establish RFC 6962 validation,
  regulatory compliance, or VCP certification. Integration snippets must be
  checked against the runtime response shapes and the canonical specification.

For actual behavior, consult [src/routes/](src/routes/) and
[src/data/](src/data/). Use the canonical specification when implementing
verification; the bundled examples are not a conformance test suite.

## Project Structure

| Path | Purpose |
|------|---------|
| `src/index.ts` | Express entry point, middleware, route mounting, health endpoint |
| `src/routes/system.ts` | System-status route |
| `src/routes/events.ts` | Search, recent events, details, proofs, and certificates |
| `src/routes/entities.ts` | Mock organization-list route |
| `src/data/` | Mock fixtures and data-source classes |
| `src/middleware/rateLimiter.ts` | Rate-limit definitions |
| `src/types/index.ts` | Types imported by the server |
| `types.ts` | Separate client integration types and helpers; outside the server build |
| `API_REFERENCE.md` | Detailed API descriptions and response examples |
| `DEVELOPER_GUIDE.md` | Client integration and SDK-generation examples |
| `openapi.yaml` | OpenAPI 3.1 integration description |
| `package.json` / `tsconfig.json` | Dependencies, scripts, and compiler settings |
| `.github/workflows/ci.yml` | Existing CI workflow |
| `dist/` | Generated server build output |

The runtime dependencies are Express, CORS, Helmet, Morgan, and
express-rate-limit. Development uses TypeScript and tsx.

## Development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Watch and run the TypeScript server |
| `npm run type-check` | TypeScript checking without emitting files |
| `npm run build` | Compile the server |
| `npm start` | Run compiled server output |
| `npm run lint` | Invoke ESLint; no ESLint configuration is currently checked in |
| `npm run format` | Format `src/**/*.ts` with Prettier |

There is no `test` script or checked-in automated test suite. To contribute,
create a branch, describe the change and its validation, and open a pull request.

## VCP Specification and Versioning

API package versions, URL versions, and protocol versions are separate:

| Item | Current reference |
|------|-------------------|
| This API package | `1.1.0` in `package.json` |
| HTTP route namespace | `/v1` |
| Bundled certificate metadata | `system.vcp_version: "1.0"` (mock data) |
| Canonical VCP specification | [veritaschain/vcp-spec](https://github.com/veritaschain/vcp-spec), authoritative files under [`spec/`](https://github.com/veritaschain/vcp-spec/tree/main/spec) |

**Canonical status checked on 2026-10-08 (JST):** the canonical README identifies
v1.2 as current and labels its specification text "Production Ready (GA)".
[The GA cutover PR #1](https://github.com/veritaschain/vcp-spec/pull/1) is merged,
but its required `v1.2.0` tag was not present when checked. This README therefore
does not assert that the tagged GA release process is complete.

See the [canonical v1.2 documents and status](https://github.com/veritaschain/vcp-spec/tree/main/spec/v1.2)
for updates. A specification status does not establish this API's conformance;
this repository has not demonstrated v1.2 conformance. Historical v1.0 fixture
values are not automatically upgraded by changing a documentation link.

## Documentation and Related Projects

- [API reference](API_REFERENCE.md)
- [Developer guide](DEVELOPER_GUIDE.md)
- [OpenAPI description](openapi.yaml)
- [Client integration types](types.ts)
- [VCP canonical specification and release status](https://github.com/veritaschain/vcp-spec)

## License

Repository license source of truth: [LICENSE](LICENSE), which identifies
Apache License 2.0. Package, OpenAPI, and documentation license metadata use
`Apache-2.0` to match it.

Copyright © 2025 VeritasChain Standards Organization (VSO).

The separately maintained VCP specification is licensed under CC BY 4.0 in its
own repository; that specification license is distinct from this API's license.

## Support

- [Issues](https://github.com/veritaschain/vcp-explorer-api/issues)
- Email: standards@veritaschain.org
- Website: https://veritaschain.org
