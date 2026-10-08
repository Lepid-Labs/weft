# Architecture

Weft is one transport-agnostic service with thin adapters around it. `@lepid-labs/weft-core` holds every rule about
the document graph; the CLI, the browser UI, the embeddable bundle and the React wrapper consume it. This design covers
what each package is responsible for, how `weft serve` wires them together, and how the packages are shaped
differently for the workspace and for npm. It serves the serving, reading and packaging requirements in
[requirements](../requirements.md); the other [designs](../design.md) carry each component's detail.

## Approach

### Packages

| Package | Responsibility |
|---------|----------------|
| `@lepid-labs/weft-core` | Config, indexing, link parsing, anchors, the manifest, validation, search, git history, repo fetching, and the `WeftService` facade over them |
| `@lepid-labs/weft` | The CLI. Owns the one `WeftService` a `weft serve` uses; `index`, `analyze` and `check` call core directly |
| `@lepid-labs/weft-ui` | The SvelteKit reader (adapter-node), a pure consumer of the manifest and the `/api` JSON |
| `@lepid-labs/weft-embed` | A library build of the reader for other pages: `mountWeft`, `mountDoc`, `mountSection` ([embedding](embedding.md)) |
| `@lepid-labs/weft-react` | `<WeftSection>`, a React wrapper over `mountSection` |

### One service, thin adapters

The architecture is ports and adapters ([0005](../decisions/0005-local-server-and-service.md)). All business logic
lives in core as `WeftService`. Each consumer instantiates its own `WeftService` from the project config; the graph is
derived from the filesystem, so processes share no mutable state. CLI commands such as `weft check` need no server.

Within one `weft serve` there is exactly one `WeftService`, constructed and owned by the CLI. The UI never constructs
one: it reads the manifest and the `/api` JSON. Presentation config (`defaultTheme`, `style`, `styleUrl`, `layout`,
`siteTitle`, `siteUrl`, `ogImage`) travels in the manifest's `site` block, so the UI needs no config access. The UI
imports only core's types and `@lepid-labs/weft-core/browser`, the browser-safe subset that both sides of a
render-time contract call (OpenAPI parsing and anchor ids, section extraction, include matching). It has no
server-side core runtime import.

Config is static data ([0017](../decisions/0017-static-config.md)): `weft.config.yaml`, `.yml` or `.json`, validated
when it loads. A legacy `weft.config.ts` or `.js` fails with a migration error rather than being ignored.
`weft.config.local.yaml` is a per-machine overlay that may set only `repos`, `style` and `styleUrl`, so committed and
local config cannot quietly diverge. `resolveDocsRoots` yields one docs root per `projects` entry, or one implicit
root over `docsDir`.

### CLI to UI handoff

The only handoff from CLI to UI is the `WEFT_MANIFEST_PATH` environment variable. `weft serve` sets it to the
manifest it writes, and SvelteKit's server loads read that file. Client code fetches `/api`. Server loads read a file
rather than call `/api` because SvelteKit's SSR fetch cannot reach Vite middleware.

### Serve modes

`weft serve` mounts the adapter-node build that `@lepid-labs/weft-ui` produces (`build/handler.js`, a connect-style
handler whose only runtime externals are `unified` and `remark-parse`) behind a plain `node:http` server, with the
`/api` router in front. With `--dev` it instead runs Vite over the UI source, with the same router as Vite middleware.
The router strips its mount point exactly as Vite's `use("/api", …)` does, so `handleApiRequest` is the one API in
both modes.

The build wins when present, which is what `npx` runs. The source tree is the fallback for an unbuilt checkout, and
`--dev` forces Vite for UI work. `pnpm dev` at the repo root builds core and the CLI and runs `weft serve . --dev`, so
there is one launch path.

In both modes `WeftService.watch()` (chokidar) rebuilds the manifest when a document changes; with `--dev`, Vite also
hot-reloads the UI source. Roots inside the fetch cache are not watched ([repo fetching](repo-fetching.md)).

### Serve behaviour

