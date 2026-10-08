# Integrate a build tool or renderer

For projects that put a renderer or build tool between their sources and what readers receive. After it you can have
the build tell weft what it knows — generated documents, resolved links, metadata — keep build output out of the
graph, and understand how weft treats links written against the published form or still holding template syntax.

## Contribution files

Weft indexes source. A build knows things source cannot express: what a templated link resolved to, what it generated
and from what. Rather than an adapter per tool ([why](../decisions/0018-one-contribution-format.md)), Weft reads one
**contribution file** that any build can write — the same shape as a linter emitting SARIF or a compiler emitting
source maps. Point at it with globs relative to the project root:

```yaml
contributions:
  - build/weft-contribution.json
```

JSON or YAML, both accepted.

```json
{
  "version": 1,
  "tool": "my-renderer 1.4.0",
  "nodes": [
    { "id": "generated/summary.md", "type": "markdown", "title": "Generated Summary" }
  ],
  "edges": [
    { "from": { "node": "generated/summary.md" }, "to": { "node": "index.md" }, "type": "derives-from" }
  ],
  "metadata": {
    "handbook.md": { "title": "Handbook v2.41" }
  }
}
```

| Key | Purpose |
|-----|---------|
| `version` | Contribution schema version. Currently `1` |
| `tool` | Optional. Named in any message about this file, so a bad contribution is traceable |
| `nodes` | Documents the build knows about that indexing source cannot discover |
| `edges` | Relationships the build knows about. Any edge `type` is valid; `derives-from` is the convention for generated output |
| `metadata` | Field patches for documents Weft already indexed, keyed by node id |

A contributed node may also be an output outside every docs root, declared with `type: artifact`; see
[Track generated outputs](generated-artifacts.md).

## Pipeline order

The order is part of the contract, not an implementation detail:

1. **Weft indexes source.** Indexing rendered output instead would lose sidecars and source structure.
2. **Contributions apply**, in the order their files sort by path — so a merge is reproducible regardless of how the
   filesystem enumerates a glob. A later contribution overrides an earlier one.
3. **Ordering and nav filtering apply last**, to the combined set, so a contributed document sorts and honours
   `docOrder` exactly like an indexed one.

## What a patch may set

`metadata` may set `title`, `description`, `theme`, `ogImage`, `hiddenFromNav`, `contentHash` and `lineCount`.

It may **not** set `id`, `type`, `anchors` or `project`. The first three are facts about the file Weft read and the
last is graph topology; a build contributes what Weft cannot see, and overriding extraction output is not that.
Attempting it fails with the offending field named.

Two situations are reported rather than fatal, since neither makes the graph unusable:

- a patch for a node id that does not exist is ignored with a warning
- a contributed node whose id Weft **already indexed** is merged over, with a warning — usually the signature of build
  output landing inside `docsDir`

## Build output

If a renderer emits into `docsDir`, Weft indexes every generated file as a node alongside the source it came from, and
every document appears twice.

`_site/`, `_book/`, `.quarto/`, `dist/` and `node_modules/` are excluded by default. Deliberately **not** excluded:
`site/`, `public/`, `build/` and `out/` — all commonly hold sources, and hiding real documents by default is worse than
indexing output. If your build writes to one of those inside `docsDir`, add it to
[`ignore`](configuration.md#all-options) yourself.

## Links to a published form

Authors link to what a reader will actually open, so a documentation set that publishes is full of links naming the
rendered copy rather than the source:

```markdown
See [the guide](guide.html) for setup.
```

Nodes are the source documents, so `guide.html` is not one. Instead of storing an edge to nothing, when a link target
is not a node and exactly one source document shares its path stem, the edge resolves to that source — `guide.html`
becomes an edge to `guide.md`, anchor intact. The manifest records the original path in `resolvedFrom`, and the
linked-items sidebar shows it on hover, so the inference is visible rather than silent.

The rule is deliberately narrow:

- only `.html`, `.htm` and `.pdf` targets are treated as a published form. Sharing a stem with a document does not
  make `arch.png` a reference to `arch.md`
- the target must not already be a node
- exactly one source may share the stem. If both `guide.md` and `guide.yaml` exist, the link is left alone rather than
  guessed at

A published-form link with no matching source stays unresolved, and is reported by
[`edge-target-missing`](validation.md#rules) only if its extension is one Weft indexes — otherwise it shows in the
sidebar as **not found**.

## Templated links

A link whose path still contains a placeholder — `{{version}}/api.md`, `${lang}/guide.md`, `{% raw %}`,
`<%= path %>` — has not been resolved yet; the renderer decides what it points at. Weft records no edge for these
rather than inventing one to the literal text, which would make [`edge-target-missing`](validation.md#rules) report
correct source as broken. If the build knows what such a link resolved to, declare the edge in a
[contribution file](#contribution-files).

Template syntax in the *anchor* is ignored, since it does not change which document is targeted.
