# 0018 One contribution format, never per-tool adapters

Status: accepted

## Context

External builds (generators, publishers, converters) produce documents, outputs and relationships that Weft cannot see
by reading source. Weft needs to take those in without learning each tool, and without losing what it already knows
from source.

## Options

- **Per-tool adapters**: Weft would have to learn each tool's output and vocabulary.
- **Indexing the rendered output**: would lose sidecars and source structure.
- **One contribution format**: any build writes nodes, edges and metadata patches in one shape, and Weft merges them.

## Decision

**A build writes one contribution format (nodes, edges, metadata patches), and Weft merges it after indexing source.**

- **Merge order is contract, not detail.** Source first, then contributions in sorted file order, then ordering and
  nav filtering over the combined set.
- **Patches may not touch `id`, `type`, `anchors` or `project`.** Those are extraction facts and topology; a build
  contributes what Weft *cannot* see.
- **A contributed node colliding with an indexed one warns rather than fails.** It usually means build output is
  landing inside `docsDir`.

## Consequences

- The same shape as `ValidatorRegistry` and host render passes ([0027](0027-host-contributed-render-passes.md)): other
  tools contribute, and Weft never learns one corpus's vocabulary.
- Anything that runs after the merge sees contributed nodes. Resolving links to a document's published form runs after
  contributions, so a build-declared node can be a link's target, and an artifact can be registered by a contribution
  ([links and anchors](../design/links-and-anchors.md), [validation](../design/validation.md)).
- An external build can declare a content hash rather than have Weft recompute it, which is why the hash recipe is
  documented ([0019](0019-content-hashes-not-timestamps.md)).
- The format is described in [graph and manifest](../design/graph-manifest.md) and the
  [external tools guide](../guides/external-tools.md).
