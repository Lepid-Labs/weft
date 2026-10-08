<script lang="ts">
import MarkdownRenderer from "$lib/components/MarkdownRenderer.svelte";
import { hostTheme } from "$lib/host-theme.svelte.js";
import { MERMAID_LOADER_KEY } from "$lib/mermaid.js";
import {
	SectionError,
	type SectionTarget,
	type SectionUrlTarget,
	defaultSectionUrl,
	loadSection,
	rehypeSection,
} from "$lib/section.js";
import type { SectionRange } from "@lepid-labs/weft-core/browser";
import { setContext } from "svelte";
import type { PluggableList } from "unified";
import { mermaidLoader } from "../mermaid-cdn.js";
import type { SectionClient, SectionMountOptions } from "./index.js";
import type { SectionState } from "./section-state.svelte.js";

// Tokens and scoped base styles — never the page-level sheet.
import "$lib/../app.css";

interface Props {
	options: SectionMountOptions;
	client: SectionClient;
	// Not `state`: a variable of that name turns `$state(...)` into a store read.
	view: SectionState;
}

let { options, client, view }: Props = $props();

// svelte-ignore state_referenced_locally — options are fixed for the mount's life
setContext(MERMAID_LOADER_KEY, mermaidLoader(options.mermaid));

let root: HTMLDivElement | undefined = $state();
const host = hostTheme(
	() => root,
	() => options.style
);

let section = $state<{ target: SectionTarget; range: SectionRange } | undefined>();
let failure = $state<SectionError | undefined>();
let generation = 0;

/** Links into the docs, by the href each carries on the page. */
const links = new Map<string, SectionTarget>();

$effect(() => {
	void load({ path: view.path, anchor: view.anchor });
});

async function load(target: SectionTarget) {
	const current = ++generation;
	try {
		const range = await loadSection((path) => client.fetchDoc(path), target);
		if (current !== generation) return;
		links.clear();
		section = { target, range };
		failure = undefined;
	} catch (error) {
		if (current !== generation) return;
		fail(
			error instanceof SectionError ? error : new SectionError("load", target, String(error), error)
		);
	}
}

function fail(error: SectionError) {
	section = undefined;
	failure = error;
	options.onError?.(error);
}

function resolveUrl(target: SectionUrlTarget): string | undefined {
	return options.resolveUrl?.(target) ?? defaultSectionUrl(options, target);
}

let rehypePlugins = $derived<PluggableList>(
	section
		? [
				[
					rehypeSection,
					{
						path: section.target.path,
						baseLevel: section.range.baseLevel,
						headingLevel: options.headingLevel,
						hideHeading: options.hideHeading,
						resolveUrl,
						onLink: (href: string, target: SectionTarget) => links.set(href, target),
					},
				],
				...(options.rehypePlugins ?? []),
			]
		: []
);

function plainClick(event: MouseEvent): boolean {
	return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

const HTTP = /^https?:/i;

/** A fragment as an id: percent-decoded, or as written if it is not valid encoding. */
function decodeFragment(fragment: string): string {
	try {
		return decodeURIComponent(fragment);
	} catch {
		return fragment;
	}
}

/**
 * Where a click inside the section goes.
 *
 * Nothing here may navigate the host's own page. A `#fragment` would rewrite
 * its location hash — which a hash-routed app reads as a route — so one that
 * names a heading in the section scrolls to it here, and one that does not is
 * a link to that heading in the file. Links into the docs go to `onLinkClick`,
 * or open in a new tab; so do external links, rather than taking the reader
 * out of the tool they were using. A modified click keeps the browser's
 * meaning (new tab, new window) wherever the link carries a real URL.
 *
 * Runs after `MarkdownRenderer`'s own handler, which has already cancelled the
 * default for any link still relative — there is no page to go to for those.
 */
function handleClick(event: MouseEvent) {
	const anchor = (event.target as HTMLElement).closest("a");
	const href = anchor?.getAttribute("href");
	if (!anchor || !href || !root?.contains(anchor) || !section) return;

	if (href.startsWith("#")) {
		event.preventDefault();
		const id = decodeFragment(href.slice(1));
		const heading = id ? root.querySelector(`#${CSS.escape(id)}`) : null;
		if (heading) heading.scrollIntoView({ behavior: "smooth" });
		else follow(event, { path: section.target.path, anchor: href });
		return;
	}

	const target = links.get(href);
	if (target) follow(event, target);
	else if (HTTP.test(href) && plainClick(event)) {
		event.preventDefault();
		window.open(href, "_blank", "noopener,noreferrer");
	}
}

function follow(event: MouseEvent, target: SectionTarget) {
	const url = resolveUrl({ kind: "link", ...target });
	if (options.onLinkClick) {
		event.preventDefault();
		options.onLinkClick({ ...target, ...(url ? { url } : {}) });
		return;
	}
	if (!url) {
		event.preventDefault();
		return;
	}
	// A modified click on a real link is the browser's to handle — unless the
	// default is already cancelled (a fragment), when this is the only way out.
	if (!plainClick(event) && !event.defaultPrevented) return;
	event.preventDefault();
	window.open(url, "_blank", "noopener,noreferrer");
}
</script>

<!--
	Inline in the host's layout: no width cap, no centring, no outer margin. The
	host's container decides how wide the section is; Weft only fills it.
-->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="weft-scope weft-section"
	data-theme={host.scheme ?? undefined}
	data-ld-style={host.style}
	bind:this={root}
	onclick={handleClick}
>
	{#if failure}
		{#if !options.onError}
			<p class="weft-section-error">{failure.message}</p>
		{/if}
	{:else if section}
		<MarkdownRenderer
			content={section.range.text}
			onnavigate={() => {}}
			onerror={(error) =>
				section && fail(new SectionError("render", section.target, error.message, error))}
			remarkPlugins={options.remarkPlugins}
			{rehypePlugins}
			extendSchema={options.extendSchema}
		/>
	{/if}
</div>

<style>
	/* The section starts and ends at its content, so it sits flush in the host's
	   layout — a leading heading's top margin is space the host did not ask for. */
	.weft-section :global(.markdown-body > :first-child) {
		margin-top: 0;
	}
	.weft-section :global(.markdown-body > :last-child) {
		margin-bottom: 0;
	}
	.weft-section-error {
		margin: 0;
		color: var(--ld-danger, #b3261e);
	}
</style>
