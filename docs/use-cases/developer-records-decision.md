# UC-008 Developer records the decision behind a significant change

A developer, or an AI agent, is about to make a significant change (replacing an auth strategy, restructuring a data
model, deprecating an API) and wants the reasoning recorded where anyone can find it from the affected artifacts.

## Primary flow

1. As part of the change, the developer appends a decision entry to the relevant documentation node: what changed,
   why, what alternatives were considered, and who approved it.
2. The developer links the entry to the affected nodes in the graph: API spec, schema, architecture doc.

## Postconditions

The decision is reachable from every node it affects. Over time the decision log becomes a navigable history of the
project's evolution: anyone can trace from a piece of code to the design decision that shaped it.
