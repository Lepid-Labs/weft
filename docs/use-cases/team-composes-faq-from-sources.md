# UC-016 Team composes an FAQ from the documents that own the answers

A team maintains an FAQ page that is really a collection of answers owned by other documents (deployment questions
answered in the ops runbook, API questions in the spec, pricing questions in the product doc) and, instead of copying
answers in and watching them drift, wants the FAQ to show each answer from its owner.

## Primary flow

1. For each FAQ entry, the team declares an anchor-range include of the owning document's section.
2. When a reader opens the FAQ, Weft pulls each owning section inline at render time.
3. The reader sees one cohesive page.

## Alternate flows

- 1a. The team composes an org-level overview from sections of documents in other repositories instead, served by a
  single local Weft over several checkouts, then continues at step 2.

## Postconditions

Every answer has exactly one source of truth, and `weft check` reports when an included section changes after the
composition was last reviewed.
