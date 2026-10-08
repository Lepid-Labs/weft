# UC-015 Stakeholder reviews design documents without code access

A non-technical stakeholder receives a `docs/` folder export and wants to review the design documents, wireframes
and functional specs without access to the codebase.

## Primary flow

1. The stakeholder opens a hosted static site of the documentation, published with `weft build`.
2. The stakeholder navigates the design documents, wireframes and functional specs.

## Alternate flows

- 1a. The stakeholder runs `weft serve` locally over the export instead, then continues at step 2.

## Postconditions

The stakeholder has reviewed the documents without access to the codebase.
