import { extractMarkdownAnchors } from "./anchors/markdown.js";
import { decodePercent } from "./percent.js";
import type {
	IncludeContributes,
	IncludeDefaults,
	IncludeHeadingShift,
	LinkRef,
	WeftEdge,
} from "./types.js";

/**
 * The edge type that means "this document renders that one inline".
 *
 * A convention rather than a new mechanism, like `DERIVES_FROM` — any string has
 * always been a valid edge type. What it gains here is defined semantics: the
 * renderer expands an edge of this type at render time, and `include-cycle`
 * checks the graph they form stays acyclic.
 */
export const INCLUDES = "includes";

export const HEADING_SHIFTS: readonly IncludeHeadingShift[] = ["auto", "none"];
export const CONTRIBUTES_MODES: readonly IncludeContributes[] = ["source", "inline"];

/**
 * What an include edge means when it says nothing: headings fold into the
 * including document's outline, and content is searchable only at its source.
 */
export const INCLUDE_DEFAULTS: Required<IncludeDefaults> = {
	headingShift: "auto",
	contributes: "source",
};

/**
 * Stamp resolved include semantics onto every `includes` edge.
 *
 * Run at manifest build time so the defaults are resolved exactly once. A
 * consumer of the manifest — the UI most of all, which has no config access —
 * reads the edge and never has to know what the project's defaults were.
 */
export function applyIncludeDefaults(edges: WeftEdge[], defaults?: IncludeDefaults): WeftEdge[] {
	return edges.map((edge) => {
		if (edge.type !== INCLUDES) return edge;
		return {
			...edge,
			headingShift: edge.headingShift ?? defaults?.headingShift ?? INCLUDE_DEFAULTS.headingShift,
			contributes: edge.contributes ?? defaults?.contributes ?? INCLUDE_DEFAULTS.contributes,
		};
	});
}

/** An anchor-bounded slice of a Markdown document. */
export interface SectionRange {
	/** The sliced source text, ready to render. */
	text: string;
	/**
	 * Heading level the range starts at: the selected heading's level, or the
	 * shallowest heading in the document for a whole-document range. Absent when
	 * the document has no headings — there is nothing for `headingShift` to move.
	 */
	baseLevel?: number;
}

/**
 * Extract the section of a Markdown document an anchor selects.
 *
 * The range runs from the anchored heading to the next heading of the same or
 * shallower level, exclusive — the section as a reader understands it. No
 * anchor selects the whole document, the degenerate case of the same idea.
 *
 * Lives in core rather than the UI because a static `weft build` will need the
 * identical slice server-side; the extraction has one home so the two renderers
 * cannot disagree about where a section ends.
 *
 * Returns undefined when the anchor names no heading in the document. That the
 * anchor is broken is `edge-anchor-missing`'s finding — the caller only needs
 * to know there is nothing to expand.
 */
export function extractSection(content: string, anchor?: string): SectionRange | undefined {
	const headings = extractMarkdownAnchors(content).filter((a) => a.level !== undefined);

	if (anchor === undefined || anchor === "" || anchor === "#") {
		const levels = headings.map((h) => h.level as number);
		return {
			text: content,
			...(levels.length ? { baseLevel: Math.min(...levels) } : {}),
		};
	}

	const slug = anchor.startsWith("#") ? anchor : `#${anchor}`;
	const start = headings.find((h) => h.slug === slug);
	if (!start || !start.line) return undefined;

	const level = start.level as number;
	const next = headings.find(
		(h) => (h.line as number) > (start.line as number) && (h.level as number) <= level
	);

	const lines = content.split(/\r?\n/);
	const text = lines.slice(start.line - 1, next?.line ? next.line - 1 : undefined).join("\n");
	return { text, baseLevel: level };
}

/** A URL scheme: anything with one is not a path relative to a document. */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Find the include edge a link declares, for links in one document.
 *
 * Takes the link's destination as written and returns the `includes` edge it
 * is the source of, if any. Undefined instead of a matcher when the document
 * declares no includes, so a caller can skip looking for links at all.
 *
 * One implementation for both readers: the renderer expands what this matches,
 * and `include-link-missing` reports an include edge nothing matches. Two
 * copies would let `weft check` pass a page that renders wrong — the failure
 * this exists to prevent.
 *
 * A relative destination resolves against the node id, decoded the way link
 * extraction decodes it. Any other destination — a GitHub blob URL into a
 * mapped repo — is looked up through the edge extraction already made from it,
 * which records the link as written in `resolvedFrom`. The manifest holds the
 * answer, so the repo map never has to reach a browser.
 */
export function includeMatcher(
	nodeId: string,
	edges: WeftEdge[]
): ((href: string) => WeftEdge | undefined) | undefined {
	const includes = edges.filter(
		(edge) => edge.type === INCLUDES && !edge.pending && edge.from.node === nodeId
	);
	if (!includes.length) return undefined;

	// Keyed decoded: a renderer re-encodes what it does not consider URL-safe,
	// so the same link can reach this as `café.md` or `caf%C3%A9.md`.
	const resolved = new Map<string, LinkRef>();
	for (const edge of edges) {
		if (edge.from.node === nodeId && edge.resolvedFrom) {
			resolved.set(decodePercent(edge.resolvedFrom), edge.to);
		}
	}

	const targetOf = (href: string): LinkRef | undefined => {
		if (SCHEME.test(href)) return resolved.get(decodePercent(href));

		const [path, fragment] = href.split("#");
		if (!path) return undefined;
		const node = resolveHref(nodeId, decodePercent(path));
		if (!node) return undefined;
		return fragment ? { node, anchor: `#${decodePercent(fragment)}` } : { node };
	};

	return (href) => {
		const target = targetOf(href);
		if (!target) return undefined;
		return includes.find(
			(edge) =>
				// An include written in a published form (`guide.html`) resolved to its
				// source, and a link in the same form still names it.
				(edge.to.node === target.node || edge.resolvedFrom === target.node) &&
				(edge.to.anchor ?? "") === (target.anchor ?? "")
		);
	};
}

/**
 * Resolve a relative href against a node id's directory, the same arithmetic
 * link extraction does on paths. A path that escapes the id's root, or a URL
 * with a scheme, resolves to nothing.
 */
export function resolveHref(nodeId: string, href: string): string | undefined {
	if (SCHEME.test(href)) return undefined;

	const base = nodeId.split("/").slice(0, -1);
	for (const segment of href.split("/")) {
		if (segment === "" || segment === ".") continue;
		if (segment === "..") {
			if (!base.length) return undefined;
			base.pop();
			continue;
		}
		base.push(segment);
	}
	return base.join("/") || undefined;
}
