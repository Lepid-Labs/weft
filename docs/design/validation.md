# Validation

The validation stage reads a built manifest and reports what is wrong with the graph: links that do not resolve,
claims that no longer hold, generated outputs that fell behind their sources, copies that drifted apart, and include
edges that cannot expand. `weft analyze` reports the findings and `weft check` gates CI on them. This design covers
the registry and runner, severity, git history, and each rule family. It serves the validation requirements in
[requirements](../requirements.md).

## Approach

### Registry and runner

A `ValidatorRegistry` holds the registered checks, and `validateManifest` runs them over a built manifest and returns
`Diagnostic`s. Validation reads the finished manifest and never mutates it, so a check can be added without touching
the indexer. A validator that throws becomes one `validator-error` diagnostic rather than taking down the run. It is
the same shape as contributed render passes and manifest contributions: other code contributes, and the core never
learns one corpus's vocabulary.

### Severity

Severity is config's, not the validator's. A check emits `Finding`s that carry no severity, and the runner stamps each
one from the `rules` config over the rule's declared default, so the same finding can be an error in one project and
a warning in another. A rule set to `off` does not run, and `isEnabled` lets an expensive validator skip work it would
throw away. A check that needs two severities, such as a hard failure and a softer "known pending" variant, declares
two rule ids, so each stays independently configurable.

### Git history

Git history is gathered once by the runner, not by each check. `ValidationContext.history` is keyed by node id, so no
validator repeats project namespacing, and the walk is skipped entirely unless an enabled rule declares
`needsHistory`. It is the only IO validation does. One `git log --raw -M` yields dates, blobs and renames together,
and `lastCommitDates` is a view over it, so there is one parser rather than one per question.

`fileHistory` ([git.ts](../../packages/core/src/git.ts)) walks `git log --raw` once per docs root at a chosen depth.
`full` adds `-M` for every blob each path has held and for rename destinations; `dates` passes `--no-renames`
(rename detection is on by default) when only nodes' `modified` dates are wanted. `WeftService` caches the walk per
root: indexing walks at dates depth, and `validate()` walks at full depth, or upgrades a cached dates walk once, and
hands the result to `validateManifest`. `weft check` therefore runs `git log` once per root. Outside a repository the
history is empty rather than an error, and both history-based checks treat empty as "nothing to say", not as evidence
that all is well.

