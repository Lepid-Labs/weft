# UC-012 Team scopes a migration before it begins

A team is planning a large migration (swapping a database engine, replacing an auth framework, deprecating a service)
and wants to scope it before writing code.

## Primary flow

1. The team queries the Weft graph for everything connected to the component being replaced.
2. Weft returns the connected nodes across artifact types: API specs, schema docs, architecture notes, decision log
   entries, wireframes that reference affected behavior.
3. The team scopes the migration from that impact map.

## Postconditions

The team has a complete impact map across all artifact types, and scopes the migration before it begins rather than
discovering surprises mid-flight.
