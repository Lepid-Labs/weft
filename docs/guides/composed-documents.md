# Compose a document from sections of others

For authors who want one document assembled from sections that live elsewhere: an FAQ whose every answer lives in
the document that owns it, or an org-level overview built from the architecture summaries of several repositories.
After it you can mark links as includes, control how included headings and search results behave, and have
`weft check` tell you when a composition breaks or its sources change.

## Mark links as includes

Instead of copying content in — and watching the copies drift — the composing document links to its sources as usual,
and a [sidecar](sidecar-links.md) marks which of those links are includes:

```yaml
# faq.md.weft
links:
  - target: runbook.md#deploys
    type: includes
  - target: pricing.md#how-billing-works
    type: includes
```

The document stays a plain link list on GitHub, where it renders as exactly that. In Weft's UI each include link that
stands alone as a block — the sole content of a paragraph or list item — expands inline at render time: the target's
anchor range renders in place, inside a visibly attributed frame linking back to the source. A link woven into a
sentence never expands. How expansion fits the render chain is in
[Rendering pipeline](../design/rendering-pipeline.md).

## Which link is the include

A link matches an include edge when it names the same document and anchor as the edge's `target`. A relative link
resolves against the including document's node id, so a link into another project is written from the id
(`../ops/runbook.md`) — a path that means nothing on GitHub. A GitHub blob URL into a
[mapped repo](multiple-repositories.md#github-blob-urls) matches through the edge it already resolved to, so one link
works in both places:

```markdown
[Deploys](https://github.com/acme/ops/blob/main/docs/runbook.md#deploys)
```

```yaml
links:
  - target: https://github.com/acme/ops/blob/main/docs/runbook.md#deploys   # or ops/runbook.md#deploys
    type: includes
```

## Includes that never expand

An include edge that no standalone link matches leaves the page showing an ordinary link, which looks deliberate. The
[`include-link-missing`](validation.md#rules) rule (`warn`) reports it — typically a link woven into a sentence, an
anchor that differs from the sidecar's, or a blob URL into a repo with no checkout mapped. It uses the renderer's own
matching, so it reports exactly the includes a page leaves unexpanded.

## Anchor ranges

`target: doc.md#some-heading` includes from that heading to the next heading of the same or shallower level. A target
with no anchor includes the whole document.

## Heading levels and search attribution

Both have global defaults in `weft.config.yaml`, which a sidecar link overrides per edge with the same field names:

```yaml
# weft.config.yaml
includes:
  headingShift: auto    # auto | none
  contributes: source   # source | inline
```

| Option | Values | Meaning |
|--------|--------|---------|
| `headingShift` | `auto` (default) | Included headings demote beneath the heading level at the point of inclusion, so the composed page reads as one outline |
| | `none` | Source levels are preserved — for sources already authored at the right depth |
| `contributes` | `source` (default) | Included content is searchable only under its source node, so search never returns duplicate hits |
| | `inline` | Also attributed to the including document. Declared and recorded on the edge; search does not honour it yet |

Resolved values are stamped onto each `includes` edge at build time, so a manifest consumer never needs the config.

## Cycles

The [`include-cycle`](validation.md#rules) rule (`error`) reports documents that include each other, at document
granularity, once per cycle. The renderer keeps its own independent visited set and depth cap, so a manifest that
predates the rule cannot hang the page — the cycle point renders as an ordinary link with a notice.

## Detecting drift

An include edge is a sidecar link, so it can carry [`asserts`](validation.md#assertions): assert `lineCount` or
`modified` on the included section's document and `weft check` reports when a source changed after the composition
was last reviewed.
