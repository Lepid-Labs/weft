# Validate your docs

For anyone keeping a documentation set correct in CI. It covers what `weft analyze` and `weft check` report, how to
tune each rule's severity, how to mark a link at something not yet written, and how a link can state a claim about its
target that weft then checks.

## What the checks cover

[`weft analyze`](cli.md#weft-analyze) reports and always passes; [`weft check`](cli.md#weft-check) runs the same rules
and fails on an error. The rules come in families:

- The **edge-resolution** rules require every link to point at a document in the graph, and every anchor to exist on
  the document it targets — naming what a moved target became, rather than reporting an unexplained break.
- The **assertion** rules check the claims links make about their targets: a cited version, length, or date that no
  longer holds ([Assertions](#assertions)).
- The **artifact** rules report a generated output that has fallen behind the source it was built from
  ([Track generated outputs](generated-artifacts.md)).
- The **copy** rules report the same document kept in two places, both while the copies still agree and once they
  have drifted apart ([Duplicate and diverged copies](#duplicate-and-diverged-copies)).
- The **include** rules report composed documents that cannot be composed as written
  ([Compose a document](composed-documents.md)).

Naming moved documents and detecting diverged copies read git history. Outside a repository there is no history, those
checks have nothing to say, and the rest are unaffected. How the history is gathered is in
[Validation design](../design/validation.md).

## Severities

Each rule has a default severity, which `rules` in `weft.config.yaml` overrides per project:

```yaml
rules:
  some-check: warn   # report, but do not fail `weft check`
  noisy-check: off   # do not run at all
```

| Severity | Meaning |
|----------|---------|
| `error` | Reported, and fails `weft check` with exit code 1 |
| `warn` | Reported, `weft check` still passes |
| `info` | Reported as a note, `weft check` still passes |
| `off` | The rule does not run |

Run `weft analyze --list-rules` to see the available rule ids and their defaults. An id in `rules` that no rule
declares is reported at the end of a run rather than rejected, so a config written against a newer Weft — or against a
check supplied by an external tool — still loads.

## Rules

| Rule | Default | Reports |
|------|---------|---------|
| `edge-target-missing` | `error` | A link points at a document that is not in the graph |
| `edge-anchor-missing` | `error` | The target document exists, but defines no such anchor |
| `edge-source-anchor-missing` | `error` | A sidecar declares a source `anchor` its own document does not define |
| `edge-pending` | `info` | A link marked `pending` still does not resolve |
| `edge-pending-resolved` | `info` | A link marked `pending` now resolves, so the marker can be dropped |
| `assert-version-mismatch` | `error` | A link asserts a version its target no longer declares |
| `assert-line-count-mismatch` | `warn` | A link asserts a line count its target no longer has |
| `assert-modified-mismatch` | `warn` | A link asserts a date its target no longer matches |
| `assert-unverifiable` | `warn` | A link asserts something that cannot be checked against its target |
| `artifact-stale` | `error` | A generated output no longer reflects the source it was built from |
| `artifact-source-unrecorded` | `info` | A `derives-from` edge records no source hash, so staleness cannot be checked |
| `node-duplicate` | `info` | Several documents hold identical content at different paths |
| `node-diverged` | `warn` | Documents that once held identical content no longer match |
| `include-cycle` | `error` | Documents include each other in a cycle, so no composed form of them exists |
| `include-link-missing` | `warn` | An include edge matches no link standing alone in its document, so nothing expands |
| `entry-point-missing` | `warn` | The configured `entryPoint` names no document, so the UI opens its default instead |
| `validator-error` | `error` | A rule threw while running |

The artifact rules are explained in [Staleness](generated-artifacts.md#staleness), and the include rules in
[Includes that never expand](composed-documents.md#includes-that-never-expand) and
[Cycles](composed-documents.md#cycles).

A missing document and a missing anchor are separate rules because they usually have different causes and different
fixes: the first means the path is wrong or the document was never written, the second means the section moved or was
renamed. When a heading was reworded rather than deleted, `edge-anchor-missing` names the anchor it most likely became.

### Moved documents

Renaming a document breaks every link to it, and a pile of dangling references gives no clue what happened. Weft
consults git's rename detection, so a link to a document that moved reports what it became:

```
  error  edge-target-missing  README.md -> setup.md
          setup.md moved to guides/setup.md
          hint: Point the link at guides/setup.md.
```

It stays `edge-target-missing` at the same severity — the link does need fixing either way — and the new id is also in
`data.renamedTo` for `--json` consumers. A destination that has since been deleted is not suggested, since pointing the
link at it would only break it differently.

### Links that are not checked

Links to files Weft does not index — images, PDFs, anything outside `.md`, `.markdown`, `.yaml`, `.yml`, and whatever
[`extensions`](configuration.md#extensions) added — are not checked. They were never going to become nodes, so
reporting them would bury the real breakage.

> **Using a renderer?** Links whose paths still hold template syntax produce no edges at all, so they cannot be
> reported as broken — see [Templated links](external-tools.md#templated-links). If your build resolves paths in a
> form Weft cannot recognise as a placeholder, a [contribution file](external-tools.md#contribution-files) can declare
> the resolved edges instead.

## Pending references

Writing a pointer to something you are about to create is normal practice, and a check that cannot express it fires
on correct workflow and gets switched off. Mark such a link `pending` in a [sidecar](sidecar-links.md):

```yaml
# architecture.md.weft
links:
  - target: appendix.md#glossary
    type: see-also
    pending: true
```

A pending link reports under `edge-pending` at `info` instead of failing the build, so it stays visible and countable
rather than silently excluded — a reference that has been pending a long time is itself worth noticing. Once the
target exists, `edge-pending-resolved` tells you the marker can be removed, so the suppression does not outlive its
reason.

Only sidecar links can declare this. An inline Markdown link has nowhere to put a marker, so an inline reference to
something unwritten reports as `edge-target-missing` until inline links can carry attributes.

## Assertions

Documents constantly assert things about each other: which version it is, how long it is, when it last changed. Every
such claim is true when written and rots silently afterwards. A sidecar link can state the claim where it can be
checked:

```yaml
# integration-guide.md.weft
links:
  - target: spec.md
    type: references
    asserts:
      version: "2.41"
      lineCount: ~3500
      modified: 2026-07
```

| Property | Compared against | Matching |
|----------|------------------|----------|
| `version` | The target's frontmatter [`version`](configuration.md#per-document-frontmatter) | Exact, as written |
| `lineCount` | Lines of text in the target | Exact for a number; `~3500` allows ten percent either way |
| `modified` | The target's last commit date | Prefix, so `2026-07` asserts the month and a full timestamp asserts the instant |

A claim that no longer holds reports under its own rule, so a project can decide how much each one matters. A stale
version is an `error` by default, because a version pointer is the most expensive thing in a documentation set to
maintain by hand and nothing else signals when one goes stale. Length and date drift with ordinary editing, so those
warn. `~` exists because prose makes approximate claims: "roughly 3,500 lines" is what a document actually says.

A claim nothing can check — a `version` asserted against a document that declares none, a count that is not a number,
a property no node has — reports as `assert-unverifiable`. Nothing is known to be wrong, but an assertion nobody can
check is a check the author believes they have and does not.

Assertions are skipped on a link marked `pending`, and on one whose target is not in the graph: that is
`edge-target-missing`'s finding, and reporting it twice says nothing new.

> **Where dates come from.** `modified` is the date of the last commit touching the file, never the filesystem's mtime
> ([why](../decisions/0019-content-hashes-not-timestamps.md)). A document that is untracked or uncommitted, or a
> project that is not a git repository, simply has no date, and asserting one reports as `assert-unverifiable`.

## Duplicate and diverged copies

The same document kept in two places drifts, and the graph sees two unrelated nodes. The expensive version is a copy
in an outbound directory and a copy in an internal one, identical for months, until an edit scoped to one location
quietly makes the copy that reaches external readers the wrong one. Weft reports it in two stages.

`node-duplicate` reports documents whose content currently agrees, at `info`. Nothing is wrong yet — but this is the
cheapest moment the problem will ever be visible, and the window closes on the first edit to either copy.

`node-diverged` reports documents that **once** held identical content and no longer do, at `warn`. Weft asks git
whether the paths held the same blob at some point in history, and rename detection means a copy that has since been
moved is still recognised.

```
  info   node-duplicate  (graph)
          Identical content at 2 paths: outbound-setup.md, setup.md

  warn   node-diverged   (graph)
          Once identical, now different: guides/setup.md, outbound-setup.md
```

Both read only what reached the manifest, so [`ignore`](configuration.md#all-options) already applies. Both name the
graph rather than one of the copies: nothing here knows which came first. If one copy really is generated from the
other, say so with a [`derives-from`](generated-artifacts.md#staleness) edge.

> **`node-diverged` needs git history.** Without a repository the check has nothing to say, which is not the same as
> reporting the copies are fine. A project that relies on it should make sure CI checks out enough history for
> `git log` to see the past (a shallow clone sees only what it fetched).
