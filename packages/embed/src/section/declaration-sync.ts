/**
 * Compile-time only: fails `pnpm typecheck` if the hand-written `section.d.ts`
 * drifts from the implementation. Nothing imports this file, so it never
 * reaches a bundle.
 *
 * Option names must match exactly. Option types must match too, except where
 * the declaration is deliberately looser — plugin lists and the sanitizer
 * schema are unified's types in the implementation and stand-ins in the
 * declaration, because a host does not install unified.
 */
import type * as Declared from "../../section.js";
import type * as Impl from "./index.js";

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Keys whose declared type stands in for a type the host does not have. */
type StandIn = "remarkPlugins" | "rehypePlugins" | "extendSchema";

type SameOptions = {
	[K in Exclude<keyof Impl.SectionMountOptions, StandIn>]: Same<
		Declared.SectionMountOptions[K],
		Impl.SectionMountOptions[K]
	>;
};

export const checks: {
	optionNames: Same<keyof Declared.SectionMountOptions, keyof Impl.SectionMountOptions>;
	options: SameOptions[keyof SameOptions];
	state: Same<Declared.SectionMountState, Impl.SectionMountState>;
	mount: Same<Declared.SectionMount, Impl.SectionMount>;
	link: Same<Declared.SectionLink, Impl.SectionLink>;
	target: Same<Declared.SectionUrlTarget, Impl.SectionUrlTarget>;
	client: Same<Declared.SectionClient, Impl.SectionClient>;
	error: Same<Declared.SectionError, InstanceType<typeof Impl.SectionError>>;
	errorKind: Same<Declared.SectionErrorKind, Impl.SectionErrorKind>;
} = {
	optionNames: true,
	options: true,
	state: true,
	mount: true,
	link: true,
	target: true,
	client: true,
	error: true,
	errorKind: true,
};