- **Bind address.** `--host` defaults to `127.0.0.1` (#90). A wildcard bind can share its port with a process bound
  to a specific address, so the server started cleanly while the printed URL reached the other process; a loopback
  bind collides loudly instead. `0.0.0.0` or `::` opts back in to every interface.
- **Taken port.** Reported as a taken port. `isPortInUse` covers Node's `EADDRINUSE` and Vite's `strictPort`
  rejection; dev mode sets `strictPort` so Vite cannot quietly move to the next port.
- **Self-check.** Before the URL is announced or the browser opened, `selfCheck` requests `/api/manifest` and `/` from
  inside the process. The outcome is the `[OK]` or `[FAIL]` prefix on the "running at" line (green or red on a TTY,
  plain when piped or under `NO_COLOR`). A browser that then cannot connect is attributed to its own side (a proxy, a
  policy) when the check passed, or to the named socket error when it failed.
- **Opening a browser.** `--open` uses the platform opener (`open`, `cmd /c start`, `xdg-open`), with no dependency.
  It is opt-in because cleye has no `--no-<flag>` negation, so a default-on flag could never be turned off.
- **Style override.** `--style <name>`, `--style <dark>/<light>` and `--style-url` override `style` and `styleUrl`
  from both config files. They are the only per-run override that works with `--repo`, whose local config would live
  in the fetch cache. The merged value is checked against the `@lepid-labs/styles` manifest before the server starts.
  `loadStyleRoster` resolves that manifest from the UI package's directory, since the CLI does not depend on the
  styles package itself; `assertServableStyle` mirrors the UI's own check but fails on the command line rather than
  in the browser, and defers to `styleUrl` for names the bundle does not carry.

### Workspace and published package shapes

Core resolves to built output (`dist/index.js`) for plain-Node consumers such as the CLI, so core must be built
before running `weft`; after editing core, run `pnpm --filter @lepid-labs/weft-core build` (or `tsc --watch`). Vite
dev loads core's TypeScript source through the alias in `packages/ui/vite.config.ts`, and typecheck sees source
through the `types` condition, so the Vite dev loop needs no rebuild. At pack time `publishConfig` swaps core's
`types` to `dist/`: one `package.json`, two audiences, and `pnpm pack` is the check that the published shape is right.

`@lepid-labs/weft-ui` publishes its build, not the SvelteKit project (`files: ["build"]` and an `exports` map). `vite`
is an optional peer of the CLI: only `--dev` imports it, a published install must not pull the whole toolchain for a
mode it cannot use, and the import failure names the reason. The npm scope, lockstep versions and trusted publishing
are [0022](../decisions/0022-npm-scope-and-lockstep-releases.md); the release procedure is
[release a version](../runbooks/release-a-version.md).

## Alternatives

- **Booting Vite's dev server as the server.** `weft serve` used to do this over the UI source tree, which no
  published package can do: it would ship svelte, kit, vite and the UI source and compile them on every cold `npx`.
  Vite is the dev mode, not the server.
- **A service per consumer inside one serve.** The UI constructing its own `WeftService`, or reading config, would
  give one serve two graphs and two config readers. The `site` block and `WEFT_MANIFEST_PATH` replace both.
- **A separate API server.** Hono, Fastify and Express were weighed in
  [0005](../decisions/0005-local-server-and-service.md).
- **A wildcard default bind, and a default-on `--open`.** Rejected for the reasons under serve behaviour.

## Interfaces

- **`WeftService`** ([service.ts](../../packages/core/src/service.ts)): `getManifest`, `read`, `search`,
  `traverse(nodeId, direction)` with `direction` one of `outgoing`, `incoming` or `both`, `validate`, `freshness`
  ([manifest freshness](manifest-freshness.md)), `watch`, `rebuild(slug?)` and `writeManifest`. `read` refuses an
  artifact and any path that was never a document ([validation](validation.md#artifacts-and-staleness)).
- **`/api`** ([api-middleware.ts](../../packages/cli/src/api-middleware.ts)), JSON over GET, consumed by the UI:

  | Endpoint | Returns |
  |----------|---------|
  | `/api/manifest` | The merged `Manifest` |
  | `/api/doc/<node id>` | `{ content }`, the raw source; 404 when the id is not a readable document |
  | `/api/search?q=` | `SearchResult[]`; 400 without `q` |
  | `/api/traverse?node=&direction=` | The `WeftEdge[]` touching the node; `direction` defaults to `both` |

- **`WEFT_MANIFEST_PATH`**: absolute path to the merged manifest. Set by `weft serve`; a UI server started without it
  fails and says it must be launched through `weft serve`.

## Risks

- **Planned operations.** The original service design also named `write(nodeId, content)` and `authorLink(from, to,
  type)` for the [link authoring UI](ui-layout.md#link-authoring-planned), `appendDecisionLog(nodeId, entry)` for a
  decision log, and `analyze(options)`. None is built. `weft analyze` runs `validate()`; coverage gaps, orphaned
  documents and connectivity analysis are not built. Also planned: `weft build` (render the graph to a static site),
  `weft new <template>` (scaffold a document), `weft log` (append a decision-log entry), `weft check --staleness`
  (flag documents whose linked code changed), and an MCP adapter
  ([0005](../decisions/0005-local-server-and-service.md)).
- **Core must be built before the CLI runs.** Forgetting to rebuild after editing core runs stale code with no
  warning.
