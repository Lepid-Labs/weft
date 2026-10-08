# 0022 Publish under @lepid-labs, in lockstep, through trusted publishing

Status: accepted

## Context

Weft publishes to npm, and the spelling that matters is the one a reader types:
`npx @lepid-labs/weft serve --gh org/repo --open`. The workspace and the published packages want different things from
the same manifests: in development, Vite's alias and svelte-check read core's TypeScript source with no rebuild in the
loop, while a published package must point at built output.

## Options

- **The `@weft` scope**: not ours.
- **`vite` as a CLI dependency**: a published install would pull the whole toolchain for a mode it cannot use.
- **Bumping versions by round-tripping each `package.json` through a JSON parser**: re-serializing re-wraps short
  arrays and fails `biome check` on the release commit.

## Decision

**Every package is published under `@lepid-labs`, at one shared version, by the Release workflow through trusted
publishing.**

- The packages are `@lepid-labs/weft` (the CLI), `@lepid-labs/weft-core`, `@lepid-labs/weft-ui`,
  `@lepid-labs/weft-react` and `@lepid-labs/weft-embed`, all at the same version.
- Core's `types`/`exports` point at `src/` for the workspace, and `publishConfig` swaps them to `dist/` at pack time:
  one `package.json`, two audiences. `pnpm pack` is the check that the published shape is right.
- `vite` is an optional peer of the CLI: only `--dev` imports it, and the import failure names the reason.
- Release is a `chore: release v<version>` pull request (`just release <version>`), then a tag on `main`'s squash
  commit of it (`just release-tag <version>`), then the Release workflow runs `pnpm -r publish` with provenance,
  authenticated by npm trusted publishing (OIDC) rather than a token secret. Each package's `prepublishOnly` builds
  it, and pnpm skips versions already on npm.
- The CLI reads its version from its own `package.json`, so one script (`scripts/set-version.mjs`) is the whole bump.
  It rewrites only the `"version"` line.
- The Node floor stays `>=24` deliberately: GitHub's own tooling now requires it.

## Consequences

- A package gains a trusted publisher only once it exists on npm, so a new package's first version goes out by hand
  with `just publish` ([publish a new package](../runbooks/publish-a-new-package.md)). Every later version goes through
  the workflow ([release a version](../runbooks/release-a-version.md)).
- Publishing the UI means publishing its build ([0005](0005-local-server-and-service.md)), and publishing the embed
  bundle brought it into the lockstep ([0023](0023-publish-the-embed-bundle.md)).
- How the workspace and published entry points differ is described in [architecture](../design/architecture.md).

## History

- Until 2026-09-04: the packages were named under the `@weft` scope.
