import { registerHooks } from "node:module";

const testModuleUrl = new URL("./node-cloudflare-workers.mjs", import.meta.url)
	.href;

registerHooks({
	resolve(specifier, context, nextResolve) {
		if (specifier === "cloudflare:workers") {
			return { shortCircuit: true, url: testModuleUrl };
		}
		return nextResolve(specifier, context);
	},
});
