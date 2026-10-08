import type { Manifest, WeftNode } from "@lepid-labs/weft-core";

const DOC_EXT = /\.(md|markdown|yaml|yml|json)$/;
const README = "README.md";

/**
 * The node addressed as `/`: the configured entry point, else the top-level
 * README. Core puts `site.entryPoint` in the manifest only once it has checked
 * that it names a document, so it needs no checking here.
 */
export function rootNodeId(manifest: Manifest): string {
	return manifest.site?.entryPoint ?? README;
}

/**
 * Map a node id to its URL path. The root node is `/`, and a README is
 * addressed by its directory, so a project's `alpha/README.md` is `/alpha`.
 * A top-level README that is not the root keeps its name, `/README`, so that
 * configuring an entry point never makes it unreachable.
 */
export function nodeIdToPath(nodeId: string, rootId = README): string {
	if (nodeId === rootId) return "/";
	const withoutExt = nodeId.replace(DOC_EXT, "");
	return `/${withoutExt.replace(/\/README$/, "")}`;
}

export function pathToNode(path: string, nodes: WeftNode[], rootId = README): WeftNode | undefined {
	const normalized = (path ?? "").replace(/^\//, "").replace(/\/$/, "");
	if (normalized === "") return nodes.find((n) => n.id === rootId);

	for (const candidate of [normalized, `${normalized}/README`]) {
		const node = nodes.find((n) => n.id.replace(DOC_EXT, "") === candidate);
		if (node) return node;
	}
	return undefined;
}
