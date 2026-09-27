<script lang="ts">
import { type TreeNode, buildGroups, buildTree } from "$lib/doc-tree.js";
import { nodeIdToPath } from "$lib/utils/paths.js";
import type { WeftNode, WeftProjectRef } from "@lepid-labs/weft-core";

interface Props {
	nodes: WeftNode[];
	projects?: WeftProjectRef[];
	currentNodeId?: string;
	onnavigate: (nodeId: string) => void;
}

let { nodes, projects, currentNodeId, onnavigate }: Props = $props();

let grouped = $derived((projects?.length ?? 0) > 1);
// docOrderStrict hides docs from the nav without removing them from the graph,
// so the tree filters here rather than the manifest omitting them.
let visible = $derived(nodes.filter((node) => !node.hiddenFromNav));
let tree = $derived(buildTree(visible));
let groups = $derived(grouped ? buildGroups(visible, projects ?? []) : []);

// Items are real links, so a modified click opens a tab; a plain click stays
// in the app.
function follow(e: MouseEvent, nodeId: string) {
	if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
	e.preventDefault();
	onnavigate(nodeId);
}
</script>

<!-- The design system's side nav: a section per project with its name as the
     heading, documents as items, the current one marked aria-current. -->
{#snippet treeNode(node: TreeNode, depth: number)}
	{#if node.nodeId}
		<a
			class="ld-sidenav__item"
			href={nodeIdToPath(node.nodeId)}
			aria-current={currentNodeId === node.nodeId ? "page" : undefined}
			style:padding-inline-start={depth ? `${0.75 + depth * 0.75}rem` : undefined}
			onclick={(e) => follow(e, node.nodeId!)}
		>
			<span class="ld-sidenav__label">{node.label}</span>
		</a>
	{:else}
		<div class="tree-folder" style:padding-inline-start={`${0.75 + depth * 0.75}rem`}>
			{node.label}
		</div>
		{#each node.children as child}
			{@render treeNode(child, depth + 1)}
		{/each}
	{/if}
{/snippet}

<nav class="ld-sidenav" aria-label="Documents">
	{#if grouped}
		{#each groups as group}
			<div class="ld-sidenav__section" role="group" aria-labelledby="weft-nav-{group.slug}">
				<div class="ld-sidenav__heading" id="weft-nav-{group.slug}">{group.name}</div>
				{#each group.tree as node}
					{@render treeNode(node, 0)}
				{/each}
			</div>
		{/each}
	{:else}
		<div class="ld-sidenav__section">
			{#each tree as node}
				{@render treeNode(node, 0)}
			{/each}
		</div>
	{/if}
</nav>

<style>
	/* A folder inside a project: the design system has no nested nav, so a
	   subfolder is a quiet label and its documents indent beneath it. */
	.tree-folder {
		padding-block: 8px 2px;
		font-size: 11px;
		color: var(--w-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
</style>
