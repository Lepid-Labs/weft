# 0002 Build the UI with Svelte 5 and Vite

Status: accepted

## Context

The browser UI needs a split pane with independent navigation stacks, document renderers (wrapping mostly vanilla JS
libraries), a command-palette-style link picker, and search. The same app, or a subset of it, runs in the VS Code
webview panel.

Most of the rendering libraries Weft wraps are **not React-native**:

- **pdf.js**: vanilla JS, renders to canvas.
- **Redoc / Stoplight Elements**: web components or vanilla JS (React wrappers exist but are not required).
- **Mermaid**: renders SVG, vanilla JS.
- **Syntax highlighting** (Shiki, Prism): vanilla JS.

## Options

### React + Vite

| Dimension | Assessment |
|---|---|
| Ecosystem | Largest — most rendering libs have React wrappers available |
| Graph visualization | React Flow — purpose-built for interactive node graphs, excellent DX |
| Bundle size | ~40-50KB gzipped (React + ReactDOM) before app code |
| VSCode webview | Works, but full React bundle is heavy for a side panel |
| AI agent familiarity | Highest — agents generate React code most reliably |
| Learning curve | You know it already |

Against it: React is a lot of framework for what is fundamentally a document viewer with navigation. The split pane and
renderers gain little from React's re-render model; most of the work is imperative DOM manipulation (rendering a PDF
page, mounting a web component).

### Preact + Vite

A drop-in React replacement at ~3 KB gzipped. Supports React Flow and most React libraries through the `preact/compat`
alias.

| Dimension | Assessment |
|---|---|
| Ecosystem | React-compatible via compat layer — most things work |
| Graph visualization | React Flow works via compat (some edge cases) |
| Bundle size | ~3KB gzipped — significant reduction |
| VSCode webview | Much lighter, better fit for embedded panel |
| AI agent familiarity | High — same JSX/component model, agents treat it as React |
| Compat risk | Occasional subtle differences; compat layer adds debugging friction |

Against it: the compat layer works until it doesn't, and debugging a React library failing through Preact compat is
unpleasant.

### Svelte 5 + SvelteKit (or just Vite)

Compiler-based, with no runtime framework in the bundle. Components compile to efficient imperative DOM updates.

| Dimension | Assessment |
|---|---|
| Ecosystem | Smaller than React but growing; most vanilla JS libs wrap easily |
| Graph visualization | Cytoscape.js or D3 (no React Flow, but these are more flexible) |
| Bundle size | Near-zero framework overhead — output is vanilla JS |
| VSCode webview | Lightest option — ideal for embedded panel |
| AI agent familiarity | Lower — agents produce less reliable Svelte code than React |
| Learning curve | New framework for you, but simple model |

Against it: a smaller ecosystem means more DIY UI components, and AI agents are less fluent with Svelte, which matters
for a tool whose own development will likely involve AI assistance.

### Vanilla JS + Web Components + Vite

No framework. Custom elements for the pane, renderer and link picker; state through a small reactive library (such as
nanostores) or plain event emitters.

| Dimension | Assessment |
|---|---|
| Ecosystem | Direct access to all vanilla JS rendering libs — no wrappers needed |
| Graph visualization | Cytoscape.js, D3, or vis-network — all framework-agnostic |
| Bundle size | Minimal — only what you write + rendering libs |
| VSCode webview | Lightest possible |
| AI agent familiarity | Medium — agents can write web components but less structured output |
| Complexity risk | State management and component composition require more manual plumbing |

Against it: without a framework's component model and reactive state, the split pane's navigation stack and the link
picker become manual wiring. Not hard, but more surface area for bugs.

## Decision

**Svelte 5 + Vite. No graph visualization library.**

The rendering libraries are framework-agnostic, so React does not help wrap them. The UI is a document viewer with
navigation, and most of its work is imperative DOM manipulation (render a PDF canvas, inject an SVG, mount a web
component), a better fit for a compiler-based framework than for a virtual DOM. The AI-agent-familiarity gap is real
but temporary; model capability with non-React frameworks improves continuously.

- Svelte's compiler model produces minimal JS with no framework runtime in the bundle: the best fit for a document
  viewer where most rendering is imperative DOM manipulation (pdf.js canvas, Mermaid SVG, web components).
- No graph overview visualization ([0003](0003-no-graph-overview.md)). The primary UI is a split pane with search and a
  linked-items sidebar, so no Cytoscape.js, D3 or React Flow is needed.
- The lightest possible VS Code webview, with no framework runtime in an embedded panel.
- Svelte wraps vanilla JS rendering libraries (pdf.js, Redoc, Mermaid, Shiki) cleanly through `use:action` directives,
  with no wrapper components.
- AI agent fluency with Svelte is lower than with React today, but sufficient and improving.

## Consequences

The UI is a SvelteKit app built with adapter-node, served by the CLI ([0005](0005-local-server-and-service.md)), and
its tests share Vite's transform pipeline through Vitest ([0011](0011-testing-strategy.md)). Hosts that build in React
get a wrapper package rather than a React UI: `@lepid-labs/weft-react` wraps a Svelte-built mount
([0015](0015-section-embed-and-react.md)).
