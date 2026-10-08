"use client";

import type {
	SectionError,
	SectionMount,
	SectionMountOptions,
	StyleConfig,
} from "@lepid-labs/weft-embed/section";
import { type ReactNode, useEffect, useRef, useState } from "react";

export interface WeftSectionProps extends Omit<SectionMountOptions, "style"> {
	/**
	 * lepid-design style: one name, or a `{dark, light}` pair picked by the
	 * nearest `data-theme`. `style` on `mountSection` — renamed here so it does
	 * not read as React's inline CSS.
	 */
	theme?: StyleConfig;
	/** Class for the wrapping element. */
	className?: string;
	/**
	 * Shown in place of the section when it cannot be — the file failed to
	 * load, the anchor names no heading, or rendering threw. Without this or
	 * `onError`, the error's message is shown instead.
	 */
	fallback?: ReactNode;
}

/** The callbacks, read when called rather than when mounted. */
type Latest = Pick<
	WeftSectionProps,
	"client" | "resolveUrl" | "onLinkClick" | "onError" | "extendSchema" | "mermaid"
>;

/**
 * One section of a docs file, rendered inline and fetched live from its source.
 *
 * A thin wrapper over `mountSection` from `@lepid-labs/weft-embed/section`,
 * which is imported on first mount — a page that never shows a section never
 * loads the renderer, and server rendering emits only the empty container.
 *
 * `path` and `anchor` re-point the mounted section in place. Functions are
 * read when they are called, so inline arrows are fine. Any other prop that
 * changes — the source, heading options, theme, plugin arrays by identity —
 * mounts the section afresh, so keep plugin arrays stable.
 *
 * @example
 * <WeftSection repo="acme/tool" ref="v2.1.0" path="docs/cli.md" anchor="#flags"
 *   headingLevel={3} fallback={<a href={DOCS_URL}>See the CLI docs</a>} />
 */
export function WeftSection(props: WeftSectionProps) {
	const {
		path,
		anchor,
		className,
		fallback,
		theme,
		client,
		resolveUrl,
		onLinkClick,
		onError,
		extendSchema,
		mermaid,
		repo,
		ref,
		baseUrl,
		headingLevel,
		hideHeading,
		styleUrl,
		remarkPlugins,
		rehypePlugins,
	} = props;

	const container = useRef<HTMLDivElement>(null);
	const mounted = useRef<SectionMount | null>(null);
	const [failed, setFailed] = useState(false);

	const latest = useRef<Latest>({});
	// Where the section points now, for a mount that finishes after it changed.
	const position = useRef({ path, anchor });
	// Declared first, so it has run by the time the effects below read either.
	useEffect(() => {
		latest.current = { client, resolveUrl, onLinkClick, onError, extendSchema, mermaid };
		position.current = { path, anchor };
	});

	// Whether each optional behaviour is on is fixed for a mount — the embed
	// reads it once — so turning one on or off remounts. Its function is not.
	const hasClient = client !== undefined;
	const hasLinkHandler = onLinkClick !== undefined;
	const handlesError = onError !== undefined || fallback !== undefined;
	const hasExtendSchema = extendSchema !== undefined;
	const mermaidMode = mermaid === false ? "off" : mermaid ? "custom" : "default";
	const themeKey = typeof theme === "string" ? theme : theme ? `${theme.dark}|${theme.light}` : "";

	// biome-ignore lint/correctness/useExhaustiveDependencies: functions are read through `latest`, and `theme` through `themeKey`, so neither remounts by identity alone.
	useEffect(() => {
		const element = container.current;
		if (!element) return;

		let cancelled = false;
		setFailed(false);

		import("@lepid-labs/weft-embed/section").then(
			({ mountSection }) => {
				if (cancelled) return;
				const options: SectionMountOptions = {
					...position.current,
					repo,
					ref,
					baseUrl,
					headingLevel,
					hideHeading,
					style: theme,
					styleUrl,
					remarkPlugins,
					rehypePlugins,
					resolveUrl: (target) => latest.current.resolveUrl?.(target),
				};
				if (hasClient) {
					options.client = {
						fetchDoc: (file) => {
							const current = latest.current.client;
							return current ? current.fetchDoc(file) : Promise.reject(new Error("no client"));
						},
					};
				}
				if (hasLinkHandler) options.onLinkClick = (link) => latest.current.onLinkClick?.(link);
				if (handlesError) {
					options.onError = (error: SectionError) => {
						setFailed(true);
						latest.current.onError?.(error);
					};
				}
				if (hasExtendSchema) {
					options.extendSchema = (schema) => latest.current.extendSchema?.(schema) ?? schema;
				}
				if (mermaidMode === "off") options.mermaid = false;
				else if (mermaidMode === "custom") {
					options.mermaid = () => {
						const loader = latest.current.mermaid;
						return loader ? loader() : Promise.reject(new Error("no mermaid loader"));
					};
				}
				mounted.current = mountSection(element, options);
			},
			(error: unknown) => {
				// The renderer's chunk failed to load: there is no SectionError class
				// to report it with, but the host's fallback still applies.
				if (cancelled) return;
				if (handlesError) setFailed(true);
				console.error("Weft: could not load the section renderer", error);
			}
		);

		return () => {
			cancelled = true;
			mounted.current?.destroy();
			mounted.current = null;
		};
	}, [
		repo,
		ref,
		baseUrl,
		headingLevel,
		hideHeading,
		themeKey,
		styleUrl,
		remarkPlugins,
		rehypePlugins,
		hasClient,
		hasLinkHandler,
		handlesError,
		hasExtendSchema,
		mermaidMode,
	]);

	// Re-point in place. Before the mount exists this does nothing, and the
	// mount picks the position up from `position` when it is made.
	useEffect(() => {
		setFailed(false);
		mounted.current?.update({ path, anchor });
	}, [path, anchor]);

	// The embed owns the inner element's children; React owns its siblings.
	return (
		<div className={className}>
			<div ref={container} />
			{failed ? fallback : null}
		</div>
	);
}
