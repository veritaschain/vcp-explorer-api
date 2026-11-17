# Development dependency review — 2026-11-18 JST

This review starts from `e9c59d7ce842ceff83b97731ecb58316808bc3ab` and removes the reported minimatch advisory through supported ESLint and typescript-eslint releases. Observations were made on 2026-11-17 UTC (2026-11-18 JST) with Node `v24.22.1` and npm `11.9.0`. Audit results are dated registry observations, not a continuing guarantee.

## Change

| Package | Before | After |
| --- | --- | --- |
| `eslint` | 10.13.0 | 10.15.0 |
| `@typescript-eslint/eslint-plugin` | 8.72.0 | 8.73.0 |
| `@typescript-eslint/parser` | 8.72.0 | 8.73.0 |
| `@eslint/config-array` | 0.23.5 | 0.23.6 |
| `minimatch` | 10.2.6 | 11.0.9 |

The direct development dependencies remain exact pins. The lock changes 15 parsed entries, including the root entry; 14 package entries change or are added. Supporting typescript-eslint packages move together to 8.73.0, and minimatch introduces `@isaacs/nonrecursive-glob-match@1.1.0`. Runtime dependency entries are unchanged.

`package-entry-diff.json` records every changed entry. The initial targeted npm update also refreshed compatible, unrelated versions and hoisted `balanced-match`; those changes were restored before installation and validation. `lock-scope-adjustment.json` records the intermediate and final hashes. The final lock SHA-256 is `b7fd12ebed3569be041a320fc721233b54fe3fab8ff1c377e2e9ba94acc92305`.

No overrides, audit suppressions, dependency downgrades, application source changes, or lint-policy/baseline changes are included.

## Audit result and remaining advisory

| Audit scope | Baseline | Candidate |
| --- | --- | --- |
| All dependencies | 12 package entries: 7 moderate, 5 high | 9 package entries: all high |
| Unique advisory URLs | 2 | 1 |
| `--omit=dev` | 0 | 0 |

The candidate removes [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). ESLint's [10.15.0 release notes](https://github.com/eslint/eslint/releases/tag/v10.15.0) describe the minimatch update, and the [typescript-eslint 8.73.0 release](https://github.com/typescript-eslint/typescript-eslint/releases/tag/v8.73.0) provides the matching supported parser/plugin family. Exact selected versions, dependency/peer/engine declarations, tarball URLs, and integrity values for all 14 changed or new packages match npm registry metadata; the recorded registry checks do not constitute package signature verification.

The remaining advisory is [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), concerning repeated extglob patterns in picomatch. The advisory was published on October 19 and reviewed/updated on November 17, 2026. At this observation it lists affected versions `<=4.0.7` and no patched version. The final lock still contains `picomatch@4.0.7` through development tooling. All nine reported entries resolve to this one advisory. Four existing typescript-eslint parent entries are reported as high in the candidate where the baseline audit reported moderate; the vulnerable picomatch path was already present in the baseline. Package-entry counts must not be described as counts of distinct vulnerabilities.

The audit's suggested older stylistic/parser versions are not applied: the supported lint policy and its frozen behavior remain intact. This advisory remains open for a compatible upstream fix. The full audit exits 1; the production-only audit exits 0.

`residual-input-review.json` records a bounded input-path review against the installed final lock. The effective configuration for `src/index.ts` does not enable `@stylistic/jsx-pascal-case` or configure parser `project`/`projectService`. Those are the reviewed routes by which the relevant plugins pass configured glob patterns to picomatch/tinyglobby. This review did not establish a runtime request-input path; it does not prove the advisory unexploitable. Changes to lint configuration or untrusted build inputs require reassessment.

## Validation

| Check on the final candidate | Result |
| --- | --- |
| Clean `npm ci` with the repository install policy | Pass |
| `npm run lint` | Pass |
| `npm run type-check` | Pass |
| `npm run build` | Pass |
| `npm test` | 198 passed, 1 failed, 0 skipped; environment limitation below |
| `npm run test:evidence` with pinned SDK | 22 passed, 0 failed |
| Selected dependency, peer, and Node-engine ranges | 98 checks satisfied |
| Exact registry metadata comparisons | All 14 changed/new packages match |
| Baseline/candidate emitted `dist` paths and SHA-256 values | All 60 files identical |

The single local test failure is `npm run dev starts and reloads a disposable source copy with hooks disabled`: the sandbox denies tsx's Unix-domain IPC listener with `listen EPERM` at `/tmp/tsx-1000/293.pipe`. This test is retained unchanged. The local suite is **not** reported as fully passing; the existing hosted CI gate must pass before merging.

The evidence integration uses SDK commit `eb8df265a09f2415154de2ae2a617bb502c558d2`, matching the pinned integration workflow. All 22 tests pass, including the portable read-only HTTP adapter, exact-origin CORS/preflight, generic errors, fixed fixtures, and verification results. The candidate's application build output is byte-identical to the baseline, not merely equivalent by test results.

## Evidence and reproduction

`commands-*.json` records command arguments, UTC start/end times, exits, package/lock input hashes, and whether those inputs changed. Matching stdout/stderr files preserve the observed output, including the failed local test. They intentionally retain npm's final blank lines and the test runner's space-only diagnostic lines; a whole-change `git diff --check` therefore reports those raw-log whitespace warnings. The package/lock/configuration changes have no whitespace errors. The targeted-update command's output describes the intermediate lock; all candidate installation, audit, build, and test records use the final hash above.

To reproduce the principal checks using the repository's pinned Node version:

```sh
npm ci --no-audit --no-fund
npm run lint
npm run type-check
npm run build
npm test
npm audit --package-lock-only --ignore-scripts --json
npm audit --package-lock-only --ignore-scripts --omit=dev --json
```

For evidence integration, build the TypeScript package from the pinned SDK commit, then set `VCP_EVIDENCE_SDK_MODULE`, `VCP_EVIDENCE_BUNDLE`, and `VCP_EVIDENCE_TRUST` to its `typescript/dist/index.js`, `examples/explorer-demo/bundle.json`, and `examples/explorer-demo/trust.json` before running `npm run test:evidence`. The recorded command includes the exact local input paths used in this review.

`baseline-dist.json` and `candidate-dist.json` record the complete emitted file inventories. `summary.json` provides machine-readable outcomes; `evidence-sha256.json` hashes each evidence file other than the inventory itself. Registry/audit responses can change after this observation, so future results need their own timestamps.
