# UC-007 AI agent updates documentation alongside code

An AI agent completes a code change (adding a new endpoint, changing a database column, modifying business logic) and,
before finishing, wants the documentation to describe the new behavior.

## Preconditions

The changed code is linked to documentation through `@doc` references and graph edges.

## Primary flow

1. The agent queries the Weft graph for documentation nodes linked to the code it changed.
2. Weft returns the linked document sections.
3. The agent updates the affected sections (API spec, schema description, architecture notes) to reflect the new
   behavior.
4. The agent finishes the change with code and documentation together.

## Postconditions

Documentation stays in sync with code as a natural part of the implementation workflow rather than a separate chore.
