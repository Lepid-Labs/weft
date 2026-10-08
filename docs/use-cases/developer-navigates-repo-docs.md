# UC-001 Developer navigates the repository's documentation

A developer opens a terminal in a project repository and runs `weft serve`, wanting to trace a feature from its
high-level design down to the code that implements it.

## Preconditions

The project's documents live in the repository and link to one another.

## Primary flow

1. Weft opens a browser UI showing the document graph.
2. The developer opens the high-level design document from the document tree.
3. The developer follows a link, inline or from the linked-items sidebar, to the relevant section of the API spec.
4. The developer follows the API spec to the database schema.
5. The developer follows the schema to the code file that implements it.

## Alternate flows

- \*a. At any step, the developer goes back to an earlier document, or forward again; each navigation step is kept in
  history, and the use case continues from there.

## Postconditions

The developer has moved from design intent to implementation in one place, and their path is in the navigation
history.
