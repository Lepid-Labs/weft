# Constraint requirements

The design constraints every part of Weft holds to, and what Weft deliberately leaves out of its first release.

## RQ-001 Repository-native

Status: agreed

Weft indexes the documentation and the codebase in place, in the repository. It uses no external service and no
separate content store.

## RQ-002 Standard Markdown links

Status: agreed

Links between documents are standard Markdown and render on GitHub and in any editor. Weft identifies graph edges by
resolving those links, never by requiring a custom link syntax.

Set by [decision 0016](../decisions/0016-standard-markdown-links.md).

## RQ-003 Derived, not hand-maintained

Status: agreed

The graph manifest is generated from the documents and is never edited by hand. Humans write documents; Weft builds
the graph.

## RQ-004 Any document as entry point

Status: agreed

Whichever document a reader opens, it shows its full context: what it implements, what specifies it, and what
references it.

Supports UC-001, UC-005.

## RQ-005 Configuration is plain data

Status: agreed

Project configuration is a YAML or JSON file at the project root that loads without running code and without the
project depending on any Weft package.

Acceptance criteria:

- A wrong type or a bad enum value fails at load, naming the offending field.
- An unknown key warns rather than fails.
- A legacy JavaScript or TypeScript config fails with a message telling the user how to migrate.

Set by [decision 0017](../decisions/0017-static-config.md).

## RQ-006 Change is measured by content, never by modification time

Status: agreed

Wherever Weft decides whether something changed — staleness, freshness, a document's `modified` date — it compares
content hashes or reads git author dates. It never reads file modification times, which a clone or CI checkout resets.

Set by [decision 0019](../decisions/0019-content-hashes-not-timestamps.md).

## RQ-007 Relationships are explicitly authored

Status: agreed

Every edge in the graph comes from a link or declaration someone wrote: a Markdown link, a sidecar entry, or a
contribution file. Weft does not infer relationships from content.

## RQ-008 No real-time collaboration

Status: agreed

Weft does not support several users navigating or editing together in real time. Excluded from the first release.

## RQ-009 No mobile layout

Status: agreed

Weft provides no layout designed for mobile devices. Excluded from the first release.
