export { WeftSection, type WeftSectionProps } from "./WeftSection.js";
// Types only: a value import would load the renderer up front, and on the server.
export type {
	MermaidApi,
	MermaidLoader,
	SectionClient,
	SectionError,
	SectionErrorKind,
	SectionLink,
	SectionTarget,
	SectionUrlTarget,
	StyleConfig,
} from "@lepid-labs/weft-embed/section";
