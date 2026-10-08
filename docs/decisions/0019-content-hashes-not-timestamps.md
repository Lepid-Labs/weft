# 0019 Content hashes and git author dates, never timestamps

Status: accepted

## Context

Several of Weft's questions are about change. Is a generated artifact stale against its source? Is a manifest stale
against the tree it was built from? When was a document last modified? These checks matter most in CI and on fresh
clones, and git preserves neither file mtimes nor, across platforms, line endings and byte-order marks.

## Options

### For detecting change

- **File mtime**: unusable. Git preserves none, so a clone or CI checkout makes every file look simultaneously
  modified: meaningless in exactly the environment the checks run in.
- **A hash of the raw bytes**: would call every document changed the moment CI checked it out with different line
  endings from the tree that produced it, the same objection that rules out mtime.
- **A hash of normalized content**: strip the BOM, convert CRLF to LF, then hash.

### For a document's `modified` date

- **mtime**: a clone would date every file to the checkout.
- **The last commit's committer date**: a rebase rewrites it, reporting the whole branch as changed today.
- **The last commit's author date**: survives clones and rebases.

### For a manifest's provenance

- **A sidecar file next to the manifest**: every direct reader of `manifest.json` (SSR, `gen-manifest.mjs`) would need a
  second read, or get a graph of unknown staleness.
- **A `build` block inside the manifest**: one read carries both.
- **Naming its hash `sourceHash`**: rejected. `WeftEdge.sourceHash` already means "the source's hash when an artifact
  was generated", and a second field meaning "hash of everything the indexer read" would collide on the most
  confusable axis available. The field is `inputsHash`.

## Decision

**Change is detected by comparing content hashes, and dates come from git author dates. Never mtime.**

- **Content hashes normalize first**: strip the BOM, CRLF to LF, SHA-256, first 16 hex characters. The recipe is
  documented so an external build can declare a hash rather than have Weft recompute it. The hash covers frontmatter;
  no file size is recorded, since nothing needs it and it would be ambiguous beside a normalizing hash.
- **Staleness compares a recorded hash, never a timestamp.** A `derives-from` edge carries `sourceHash`, the source's
  hash when the artifact was generated, and `artifact-stale` fires when the source's current hash differs. Only the
  generator knows that hash, which is why the recipe is documented for outside reproduction.
- **A manifest carries its own provenance**: an optional `build` block (`builtAt`, `inputsHash`), with the inputs hash
  computed from content, never mtime.
- **`modified` is the last commit's author date**, from the single `git log --raw` walk per docs root. Git failing for
  any reason yields no dates rather than an error: a docs set unpacked from a tarball still has to index.

## Consequences

- Hashes and dates mean the same thing on a laptop, in CI and on a fresh clone.
- A test guards the inputs hash against an mtime-only change, so mtime cannot creep back in later.
- Without git history there are no dates. Serving a repo without a checkout uses a partial clone rather than a tarball
  for exactly this reason ([0021](0021-serve-without-a-checkout.md)).
- The persisted search index planned in [0006](0006-search-engine.md) still compares mtimes and must be reconciled
  with this record before it is built.
- Details live in the designs: node hashes and the `build` block in [graph and manifest](../design/graph-manifest.md),
  what the inputs hash covers and how freshness is reported in [manifest freshness](../design/manifest-freshness.md),
  and the staleness and assertion rules in [validation](../design/validation.md).
