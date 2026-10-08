# 0007 Write sidecar files in YAML

Status: accepted

## Context

Sidecar files (`<file>.weft`) store links and annotations for binary or converted-format sources where the source
cannot carry the metadata itself (PPTX, PDF, Figma). They are committed to the repo, reviewed in PRs, and occasionally
edited by hand.

## Options

- **JSON**: universal, strict syntax, but no comments, noisy for arrays of objects (closing braces and brackets), and
  poor multiline string support.
- **YAML**: human-readable, supports comments and clean multiline strings, compact for arrays of objects. Already in
  the ecosystem (OpenAPI specs, Markdown frontmatter).
- **TOML**: good for flat config, but its `[[array]]` syntax adds visual noise when a file is mostly arrays of objects
  (links, annotations), and it scales poorly past 20 entries.

## Decision

**YAML.**

- Sidecars are arrays of structured objects with occasional free text (annotation bodies, labels). YAML's indented
  list syntax is the most scannable format for that shape of data.
- It supports inline comments, useful for noting why a link exists or flagging a broken one.
- It is already familiar: OpenAPI specs are YAML, and so is Markdown frontmatter. Users learn no new format.
- Block scalars (`|` or `>`) handle multiline annotation bodies cleanly.

```yaml
# overview.pptx.weft
source: docs/slides/overview.pptx
converted: docs/slides/overview.html

links:
  - anchor: slide-4
    elementSelector: "#slide-4 .shape-3"
    target: docs/api.yaml#/paths/users/get
    type: references
    label: User API

  - anchor: slide-7
    target: docs/db-schema.md#users-table
    type: references
    label: Users table schema

annotations:
  - anchor: slide-2
    author: alex
    created: 2025-03-19
    body: This slide understates the caching layer complexity.

  - anchor: slide-4
    author: dana
    created: 2025-03-20
    body: |
      The API contract shown here is outdated.
      See the updated spec for the new pagination params.
```

## Consequences

YAML's implicit typing has to be read around. A sidecar's `sourceHash` is sixteen hex characters, and one that happens
to be all digits would parse as an integer and lose its leading zeros, so it is read from the scalar's source text, the
same way a frontmatter `version` is (an unquoted `2.10` would otherwise parse as 2.1). The sidecar fields in use today
are described in [links and anchors](../design/links-and-anchors.md) and the
[sidecar links guide](../guides/sidecar-links.md).
