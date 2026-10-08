# Declare links in sidecar files

For authors who need links that inline Markdown cannot express. After it you can write a `.weft` sidecar beside a
document, give its links types and labels, and point them at anchors inside OpenAPI specs or at sections of the
source document itself.

## Sidecar files

Ordinary Markdown links between documents become edges on their own. For edges that cannot be expressed as inline
Markdown links — cross-format relationships, anchor-level connections to OpenAPI operations, or links with explicit
type labels — create a sidecar file next to the source document.

A sidecar for `architecture.md` is named `architecture.md.weft`.

```yaml
# architecture.md.weft
links:
  - target: api.yaml#/paths/users/get
    type: implements
    label: User list endpoint

  - anchor: "#data-flow"
    target: design-decisions.md#caching-strategy
    type: specifies

  - target: research.md
    type: see-also
```

In a multi-project setup, a `target` may carry another project's slug to cross products; see
[Cross-project edges](multiple-projects.md#cross-project-edges). A `target` may also be a GitHub blob URL into a mapped
repo; see [GitHub blob URLs](multiple-repositories.md#github-blob-urls).

## Sidecar fields

| Field | Required | Description |
|-------|----------|-------------|
| `target` | yes | Path to the target document, relative to `docsDir`. Append `#anchor` to target a specific anchor |
| `type` | no | Edge type. Defaults to `references` |
| `anchor` | no | Anchor within the *source* document where the edge originates (e.g. `#heading-slug`) |
| `label` | no | Human-readable label for the edge, shown in linked-items sidebar |
| `pending` | no | The target is known not to exist yet — see [Pending references](validation.md#pending-references) |
| `asserts` | no | Claims this link makes about its target — see [Assertions](validation.md#assertions) |
| `sourceHash` | no | On a `derives-from` edge: the source's `contentHash` when the output was generated — see [Staleness](generated-artifacts.md#staleness) |
| `headingShift` | no | On an `includes` edge: `auto` (default) or `none` — see [Compose a document](composed-documents.md#heading-levels-and-search-attribution) |
| `contributes` | no | On an `includes` edge: `source` (default) or `inline` — see [Compose a document](composed-documents.md#heading-levels-and-search-attribution) |

An `anchor` the source document does not define is reported by the `edge-source-anchor-missing`
[rule](validation.md#rules).

## Edge types

Any string is valid as an edge type. Conventional types:

| Type | Meaning |
|------|---------|
| `implements` | This doc/anchor implements what the target specifies |
| `specifies` | This doc defines behavior implemented elsewhere |
| `references` | General reference (default) |
| `see-also` | Related reading, no formal dependency |
| `annotates` | This doc adds context to a specific part of the target |
| `derives-from` | This was generated from the target — see [Track generated outputs](generated-artifacts.md) |
| `includes` | This doc renders the target (or one section of it) inline — see [Compose a document](composed-documents.md) |

The sidecar format, and how weft resolves link targets and anchors, is described in
[Links and anchors](../design/links-and-anchors.md).
