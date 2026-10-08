# Rendering requirements

How Weft renders each kind of document, keeps raw HTML safe, lets a host extend rendering, and composes documents
from sections of others.

## RQ-061 Markdown renders as on GitHub

Status: agreed

Markdown renders as GitHub-flavoured Markdown. Every heading gets the id the graph indexes and a control to copy a
link to it; fenced blocks that declare a language are highlighted in colours that follow light and dark; a wide table
scrolls itself rather than the page.

Supports UC-001, UC-005, UC-015.

## RQ-062 Mermaid diagrams

Status: agreed

A Mermaid fence renders as a diagram, as on GitHub, including inside an included section.

Acceptance criteria:

- Diagrams take their colours and font from the active style and redraw when it changes.
- Mermaid loads only on a page that has a diagram.
- A diagram that fails to parse shows the parse error and its source; the rest of the page renders.
- Without JavaScript, or when Mermaid cannot load, the fence shows as a code block.
- Diagrams run at Mermaid's strict security level, which a diagram's own directives cannot lift.

Set by [decision 0014](../decisions/0014-mermaid-rendering.md).

## RQ-063 Raw HTML is sanitized

Status: agreed

Raw HTML in a document passes an allowlist before it reaches the page: inline event handlers, iframes and
`javascript:` links are removed, while ordinary formatting and a plain inline SVG figure survive. Sanitizing runs
last, over the document's own content, the output of contributed passes and included sections alike. Heading ids
keep their indexed form, so anchors still resolve.

## RQ-064 Contributed render passes

Status: agreed

A host can add its own Markdown and HTML render passes, and extend the allowlist, rather than fork the renderer.
Contributed passes run after raw HTML is parsed and before sanitizing. An extended allowlist that lacks its tag or
attribute lists is rejected rather than used.

Set by [decision 0027](../decisions/0027-host-contributed-render-passes.md).

## RQ-065 OpenAPI specs

Status: agreed

An OpenAPI spec renders its operations and schemas, each at the anchor the graph indexes for it, within the document
view rather than as a separate portal.

Set by [decision 0012](../decisions/0012-openapi-renderer.md). Supports UC-001.

## RQ-066 OpenAPI references are resolved

Status: draft

The OpenAPI view resolves `$ref` references, so a referenced schema is shown where it is used.

Set by [decision 0012](../decisions/0012-openapi-renderer.md).

## RQ-067 OpenAPI examples

Status: draft

The OpenAPI view shows the examples a spec declares.

## RQ-068 Composed documents

Status: agreed

A link marked as an include that stands alone as a block (the sole content of a paragraph or list item) expands in
place to the target's section, from its heading to the next heading of the same or shallower level, or the whole
document when no anchor is given. The section renders in a frame that names and links back to its source. A link
inside a sentence never expands.

Acceptance criteria:

- Included headings demote beneath the point of inclusion by default; a global or per-include option keeps the
  source's levels.
- Included content passes through the same render passes and sanitizer as the document's own.
- A cycle, the depth limit, a failed fetch or a missing anchor renders the author's link with a notice, so the page
  never hangs or fails.

Set by [decision 0026](../decisions/0026-composed-documents-via-includes.md). Supports UC-016.

## RQ-069 Included content is searched under its source

Status: agreed

By default, included content is searchable only under its source document, so search never returns duplicate hits.

Supports UC-016.

## RQ-070 Inline search attribution

Status: draft

An include marked to contribute inline is also searchable under the including document. The option is declared and
recorded on the edge today; search does not honour it yet.

Supports UC-016.

## RQ-071 Code files

Status: draft

A code file renders with syntax highlighting, and its references to documentation are highlighted.

Supports UC-002.

## RQ-072 Google Slides decks

Status: draft

An imported Google Slides deck renders from its structure rather than as pictures: elements scale with the view, text
is selectable and searchable, and every page element has an anchor a link can target. After import it renders
offline.

Acceptance criteria:

- Import needs only read-only access to the deck.
- Re-import updates sidecar links by element id and reports links to removed elements as broken.

Set by [decision 0013](../decisions/0013-google-slides-rendering.md). Supports UC-003.
