# Graph source requirements

Where the graph's content comes from beyond one docs directory: several projects and repositories, repositories
fetched rather than checked out, external builds, generated outputs, and code.

## RQ-024 Multiple projects

Status: agreed

One config can index several docs roots into one graph. With projects configured, node ids are namespaced by project
slug, each project gets its own manifest beside a merged one, and an edge belongs to the project of its source node.
Relative links and sidecar targets that cross projects resolve to the other project's node. A config with a single
docs directory keeps bare ids and one manifest.

## RQ-025 Repositories named by identity

Status: agreed

A project can name the repository holding its docs by identity (`org/repo`); where that repository is checked out is
per-machine configuration. Manifests never embed one machine's paths.

Acceptance criteria:

- The local config overlay may set only repository locations and styles; any other option there is an error.
- A project naming a repository that no map locates fails at load, pointing at the local file.

Set by [decision 0020](../decisions/0020-multi-repo-roots-by-identity.md). Supports UC-016.

## RQ-026 GitHub blob URLs resolve into mapped repositories

Status: agreed

A GitHub blob URL, at any ref, into a mapped repository becomes an ordinary edge when its file falls inside a
configured docs root, with the URL recorded. URLs into unmapped repositories, non-blob URLs, other hosts and paths
outside every docs root stay external links, and nothing is fetched.

Set by [decision 0020](../decisions/0020-multi-repo-roots-by-identity.md).

## RQ-027 Indexing never writes into a checkout it does not own

Status: agreed

The manifest for a docs root outside the project root is written under the project root, and an index of projects
records where each manifest is. A project can opt in to writing its manifest into its own checkout.

Set by [decision 0020](../decisions/0020-multi-repo-roots-by-identity.md).

## RQ-028 Serve without a checkout

Status: agreed

Weft can serve a GitHub repository at a branch, tag or commit (remote HEAD by default) without a local checkout. It
fetches the repository, reads its config, and fetches the repositories it references that no local checkout covers; a
configured local checkout always wins over a fetch.

Acceptance criteria:

- Fetched roots keep their git history, so `modified` dates and history-based checks behave as over a checkout.
- Fetched copies are cached by resolved commit. A branch is re-resolved after 15 minutes, or at once on request. An
  interrupted fetch is redone.
- Fetched roots are read-only: nothing is written into them, and they are not watched.
- Private repositories authenticate with a token from the environment or the GitHub CLI, which is never written to
  repository config or visible in a process listing.
- GitHub only; other hosts are out of scope.

Set by [decision 0021](../decisions/0021-serve-without-a-checkout.md).

## RQ-029 Several sites in one repository

Status: agreed

Weft can treat a subdirectory of a repository, local or fetched, as the root, with its config and paths resolving
from there. The subdirectory must be a relative path that stays inside the repository.

Set by [decision 0021](../decisions/0021-serve-without-a-checkout.md).

## RQ-030 External builds contribute through one file format

Status: agreed

A build can add nodes, edges and metadata patches to the graph by writing one contribution file (JSON or YAML). Weft
has no per-tool adapters.

Acceptance criteria:

- Source is indexed first, then contributions apply in path-sorted order, a later one overriding an earlier, then
  ordering and navigation filtering apply to the combined set.
- A patch may not set a node's id, type, anchors or project; trying fails, naming the field.
- A patch for a node that does not exist warns and is ignored. A contributed node colliding with an indexed one is
  merged over, with a warning.

Set by [decision 0018](../decisions/0018-one-contribution-format.md).

## RQ-031 Generated artifacts are nodes

Status: agreed

Outputs registered by glob (relative to each docs root, honouring ignore) or by contribution become artifact nodes:
an id and a hash over raw bytes, with no anchors or line count, never shown in navigation. A glob matching an indexed
document loses to the document. An artifact is never read as text: it is not searched, served as a document, or
rendered.

## RQ-032 Code files reference documentation

Status: draft

A comment in a code file can reference a document or anchor, and Weft records the reference as an edge from the code
file.

Supports UC-002, UC-007, UC-011.
