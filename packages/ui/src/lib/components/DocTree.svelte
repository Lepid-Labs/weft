<script lang="ts">
import { type TreeNode, buildGroups, buildTree } from "$lib/doc-tree.js";
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
</script>

{#snippet treeNode(node: TreeNode, depth: number)}
	{#if node.nodeId}
		<button
			class="tree-item"
			class:active={currentNodeId === node.nodeId}
			style="padding-left: {8 + depth * 16}px"
			onclick={() => onnavigate(node.nodeId!)}
		>
			{node.label}
		</button>
	{:else}
		<div class="tree-folder" style="padding-left: {8 + depth * 16}px">
			{node.label}
		</div>
		{#each node.children as child}
			{@render treeNode(child, depth + 1)}
		{/each}
	{/if}

	{#if node.nodeId}
		<!-- Leaf nodes don't render children -->
	{:else}
		<!-- Children already rendered above -->
	{/if}
{/snippet}

<nav class="doc-tree">
	{#if grouped}
		{#each groups as group}
			<div class="project-header">{group.name}</div>
			{#each group.tree as node}
				{@render treeNode(node, 0)}
			{/each}
		{/each}
	{:else}
		{#each tree as node}
			{@render treeNode(node, 0)}
		{/each}
	{/if}
</nav>

<style>
	.doc-tree {
		display: flex;
		flex-direction: column;
		font-size: 13px;
	}
	.tree-item {
		display: block;
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		padding: 5px 14px;
		cursor: pointer;
		color: var(--w-text-secondary);
		border-radius: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 13px;
		transition: color 0.1s;
	}
	.tree-item:hover {
		background: var(--w-accent-subtle);
		color: var(--w-text);
	}
	.tree-item.active {
		background: var(--w-accent-subtle);
		color: var(--w-accent);
		font-weight: 500;
	}
	.project-header {
		padding: 4px 14px;
		font-weight: 600;
		color: var(--w-text);
		font-size: 12px;
		letter-spacing: 0.02em;
		margin-top: 16px;
		border-bottom: 1px solid var(--w-border);
		padding-bottom: 6px;
		margin-bottom: 4px;
	}
	.project-header:first-child {
		margin-top: 0;
	}
	.tree-folder {
		padding: 4px 14px;
		font-weight: 600;
		color: var(--w-text-secondary);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-top: 12px;
	}
</style>
