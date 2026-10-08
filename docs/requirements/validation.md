# Validation requirements

How Weft checks the graph and reports what is broken, stale, duplicated or missing, both for a reader and as a gate
in CI.

## RQ-033 Report, and gate

Status: agreed

Analysis reports every finding and always succeeds. Check runs the same validation and fails with exit code 1 on any
error-severity finding; warnings and notes are reported but pass, so a rule can be adopted at `warn` before it is
promoted. Both give a machine-readable result on request, and analysis can list every rule with its default severity.

Supports UC-009.

## RQ-034 Severity belongs to configuration

Status: agreed

Each rule has a default severity (`error`, `warn`, `info` or `off`), which a project can override rule by rule. A
check that needs two severities declares two rule ids, so each stays configurable. A rule id in config that no rule
declares is reported at the end of the run, not rejected.

## RQ-035 Unresolved links

Status: agreed

A link to a document that is not in the graph, a link to an anchor its target does not define, and a sidecar source
anchor its own document does not define are each reported as a separate error. Links to file types Weft does not
index are not checked.

## RQ-036 Moved targets are named

Status: agreed

When a link's target document has moved, according to git's rename history, the finding names where it went, unless
that destination has since been deleted. When a heading was reworded, the finding names the anchor it most likely
became.

## RQ-037 Pending references

Status: agreed

A sidecar link marked pending that still does not resolve is reported as a note, not an error. Once it resolves, Weft
reports that the marker can be dropped.

## RQ-038 Assertions about a link's target

Status: agreed

A sidecar link can assert its target's version, line count or `modified` date, and validation checks each claim
against the target's current state.

Acceptance criteria:

- A version that no longer holds is an error; a line count or date that no longer holds is a warning.
- A claim that cannot be checked against its target is a warning.
- A line count written as `~N` allows 10 percent either way.
- Assertions on a pending or unresolvable edge are skipped.

## RQ-039 Generated artifact staleness

Status: agreed

A `derives-from` edge records the source's content hash when the artifact was generated. When the source's current
hash differs, the artifact is reported stale as an error. Each source of a multi-input artifact is checked on its
own. An edge with no recorded hash is reported as a note.

Set by [decision 0019](../decisions/0019-content-hashes-not-timestamps.md).

## RQ-040 Duplicate and diverged copies

Status: agreed

Documents holding identical content at different paths are reported as a note. Documents that once held identical
content, according to git history and following renames, and no longer do are reported as a warning. Both findings
name the graph rather than one copy. Without git history, the divergence check reports nothing.

## RQ-041 Include problems

Status: agreed

Documents that include each other in a cycle are reported as an error, once per cycle, at document granularity. An
include edge that no standalone link in its document matches is reported as a warning, using the same matching the
renderer uses.

Set by [decision 0026](../decisions/0026-composed-documents-via-includes.md). Supports UC-016.

## RQ-042 Git history is read once

Status: agreed

Validation reads git history once per docs root per run, and only when an enabled rule needs it. Outside a
repository the history-based rules report nothing, and the other rules are unaffected.

## RQ-043 A failing rule does not stop the run

Status: agreed

A rule that throws becomes one error finding, and the other rules still run. Validation never changes the manifest.

## RQ-044 Documents stale against code

Status: draft

Weft reports a document as likely stale when code it links to has changed since the document last changed, judged
from git history and never from file times ([RQ-006](constraints.md)), in both analysis and check.

Acceptance criteria:

- In CI, a pull request that touches linked code is told which document sections likely need updating, each linked.

Supports UC-009, UC-011.

## RQ-045 Documentation coverage

Status: draft

Analysis reports code files with no documentation references, documents with no inbound edges, and graph regions
whose connectivity is sparse relative to the code's complexity.

Supports UC-011.

## RQ-046 Traceability and connectivity reports

Status: draft

Analysis reports which features trace to which use cases, and how connected each part of the graph is.

## RQ-047 Diagram syntax errors

Status: draft

Check reports a Mermaid diagram that fails to parse, so a broken diagram fails CI rather than a page view.

Set by [decision 0014](../decisions/0014-mermaid-rendering.md).
