<script lang="ts">
import type { RenderOptions } from "$lib/markdown.js";
import { type ThemeInitOptions, theme } from "$lib/stores/theme.svelte.js";
import { nodeIdToPath } from "$lib/utils/paths.js";
import type { Manifest } from "@lepid-labs/weft-core";
import DocTree from "./DocTree.svelte";
import DocView from "./DocView.svelte";
import LinkedItems from "./LinkedItems.svelte";
import SearchPalette from "./SearchPalette.svelte";

interface Props extends RenderOptions {
	manifest: Manifest;
	layout?: "reader" | "default";
	currentNodeId: string;
	anchor?: string;
	navigate: (path: string) => void;
	/**
	 * Theme wiring for hosts that are not the whole page. The standalone app
	 * omits this: the layout's metas carry the pair and `<html>` takes the
	 * attributes. An embed passes its pair and its own scope container, so
	 * nothing lands on the host's root.
	 */
	themeOptions?: ThemeInitOptions;
}

let {
	manifest,
	layout = "default",
	currentNodeId,
	anchor,
	navigate,
	remarkPlugins,
	rehypePlugins,
	extendSchema,
	themeOptions,
}: Props = $props();

let showSearch = $state(false);
// The nav is a drawer below the design system's breakpoint; the toggle only
// shows there, since weft's nav has no icons to leave behind as a rail.
let navOpen = $state(false);

let readerMode = $derived(layout === "reader");
let siteTitle = $derived(manifest.site?.siteTitle || "Weft");
let currentNode = $derived(manifest.nodes.find((n) => n.id === currentNodeId) ?? null);

$effect(() => {
	theme.init(themeOptions);
});

$effect(() => {
	theme.setDocOverride(currentNode?.theme ?? null);
});

$effect(() => {
	const narrow = matchMedia("(max-width: 48rem)");
	const close = () => (navOpen = false);
	narrow.addEventListener("change", close);
	return () => narrow.removeEventListener("change", close);
});

function handleNavigate(nodeId: string, anchor?: string) {
	navOpen = false;
	navigate(nodeIdToPath(nodeId) + (anchor ?? ""));
}

function goHome(e: MouseEvent) {
	if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
	e.preventDefault();
	navOpen = false;
	navigate("/");
}

function handleKeydown(e: KeyboardEvent) {
	if ((e.metaKey || e.ctrlKey) && e.key === "k") {
		e.preventDefault();
		showSearch = !showSearch;
	}
	if (e.key === "Escape") {
		if (showSearch) showSearch = false;
		else navOpen = false;
	}
}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- The design system's app shell: it paints the theme's page background,
     keeps the header and nav sticky, and turns the nav into a drawer when
     narrow (data-ld-nav-open). -->
