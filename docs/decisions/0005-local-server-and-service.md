# 0005 Serve the UI build from one service owned by the CLI

Status: accepted

## Context

Three consumers need the same core operations (search, traverse, read, write, analyze): the browser UI over an HTTP
API, the MCP server over stdio, and the CLI through direct calls. The server choice and the code-sharing architecture
are coupled decisions. `weft serve` also has to run from a published install (`npx`), not only from a checkout of this
repository.

## Options

### SvelteKit server routes (adapter-node)

Already in the stack for the UI ([0002](0002-ui-framework.md)). Server routes handle the API, and one process serves UI
and API on one port. Against it: the UI then constructs its own `WeftService`, so it needs the project config and
core's server-side runtime.

### Hono (separate API server) + Vite (UI dev server)

A lightweight standalone HTTP framework. API and UI are separate processes in development, combined in production by a
custom build step. Clean separation, but more glue.

### Fastify / Express

Heavier server frameworks, with no advantage over Hono for thin adapter routes.

### Vite's dev server over the UI source, with the API as middleware

The CLI owns the service and serves the API as a Vite plugin in front of the UI. Against it: no published package can
do this. It would ship svelte, kit, vite and the UI source, and compile them on every cold `npx`. SvelteKit's SSR fetch
also cannot reach Vite middleware, so server loads have to read the manifest file instead.

### The UI's adapter-node build behind a plain `node:http` server

The build `@lepid-labs/weft-ui` already produces (`build/handler.js`, a connect-style handler whose only runtime
externals are `unified` and `remark-parse`), mounted behind `node:http` with the `/api` router in front. The router
strips the mount point exactly as Vite's `use("/api", …)` did, so `handleApiRequest` is the one API in both modes.

## Decision

**Ports and adapters, with exactly one `WeftService` per `weft serve`, owned by the CLI, serving the UI's adapter-node
build.**

- Core business logic lives in `@lepid-labs/weft-core` as a transport-agnostic `WeftService`. The operations it is to
  offer: search, traverse, read, write, author a link, append to a decision log, analyze, and watch.
- `weft serve` constructs and owns the one `WeftService`. The UI never constructs one: client code fetches the CLI's
  `/api` JSON, and SSR loads read the manifest file named by `WEFT_MANIFEST_PATH`, the only CLI-to-UI handoff.
  Presentation config (`defaultTheme`, `layout`, `siteTitle`, `siteUrl`, `ogImage`) travels in the manifest's `site`
  block, so the UI needs no config access.
- `weft serve` mounts the UI's adapter-node build behind `node:http`, with the `/api` router in front. Mode selection:
  the build wins when present (what `npx` runs), the source tree is the fallback for an unbuilt checkout, and `--dev`
  forces Vite for UI work. `pnpm dev` passes `--dev`.
- The MCP server (`@lepid-labs/weft-mcp`, stdio transport) maps its tool definitions onto `WeftService` methods using
  `@lepid-labs/weft-core` directly. It never calls the HTTP API, so there is no network hop and no dependency on
  `weft serve` running.
- CLI commands such as `weft check` and `weft analyze` call `WeftService` directly, with no server.

The graph is derived from the filesystem, so a separate process that needs it builds its own service from the project
config; processes share no mutable state.

## Consequences

- All business logic is testable against `WeftService` without standing up HTTP or MCP.
- `@lepid-labs/weft-ui` publishes its build, not the SvelteKit project: it has `files: ["build"]` and an `exports` map.
- `vite` is an optional peer of the CLI, imported only by `--dev`
  ([0022](0022-npm-scope-and-lockstep-releases.md)).
- The packages, the handoff and both serve modes are described in [architecture](../design/architecture.md).

## History

- 2026-03-20 to 2026-07-25: SvelteKit with adapter-node. The UI's server routes were one-line adapters over a
  `WeftService` the UI constructed, and each consumer instantiated its own service.
- 2026-07-25 to 2026-09-04: the CLI owned the one `WeftService` and served the API as middleware in front of Vite's dev
  server over the UI source; the UI became a pure consumer.
