# Graph requirements

How Weft builds the documentation graph from one docs root: what it indexes, how links and anchors become typed edges,
and what the manifest records about itself.

## RQ-010 Index the docs directory

Status: agreed

Weft indexes every Markdown (`.md`, `.markdown`) and OpenAPI (`.yaml`, `.yml`) file under the configured docs
directory, `docs/` by default, except paths matching the configured ignore globs.

## RQ-011 Build output is excluded by default

Status: agreed

`_site/`, `_book/`, `.quarto/`, `dist/` and `node_modules/` are excluded from indexing by default. `site/`, `public/`,
`build/` and `out/` are not, because they commonly hold sources, and hiding real documents by default is worse than
indexing output.

## RQ-012 Additional file extensions

Status: agreed

A project can map further file extensions to Markdown or OpenAPI, including one Weft can parse but does not index by
default (`.json` as OpenAPI). It cannot remap an extension Weft indexes by default: that is rejected at load, naming
the extension and its built-in mapping.

## RQ-013 Anchors

Status: agreed

Markdown headings become anchors slugged exactly as GitHub slugs them, collision suffixes and non-ASCII letters
included; headings inside fenced code blocks are not anchors. OpenAPI operation IDs and schema names become anchors.
Each anchor keeps its heading text, so a renamed heading can be told apart from a deleted one.

Set by [decision 0016](../decisions/0016-standard-markdown-links.md).

## RQ-014 Indexed anchors match rendered ids

Status: agreed

Every anchor the index records resolves to an element id on the rendered page, for Markdown and OpenAPI alike.

## RQ-015 Relative links become edges

Status: agreed

A relative Markdown link to an indexed document becomes an edge, anchor included. The destination is percent-decoded
before it is resolved (`My%20Report.md` names `My Report.md`); a part with a malformed escape is left as written.

Set by [decision 0016](../decisions/0016-standard-markdown-links.md).

## RQ-016 Templated links produce no edge

Status: agreed

A link whose path holds template syntax (`{{ }}`, `{% %}`, `${ }`, `<% %>`) produces no edge, since its target is the
renderer's to decide. Template syntax in the anchor alone is ignored.

## RQ-017 Links to a published form resolve to their source

Status: agreed

A link to an `.html`, `.htm` or `.pdf` path that is not a node resolves to the one source document sharing its path
stem, anchor intact, with the original path recorded and shown to the reader. It is left unresolved when more than one
source shares the stem, and never applies when the target is already a node.

## RQ-018 Sidecar links

Status: agreed

Edges that cannot be written as inline Markdown links (cross-format, anchor-level into an OpenAPI operation, or
explicitly typed) are declared in a YAML sidecar file beside the document, each with a target and optionally a type,
a source anchor and a label.

Set by [decision 0007](../decisions/0007-sidecar-file-format.md).

## RQ-019 Typed, anchor-level edges

Status: agreed

Every edge has a type, any string, `references` by default. An edge may start at an anchor in its source and end at
an anchor in its target.

## RQ-020 Documents carry checkable facts

Status: agreed

Each document node carries a content hash, a line count, a `modified` date and, when declared, a `version`.

Acceptance criteria:

- The content hash follows a published recipe an external build can reproduce: strip a leading BOM, convert CRLF to
  LF, SHA-256, keep the first 16 hex characters.
- `modified` is the author date of the document's last commit. Without git there is no date, and indexing still
  succeeds.
- `version` is read from frontmatter exactly as written: `2.10` stays `2.10`.

Set by [decision 0019](../decisions/0019-content-hashes-not-timestamps.md).

## RQ-021 Per-document frontmatter

Status: agreed

A Markdown document's frontmatter can set its title, description, theme, sharing image and version. The title
defaults to the document's first `#` heading.

## RQ-022 Manifests record their provenance

Status: agreed

Each manifest records when it was built and a hash of its inputs: the sorted list of indexed paths plus the content of
every input that is not a node (sidecars, contribution files, and the config files including the local overlay).

## RQ-023 Manifest freshness

Status: agreed

A consumer can ask whether a manifest still reflects the docs and gets `fresh`, `stale`, or `unknown` when the
manifest records no provenance. An answer is served from cache for at most 2 s, and a rebuild invalidates it at once.

Set by [decision 0019](../decisions/0019-content-hashes-not-timestamps.md).
