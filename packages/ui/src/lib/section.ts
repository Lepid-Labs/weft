import { type SectionRange, extractSection, resolveHref } from "@lepid-labs/weft-core/browser";
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Rendering one section of one file, with no manifest.
 *
 * `mountSection` in the embed puts a slice of a document into someone else's
 * page — a help panel, a settings screen. These are the parts of that which do
 * not need a DOM: loading the slice, folding its headings into the host's
 * outline, and pointing its relative links and images somewhere that resolves
 * outside the docs tree.
 */

/** A file in the docs source, and optionally a heading in it. */
export interface SectionTarget {
	/** Path as the source names it: repo-relative for GitHub, or what the client fetches. */
	path: string;
	/** A heading anchor, `#`-prefixed. */
	anchor?: string;
}

/** What a relative URL in the section points at, and which attribute it came from. */
export interface SectionUrlTarget extends SectionTarget {
	kind: "link" | "image";
}

/** Why a section could not be shown. */
export type SectionErrorKind = "load" | "anchor" | "render";

export class SectionError extends Error {
	readonly kind: SectionErrorKind;
	readonly path: string;
	readonly anchor?: string;

	constructor(kind: SectionErrorKind, target: SectionTarget, message: string, cause?: unknown) {
		super(message, cause === undefined ? undefined : { cause });
		this.name = "SectionError";
		this.kind = kind;
		this.path = target.path;
		this.anchor = target.anchor;
	}
}

/**
 * Fetch a file and slice the section an anchor selects.
 *
 * A missing anchor is its own error kind rather than an empty render, because
 * it is the failure a host most needs to tell apart: the file is there, but
 * the heading it points at was renamed. A check in the host's CI catches that
 * before release; `kind: "anchor"` is how it shows up at runtime.
 */
export async function loadSection(
	fetchDoc: (path: string) => Promise<string>,
	target: SectionTarget
): Promise<SectionRange> {
	let content: string;
	try {
		content = await fetchDoc(target.path);
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new SectionError("load", target, `Could not load ${target.path}: ${reason}`, error);
	}

	const section = extractSection(content, target.anchor);
	if (!section) {
		throw new SectionError(
			"anchor",
			target,
			`No heading ${target.anchor} in ${target.path} — was it renamed?`
		);
	}
	return section;
}

/** A URL scheme, or a protocol-relative `//host` — anything that is not a path in the docs. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

function decode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * Resolve a link or image URL written in `path` to the file it names.
 *
 * Relative URLs resolve against the file's directory and root-relative ones
 * (`/docs/x.md`) against the source root, as GitHub resolves both. An external
 * URL, a bare `#fragment`, or a path that climbs out of the root names no file.
 */
export function resolveSectionUrl(path: string, url: string): SectionTarget | undefined {
	if (!url || url.startsWith("#") || EXTERNAL.test(url)) return undefined;

	const hash = url.indexOf("#");
	const pathPart = hash === -1 ? url : url.slice(0, hash);
	const fragment = hash === -1 ? "" : url.slice(hash + 1);

	// Resolved from a stand-in file at the root, so the directory is empty.
	const resolved = pathPart.startsWith("/")
		? resolveHref("_", decode(pathPart.slice(1)))
		: resolveHref(path, decode(pathPart));
	if (!resolved) return undefined;

	return fragment ? { path: resolved, anchor: `#${decode(fragment)}` } : { path: resolved };
}

/** Percent-encode each segment of a path, keeping its slashes. */
export function encodePath(path: string): string {
	return path.split("/").map(encodeURIComponent).join("/");
}

/** Where a source keeps its files, for building default URLs. */
export interface SectionSource {
	/** GitHub `owner/repo`. */
	repo?: string;
	/** Branch, tag or commit. */
	ref?: string;
	/** A base URL serving files at their paths. */
	baseUrl?: string;
}

/** The raw file URL for a path, or undefined when the source has no URL of its own. */
export function rawFileUrl(source: SectionSource, path: string): string | undefined {
	if (source.baseUrl) return `${source.baseUrl.replace(/\/+$/, "")}/${encodePath(path)}`;
	if (source.repo) {
		return `https://raw.githubusercontent.com/${source.repo}/${source.ref ?? "main"}/${encodePath(path)}`;
	}
	return undefined;
}

/**
 * Where a relative URL should point when the host says nothing.
 *
 * A link opens the file on GitHub — which also works for a private repo, since
 * the reader's browser is the one signed in — or the file under `baseUrl`. An
 * image loads from the raw file. With only a client there is no URL to build.
 */
export function defaultSectionUrl(
	source: SectionSource,
	target: SectionUrlTarget
): string | undefined {
	if (target.kind === "link" && source.repo && !source.baseUrl) {
		const blob = `https://github.com/${source.repo}/blob/${source.ref ?? "main"}`;
		return `${blob}/${encodePath(target.path)}${target.anchor ?? ""}`;
	}
	const raw = rawFileUrl(source, target.path);
	return raw && target.kind === "link" ? `${raw}${target.anchor ?? ""}` : raw;
}

export interface SectionRenderOptions {
	/** The file the section came from; relative URLs resolve against it. */
	path: string;
	/** The section's own heading level — `SectionRange.baseLevel`. */
	baseLevel?: number;
	/** Render the section's heading at this level, its subsections below it. */
	headingLevel?: number;
	/** Drop the heading the section starts with. */
	hideHeading?: boolean;
	/** A rewritten URL for a relative link or image, or undefined to leave it as written. */
	resolveUrl(target: SectionUrlTarget): string | undefined;
	/** Told about every link into the docs, by the href it now carries. */
	onLink?(href: string, target: SectionTarget): void;
}

const HEADING = /^h([1-6])$/;

/**
 * Fit a section into the host page: its heading level, and its relative URLs.
 *
 * A rehype plugin for the untrusted stage, so the URLs it writes still meet
 * the sanitizer — a host `resolveUrl` returning `javascript:` is dropped there
 * like any other.
 */
export function rehypeSection(options: SectionRenderOptions) {
	return (tree: Root) => {
		if (options.hideHeading) {
			const first = tree.children.find((child) => child.type === "element");
			if (first && HEADING.test(first.tagName))
				tree.children.splice(tree.children.indexOf(first), 1);
		}

		const delta =
			options.headingLevel !== undefined && options.baseLevel !== undefined
				? options.headingLevel - options.baseLevel
				: 0;

		visit(tree, "element", (node: Element) => {
			const heading = HEADING.exec(node.tagName);
			if (heading && delta !== 0) {
				node.tagName = `h${Math.min(6, Math.max(1, Number(heading[1]) + delta))}`;
			}

			const attribute = node.tagName === "a" ? "href" : node.tagName === "img" ? "src" : undefined;
			const value = attribute && node.properties?.[attribute];
			if (!attribute || typeof value !== "string") return;

			const target = resolveSectionUrl(options.path, value);
			if (!target) return;

			const kind = attribute === "href" ? "link" : "image";
			const url = options.resolveUrl({ kind, ...target });
			if (url !== undefined) node.properties[attribute] = url;
			if (kind === "link") options.onLink?.(url ?? value, target);
		});
	};
}
