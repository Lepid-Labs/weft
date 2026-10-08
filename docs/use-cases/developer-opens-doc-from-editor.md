# UC-002 Developer opens a referenced document from the editor

While reading a code file in VS Code, a developer sees gutter annotations where `@doc` references appear in comments,
and wants to read the document section a reference points to without leaving the editor.

## Preconditions

The code file's comments hold `@doc` references to documents in the graph.

## Primary flow

1. The editor marks each line holding a `@doc` reference with a gutter annotation.
2. The developer activates the annotation on one reference.
3. The Weft side panel opens directly to the referenced document section.
4. The developer follows links within the panel to related documents.

## Postconditions

The developer has read the referenced section, and the context linked from it, without leaving the editor.
