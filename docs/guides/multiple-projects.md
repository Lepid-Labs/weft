# Index several projects into one graph

For monorepos holding several products, each with its own `docs/` tree. After it you can index them all into one
graph, link between products, and order their documents together in the navigation. When the products live in
different repositories, read [Combine docs from several repositories](multiple-repositories.md) next.

## Configure projects

Set `projects` instead of `docsDir` in `weft.config.yaml`:

```yaml
projects:
  - name: Alpha
    docsDir: products/alpha/docs
  - name: Beta
    docsDir: products/beta/docs
    slug: b
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Display name, shown as a group header in the left-hand nav |
| `docsDir` | yes | Directory to scan for this project's documents, relative to project root — or to the mapped checkout when `repo` is set |
| `slug` | no | Id/URL namespace. Defaults to a kebab-cased `name` (`"Design System"` → `design-system`) |
| `repo` | no | Repo identity (`org/repo`) whose checkout holds this project's docs — see [Combine docs from several repositories](multiple-repositories.md) |
| `manifestInRepo` | no | Write this project's manifest into its own checkout even when it lives outside the project root. Default `false` — see [Manifest placement](multiple-repositories.md#manifest-placement) |

Indexing then writes one manifest per project plus a merged one; see
[Multi-project output](configuration.md#multi-project-output).

## Node IDs

With `projects` set, node IDs are namespaced by slug — `products/alpha/docs/api.md` becomes `alpha/api.md`, and its
URL is `/alpha/api`. Each project's `README.md` is addressed by the project path alone (`/alpha`). This keeps IDs
unique when two products both have an `api.md`.

Configs using plain `docsDir` are unaffected: IDs stay relative to `docsDir` with no prefix.

## Cross-project edges

A relative Markdown link that leaves its own project and lands inside another one resolves to that project's node
rather than being dropped:

```markdown
<!-- in products/alpha/docs/features.md -->
Alpha syncs through the [Beta API](../../beta/docs/api.yaml#listUsers).
```

[Sidecar](sidecar-links.md) targets take a slug prefix to cross products, or stay bare to resolve within their own
project:

```yaml
# products/alpha/docs/features.md.weft
links:
  - target: beta/api.yaml#/components/schemas/User   # another product
    type: implements

  - target: README.md                                # this product
    type: see-also
```

## Document order

In multi-project mode, [`docOrder`](configuration.md#all-options) entries may be written either as a path relative to
the project root or as a namespaced ID — both resolve to the same node:

```yaml
docOrder:
  - products/beta/docs/api.yaml
  - alpha/features.md
```

Ordering is global, so `docOrder` can interleave documents from different products. A repo-backed project's documents
are ordered by namespaced ID only — its `docsDir` is relative to another checkout, so a project-root-relative path
cannot name them.
