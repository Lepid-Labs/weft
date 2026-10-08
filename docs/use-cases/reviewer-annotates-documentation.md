# UC-004 Reviewer annotates documentation

A reviewer receives a zip of a project's documentation and wants to comment on it and return the comments to the
original author.

## Preconditions

The reviewer has the documentation as a zip, without needing the repository.

## Primary flow

1. The reviewer drops the zip in a folder and runs `weft serve` there.
2. The reviewer navigates the graph in the browser to the architecture doc.
3. The reviewer selects a paragraph and adds a comment.
4. Weft writes the annotation to a sidecar beside the document, `architecture.md.weft`.
5. The reviewer sends back that file.
6. The original author drops it in and runs `weft serve`.
7. Weft shows the annotations in context: the main view shows the document while reviewing mode surfaces comment
   history and links in the sidebar.

## Alternate flows

- 3a. The reviewer also links the comment to a related section elsewhere ("see also: api.yaml#/paths/users"), then
  continues at step 4.
- 5a. The reviewer sends back the whole `docs/` folder instead, then continues at step 6.

## Postconditions

The author sees every comment attached to the paragraph it concerns, and the annotations travel with the document.
