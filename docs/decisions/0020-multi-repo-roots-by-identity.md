# 0020 Name repos by identity, never by machine layout

Status: accepted

## Context

A docs graph can span several repositories: a meta repo whose projects live in other repos (#69). A project pointing
at another repo by a relative path (`../other-repo/docs`) bakes one machine's checkout layout into committed config,
and into every manifest derived from it.

## Options

- **Relative paths to sibling checkouts**: work only where every checkout sits where the author's did.
- **Repo identity plus a per-machine map**: config names the repo, and each machine says where its checkout is.

## Decision

**Roots are identified by repo, never by where a checkout happens to be.**

- A `projects` entry may name a `repo` (`org/repo`) instead of embedding a relative path. The `repos` map says where
  that checkout lives, overridable per machine in `weft.config.local.yaml`. The local file may set only per-machine
  options (`repos`, and the style keys of [0025](0025-lepid-design-styling.md)), so committed and local config cannot
  quietly diverge.
- Everything derived from a repo-backed root (`WeftProjectRef.docsDir`, `DocsRoot.dir`) stays checkout-relative, with
  the identity alongside, so manifests never embed one machine's paths. For the same reason, repo-backed roots are
  excluded from `docOrder`'s path-prefix matching; order them by node id.
- A GitHub blob URL into a mapped repo resolves against the checkout and becomes an ordinary edge (recorded in
  `resolvedFrom`) when the file lands in a configured docs root. Any `blob/<ref>/` is accepted, since Weft serves the
  working tree. Unmapped repos, non-blob URLs and out-of-root paths stay external links, and nothing is fetched.
- `weft index` never writes into a checkout it does not own. An external root's manifest lands under the meta repo's
  `.weft/projects/<slug>/`, with `manifestInRepo: true` as the per-project opt-in, and `projects.json` records where
  each manifest actually is.

## Consequences

- What multi-repo blessed was already true, and is now locked in: out-of-tree roots indexing into one namespaced
  graph, cross-repo relative links resolving to edges, per-root git history (each node dated from its own repo), and
  reads and watch over external roots. All of it worked by accident through plain `resolve()`; `multi-repo.test.ts`
  pins each with two real git repos, so none can regress silently.
- Serving a repo without a checkout builds on the same map ([0021](0021-serve-without-a-checkout.md)).
- Setup is covered in the [multiple repositories guide](../guides/multiple-repositories.md); namespacing and manifest
  output in [graph and manifest](../design/graph-manifest.md); blob URL resolution in
  [links and anchors](../design/links-and-anchors.md).

## History

- 2026-08-25 to 2026-08-27: `weft.config.local.yaml` could set only `repos`; the style keys were added with
  [0025](0025-lepid-design-styling.md).
