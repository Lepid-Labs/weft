# Read and navigate docs in weft

For anyone reading a docs graph in weft, and for hosts deciding what the reader will render. After it you know how to
move around the graph, which document types weft shows and how, what raw HTML survives, and how to add render passes
of your own.

## Navigation

- **Document tree** — left-hand sidebar lists all indexed docs; click any node to navigate.
- **Linked items** — right-hand sidebar shows edges to/from the current document (hidden in the `reader`
  [layout](configuration.md#all-options)). A reference whose target is not in the graph is listed struck through and
  marked *not found* rather than as a working link — a broken reference is worth seeing, but it is not somewhere you
  can navigate.
- **Search** — `Cmd+K` opens the search palette; full-text search across all doc content and anchors.
- **Back / forward** — browser history is maintained; back/forward work as expected within the app.
- **In-document links** — standard Markdown links between docs are intercepted and navigate within the app.

How the panels and search are built is in [UI layout](../design/ui-layout.md).

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open search palette |
| `Esc` | Close search palette |

## Supported document types

| Type | Extension | Notes |
|------|-----------|-------|
| Markdown | `.md`, `.markdown` | Headings become anchors, slugged exactly as GitHub does. Headings inside fenced code blocks are ignored |
| OpenAPI | `.yaml`, `.yml` | Operation IDs and schema names become anchors |
| Artifact | any | Only when listed in [`artifacts`](generated-artifacts.md). Tracked and checked, never rendered — there is nothing in a PDF for Weft to show |

More extensions can be mapped to Markdown or OpenAPI with [`extensions`](configuration.md#extensions).

## Rendering

Markdown is rendered with GitHub-flavoured Markdown plus:

- **Syntax highlighting** on fenced blocks that declare a language, with the language shown as a chip on the block.
  Highlighting is class-based and themed with Weft's own custom properties, so it follows light and dark without a
  second stylesheet.
- **Scrollable tables** — every table is wrapped so a wide one scrolls itself instead of moving the page sideways,
  with zebra striping and a row hover.
- **Heading permalinks** — every heading gets an id (the same slug the graph indexes) and a `#` control to copy a link
  to it.
- **Mermaid diagrams** — a ` ```mermaid ` fence renders as a diagram, so the same Markdown reads as a diagram on
  GitHub and in Weft, including inside an [included](composed-documents.md) section. Diagrams take their colours and
  font from the active style and redraw when the theme changes ([Diagrams](theming.md#diagrams)). Mermaid is loaded
  only by a page that has a diagram. A diagram that fails to parse is replaced by the parse error and its source; the
  rest of the page renders as usual. Without JavaScript, or if mermaid cannot load, the fence shows as a code block.

The order of the render chain is described in [Rendering pipeline](../design/rendering-pipeline.md).

## Raw HTML is sanitized

Documents may contain raw HTML, and it is filtered through an allowlist before it reaches the page. Inline event
handlers, `<iframe>`, and `javascript:` links do not survive; ordinary formatting and a plain inline `<svg>` figure
do.

Mermaid diagrams are drawn after the allowlist, in the browser, so their SVG is mermaid's to make safe: Weft runs it in
mermaid's `strict` security level (labels sanitized, no click handlers), which a diagram's own `%%{init}%%` directive
cannot change.

This matters most for [`@lepid-labs/weft-embed`](embedding.md), where a host page renders Markdown it may not
control.

## Contributing render passes

A corpus with conventions of its own — severity markers, status chips, a house callout style — can supply its own
render passes to an [embedded](embedding.md) reader rather than forking the renderer
([why](../decisions/0027-host-contributed-render-passes.md)):

```js
mountWeft('#root', {
  repo: 'acme/docs',
  rehypePlugins: [myCallouts],
  extendSchema: (schema) => ({
    ...schema,                          // extend it — do not replace it
    attributes: {
      ...schema.attributes,
      span: [...(schema.attributes?.span ?? []), ['className', 'callout']],
    },
  }),
});
```

`remarkPlugins`, `rehypePlugins` and `extendSchema` are accepted by every mount.

**Spread the schema you were given.** Returning a fresh object drops `tagNames`, and a missing `tagNames` disables the
allowlist rather than emptying it — every tag would be permitted, `<script>` included. Weft rejects a schema without
`tagNames` or `attributes` rather than rendering with it, so the mistake fails loudly instead of silently.

Contributed plugins run after raw HTML is parsed, so they can see all of it, and **before** sanitizing, so what they
emit is checked like everything else. A plugin cannot smuggle markup past the allowlist, and the stock allowlist would
strip the classes a plugin adds — which is what `extendSchema` is for.
