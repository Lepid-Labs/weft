import { relative, resolve } from "node:path";
import { type DocsRoot, nodeIdFor, rootForPath } from "../config.js";
import { decodePercent } from "../percent.js";
import { type RepoMap, parseGitHubBlobUrl } from "../repos.js";
import type { LinkRef } from "../types.js";

/**
 * What a link to `absTarget` names: a node in whichever configured docs root
 * holds the file — another project's root included — or nothing when the file
 * lies outside every root.
 */
export function linkRefAt(
	roots: DocsRoot[],
	absTarget: string,
	anchor?: string
): LinkRef | undefined {
	const root = rootForPath(roots, absTarget);
	if (!root) return undefined;

	const to: LinkRef = { node: nodeIdFor(root, relative(root.absDir, absTarget)) };
	if (anchor) to.anchor = `#${anchor}`;
	return to;
}

/**
 * Resolve a GitHub blob URL against the checkout `repos` maps its repo to.
 *
 * Undefined for anything else — another URL, a blob URL into an unmapped repo,
 * or one whose file lies outside every docs root — all of which stay ordinary
 * external links. The fragment is decoded as a relative link's is, so
 * `#r%C3%A9sum%C3%A9` names the `#résumé` heading GitHub links that way.
 */
export function resolveBlobUrl(
	url: string,
	roots: DocsRoot[],
	repos?: RepoMap
): LinkRef | undefined {
	const blob = parseGitHubBlobUrl(url);
	const checkout = blob && repos?.get(blob.repo);
	if (!blob || !checkout) return undefined;

	const anchor = blob.anchor ? decodePercent(blob.anchor.slice(1)) : undefined;
	return linkRefAt(roots, resolve(checkout, blob.path), anchor);
}
