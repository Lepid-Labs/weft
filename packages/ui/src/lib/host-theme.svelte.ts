import type { StyleConfig } from "@lepid-labs/weft-core/browser";
import { resolveStylePair } from "./styles.js";

/**
 * The scheme and style an embedded mount should render in, read from its host.
 *
 * Shared by every mount that sits inside someone else's page — `mountDoc` and
 * `mountSection` — so the rule for which ancestor wins has one home. Call it
 * while a component initializes: it installs an effect.
 *
 * CSS cannot express "nearest ancestor wins". A host page themed `light` with
 * the mount's container marked `dark` matches BOTH `[data-theme="light"] .weft-scope`
 * and `[data-theme="dark"] .weft-scope` — same element, both (0,2,0) — so source
 * order decides, and a mount that asked to be dark renders light.
 *
 * Resolving the value here and mirroring it onto the mount's own root turns an
 * ancestor question into an own-attribute one, which the cascade handles
 * unambiguously — and keeps the rules scoped.
 */
export function hostTheme(
	getRoot: () => HTMLElement | undefined,
	getStyle: () => StyleConfig | undefined
) {
	let inherited = $state<"dark" | "light" | null>(null);

	$effect(() => {
		const root = getRoot();
		if (!root) return;

		const resolve = () => {
			// From the PARENT, never from `root` itself: the mount writes the
			// attribute onto `root`, and reading it back would latch the first value
			// forever.
			const found = root.parentElement?.closest("[data-theme]")?.getAttribute("data-theme");
			// Clamped rather than mirrored verbatim. A host themed `solarized-mango`
			// matches no block and falls through to the light base either way — but
			// republishing their arbitrary string as Weft's own state is not something
			// to do on their behalf.
			inherited = found === "dark" || found === "light" ? found : null;
		};

		resolve();

		// A host may toggle its own theme at runtime; the filter keeps this cheap
		// even though the subtree is the whole document.
		const observer = new MutationObserver(resolve);
		observer.observe(document.documentElement, {
			subtree: true,
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	});

	const pair = $derived(resolveStylePair(getStyle()));

	// The mirrored scheme picks which half of the pair renders. An unthemed host
	// gets the light half when there is one — host pages are usually light, and
	// the pre-conversion base palette was light for the same reason. A scheme the
	// pair cannot serve clamps to the half that exists.
	const style = $derived.by(() => {
		const scheme = inherited ?? (pair.light ? "light" : "dark");
		return pair[scheme] ?? pair.light ?? pair.dark;
	});

	return {
		/** The host's scheme, for the mount's own `data-theme`; null when it set none. */
		get scheme() {
			return inherited;
		},
		/** The lepid-design style to put on the mount's `data-ld-style`. */
		get style() {
			return style;
		},
	};
}
