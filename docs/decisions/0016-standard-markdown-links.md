# 0016 Link with standard Markdown, slugged as GitHub does

Status: accepted

## Context

Weft's graph edges come from the links documents already carry. Those documents are also read where they live, on
GitHub above all, and Weft's promise is that the same Markdown works in both places. A link to a heading is only as
good as the slug it names, so the anchors Weft indexes have to be the ids a reader's page actually has.

## Options

### For links

- **A Weft-specific syntax (an `@doc:` prefix)**: does not render on GitHub.
- **Standard relative Markdown links**: render on GitHub as written; Weft finds graph edges by resolving them against
  the docs root.

### For heading slugs

- **A hand-rolled slugifier**: collapsed hyphen runs and stripped every non-ASCII letter, so 37 of this repo's 219
  headings disagreed with GitHub and a CJK heading slugged to the empty string.
- **Slugging the heading's source line**: diverged on any heading containing a link (`## See [docs](x.md)` gave
  `#see-docsxmd` against the page's `#see-docs`) and missed setext headings entirely.
- **`github-slugger` over the heading's rendered text**: the implementation GitHub's own rendering uses, on the same
  input the page renders.

## Decision

**Links are standard relative Markdown links, and heading anchors are GitHub's slugs.**

- Weft identifies graph edges by resolving relative links against the docs root. There is no Weft-specific syntax.
- Because links are authored to render on GitHub, GitHub's slugs are the correct ones. Core extracts anchors with
  `remark` and `github-slugger`, and the UI renders ids with `rehype-slug`, both slugging the heading's rendered text:
  indexed anchors and rendered ids are one algorithm over one input. The slugger also owns its own `-1`/`-2` collision
  suffixes.
- OpenAPI ids follow the same rule: one pair of functions, called by both extractor and renderer
  ([0012](0012-openapi-renderer.md)).

## Consequences

- Changing the slugger changed the manifest format: anchors became objects (manifest `version: 2`) and headings inside
  fenced code blocks are no longer indexed.
- The UI's `markdown.test.ts` renders fixtures and this repo's own docs and asserts that every indexed anchor resolves
  to an element id; without it, either side can regress silently.
- The sanitizer has to keep real ids rather than prefixing them, a trade taken knowingly for GitHub parity
  ([rendering pipeline](../design/rendering-pipeline.md)).
- Ordinary Markdown brings ordinary Markdown's cases, each handled so the same file still works in both places:
  percent-encoded destinations, links holding template syntax, links to a document's published form, and GitHub blob
  URLs. These rules and the anchor registry are described in [links and anchors](../design/links-and-anchors.md).
