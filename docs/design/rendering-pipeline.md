# Rendering pipeline

This design covers how the reader turns a document into HTML: the renderer per document type, the Markdown render
chain and its sanitizer, render passes a host contributes, `includes` expansion, client-side Mermaid diagrams, and the
OpenAPI renderer. The same pipeline runs in the standalone UI and in every embed mount. It serves the reading and
rendering requirements in [requirements](../requirements.md).

## Approach

### Renderers

One renderer component per document type: `DocView` picks `MarkdownRenderer` or `OpenApiRenderer` by node type. An
artifact is never fetched, since reading a binary as text succeeds and returns nonsense; `DocView` shows a notice
instead ([validation](validation.md#artifacts-and-staleness)). Renderers report link clicks through a callback that
the layout shell handles, so a renderer knows nothing about panes or navigation; `MarkdownRenderer` intercepts
in-app links this way. Code blocks are highlighted by `rehype-highlight` with language detection off.

### Render chain

The order of the chain is the contract, not an implementation detail, and it is spelled out in
[markdown.ts](../../packages/ui/src/lib/markdown.ts) rather than left to whoever edits the chain next. `rehype-raw`
parses raw HTML into the tree, which is what lets anything inspect it; contributed plugins run next; this renderer's
own passes after that; and `rehype-sanitize` runs last, over everything.

The order is enforced by two processors, not by the order of `.use()` calls. `unified` resolves attachers when it
freezes, so a contributed plugin whose attacher calls `this.use()` appends past everything registered after it, and a
single processor would let a self-registering plugin walk straight past the sanitizer.

- **Stage 1, untrusted:** parse, GFM, contributed remark plugins, Markdown to HTML with raw HTML kept, `rehype-raw`,
  contributed rehype plugins. The file is threaded through explicitly, because splitting the processor otherwise
  left the source text empty for every contributed plugin, with no error. Include expansion closes this stage.
- **Stage 2, first-party:** strip a document's own heading ids, `rehype-slug`, drop forged ids, heading permalinks,
  highlighting, code-language labels, table wrapping, then `rehype-sanitize` and stringify.

### Sanitizer

The allowlist is built from `defaultSchema`, GitHub's own, and widened only where something needs it. It is an
allowlist rather than a denylist, so markup nobody anticipated is dropped rather than passed. Three widenings are
deliberate:

- **`clobberPrefix` is emptied.** `defaultSchema` renames every id to `user-content-*` to prevent DOM clobbering, which
  would silently break every anchor in the graph: core extracts `#data-flow`, edges point at it, search scrolls to it,
  and all of it would resolve to nothing. GitHub parity was the whole point of replacing the slugger
  ([links and anchors](links-and-anchors.md#anchors)), so real ids win and the trade is taken knowingly. To narrow it,
  `id`, `name`, `accessKey` and `tabIndex` come off the global attribute list and back on only where needed; heading
  ids come only from the slugger; footnote ids must match the emitter's exact shape, with forged ones dropped first.
- **A narrow SVG allowlist.** Presentational attributes only: no event handlers, no `href`, no `className`. SVG child
  elements are allowed only inside `<svg>`, since a stray `<title>` would rename the host page's browser tab.
- **Class values per tag.** `defaultSchema` lists the permitted class values for each tag rather than allowing classes
  freely, so widening means extending the existing entry (`hljs` and `hljs-*` for the highlighter, the renderer's own
  affordances, include frames). Appending a bare `className` leaves `class=""`, which reads as a styling bug rather
  than a sanitizer decision.

The schema a host returns from `extendSchema` is validated: one with no `tagNames` array or no `attributes` would
disable the allowlist or strip every attribute, so it is refused.

### Contributed render passes

A host contributes render passes rather than forking the renderer
([0027](../decisions/0027-host-contributed-render-passes.md)). `remarkPlugins`, `rehypePlugins` and `extendSchema`
thread from `renderMarkdown` through `DocView` and `WeftApp` to the embed config. It is a code seam rather than a
config key, because `weft.config.yaml` is static data and the renderer runs in the browser. Plugin output is sanitized
like everything else, so a plugin that emits new markup needs a matching `extendSchema`. `extendSchema` is a
transform rather than a partial to merge, because the schema is nested arrays with per-tag semantics and merge rules
for it would be a second thing to get wrong.

### Include expansion

Composed documents come from `includes` edges expanded at render time
([0026](../decisions/0026-composed-documents-via-includes.md)). A sidecar marks a link the document already carries
as `type: includes`, and the reader expands it only where the link stands alone as a block, since inlining a section
mid-sentence has no sensible reading.

- **Matching.** `includeMatcher` (core, browser-exported) resolves a relative link against the node id, and finds any
  other link, such as a blob URL into a mapped repo, through the edge indexing already made from it (`resolvedFrom`).
  The repo map never reaches the browser, and manifests built before #78 still expand. Validation runs the same
  matcher ([validation](validation.md#include-rules)).
- **Slicing.** `extractSection` lives in core and is browser-exported: from the anchored heading to the next heading
  of the same or shallower level, or the whole document with no anchor. Static `weft build` will need the identical
  slice server-side, so render time and build time cannot disagree.
- **Trust.** Expansion closes stage 1: fetched content renders through the same untrusted chain as the document,
  contributed plugins see it, and everything spliced in still meets the sanitizer. Moving it to stage 2 would put
  fetched content past the allowlist.
- **Per-edge options.** `headingShift` (`auto` demotes included headings beneath the inclusion point; `none`) and
  `contributes` (`source` or `inline`) are stamped onto each edge from config defaults at build time by
  `applyIncludeDefaults`, so the manifest is self-contained and the UI never sees config.
- **Cycles and failure.** `include-cycle` fixes the graph, while the renderer's own visited chain and depth cap (5)
  degrade the cycle point to a link with a notice, because a manifest predating the rule must not hang the page. Every
  degrade path (cycle, depth, fetch failure, missing anchor) keeps the author's link.

Without the `includes` render option an include link renders as the ordinary link it also is, so an embed host that
supplies no edges loses nothing but the expansion.

### Mermaid diagrams

Diagrams are drawn client-side, after the sanitizer (#106, [0014](../decisions/0014-mermaid-rendering.md)). The fence
stays `pre[data-lang="mermaid"]` through the pipeline, because `rehype-highlight` skips it as plain text, and
[mermaid-dom.ts](../../packages/ui/src/lib/mermaid-dom.ts) swaps it for SVG once it is in the DOM.
[mermaid.ts](../../packages/ui/src/lib/mermaid.ts) holds the DOM-free decisions: mapping tokens to theme variables,
isolating each diagram, and a page-wide queue, because `mermaid.initialize` is global.

The loader comes from Svelte context (`MERMAID_LOADER_KEY`). The UI's `+layout.svelte` sets a lazy `import("mermaid")`
compiled out of SSR. The embed sets a pinned jsDelivr import (`src/mermaid-cdn.ts`, its version from a Vite `define`)
unless the host passes its own loader through the `mermaid` option, or `false` for none.
[check-mermaid.mjs](../../packages/embed/scripts/check-mermaid.mjs) fails the embed build if a bundle inlines mermaid
or loses the pin.

### OpenAPI renderer

OpenAPI documents render through custom Svelte components ([0012](../decisions/0012-openapi-renderer.md)).
`parseOpenApiSpec` is exported from `@lepid-labs/weft-core/browser`; the client fetches the raw spec through
`/api/doc/*` and parses it in the browser. Anchor ids come from the same functions the indexer uses
([links and anchors](links-and-anchors.md#anchors)), and the renderer handles its own anchor scrolling.

## Alternatives

- **Sanitizing earlier, or with a stock allowlist.** Sanitizing first checks the document and then lets plugin output
  through unexamined; a stock allowlist strips exactly the classes the highlighter just added. Both failures are
  silent.
- **Keeping `clobberPrefix`, or dropping `allowDangerousHtml` instead of allowing SVG.** The first breaks every anchor;
  the second deletes a generated document's inline chart without a word.
- **Server-side Mermaid SVG.** Rejected in [0014](../decisions/0014-mermaid-rendering.md).
- **Portal OpenAPI renderers.** Rejected in [0012](../decisions/0012-openapi-renderer.md).

## Interfaces

- **`RenderOptions`** ([markdown.ts](../../packages/ui/src/lib/markdown.ts)): `remarkPlugins`, `rehypePlugins`,
  `extendSchema(schema) → schema` and `includes`. The same three plugin options appear on every embed mount.
- **`includes` edge fields** `headingShift` and `contributes`: see [links and anchors](links-and-anchors.md#interfaces).
- **`mermaid` option** on embed mounts: `false`, or a loader returning the mermaid API.

## Risks

- `contributes: inline` is recorded but search does not honour it yet.
- OpenAPI `$ref` dereferencing is deferred.
- With no clobber prefix, ids reach the DOM as written; the attribute narrowing above is the mitigation.
- A mermaid syntax check in `weft check` is a follow-up ([0014](../decisions/0014-mermaid-rendering.md)), so a broken
  diagram fails a page view rather than CI.
