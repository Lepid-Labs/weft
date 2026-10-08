# 0014 Draw Mermaid diagrams client-side, after sanitizing

Status: accepted

## Context

GitHub renders ` ```mermaid ` fences as diagrams, and Weft's promise is that the same Markdown works in both places
(#106). End-to-end pages (token flows, task state machines) need sequence and state diagrams. Mermaid is large (~125 MB
unpacked, several MB of browser code), the renderer sanitizes everything through an allowlist (`extendSchema`), and the
embed ships an IIFE build that lib-mode Vite cannot code-split.

## Options

- **Server-side SVG**: render each diagram to SVG at render time and pass it through the allowlist. The sanitizer would
  have to admit mermaid's SVG vocabulary (styles, `foreignObject`, markers, ids), a large surface to allow safely, and
  layout needs a DOM to measure text.
- **Client-side, after sanitizing**: leave the fence as the code block it already is, and swap it for mermaid's SVG in
  the browser once the sanitized HTML is on the page.

## Decision

**Client-side, after sanitizing, with the loader supplied by the host app.**

- **The allowlist does not change.** The placeholder is `pre[data-lang="mermaid"]`, which the pipeline already emits;
  raw HTML forging one is equivalent to writing the fence. The SVG is trusted to mermaid's `strict` security level,
  which a diagram's `%%{init}%%` directive cannot lift (`securityLevel` is a mermaid `secure` key).
- **It degrades to what was there before.** Without JavaScript, or when mermaid cannot load, the fence stays a code
  block.
- **Themed from resolved tokens, not `data-theme`.** Colours are read where the diagram sits and flattened to opaque
  hex (mermaid's parser rejects `var()` and `color-mix()`, and translucent tokens are common), and dark mode is judged
  from the background, so fixed-scheme styles work. A scheme or style change redraws.
- **Loading is the host's choice, through Svelte context.** The standalone UI imports mermaid as a lazy chunk of its
  own build, so `weft serve` works offline and mermaid is a `devDependency` of `@lepid-labs/weft-ui` rather than an
  install for every CLI user. The embed cannot split a chunk off its IIFE (bundling would grow `weft.iife.js` from
  ~0.7 MB to ~6 MB), so by default it imports mermaid's ESM build from jsDelivr, pinned to the installed version; hosts
  override it with the `mermaid` option or turn it off. A build step fails if either bundle inlines mermaid or loses
  the pin.

## Consequences

By default an embedded page loads mermaid from jsDelivr, so its diagrams depend on that CDN unless the host supplies
its own loader or turns diagrams off. A broken diagram shows up on a page view, not in CI, until the follow-up rule
exists. How the fence passes through the pipeline is described in [rendering pipeline](../design/rendering-pipeline.md).

## Follow-up

A `weft check` rule reporting mermaid syntax errors, so a broken diagram fails CI rather than a page view.
