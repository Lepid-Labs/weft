# Purpose

Project knowledge rots when it lives outside the repository, and even the documents kept beside the code sit
scattered and disconnected, with nothing to show how one relates to another. Weft exists to make those relationships
a graph a reader can navigate.

Design docs drift from the code. API specs fall out of sync with implementation. Architecture diagrams become
historical artifacts. Decisions get re-litigated because no one can find where they were recorded. The documents
exist — they're just scattered, disconnected, and invisible from where the work happens.

## The Problem

Existing tools treat documentation as a publishing problem: write it somewhere, link to it once, hope people find it.
The result is a pile of documents with no navigable structure. Readers can't tell how a feature spec relates to its
implementation, which decision log entry explains a design choice, or where a wireframe was refined into an API
contract.

The gap isn't content — it's the graph of relationships between content. The
[documentation tools survey](research/documentation-tools.md) found no existing tool that closes it.

## What Weft Does

Weft is a documentation graph browser that lives in the repository alongside the code.

All project artifacts — design docs, architecture diagrams, API specs, database schemas, wireframes, slide decks,
functional specs — become nodes in a navigable graph. Typed, anchor-level edges connect them: *this use case is
implemented by that API operation; this decision record specifies this schema; this wireframe annotates that
section.*

Any document can be the entry point. Navigation is a first-class interaction, not an afterthought. The constraints
that follow from this are [requirements](requirements/constraints.md).

## Audience

Software teams whose documentation already lives in the repository — or should. The primary users are developers and
technical leads navigating a project's design docs, specs, and decision records from within their normal workflow.
Secondary users are adjacent contributors (product, design, QA) who read those documents and need to see how they
connect, without learning a separate tool or leaving the repo's published docs.

## What It Is Not

Weft is not a wiki, a knowledge base SaaS, or a static site generator. It does not replace writing. It does not manage
content in a database. It does not require migrating documents out of the repository.

It is a browser for the graph that already exists, made explicit.
