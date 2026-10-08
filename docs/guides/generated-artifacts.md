# Track generated outputs

For documentation sets that publish outputs built from their sources, usually PDFs. Those are the copies that reach
external readers, and the copies nobody looks at again after building them. After this guide you can register them in
the graph and have `weft check` fail when one has fallen behind its source.

## Register artifacts

Weft indexes `.md`, `.markdown`, `.yaml` and `.yml` (plus whatever [`extensions`](configuration.md#extensions)
added). A PDF is none of those, so it is not a node and an edge has nothing to point at. Register outputs explicitly:

```yaml
artifacts:
  - "**/*.pdf"
```

Globs are relative to each docs root, the same as document indexing, and `ignore` applies to them too. An artifact
node carries an id, a content hash and nothing else it does not need: no anchors, no line count, and it never appears
in navigation or renders in the reader. An output that lives outside every docs root is declared by a
[contribution](external-tools.md#contribution-files) instead, with `type: artifact`.

> **Artifacts hash their bytes, documents hash their normalized text.** Both fill `contentHash` with the same SHA-256
> and truncation, but a document's hash strips a BOM and converts CRLF to LF first. That is a text operation, and a
> binary holds byte sequences that merely look like line endings. The two are never compared against each other.

## Staleness

Declare what an output was built from, and from which version of it, with a `derives-from` edge carrying
`sourceHash` — the source's `contentHash` at the moment of generation:

```yaml
# handbook.pdf.weft — the sidecar belongs to the artifact, so edges run output -> source
links:
  - target: handbook.md
    type: derives-from
    sourceHash: 8739a4a018eb3517

  # A template change invalidates the output too.
  - target: theme.md
    type: derives-from
    sourceHash: 41c0f2a9de7b0c85
```

When the source's current hash no longer matches, `artifact-stale` reports it — an error by default, because the stale
copy is the one the audience sees. Each source is checked on its own, so several `derives-from` edges cover an output
whose inputs are more than one document.

An edge with no `sourceHash` reports as `artifact-source-unrecorded` at `info`. Nothing is known to be wrong:
`derives-from` is also a fair way to express that two things are related without asking for the relationship to be
checked. It stays visible and countable rather than silent.

Staleness is judged by content hash, never by modification time
([why](../decisions/0019-content-hashes-not-timestamps.md)).

## Record the source hash

The hash has to be recorded by whatever does the generating, since that is the only party that knows which version it
read. The recipe is fixed so a build can compute it without running Weft: strip a leading BOM, convert CRLF to LF,
SHA-256, keep the first 16 hex characters. `@lepid-labs/weft-core` exports it as `hashContent`.

A build that already knows what it produced is usually better off declaring the whole thing — the artifact node and
its `derives-from` edges — through a [contribution file](external-tools.md#contribution-files).
