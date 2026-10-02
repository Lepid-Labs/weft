import { dirname, relative, resolve } from "node:path";
import type { Link, List, ListItem, Root } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { type DocsRoot, nodeIdFor, rootForPath } from "../config.js";
import { decodePercent } from "../percent.js";
import type { RepoMap } from "../repos.js";
import type { LinkRef, WeftEdge } from "../types.js";
import { linkRefAt, resolveBlobUrl } from "./resolve.js";

interface MdLink {
	label: string;
	url: string;
}

/** What one parse of a Markdown document yields. */
export interface MarkdownLinks {
	/** Graph edges, exactly as `extractMarkdownLinks` returns them. */
	edges: WeftEdge[];
	/**
	 * Destinations, as written, of the links standing alone as a block — what
	 * `WeftNode.blockLinks` records.
	 */
	blockLinks: string[];
}

/**
 * Template placeholders left in a link path by a renderer's source form:
 * Handlebars/Jinja/Liquid/Quarto `{{ }}` and `{% %}`, JS `${ }`, ERB/EJS `<% %>`.
 */
const TEMPLATE_SYNTAX = /\{\{|\{%|\$\{|<%/;

/**
 * Extract graph edges from Markdown content.
 * A destination is read the way a URL-following renderer reads it, with its
 * percent-escapes decoded, so `My%20Report.md` names `My Report.md` as it does
 * on GitHub.
 * A link is a graph edge if it targets a file within any configured docs root —
 * a link that leaves its own root but lands in another project's root becomes a
 * cross-project edge rather than being dropped. A GitHub blob URL into a repo
 * the `repos` map knows resolves against that checkout the same way, so the
 * same Markdown works on GitHub and in weft; unmapped URLs stay external links.
 */
export function extractMarkdownLinks(
	content: string,
	filePath: string,
	roots: DocsRoot[],
	repos?: RepoMap
): WeftEdge[] {
	return scanMarkdownLinks(content, filePath, roots, repos).edges;
}

/**
 * `extractMarkdownLinks`, plus the destinations of the links that stand alone
 * as a block, from the same parse — indexing needs both and should not parse
 * every document twice.
 */
export function scanMarkdownLinks(
	content: string,
	filePath: string,
	roots: DocsRoot[],
	repos?: RepoMap
): MarkdownLinks {
	const tree = unified().use(remarkParse).parse(content);
	const alone = linksStandingAlone(tree);
	const links: MdLink[] = [];
	const blockLinks: string[] = [];

	visit(tree, "link", (node: Link) => {
		// Skip anchor-only links
		if (node.url.startsWith("#")) return;
		if (alone.has(node)) blockLinks.push(node.url);
		const label = node.children
			.map((c) => ("value" in c ? (c.value as string) : ""))
			.join("")
			.trim();
		links.push({ label, url: node.url });
	});

	const fileDir = dirname(filePath);
	const edges: WeftEdge[] = [];

	const sourceRoot = rootForPath(roots, filePath);
	if (!sourceRoot) return { edges, blockLinks };
	const fromNode = nodeIdFor(sourceRoot, relative(sourceRoot.absDir, filePath));

	for (const link of links) {
		const external = link.url.startsWith("http://") || link.url.startsWith("https://");
		// Any URL but a blob URL into a mapped repo is an ordinary external link,
		// and so is any link landing outside every configured docs root.
		const to = external
			? resolveBlobUrl(link.url, roots, repos)
			: resolveRelative(link.url, fileDir, roots);
		if (!to) continue;

		edges.push({
			from: { node: fromNode },
			to,
			type: "references",
			label: link.label || undefined,
			...(external ? { resolvedFrom: link.url } : {}),
		});
	}

	return { edges, blockLinks };
}

/** A relative destination, resolved against the linking file's directory. */
function resolveRelative(url: string, fileDir: string, roots: DocsRoot[]): LinkRef | undefined {
	const [pathPart, fragment] = url.split("#");
	if (!pathPart) return undefined;

	// A path still holding template syntax has not been resolved yet — the
	// renderer decides what it points at. Recording an edge to the literal
	// text would invent a node that never exists and report correct source
	// as broken.
	if (TEMPLATE_SYNTAX.test(pathPart)) return undefined;

	// The template check above ran on the raw text: an encoded `%7B%7B` is
	// not a placeholder an author wrote.
	const anchor = fragment === undefined ? undefined : decodePercent(fragment);
	return linkRefAt(roots, resolve(fileDir, decodePercent(pathPart)), anchor);
}

/**
 * The links standing alone as a block once rendered: the sole content of a
 * paragraph or of a list item — the only places the renderer expands an
 * include. Mirrors the UI's test on the rendered tree, so it follows how lists
 * render: a tight list's items lose their paragraphs, which leaves a link
 * sharing its item with a nested list not alone, while a loose list keeps the
 * paragraph and the link in it is.
 */
function linksStandingAlone(tree: Root): Set<Link> {
	const tight = new Set<ListItem>();
	visit(tree, "list", (list: List) => {
		if (!isLoose(list)) for (const item of list.children) tight.add(item);
	});

	const alone = new Set<Link>();
	visit(tree, "paragraph", (paragraph, _index, parent) => {
		if (parent?.type === "listItem" && tight.has(parent) && parent.children.length > 1) return;

		const meaningful = paragraph.children.filter(
			(child) => !(child.type === "text" && child.value.trim() === "")
		);
		const [only] = meaningful;
		if (meaningful.length === 1 && only.type === "link") alone.add(only);
	});
	return alone;
}

/** Whether a list renders loose — the rule `mdast-util-to-hast` applies. */
function isLoose(list: List): boolean {
	return (
		Boolean(list.spread) || list.children.some((item) => item.spread ?? item.children.length > 1)
	);
}
