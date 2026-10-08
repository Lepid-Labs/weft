# Publishing requirements

How Weft serves documentation beyond the working tree: as it stood at a past release, and as a static site that needs
no running server.

## RQ-093 Read the docs at a past release

Status: agreed

A reader can browse the documentation graph as it existed at a given branch, tag or commit, without checking out an
old branch or digging through git history, by serving the repository without a checkout ([RQ-028](graph-sources.md)).

Set by [decision 0021](../decisions/0021-serve-without-a-checkout.md). Supports UC-014.

## RQ-094 Version selector

Status: draft

The browser UI lets a reader switch between releases.

Supports UC-014.

## RQ-095 Static export

Status: draft

One command renders the full documentation graph to a static site (HTML and JavaScript) deployable to any static
host, such as GitHub Pages, Netlify or S3, with the full graph browser working without a running server.

Supports UC-014, UC-015.

## RQ-096 Static export composes documents as the UI does

Status: draft

Static export expands each include to exactly the section the UI expands.

Set by [decision 0026](../decisions/0026-composed-documents-via-includes.md). Supports UC-016.

## RQ-097 Versioned static sites

Status: draft

Static export can build a given tagged version into its own output directory, so one host can serve several versions.

Supports UC-014.
