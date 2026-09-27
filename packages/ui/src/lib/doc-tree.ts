import type { WeftNode, WeftProjectRef } from "@lepid-labs/weft-core";

/** One entry in the left-hand nav: a folder (children) or a document (nodeId). */
export interface TreeNode {
	/** Path segment; the key siblings are matched on, so two docs sharing a title stay apart. */
	name: string;
	/** What the nav shows: a document's title, or a folder's name. */
	label: string;
	nodeId?: string;
	children: TreeNode[];
}

export interface ProjectGroup {
	name: string;
	slug: string;
	tree: TreeNode[];
}

/**
 * Build a tree from node IDs, split on `/`. `prefix` (a project slug) is dropped
 * from the displayed path so the slug isn't repeated as a folder under its own
 * heading. Documents are labelled by title, which falls back to the filename
 * when a document has no heading; folders keep their directory name.
 */
export function buildTree(nodes: WeftNode[], prefix = ""): TreeNode[] {
	const root: TreeNode[] = [];

	for (const node of nodes) {
		const path =
			prefix && node.id.startsWith(`${prefix}/`) ? node.id.slice(prefix.length + 1) : node.id;
		const parts = path.split("/");
		let current = root;

		for (let i = 0; i < parts.length; i++) {
			const part = parts[i] as string;
			const isLeaf = i === parts.length - 1;

			let existing = current.find((n) => n.name === part);
			if (!existing) {
				existing = { name: part, label: part, children: [] };
				if (isLeaf) {
					existing.nodeId = node.id;
					existing.label = node.title?.trim() || part;
				}
				current.push(existing);
			}
			current = existing.children;
		}
	}

	return root;
}

/** One tree per project, in project order; a project with nothing visible is left out. */
export function buildGroups(nodes: WeftNode[], projects: WeftProjectRef[]): ProjectGroup[] {
	return projects
		.map((project) => ({
			name: project.name,
			slug: project.slug,
			tree: buildTree(
				nodes.filter((node) => node.project === project.slug),
				project.slug
			),
		}))
		.filter((group) => group.tree.length > 0);
}
