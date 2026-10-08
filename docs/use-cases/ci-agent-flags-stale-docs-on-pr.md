# UC-009 CI agent flags missing documentation updates on a pull request

A developer opens a pull request with significant code changes but no corresponding documentation updates, and a
CI-integrated agent reviews it.

## Preconditions

The changed code is linked to documentation in the graph.

## Primary flow

1. The agent runs `weft check` against the diff.
2. Weft traverses the graph to identify the documentation nodes linked to the changed code, and detects that those
   nodes are now stale.
3. The agent posts a review comment on the pull request listing the specific doc sections that likely need updating,
   with a link to each.
4. The developer, or an agent, addresses the gaps.

## Postconditions

The documentation gaps are known, and addressed, before merge.