<div class="ld-shell weft-shell" data-ld-nav-open={navOpen ? "" : undefined}>
	<a class="ld-shell__skip" href="#weft-main">Skip to content</a>
	<header class="ld-shell__header">
		<button
			type="button"
			class="ld-shell__toggle"
			aria-label="Toggle navigation"
			aria-controls="weft-nav"
			aria-expanded={navOpen}
			onclick={() => (navOpen = !navOpen)}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
		</button>
		<a class="ld-shell__brand" href="/" onclick={goHome}><span>{siteTitle}</span></a>
		<div class="ld-shell__actions">
			{#if theme.canToggle}
				<span class="theme-toggle-wrap">
					<button
						type="button"
						class="ld-icon-btn"
						onclick={(e) => (e.shiftKey || e.ctrlKey ? theme.toggleDocOverride() : theme.toggle())}
						aria-label="Toggle light/dark mode"
					>
						{#if theme.current === "dark"}
							<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
						{/if}
					</button>
					<span class="theme-tooltip">
						Click to toggle &amp; save preference<br />
						Shift/Ctrl+click to override this document
					</span>
				</span>
			{/if}
			<button type="button" class="ld-btn ld-btn--sm" onclick={() => (showSearch = true)}>
				Search <kbd>⌘K</kbd>
			</button>
		</div>
	</header>

	<aside class="ld-shell__nav" id="weft-nav">
		<DocTree
			nodes={manifest.nodes}
			projects={manifest.projects}
			onnavigate={handleNavigate}
			{currentNodeId}
		/>
	</aside>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions — Escape closes the drawer too -->
	<div class="ld-shell__scrim" aria-hidden="true" onclick={() => (navOpen = false)}></div>

	<!-- The per-doc override carries both axes: the scheme for anything keyed
	     off data-theme, and the theme name whose token block restyles this
	     subtree (tokens re-declare on this element, so they win over the
	     root's by proximity, not source order). -->
	<main
		class="ld-shell__main"
		id="weft-main"
		tabindex="-1"
		data-theme={theme.docOverride ?? undefined}
		data-ld-style={theme.docOverride ? theme.styleFor(theme.docOverride) : undefined}
	>
		<div class="ld-page ld-page--wide">
			<div class="ld-aside-layout">
				<article class="ld-aside-layout__main weft-doc">
					{#if currentNode}
						<DocView
							nodeId={currentNode.id}
							nodeType={currentNode.type}
							{anchor}
							edges={manifest.edges}
							onnavigate={handleNavigate}
							{remarkPlugins}
							{rehypePlugins}
							{extendSchema}
						/>
					{:else}
						<p class="empty">No documents found.</p>
					{/if}
				</article>
				<!-- Linked items (hidden in reader mode) -->
				{#if !readerMode && currentNode}
					<aside class="ld-aside-layout__aside weft-linked" aria-label="Linked items">
						<LinkedItems nodeId={currentNode.id} {manifest} onnavigate={handleNavigate} />
					</aside>
				{/if}
			</div>
		</div>
	</main>
</div>

{#if showSearch}
	<SearchPalette
		onclose={() => (showSearch = false)}
		onselect={(id, anchor) => {
			handleNavigate(id, anchor);
			showSearch = false;
		}}
	/>
{/if}

<style>
	.weft-shell {
		min-block-size: 100%;
	}
	/* Wide: the nav is always there, so the toggle has nothing to do. The
	   host's --weft-lhn-width sizes it; narrow, the drawer keeps its own width. */
	@media (width > 48rem) {
		.weft-shell .ld-shell__toggle {
			display: none;
		}
		.weft-shell .ld-shell__nav {
			inline-size: var(--w-lhn-width);
		}
	}
	.weft-shell svg {
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}
	.ld-icon-btn > svg {
		inline-size: 18px;
		block-size: 18px;
	}
	/* Anchors land below the sticky header, not under it. */
	.weft-doc :global(:is(h1, h2, h3, h4, h5, h6)[id]) {
		scroll-margin-top: calc(var(--ld-shell-top, 0px) + 1rem);
	}
	.weft-doc {
		max-inline-size: 52rem;
	}
	.weft-linked {
		flex-basis: var(--w-rhs-width);
		max-block-size: calc(100dvh - var(--ld-shell-top, 0px) - 2rem);
		overflow-y: auto;
	}
	.theme-toggle-wrap {
		position: relative;
		display: flex;
		align-items: center;
	}
	.theme-tooltip {
		display: none;
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		background: var(--w-bg-elevated);
		border: 1px solid var(--w-border);
		border-radius: 6px;
		padding: 8px 10px;
		font-size: 11px;
		line-height: 1.6;
		color: var(--w-text-secondary);
		white-space: nowrap;
		pointer-events: none;
		z-index: 100;
	}
	.theme-toggle-wrap:hover .theme-tooltip {
		display: block;
	}
	kbd {
		font-family: inherit;
		font-size: 11px;
		opacity: 0.7;
	}
	.empty {
		color: var(--w-text-secondary);
		text-align: center;
		margin-top: 48px;
	}
</style>