Rename following is what makes divergence detection work at all. A document renamed at any point has its pre-rename
history filed under the old path, so without following renames the blob history of every moved document is stranded
under a name nothing points at. `parseGitLog` notes each rename before recording that entry's blobs and canonicalises
every path through the chain, which works only because git walks newest-first. The same map lets
`edge-target-missing` say "setup.md moved to guides/setup.md" instead of reporting an unexplained dangling link
(#28). That enriches the existing rule rather than adding one, as a reworded heading already gets a suggested anchor
from `Anchor.text`. A destination since deleted is not suggested.

### Unresolved edges

A missing document and a missing anchor have different causes and different fixes, and a deliberately pending
reference is not breakage at all, so these are separate rules: `edge-target-missing`, `edge-anchor-missing`,
`edge-pending` and `edge-pending-resolved`, with `edge-source-anchor-missing` for an anchor the link starts from.
`pending: true` on a sidecar link moves it to the `info` rule `edge-pending`, so it stays countable instead of being
suppressed, and `edge-pending-resolved` reports the marker once the target exists.

Links to file types Weft does not index (images, PDFs) are skipped. Indexing makes an edge for any path inside a docs
root, so those edges exist but were never going to resolve. `INDEXED_EXTENSIONS` is shared by the indexing glob and
this check so the two cannot drift ([graph and manifest](graph-manifest.md#which-files-are-indexed)).

### Copies: duplicate and diverged

A copy is two different problems, and only one of them is findable by hashing. `node-duplicate` compares current
content hashes; `node-diverged` asks git whether two paths ever held the same blob. The second exists because the
first goes silent at exactly the wrong moment: two copies stop sharing a hash the instant they start being a
correctness problem, so hash comparison reports them only while they are still fine. Both target the graph rather
than a node, because nothing knows which copy came first and naming one would imply it is the original. Groups are
reported once, keyed by their sorted id set, so copies sharing several historical blobs do not produce a finding per
blob.

### Artifacts and staleness

An artifact is a node with nothing a document has: a generated output registered by the `artifacts` globs or by a
contribution, carrying an id, a byte hash and `hiddenFromNav`, with no anchors and no line count. Its hash is over raw
bytes while a document's is over normalized text: same field, two recipes, never compared with each other, because
normalizing is a text operation and a PDF holds byte sequences that only look like line endings. A wide glob that
catches an indexed document loses to the document.

Registering artifacts was mostly guard work, because reading a binary as UTF-8 does not throw: it returns a lossy
decode, so every node-reading path succeeded and produced nonsense wearing every sign of success. The search index
filled with binary noise that matched queries by accident, `service.read()` answered the doc API with mojibake and a
200, and `DocView` fell through to the Markdown branch and drew it. Each now skips or refuses an artifact, and
`read()` also refuses any path that was never a document. This is why the node type had to reach the UI at all:
without it the failure is silent everywhere.

Staleness compares a recorded hash, never a timestamp ([0019](../decisions/0019-content-hashes-not-timestamps.md)).
A `derives-from` edge carries `sourceHash`, the source's hash when the artifact was generated, and `artifact-stale`
fires when the source's current hash differs. Only the generator knows that hash, which is why the content hash recipe
is published ([graph and manifest](graph-manifest.md#interfaces)). Each source of a multi-input artifact has its own
edge and is checked separately, so a template or stylesheet change registers like an edit.

### Assertions

A link can carry a claim, and the claim is checked. `asserts` on a sidecar link states what the source believes about
its target (`version`, `lineCount`, `modified`, read as described in
[graph and manifest](graph-manifest.md#computed-node-properties)), and each is compared with the target's current
state. They are four rules because they fail differently. A stale `version` is an error: nothing else signals when a
version pointer rots, and the reader acting on it is often external. Length and date warn, since they drift with
ordinary editing. `assert-unverifiable` covers a claim nothing can check: an assertion the author believes is a check
and is not. `lineCount: "~3500"` allows ten percent either way, because prose claims approximate lengths and an exact
assertion would be wrong on the next edit. `modified` matches as a prefix of the ISO timestamp (`"2026-07"` accepts any
day that month). Assertions are skipped on a pending or unresolvable edge: that is edge resolution's finding, and
reporting it twice says nothing new.

### Include rules

`include-cycle` reports documents that include each other, at document granularity, one finding per strongly
connected component. The renderer guards cycles too ([rendering pipeline](rendering-pipeline.md#include-expansion)).
`include-link-missing` runs the renderer's own `includeMatcher` over each includer's recorded `blockLinks`, so
`weft check` reports exactly the includes a page leaves as plain links, including node-id-relative cross-project hrefs,
which no edge records but which do expand.

## Alternatives

- **One unresolved-edge rule, with pending references suppressed.** It would conflate two fixes and hide references
  that should stay countable.
- **Severity chosen by the validator.** It would make severity unconfigurable per project.
- **Each history check running git itself.** It would run one subprocess and one parser per question.
- **Hash comparison alone for copies.** It goes silent once copies drift.
- **Modification times for staleness.** Git preserves none, so a clone or CI checkout makes every file look
  simultaneously modified, which is meaningless in exactly the environment the check runs in.

## Interfaces

Rules, their default severities, and the `rules` config that overrides them (`error`, `warn`, `info` or `off`);
`weft analyze --list-rules` prints the current set. Types are in
[validate/types.ts](../../packages/core/src/validate/types.ts).

| Rule | Default | Rule | Default |
|------|---------|------|---------|
| `edge-target-missing` | error | `assert-version-mismatch` | error |
| `edge-anchor-missing` | error | `assert-line-count-mismatch` | warn |
| `edge-source-anchor-missing` | error | `assert-modified-mismatch` | warn |
| `edge-pending` | info | `assert-unverifiable` | warn |
| `edge-pending-resolved` | info | `artifact-stale` | error |
| `node-duplicate` | info | `artifact-source-unrecorded` | info |
| `node-diverged` | warn | `include-cycle` | error |
| `validator-error` | error | `include-link-missing` | warn |

`artifact-source-unrecorded` is `info` rather than `warn` because `derives-from` is also fair as plain modelling.
`include-link-missing` is `warn` so that upgrading fails no build. `weft analyze` always exits 0; `weft check` exits
1 on any error-severity diagnostic.

## Risks

- Outside a git repository the history-based rules report nothing, which reads the same as a clean result.
- A generator that does not record `sourceHash` leaves its artifacts unchecked; `artifact-source-unrecorded` makes that
  visible only at `info`.
