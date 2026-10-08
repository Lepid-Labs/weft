# UC-003 Presenter answers a question during a call

A developer is presenting an architecture overview, imported from a Google Slides deck, during a Zoom call when a
stakeholder asks about the behavior of a specific API endpoint.

Deferred: this waits on the import pipeline that brings Google Slides decks into the graph (RQ-072).

## Preconditions

The deck is in the graph, a slide links to the endpoint's section of the OpenAPI spec, and the developer has
presenting mode on.

## Primary flow

1. The developer follows the link on the slide.
2. A slide-in panel opens to the OpenAPI spec section for that endpoint, without shrinking the main slide view.
3. The developer answers the question.
4. The developer dismisses the panel.
5. The developer continues the deck from where they left off.

## Postconditions

The question is answered from the spec itself, and the presentation resumes at the same slide.
