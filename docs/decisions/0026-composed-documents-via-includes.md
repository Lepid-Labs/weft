# 0026 Compose documents by expanding include links at render time

Status: accepted

## Context

Some documents are best assembled from sections of others, so that each section has one source (#70). The composed
document should still be ordinary Markdown whose links work on GitHub
([0016](0016-standard-markdown-links.md)), and composing must not open a way around the sanitizer.

## Decision

**A sidecar marks a link the document already carries as `type: includes`, and the UI expands it at render time.**

- Expansion happens only where the link stands alone as a block (the sole content of a paragraph or list item), since
  inlining a section mid-sentence has no sensible reading.
- Expansion closes stage 1 of the render chain, so fetched content passes the sanitizer like the document's own.
  Fragments render through the same untrusted chain, so contributed plugins see them too
  ([0027](0027-host-contributed-render-passes.md)).
- `extractSection` lives in core (a heading to the next same-or-shallower heading; no anchor means the whole document),
  because a static `weft build` will need the identical slice server-side.
- Per-edge `headingShift` (`auto` demotes beneath the inclusion point) and `contributes` are stamped with config
  defaults at build time, so the manifest is self-contained and the UI never sees config
  ([0017](0017-static-config.md)).
- Cycles are guarded twice, on purpose. `include-cycle` (an error, at document granularity, one finding per strongly
  connected component) fixes the graph, while the renderer's own visited chain and depth cap degrade the cycle point to
  a link with a notice, because a manifest predating the rule must not hang the page.
- The degrade path (a cycle, the depth cap, a fetch failure, a missing anchor) always keeps the author's link.

## Consequences

- `contributes: inline` is recorded, but search does not honour it yet.
- Matching a link to the include it declares has one implementation, in core (#78), shared by the renderer and the
  `include-link-missing` rule, which reports includes a page leaves as plain links
  ([links and anchors](../design/links-and-anchors.md), [validation](../design/validation.md)).
- A single embedded section does not expand includes, because that needs the manifest's edges
  ([0015](0015-section-embed-and-react.md)).
- Expansion's place in the render chain is described in [rendering pipeline](../design/rendering-pipeline.md), and
  authoring in the [composed documents guide](../guides/composed-documents.md).
