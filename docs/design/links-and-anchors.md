# Links and anchors

This design covers how a link written in source becomes a graph edge, and how a linkable position inside a document
becomes an anchor that the graph and the rendered page agree on. Links are plain relative Markdown whose slugs match
GitHub's ([0016](../decisions/0016-standard-markdown-links.md)), plus YAML sidecar files for what Markdown cannot say
([0007](../decisions/0007-sidecar-file-format.md)). It serves the linking requirements in
[requirements](../requirements.md).

## Approach

### Where links come from

Links are embedded in source files, and the graph is derived from them. Two formats are built:

- **Markdown links**, `[label](relative/path.md#anchor)`, with no custom prefix or protocol, so they render on GitHub
  and other viewers without Weft. Any link whose destination is a file inside a docs root becomes an edge of type
  `references`, including links to files Weft does not index, such as images and PDFs
  ([validation](validation.md#unresolved-edges) skips those).
- **Sidecar files**, `<file>.weft` beside the file they describe, for links a source cannot carry (a pending
  reference, an assertion, an `includes` marker, a recorded source hash) and for sources that cannot embed links.

`scanMarkdownLinks` also returns the destinations, as written, of links standing alone as a block: the sole content
of a paragraph or list item, the only places an `includes` edge expands. They are recorded as `WeftNode.blockLinks`,
and `mergeGraphs` keeps them only on documents that include something, since `include-link-missing` is their one
reader ([validation](validation.md#include-rules)).

Planned and not built: code-comment links (`@doc path/to/doc#anchor`) and OpenAPI links (`x-doc: path/to/doc#anchor`),
both with paths relative to the repo root; sidecar `annotations`; and authoring links through the UI
([link authoring](ui-layout.md#link-authoring-planned)), for which these formats would be the serialization.

### Resolving a destination

Each destination passes these steps in order:

1. **Template syntax.** A destination holding `{{ }}`, `{% %}`, `${ }` or `<% %>` produces no edge at all. Template
   syntax on the anchor side is ignored, since it does not change the target document.
2. **Percent-decoding.** A relative destination is decoded before it is resolved: `My%20Report.md` names
   `My Report.md`, and `#r%C3%A9sum%C3%A9` names `#résumé`, so the same Markdown works on GitHub and in Weft. A part
   with a malformed escape (`100%.md`) is left as written, whole. Because step 1 runs on the destination as written,
   an encoded `%7B%7B` is a file name, not a placeholder, and its edge points at the decoded literal. An anchor is
   matched against heading slugs, so a decoded `#Sec One` still does not match the slug `#sec-one`.
3. **GitHub blob URLs.** A blob URL into a repo the `repos` map knows resolves against that checkout and becomes an
   ordinary edge, recorded in `resolvedFrom`, when the file lands in a configured docs root. Any `blob/<ref>/` is
   accepted, since Weft serves the working tree. Unmapped repos, non-blob URLs and paths outside every root stay
   external links, and nothing is fetched. A sidecar `target` may be a blob URL too: one resolver
   ([resolve.ts](../../packages/core/src/links/resolve.ts)) serves both link sources and decodes the fragment.

### Published-form resolution

A link to a document's published form resolves to its source: `guide.html` becomes an edge to `guide.md` when exactly
one source shares the stem, with `resolvedFrom` recording `guide.html`. Authors link to what a reader opens, so without
this a publishing project's graph is empty of its real relationships. It is narrow on purpose: only `.html`, `.htm`
and `.pdf`, only when the target is not already a node, and never on an ambiguous stem. It runs after contributions
([graph and manifest](graph-manifest.md#building-the-graph)), so a build-declared node can be the target. Registering
an artifact for a path stops the rewrite, because the real target now exists.

### Anchors

The anchor registry is built in [anchors/](../../packages/core/src/anchors/) during indexing, with one extractor per
format:

- **Markdown.** Parsed with `remark`; each heading's rendered text is slugged with `github-slugger`, the implementation
  GitHub itself uses. ATX and setext headings are both found. A `#` inside a fenced code block is a code node, not a
  heading, so it gets no anchor.
- **OpenAPI.** Operation ids and schema names, through `openApiOperationAnchor` and `openApiSchemaAnchor`.
- **Code files** (planned): function and class names, and line ranges for `@doc` references.

Indexed anchors and rendered ids are one algorithm over one input. An anchor is only useful if the rendered page
carries an element with that id; otherwise it is extracted, indexed, stored and offered in the UI while doing nothing.
The renderer adds `rehype-slug`, which slugs with `github-slugger`, and the indexer slugs the same parsed heading with
the same library, so the two agree by construction rather than by being kept in step:

- **The input is the heading's rendered text, not its source line.** `## See [the docs](guide.md)` renders as "See the
  docs", so its id is `#see-the-docs`. GitHub slugs what it rendered, and so does Weft.
- **Collision suffixes belong to `github-slugger`**, which both sides instantiate per document, so a repeated heading
  gets `-1`, `-2` identically on each.
- **OpenAPI ids come from `openApiOperationAnchor` and `openApiSchemaAnchor`**, exported from
  `@lepid-labs/weft-core/browser` and called by both the extractor and `OpenApiRenderer`, for the same reason.

[markdown.test.ts](../../packages/ui/src/lib/markdown.test.ts) renders fixtures and this repo's own documents and
asserts that every indexed anchor resolves to an element id in the output. Without it either side can regress
silently.

An anchor is an object, not a bare slug. Its `text` is what lets a renamed heading be told apart from a deleted one: a
slug that vanished while its text survives elsewhere is a rename, so a rule can suggest the new target rather than
only report breakage.

## Alternatives

- **A custom link prefix such as `@doc:`.** Rejected in [0016](../decisions/0016-standard-markdown-links.md).
- **A hand-rolled slugifier.** It collapsed hyphen runs and stripped every non-ASCII letter: 37 of this repo's 219
  headings disagreed with GitHub (`React + Vite` gave `#react-vite`, not GitHub's `#react--vite`), and a CJK heading
  slugged to the empty string. Links are authored to render on GitHub, so GitHub's slugs are the correct ones.
- **Slugging the source line.** It diverged on any heading containing a link (`#see-the-docsguidemd` against the
  page's `#see-the-docs`) and missed setext headings entirely.
- **An edge to the unresolved template literal.** It would invent a node, and make `edge-target-missing` report
  correct source as broken.
- **Bare-string anchors.** A slug alone cannot tell a rename from a deletion.

## Interfaces

- **Anchor** ([types.ts](../../packages/core/src/types.ts), `Anchor`; manifest `version: 2`):

  | Field | Present for | Meaning |
  |-------|-------------|---------|
  | `slug` | all | URL fragment including `#`; the only field an edge matches on |
  | `text` | all | Text the slug came from: the rendered heading, or the operation id or schema name |
  | `line` | Markdown | 1-based line in the source file |
  | `level` | Markdown | Heading level, 1 to 6 |

- **Sidecar file** ([sidecar.ts](../../packages/core/src/links/sidecar.ts)): `architecture.md.weft` describes
  `architecture.md`. YAML with a `links` list. Each link has a `target`, which is a path relative to the source
  document's own docs root, a path qualified with another project's slug (`beta/api.yaml`), or a GitHub blob URL,
  each optionally with `#anchor`. Optional fields:

  | Field | Meaning |
  |-------|---------|
  | `anchor` | Source anchor the link starts from |
  | `type` | Edge type; default `references`. `includes` and `derives-from` carry defined semantics |
  | `label` | Display label |
  | `pending` | `true`: the target does not exist yet ([validation](validation.md#unresolved-edges)) |
  | `asserts` | Claims about the target: `version`, `lineCount`, `modified` ([validation](validation.md#assertions)) |
  | `sourceHash` | On `derives-from`: the source's hash when the artifact was generated |
  | `headingShift`, `contributes` | On `includes`: override the configured defaults ([rendering pipeline](rendering-pipeline.md#include-expansion)) |

  An unrecognised `headingShift` or `contributes` value falls back to the configured default, as `pending` accepts
  only `true`. The planned `annotations` list (`anchor`, `author`, `created`, `body`) is not read today.

## Risks

- Percent-decoding and template detection disagree by design on encoded braces; a generator that percent-encodes its
  placeholders gets edges to literal file names and `edge-target-missing` errors.
- The slug parity between indexer and renderer holds only while both use `github-slugger` on the same parsed text;
  `markdown.test.ts` is the only guard.
