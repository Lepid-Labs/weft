# 0001 Implement in TypeScript, with Node as the default runtime

Status: accepted

## Context

Weft has three deployment contexts that share core logic:

1. **CLI + local server**: a single Node process running CLI commands and the HTTP/WebSocket API for the UI.
2. **Browser UI**: a Vite-bundled Svelte app (renderers, split pane, search).
3. **VS Code extension**: a webview panel and gutter decorations, running in VS Code's Node host.

The graph model, link parser, anchor registry and manifest builder are core logic needed across all three. The
language choice determines how much code can be shared rather than duplicated, the distribution model, and the CLI's
performance characteristics.

## Options

### TypeScript

One language across all four targets. Core logic is a shared package consumed by the CLI, server, UI and VS Code
extension. No serialization boundary between layers.

| Dimension | Assessment |
|---|---|
| Code sharing | Full — same `@lepid-labs/weft-core` package imported by CLI, browser, and VSCode |
| UI/VSCode | Native fit — browser UI and VS Code extension are JS/TS (Svelte + Extension API) |
| CLI performance | Node startup overhead (~100-300ms); acceptable for `serve`, noticeable for `check` in CI |
| Distribution | `npm install -g` or `npx` — requires Node runtime on target machine |
| Ecosystem | Rich — every rendering lib needed (pdf.js, mermaid, OpenAPI renderers) is JS-native |
| Build complexity | Low — standard pnpm monorepo, one toolchain |
| MCP server | Straightforward — Node process, stdio or HTTP transport |

Against it: distribution friction for non-Node projects. A Go or Python shop needs Node installed just to run `weft`.
Partly mitigated by `npx`, or by bundling with pkg or `bun compile`.

### Rust (core + CLI) / TypeScript (UI + VS Code)

Rust for the performance-sensitive parts (CLI, server, graph engine), TypeScript for the browser UI and VS Code
extension. Core types shared through generated TypeScript bindings or a JSON schema contract.

| Dimension | Assessment |
|---|---|
| Code sharing | Partial — Rust core can compile to WASM for browser use, but adds build complexity |
| UI/VSCode | TypeScript still required for these targets |
| CLI performance | Excellent — near-instant startup, fast graph traversal on large repos |
| Distribution | Single static binary — `curl \| sh`, Homebrew, GitHub releases. No runtime dependency |
| Ecosystem | Rendering libs (pdf.js, mermaid, OpenAPI) are JS — Rust can't use them directly |
| Build complexity | High — two toolchains, WASM compilation, generated type bindings, CI for multiple platforms |
| MCP server | Well-supported — Rust MCP SDK exists |

Against it: the import pipeline and document renderers are inherently JS-ecosystem (a LibreOffice subprocess aside).
Rust benefits only the graph engine and CLI, and those are not the bottleneck in typical use. The complexity tax may not
pay for itself.

### Go (core + CLI) / TypeScript (UI + VS Code)

The same split as Rust, with a simpler language and faster compilation, but no WASM story for sharing core logic with
the browser.

| Dimension | Assessment |
|---|---|
| Code sharing | Minimal — Go core cannot run in browser, so graph logic must be duplicated in TS for the UI |
| UI/VSCode | TypeScript still required |
| CLI performance | Very good — fast startup, good enough for CI |
| Distribution | Single static binary — same advantages as Rust |
| Ecosystem | Go has no equivalent of the JS rendering libs needed |
| Build complexity | Medium — two toolchains but Go is simpler than Rust |
| MCP server | Well-supported — Go MCP SDK exists |

Against it: core logic is duplicated between Go and TypeScript. Every change to the graph model, link parsing or anchor
resolution must be implemented twice, the worst outcome for long-term maintenance.

### Bun (TypeScript runtime alternative)

The same TypeScript codebase, run on Bun instead of Node. Bun compiles to a single executable, starts faster than Node,
and is a drop-in replacement for most Node APIs.

| Dimension | Assessment |
|---|---|
| Code sharing | Full — same `@lepid-labs/weft-core` package imported by CLI, browser, and VSCode |
| UI/VSCode | Same — Svelte/browser bundle + VS Code Extension API |
| CLI performance | Better than Node — ~50ms startup, fast file I/O |
| Distribution | `bun build --compile` produces a single binary — no runtime dependency |
| Ecosystem | High compatibility with npm packages; some edge cases with native modules |
| Build complexity | Low — similar to Node, single toolchain |
| MCP server | Same as Node — stdio or HTTP transport |

Against it: a compiled Bun binary and `npx` are two separate distribution paths, not one story. `npx` runs on Node
regardless, so supporting both means testing both. The VS Code extension host also runs on Node, so Bun helps only the
CLI and server. Native-module compatibility gaps exist but are shrinking.

## Decision

**TypeScript throughout. Node is the default runtime. Bun is an optional accelerator.**

The rendering ecosystem locks Weft into TypeScript for the browser UI and VS Code extension whatever the CLI is written
in, so the question is whether CLI performance or the distribution model justifies a second language for the CLI and
server alone. For a tool developers run interactively (`weft serve`) or in CI (`weft check`), the difference between
200 ms (Node) and 10 ms (Rust) startup is real but not decisive. "Requires Node" against "single binary" matters more
for adoption in non-Node shops, but those users can install through Homebrew or a curl script even with a Node-based
tool; many CLI tools bundle their runtime. Bun's compiled binary does not replace `npx`; it is an additional path, and
the VS Code extension runs on Node regardless.

- Primary distribution: `npx` / `npm install -g` of the CLI package, running on Node.
- Optional: install `weft-bun-<arch>` (for example `weft-bun-darwin-arm64`) as a project dependency. When present, the
  `weft` CLI and MCP server use the compiled Bun binary instead of Node.
- The `weft` npm package detects the optional binary at startup and delegates to it if available. No code changes:
  the same TypeScript on a different runtime.
- The VS Code extension always runs on Node (VS Code's host runtime). The browser UI is bundled JS. The Bun
  optimization applies only to the CLI, server and MCP contexts.

## Consequences

`npx` is the zero-friction default, with a fast-binary upgrade path that does not fork the codebase. The optional
dependency pattern is proven: esbuild, swc and Prisma's engines all use it. Core logic is written once and shared by
every target, and the JS-native rendering libraries are used directly. Projects that do not use Node still need it
installed for the default path. The CLI publishes as `@lepid-labs/weft`, with a Node floor of 24
([0022](0022-npm-scope-and-lockstep-releases.md)). The second-language question also shaped later choices: Tauri was
set aside partly because it would add Rust ([0004](0004-no-desktop-app-harness.md)), and SQLite FTS5 because a native
module complicates the Bun binary ([0006](0006-search-engine.md)).
