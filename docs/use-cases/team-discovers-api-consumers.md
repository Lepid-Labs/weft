# UC-010 Team discovers who depends on a shared API

A team is about to change a shared API and wants to know everything that depends on it before they do.

## Primary flow

1. The team queries the Weft graph for all nodes referencing that API's anchors.
2. Weft returns the referencing nodes across artifact types: another team's design doc references the endpoint, a
   wireframe links to the response schema, a functional spec depends on the current behavior.
3. The team reviews the downstream consumers it did not know about.

## Postconditions

The team knows the change's blast radius across artifact types, including dependencies that would not show up in a
code-only dependency analysis.
