# UC-011 Tech lead audits documentation coverage

A tech lead wants to audit the state of a project's documentation and runs `weft analyze --coverage`.

## Primary flow

1. Weft reports code files with no `@doc` links, documentation nodes with zero inbound edges (orphaned docs), and
   graph regions with sparse connectivity.
2. The tech lead reviews the gaps the report highlights.

## Postconditions

The gaps are highlighted systematically: undocumented features, stale docs that nothing references anymore, and areas
where the documentation graph is thin relative to the code's complexity.
