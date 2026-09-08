// A stand-in for the adapter-node build that ui-server.test.ts serves.
export const handler = (_req, res) => {
	res.end("ui");
};
