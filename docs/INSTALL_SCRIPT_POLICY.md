# Installation scripts and development-mode checks

## Project policy

The checked-in `.npmrc` sets `ignore-scripts=true`. Automatic npm lifecycle
hooks are disabled for **all** packages in a repository installation, including
esbuild's postinstall hook. This is an explicit deny-by-default choice, not
an `allowScripts` approval or a hidden warning filter. `engine-strict=true`
remains in place; package versions, the lockfile and application source are
unchanged by this policy.

Explicit commands such as `npm run dev`, `npm run build`, `npm test` and
`npm start` still execute their named scripts. Their implicit `pre*` and
`post*` scripts are suppressed. A future workflow requiring an install hook
or an implicit pre/post script must receive a separate review. Do not add a
blanket script approval or disable this policy just to make installation quiet.

This policy is for npm operating in this checkout. It is not automatically
inherited by consumers who install this project as a dependency, other package
managers, or commands overriding npm configuration. It is not a sandbox:
explicit commands and imported dependencies can still execute code.

## Why esbuild can work without postinstall

esbuild's upstream installation documentation explains that npm normally
installs the matching platform-specific executable through an optional
dependency. The postinstall script checks the executable version and can
replace its JavaScript command shim with a native-executable optimization.
Without that hook, the optional binary and JavaScript shim can still be used.
This project's regression checks both the CLI version and the synchronous and
asynchronous transformation APIs instead of merely assuming they work.

Keep optional dependencies installed. In particular, combining this policy
with `--omit=optional` or copying `node_modules` from another OS/architecture
is not supported. Reinstall on the target platform using the committed lock.

## Acceptance checks

The permanent `test/dev-install-policy.test.cjs` runs through `npm test` and:

1. Checks the active npm policy and inventories installed lock entries with
   install hooks. The current reviewed hook-bearing package is esbuild. A new
   installed hook package makes this check fail for review, even though its
   hook would remain blocked by `.npmrc`.
2. Runs an offline, dependency-free marker fixture. Automatic postinstall and
   an implicit pre-script must not execute; an explicit `npm run` command must
   execute. A negative control enables hooks **only inside that disposable
   fixture** and must create the marker. No external dependency is approved.
3. Confirms the unoptimized esbuild JavaScript shim, CLI version, sync/async
   TypeScript transformation and the resulting test-owned constant.
4. Copies the application source into a temporary directory, starts the
   **actual `npm run dev` command**, checks `/health`, changes one field in
   the temporary copy, and requires the changed response after watcher
   restart. It then restores the temporary source and requires the original
   response again. The original repository source is never modified, and
   the test must terminate/reap its process tree.

CI stores the bounded observations and development-process log in a separate
`install-dev-evidence` artifact. Missing evidence is not a passing test. The
existing HTTP and lint-policy checks remain enabled. Local runs can set
`DEV_INSTALL_EVIDENCE` to a directory to retain the same JSON files.

The acceptance environment is the repository's Linux GitHub-hosted runner,
with Node from `.nvmrc` and its recorded npm version. This does not establish
Windows/macOS, every CPU architecture, production deployment, or all developer
workflows. Evidence must identify the platform actually run. Future package
upgrades must preserve these tests or separately justify a policy change.

## References and limits

- npm `ignore-scripts`: https://docs.npmjs.com/cli/v11/using-npm/config/#ignore-scripts
- esbuild installation flags: https://esbuild.github.io/getting-started/#additional-npm-flags
- Follow-up tracker: https://github.com/veritaschain/vcp-explorer-api/issues/13

This is first-party installation/development testing, not a security guarantee,
independent reproduction, VCP/VAP conformance assessment or VC-Certified result.
No production service, formal specification, signed evidence or public GUI is
changed by these installation-policy checks.
