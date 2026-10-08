# 0009 Use pnpm

Status: accepted

## Context

Weft is a TypeScript monorepo with five workspace packages (`core`, `ui`, `cli`, `mcp`, `vscode`). The package
manager affects install speed, dependency correctness, cross-package build orchestration, and the npm publish story.

This is a development toolchain decision, independent of the consumer-facing runtime choice
([0001](0001-implementation-language.md)). End users install through `npm` or `npx` regardless.

## Options

### npm workspaces

Native workspaces since v7. Flat `node_modules` and no topological script ordering, so it would need Turborepo or nx
on top for build orchestration. The weakest monorepo implementation.

### pnpm

A content-addressable store with symlinked `node_modules`. Strict dependency isolation: packages can import only their
declared dependencies. `pnpm -r run build` runs topologically by default, and the `workspace:*` protocol is replaced
with real versions on `pnpm publish`.

### Yarn Berry (v4)

Strong workspace support. PnP mode eliminates `node_modules` entirely, but breaks tools that assume it exists (some VS
Code extensions, Jest configs). Falling back to `nodeLinker: node-modules` negates PnP's advantages and leaves a tool
roughly equivalent to pnpm with more configuration surface.

### Bun

The fastest installs (two to five times pnpm), with workspaces and the `workspace:*` protocol. However, it has no
strict `node_modules` (flat hoisting like npm), the `bun.lock` format is still evolving, and `bun publish` with
workspace replacement is less battle-tested. Scripts run under the Bun runtime, so development behaviour diverges from
the Node runtime most consumers will use.

## Decision

**pnpm.**

- **Dev/prod parity.** Most consumers run Weft on Node ([0001](0001-implementation-language.md)). Developing on Node
  through pnpm surfaces Node-specific issues during development, not after publishing. The optional Bun binary is a
  runtime swap: what works on Node almost certainly works on Bun, and the reverse is less reliable.
- **Strict `node_modules`.** Packages can import only their declared dependencies. With several packages sharing
  dependencies and cross-importing `@lepid-labs/weft-core`, phantom dependency bugs are a when, not an if; pnpm catches
  them at development time, while npm and Bun silently hoist.
- **Topological build orchestration.** `pnpm -r run build` builds `core` before its consumers, and `--filter` targets
  specific packages and their dependency chains. No Turborepo or nx needed.
- **A proven publish story.** `workspace:*` references are replaced with real versions on `pnpm publish`. Several
  scoped packages publish to npm, and that has to be rock solid.
- **Minimal contributor friction.** `corepack enable && pnpm install`; corepack ships with Node 16 and later.

## Consequences

Contributors need pnpm through corepack. The Release workflow publishes every public package with `pnpm -r publish`,
and pnpm skips versions already on npm ([0022](0022-npm-scope-and-lockstep-releases.md)).
