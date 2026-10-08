# Decisions

Decision records for Weft, one per file under `decisions/`, numbered in the order they were opened. Each
record gives the question, the options weighed, the choice and its consequences. A record is where its question is
discussed: when the decision changes, the record is revised in place to the decision now in force, and a `History`
section keeps one line per earlier decision.

| Decision | Summary | Status |
|----------|---------|--------|
| [0001 Implement in TypeScript, with Node as the default runtime](decisions/0001-implementation-language.md) | One language across CLI, UI and VS Code; Bun as an optional accelerator. | accepted |
| [0002 Build the UI with Svelte 5 and Vite](decisions/0002-ui-framework.md) | A compiler-based framework for a viewer that is mostly imperative DOM work. | accepted |
| [0003 No graph overview visualization](decisions/0003-no-graph-overview.md) | The graph is the engine, not the interface; users start from documents and search. | accepted |
| [0004 No desktop app harness: browser only](decisions/0004-no-desktop-app-harness.md) | `weft serve` opens a browser tab; no Electron or Tauri shell. | accepted |
| [0005 Serve the UI build from one service owned by the CLI](decisions/0005-local-server-and-service.md) | Ports and adapters; one `WeftService` per serve, serving the UI's adapter-node build. | accepted |
| [0006 Search with MiniSearch, with semantic search opt-in](decisions/0006-search-engine.md) | Full-text always on, local embeddings opt-in, one search API. | accepted |
| [0007 Write sidecar files in YAML](decisions/0007-sidecar-file-format.md) | The most scannable format for hand-edited arrays of links and annotations. | accepted |
| [0008 Open source under the MIT license](decisions/0008-licensing-and-distribution.md) | Adoption and trust first; commercial work would be a separate codebase. | accepted |
| [0009 Use pnpm](decisions/0009-package-manager.md) | Strict dependencies, topological builds and a proven workspace publish story. | accepted |
| [0010 Parse CLI arguments with cleye](decisions/0010-cli-argument-parsing.md) | Flat commands, inferred types and styled help in a small dependency. | accepted |
| [0011 Test against real files, with Vitest](decisions/0011-testing-strategy.md) | Filesystem-based integration tests from checked-in fixtures, no filesystem mocks. | accepted |
| [0012 Render OpenAPI specs with Weft's own Svelte components](decisions/0012-openapi-renderer.md) | Portal renderers fight the pane model; native components make anchors native. | accepted |
| [0013 Render Google Slides from the API's JSON](decisions/0013-google-slides-rendering.md) | Positioned DOM elements give responsive slides, element-level anchors and searchable text. | accepted |
| [0014 Draw Mermaid diagrams client-side, after sanitizing](decisions/0014-mermaid-rendering.md) | The allowlist stays unchanged, and the host app chooses how mermaid loads. | accepted |
| [0015 Embed one section through its own mount, wrapped for React](decisions/0015-section-embed-and-react.md) | `mountSection` needs no manifest; `@lepid-labs/weft-react` wraps it. | accepted |
| [0016 Link with standard Markdown, slugged as GitHub does](decisions/0016-standard-markdown-links.md) | Plain relative links make the edges, and anchors use GitHub's slugs. | accepted |
| [0017 Keep config as static data](decisions/0017-static-config.md) | `weft.config.yaml` is plain data, validated at load, with no runtime import. | accepted |
| [0018 One contribution format, never per-tool adapters](decisions/0018-one-contribution-format.md) | Builds contribute nodes, edges and patches, merged after source in a fixed order. | accepted |
| [0019 Content hashes and git author dates, never timestamps](decisions/0019-content-hashes-not-timestamps.md) | Staleness, freshness and `modified` survive clones and CI because none uses mtime. | accepted |
| [0020 Name repos by identity, never by machine layout](decisions/0020-multi-repo-roots-by-identity.md) | Projects name repos; a per-machine map says where each checkout lives. | accepted |
| [0021 Serve without a checkout: fetch as a fallback, never an override](decisions/0021-serve-without-a-checkout.md) | `weft serve --repo` fetches by blobless partial clone only what no local checkout covers. | accepted |
| [0022 Publish under @lepid-labs, in lockstep, through trusted publishing](decisions/0022-npm-scope-and-lockstep-releases.md) | One scope, one version for every package, released by workflow with provenance. | accepted |
| [0023 Publish the embed bundle to npm, with its bundled imports as devDependencies](decisions/0023-publish-the-embed-bundle.md) | Hosts pin a version and get a matching CDN URL instead of vendoring a build. | accepted |
| [0024 Define the smaller embed mount by what it refuses to do](decisions/0024-embed-mount-boundaries.md) | `mountDoc` is the reader alone, taking the host's client and never driving the page. | accepted |
| [0025 Style Weft with lepid-design, consumed as-is](decisions/0025-lepid-design-styling.md) | Upstream themes by name, a three-layer token chain, and theme roots Weft owns. | accepted |
| [0026 Compose documents by expanding include links at render time](decisions/0026-composed-documents-via-includes.md) | Block-level `includes` links expand inside the sanitized render chain. | accepted |
| [0027 Let hosts contribute render passes rather than fork the renderer](decisions/0027-host-contributed-render-passes.md) | remark and rehype plugins thread through to the embed config, sanitized last. | accepted |
